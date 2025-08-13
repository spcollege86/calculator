const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * 验证JWT Token中间件
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '访问令牌缺失'
            });
        }

        // 验证token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 查找用户（确保用户仍然存在且激活）
        const user = await User.findByPk(decoded.userId, {
            attributes: ['id', 'email', 'username', 'role', 'is_active']
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: '账户已被停用'
            });
        }

        // 将用户信息附加到请求对象
        req.user = {
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role
        };

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的访问令牌'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '访问令牌已过期'
            });
        }

        logger.error('Token验证失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 可选的认证中间件 - 如果有token则验证，没有则跳过
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // 没有token，跳过认证
            req.user = null;
            return next();
        }

        // 验证token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 查找用户
        const user = await User.findByPk(decoded.userId, {
            attributes: ['id', 'email', 'username', 'role', 'is_active']
        });

        if (user && user.is_active) {
            req.user = {
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            };
        } else {
            req.user = null;
        }

        next();

    } catch (error) {
        // 如果token验证失败，设置用户为null并继续
        req.user = null;
        next();
    }
};

/**
 * 角色验证中间件
 * @param {string|string[]} allowedRoles - 允许的角色
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '需要认证'
            });
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: '权限不足'
            });
        }

        next();
    };
};

/**
 * 管理员权限验证
 */
const requireAdmin = requireRole('admin');

/**
 * 用户权限验证（普通用户和管理员都可以）
 */
const requireUser = requireRole(['user', 'admin']);

/**
 * API密钥验证中间件（用于内部API调用）
 */
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API密钥缺失'
        });
    }

    if (apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({
            success: false,
            message: '无效的API密钥'
        });
    }

    next();
};

/**
 * 登录限流中间件
 */
const loginRateLimit = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 限制每个IP最多5次登录尝试
    message: {
        success: false,
        message: '登录尝试次数过多，请15分钟后重试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // 只对失败的请求计数
    skipSuccessfulRequests: true,
    // 基于IP地址和用户输入进行限制
    keyGenerator: (req) => {
        return `login_${req.ip}_${req.body.login || req.body.email || 'unknown'}`;
    }
});

/**
 * 注册限流中间件
 */
const registerRateLimit = require('express-rate-limit')({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 3, // 限制每个IP每小时最多3次注册
    message: {
        success: false,
        message: '注册次数过多，请1小时后重试'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireAdmin,
    requireUser,
    authenticateApiKey,
    loginRateLimit,
    registerRateLimit
}; 