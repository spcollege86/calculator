const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

// 导入配置
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');

// 导入路由
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const calculationRoutes = require('./src/routes/calculations');
const exchangeRateRoutes = require('./src/routes/exchangeRates');
const userRoutes = require('./src/routes/users');

// 导入中间件
const errorHandler = require('./src/middleware/errorHandler');
const { authenticateToken } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 基础中间件
app.use(helmet()); // 安全头部
app.use(compression()); // 启用压缩
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// 请求限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 限制每个IP每15分钟最多100个请求
    message: {
        error: '请求过于频繁，请稍后再试'
    }
});
app.use(limiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/calculations', authenticateToken, calculationRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        error: '接口不存在',
        path: req.originalUrl
    });
});

// 全局错误处理
app.use(errorHandler);

// 数据库连接和服务器启动
async function startServer() {
    try {
        // 测试数据库连接
        await sequelize.authenticate();
        logger.info('数据库连接成功');

        // 同步数据库模型（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            logger.info('数据库模型同步完成');
        }

        // 启动服务器
        app.listen(PORT, () => {
            logger.info(`服务器运行在端口 ${PORT}`);
            logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`前端地址: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        });

        // 启动定时任务（汇率更新）
        require('./src/services/cronJobs');
        
    } catch (error) {
        logger.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', async () => {
    logger.info('收到SIGTERM信号，正在关闭服务器...');
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('收到SIGINT信号，正在关闭服务器...');
    await sequelize.close();
    process.exit(0);
});

// 未捕获的异常处理
process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常:', error);
    process.exit(1);
});

// 启动服务器
startServer(); 