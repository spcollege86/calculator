const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

/**
 * 健康检查接口
 */
router.get('/health', async (req, res) => {
    try {
        // 检查数据库连接
        await sequelize.authenticate();
        
        res.json({
            success: true,
            message: '服务运行正常',
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                database: 'connected',
                uptime: process.uptime()
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: '服务不可用',
            data: {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            }
        });
    }
});

module.exports = router; 