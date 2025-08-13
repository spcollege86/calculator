const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { generateTokens, authenticateRefreshToken } = require('../middleware/auth');
const { asyncHandler, ErrorResponses } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// 注册
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('用户名长度应在3-50之间'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('请输入有效的邮箱地址'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('密码长度不能少于6位'),
    body('company')
        .optional()
        .isLength({ max: 100 })
        .withMessage('公司名称不能超过100字符')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { username, email, password, company, phone } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
        where: {
            $or: [{ email }, { username }]
        }
    });

    if (existingUser) {
        if (existingUser.email === email) {
            throw ErrorResponses.BUSINESS_ERROR('该邮箱已被注册');
        }
        if (existingUser.username === username) {
            throw ErrorResponses.BUSINESS_ERROR('该用户名已被使用');
        }
    }

    // 创建用户
    const user = await User.create({
        username,
        email,
        password_hash: password, // 会在模型的hook中自动加密
        company,
        phone,
        role: 'user'
    });

    // 生成令牌
    const tokens = generateTokens(user.id);

    logger.auth(`用户注册成功: ${username} (${email})`);

    res.status(201).json({
        message: '注册成功',
        user: user.toJSON(),
        ...tokens
    });
}));

// 登录
router.post('/login', [
    body('identifier')
        .notEmpty()
        .withMessage('请输入用户名或邮箱'),
    body('password')
        .notEmpty()
        .withMessage('请输入密码')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { identifier, password } = req.body;

    // 验证用户凭据
    const user = await User.findByCredentials(identifier, password);

    // 生成令牌
    const tokens = generateTokens(user.id);

    logger.auth(`用户登录成功: ${user.username} (${user.email})`);

    res.json({
        message: '登录成功',
        user: user.toJSON(),
        ...tokens
    });
}));

// 刷新令牌
router.post('/refresh', authenticateRefreshToken, asyncHandler(async (req, res) => {
    // 生成新的访问令牌
    const tokens = generateTokens(req.user.id);

    logger.auth(`令牌刷新成功: ${req.user.username}`);

    res.json({
        message: '令牌刷新成功',
        ...tokens
    });
}));

// 获取当前用户信息
router.get('/me', require('../middleware/auth').authenticateToken, asyncHandler(async (req, res) => {
    res.json({
        user: req.user.toJSON()
    });
}));

// 更新用户资料
router.put('/profile', [
    require('../middleware/auth').authenticateToken,
    body('username')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('用户名长度应在3-50之间'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('请输入有效的邮箱地址'),
    body('company')
        .optional()
        .isLength({ max: 100 })
        .withMessage('公司名称不能超过100字符'),
    body('phone')
        .optional()
        .matches(/^[+]?[\d\s-()]+$/)
        .withMessage('请输入有效的手机号')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { username, email, company, phone, settings } = req.body;
    const user = req.user;

    // 检查用户名和邮箱是否被其他用户使用
    if (username && username !== user.username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== user.id) {
            throw ErrorResponses.BUSINESS_ERROR('该用户名已被使用');
        }
    }

    if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
            throw ErrorResponses.BUSINESS_ERROR('该邮箱已被注册');
        }
    }

    // 更新用户信息
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (settings) updateData.settings = { ...user.settings, ...settings };

    await user.update(updateData);

    logger.auth(`用户资料更新: ${user.username}`);

    res.json({
        message: '资料更新成功',
        user: user.toJSON()
    });
}));

// 修改密码
router.put('/password', [
    require('../middleware/auth').authenticateToken,
    body('currentPassword')
        .notEmpty()
        .withMessage('请输入当前密码'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('新密码长度不能少于6位')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // 验证当前密码
    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
        throw ErrorResponses.UNAUTHORIZED('当前密码不正确');
    }

    // 更新密码
    await user.update({ password_hash: newPassword });

    logger.auth(`用户密码修改: ${user.username}`);

    res.json({
        message: '密码修改成功'
    });
}));

// 登出（客户端应删除令牌）
router.post('/logout', require('../middleware/auth').authenticateToken, asyncHandler(async (req, res) => {
    logger.auth(`用户登出: ${req.user.username}`);

    res.json({
        message: '登出成功'
    });
}));

module.exports = router; 