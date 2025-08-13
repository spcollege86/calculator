const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * 用户注册
 */
exports.register = async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { username, email, password, company, phone } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            where: {
                $or: [
                    { email },
                    { username }
                ]
            }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === email ? '邮箱已被注册' : '用户名已被注册'
            });
        }

        // 加密密码
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 创建用户
        const user = await User.create({
            username,
            email,
            password_hash: passwordHash,
            company,
            phone,
            role: 'user',
            is_active: true
        });

        // 生成JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );

        // 记录日志
        logger.info(`用户注册成功: ${user.email}`);

        // 返回结果（不包含密码哈希）
        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    company: user.company,
                    phone: user.phone,
                    role: user.role,
                    created_at: user.created_at
                },
                token,
                refreshToken
            }
        });

    } catch (error) {
        logger.error('用户注册失败:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后重试'
        });
    }
};

/**
 * 用户登录
 */
exports.login = async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { login, password } = req.body; // login 可以是 email 或 username

        // 查找用户
        const user = await User.findOne({
            where: {
                $or: [
                    { email: login },
                    { username: login }
                ],
                is_active: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在或已被停用'
            });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '密码错误'
            });
        }

        // 更新最后登录时间
        await user.update({ last_login_at: new Date() });

        // 生成JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );

        // 记录日志
        logger.info(`用户登录成功: ${user.email}`);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    company: user.company,
                    phone: user.phone,
                    role: user.role,
                    avatar: user.avatar,
                    last_login_at: user.last_login_at
                },
                token,
                refreshToken
            }
        });

    } catch (error) {
        logger.error('用户登录失败:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
};

/**
 * 刷新token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: '缺少刷新token'
            });
        }

        // 验证刷新token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findByPk(decoded.userId, {
            where: { is_active: true }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在或已被停用'
            });
        }

        // 生成新的访问token
        const newToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        res.json({
            success: true,
            message: 'Token刷新成功',
            data: {
                token: newToken
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '刷新token无效或已过期'
            });
        }

        logger.error('Token刷新失败:', error);
        res.status(500).json({
            success: false,
            message: 'Token刷新失败'
        });
    }
};

/**
 * 获取当前用户信息
 */
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        logger.error('获取用户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败'
        });
    }
};

/**
 * 更新用户信息
 */
exports.updateProfile = async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { username, company, phone, avatar } = req.body;
        const userId = req.user.userId;

        // 检查用户名是否已被其他用户使用
        if (username) {
            const existingUser = await User.findOne({
                where: {
                    username,
                    id: { $ne: userId }
                }
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: '用户名已被其他用户使用'
                });
            }
        }

        // 更新用户信息
        const [affectedRows] = await User.update({
            username,
            company,
            phone,
            avatar
        }, {
            where: { id: userId }
        });

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 获取更新后的用户信息
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        logger.info(`用户信息更新成功: ${updatedUser.email}`);

        res.json({
            success: true,
            message: '用户信息更新成功',
            data: { user: updatedUser }
        });

    } catch (error) {
        logger.error('更新用户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '更新用户信息失败'
        });
    }
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        // 获取用户信息
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 验证当前密码
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '当前密码错误'
            });
        }

        // 加密新密码
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 更新密码
        await user.update({ password_hash: newPasswordHash });

        logger.info(`用户密码修改成功: ${user.email}`);

        res.json({
            success: true,
            message: '密码修改成功'
        });

    } catch (error) {
        logger.error('修改密码失败:', error);
        res.status(500).json({
            success: false,
            message: '修改密码失败'
        });
    }
};

/**
 * 用户登出
 */
exports.logout = async (req, res) => {
    try {
        // 这里可以实现token黑名单机制
        // 目前简单返回成功消息
        logger.info(`用户登出: ${req.user.email || req.user.userId}`);
        
        res.json({
            success: true,
            message: '登出成功'
        });

    } catch (error) {
        logger.error('用户登出失败:', error);
        res.status(500).json({
            success: false,
            message: '登出失败'
        });
    }
}; 