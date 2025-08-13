const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { User, Product, Calculation } = require('../models');
const { asyncHandler, ErrorResponses } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取用户列表（管理员权限）
router.get('/', [
    requireAdmin,
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须为正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页条数应在1-100之间'),
    query('role').optional().isIn(['admin', 'user']).withMessage('角色参数无效'),
    query('is_active').optional().isBoolean().withMessage('激活状态参数无效'),
    query('search').optional().isString().withMessage('搜索关键词格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const {
        page = 1,
        limit = 20,
        role,
        is_active,
        search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 添加搜索条件
    if (role) {
        where.role = role;
    }

    if (is_active !== undefined) {
        where.is_active = is_active === 'true';
    }

    if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
            { username: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { company: { [Op.like]: `%${search}%` } }
        ];
    }

    const { rows: users, count } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password_hash'] }
    });

    res.json({
        success: true,
        data: {
            users: users.map(user => user.toJSON()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        }
    });
}));

// 获取单个用户详情（管理员权限）
router.get('/:id', requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id, {
        attributes: { exclude: ['password_hash'] },
        include: [
            {
                model: Product,
                as: 'products',
                attributes: ['id', 'name', 'category', 'created_at'],
                limit: 5,
                order: [['created_at', 'DESC']]
            },
            {
                model: Calculation,
                as: 'calculations',
                attributes: ['id', 'product_name', 'created_at'],
                where: { is_saved: true },
                required: false,
                limit: 5,
                order: [['created_at', 'DESC']]
            }
        ]
    });

    if (!user) {
        throw ErrorResponses.NOT_FOUND('用户不存在');
    }

    // 获取用户统计信息
    const productCount = await Product.count({
        where: { user_id: id }
    });

    const calculationCount = await Calculation.count({
        where: { user_id: id, is_saved: true }
    });

    const userData = user.toJSON();
    userData.stats = {
        product_count: productCount,
        calculation_count: calculationCount
    };

    res.json({
        success: true,
        data: userData
    });
}));

// 创建用户（管理员权限）
router.post('/', [
    requireAdmin,
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
    body('role')
        .isIn(['admin', 'user'])
        .withMessage('角色参数无效'),
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

    const { username, email, password, role, company, phone } = req.body;

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
        role,
        company,
        phone,
        is_active: true
    });

    logger.info(`管理员创建用户 - 操作者: ${req.user.username}`, {
        newUserId: user.id,
        newUsername: username,
        role
    });

    res.status(201).json({
        success: true,
        message: '用户创建成功',
        data: user.toJSON()
    });
}));

// 更新用户（管理员权限）
router.put('/:id', [
    requireAdmin,
    body('username')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('用户名长度应在3-50之间'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('请输入有效的邮箱地址'),
    body('role')
        .optional()
        .isIn(['admin', 'user'])
        .withMessage('角色参数无效'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('激活状态参数无效'),
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

    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByPk(id);
    if (!user) {
        throw ErrorResponses.NOT_FOUND('用户不存在');
    }

    // 防止管理员修改自己的角色和状态
    if (user.id === req.user.id) {
        if (updateData.role && updateData.role !== user.role) {
            throw ErrorResponses.BUSINESS_ERROR('不能修改自己的角色');
        }
        if (updateData.is_active === false) {
            throw ErrorResponses.BUSINESS_ERROR('不能禁用自己的账户');
        }
    }

    // 检查用户名和邮箱是否被其他用户使用
    if (updateData.username && updateData.username !== user.username) {
        const existingUser = await User.findOne({
            where: { username: updateData.username }
        });
        if (existingUser && existingUser.id !== user.id) {
            throw ErrorResponses.BUSINESS_ERROR('该用户名已被使用');
        }
    }

    if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
            where: { email: updateData.email }
        });
        if (existingUser && existingUser.id !== user.id) {
            throw ErrorResponses.BUSINESS_ERROR('该邮箱已被注册');
        }
    }

    await user.update(updateData);

    logger.info(`管理员更新用户 - 操作者: ${req.user.username}`, {
        targetUserId: id,
        targetUsername: user.username,
        updateFields: Object.keys(updateData)
    });

    res.json({
        success: true,
        message: '用户信息更新成功',
        data: user.toJSON()
    });
}));

// 重置用户密码（管理员权限）
router.put('/:id/reset-password', [
    requireAdmin,
    body('new_password')
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

    const { id } = req.params;
    const { new_password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
        throw ErrorResponses.NOT_FOUND('用户不存在');
    }

    await user.update({ password_hash: new_password });

    logger.info(`管理员重置用户密码 - 操作者: ${req.user.username}`, {
        targetUserId: id,
        targetUsername: user.username
    });

    res.json({
        success: true,
        message: '密码重置成功'
    });
}));

// 删除用户（管理员权限）
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
        throw ErrorResponses.NOT_FOUND('用户不存在');
    }

    // 防止删除自己的账户
    if (user.id === req.user.id) {
        throw ErrorResponses.BUSINESS_ERROR('不能删除自己的账户');
    }

    // 防止删除最后一个管理员
    if (user.role === 'admin') {
        const adminCount = await User.count({
            where: { role: 'admin', is_active: true }
        });
        if (adminCount <= 1) {
            throw ErrorResponses.BUSINESS_ERROR('不能删除最后一个管理员账户');
        }
    }

    await user.destroy();

    logger.info(`管理员删除用户 - 操作者: ${req.user.username}`, {
        deletedUserId: id,
        deletedUsername: user.username
    });

    res.json({
        success: true,
        message: '用户删除成功'
    });
}));

// 获取用户统计信息（管理员权限）
router.get('/stats/overview', requireAdmin, asyncHandler(async (req, res) => {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const adminUsers = await User.count({ where: { role: 'admin' } });
    
    // 最近30天注册用户
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.count({
        where: {
            created_at: {
                [require('sequelize').Op.gte]: thirtyDaysAgo
            }
        }
    });

    // 最近7天活跃用户（有登录记录）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActiveUsers = await User.count({
        where: {
            last_login_at: {
                [require('sequelize').Op.gte]: sevenDaysAgo
            }
        }
    });

    res.json({
        success: true,
        data: {
            total_users: totalUsers,
            active_users: activeUsers,
            admin_users: adminUsers,
            new_users_30d: newUsers,
            active_users_7d: recentActiveUsers
        }
    });
}));

// 批量操作用户（管理员权限）
router.post('/batch-action', [
    requireAdmin,
    body('action').isIn(['activate', 'deactivate', 'delete']).withMessage('操作类型无效'),
    body('user_ids').isArray({ min: 1 }).withMessage('用户ID列表不能为空')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { action, user_ids } = req.body;
    const results = [];

    // 防止操作自己的账户
    if (user_ids.includes(req.user.id)) {
        throw ErrorResponses.BUSINESS_ERROR('不能对自己的账户执行批量操作');
    }

    for (const userId of user_ids) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                results.push({
                    user_id: userId,
                    success: false,
                    error: '用户不存在'
                });
                continue;
            }

            switch (action) {
                case 'activate':
                    await user.update({ is_active: true });
                    results.push({
                        user_id: userId,
                        username: user.username,
                        success: true,
                        action: '激活'
                    });
                    break;

                case 'deactivate':
                    await user.update({ is_active: false });
                    results.push({
                        user_id: userId,
                        username: user.username,
                        success: true,
                        action: '禁用'
                    });
                    break;

                case 'delete':
                    // 防止删除管理员
                    if (user.role === 'admin') {
                        results.push({
                            user_id: userId,
                            username: user.username,
                            success: false,
                            error: '不能删除管理员账户'
                        });
                        continue;
                    }
                    
                    await user.destroy();
                    results.push({
                        user_id: userId,
                        username: user.username,
                        success: true,
                        action: '删除'
                    });
                    break;
            }
        } catch (error) {
            results.push({
                user_id: userId,
                success: false,
                error: error.message
            });
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`管理员批量操作用户 - 操作者: ${req.user.username}`, {
        action,
        totalCount: user_ids.length,
        successCount,
        failCount
    });

    res.json({
        success: true,
        message: `批量操作完成，成功: ${successCount}，失败: ${failCount}`,
        data: results
    });
}));

module.exports = router; 