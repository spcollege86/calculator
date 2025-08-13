const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    database: process.env.DB_NAME || 'cross_border_calculator',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
    },
    timezone: '+08:00' // 设置时区为中国标准时间
});

// 数据库连接测试
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('数据库连接测试成功');
    } catch (error) {
        console.error('数据库连接失败:', error);
        throw error;
    }
};

module.exports = {
    sequelize,
    testConnection
}; 