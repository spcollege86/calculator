const logger = require('../utils/logger');

/**
 * 统一错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // 记录错误日志
    logger.error(`错误 ${req.method} ${req.originalUrl}: ${err.message}`, {
        error: err.stack,
        body: req.body,
        user: req.user?.userId,
        ip: req.ip
    });

    // Sequelize 验证错误
    if (err.name === 'SequelizeValidationError') {
        const message = err.errors.map(error => error.message).join(', ');
        return res.status(400).json({
            success: false,
            message: '数据验证失败',
            errors: err.errors.map(error => ({
                field: error.path,
                message: error.message,
                value: error.value
            }))
        });
    }

    // Sequelize 唯一约束错误
    if (err.name === 'SequelizeUniqueConstraintError') {
        const message = '数据已存在，违反唯一性约束';
        return res.status(409).json({
            success: false,
            message,
            errors: err.errors.map(error => ({
                field: error.path,
                message: `${error.path} 已存在`,
                value: error.value
            }))
        });
    }

    // Sequelize 外键约束错误
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            success: false,
            message: '外键约束错误，关联的记录不存在'
        });
    }

    // Sequelize 数据库连接错误
    if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
        return res.status(503).json({
            success: false,
            message: '数据库连接失败，请稍后重试'
        });
    }

    // Sequelize 超时错误
    if (err.name === 'SequelizeTimeoutError') {
        return res.status(408).json({
            success: false,
            message: '请求超时，请稍后重试'
        });
    }

    // JWT 相关错误
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: '无效的访问令牌'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: '访问令牌已过期'
        });
    }

    // Multer 文件上传错误
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: '文件大小超出限制'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: '不允许的文件字段'
        });
    }

    // 语法错误
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: '请求格式错误'
        });
    }

    // 请求实体过大
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: '请求实体过大'
        });
    }

    // 自定义业务错误
    if (err.isOperational) {
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message
        });
    }

    // 默认错误处理
    res.status(err.statusCode || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : '服务器内部错误'
    });
};

/**
 * 处理未找到的路由
 */
const notFound = (req, res, next) => {
    const error = new Error(`接口不存在 - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

/**
 * 异步错误捕获包装器
 * 用于包装异步路由处理函数，自动捕获Promise拒绝
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 创建自定义错误
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 创建验证错误
 */
const createValidationError = (message, errors = []) => {
    const error = new AppError(message, 400);
    error.errors = errors;
    return error;
};

/**
 * 创建未授权错误
 */
const createUnauthorizedError = (message = '未授权访问') => {
    return new AppError(message, 401);
};

/**
 * 创建禁止访问错误
 */
const createForbiddenError = (message = '禁止访问') => {
    return new AppError(message, 403);
};

/**
 * 创建未找到错误
 */
const createNotFoundError = (message = '资源未找到') => {
    return new AppError(message, 404);
};

/**
 * 创建冲突错误
 */
const createConflictError = (message = '资源冲突') => {
    return new AppError(message, 409);
};

/**
 * 创建服务器错误
 */
const createInternalError = (message = '服务器内部错误') => {
    return new AppError(message, 500);
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler,
    AppError,
    createValidationError,
    createUnauthorizedError,
    createForbiddenError,
    createNotFoundError,
    createConflictError,
    createInternalError
}; 