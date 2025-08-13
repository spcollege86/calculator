const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Calculation = require('./Calculation');
const ExchangeRate = require('./ExchangeRate');

// 定义模型关联关系
const initializeAssociations = () => {
    // 用户和产品的关系
    User.hasMany(Product, {
        foreignKey: 'user_id',
        as: 'products',
        onDelete: 'CASCADE'
    });
    
    Product.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // 用户和计算记录的关系
    User.hasMany(Calculation, {
        foreignKey: 'user_id',
        as: 'calculations',
        onDelete: 'CASCADE'
    });
    
    Calculation.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // 产品和计算记录的关系
    Product.hasMany(Calculation, {
        foreignKey: 'product_id',
        as: 'calculations',
        onDelete: 'SET NULL'
    });
    
    Calculation.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    console.log('模型关联关系初始化完成');
};

// 同步数据库
const syncDatabase = async (options = {}) => {
    try {
        const { force = false, alter = false } = options;
        
        await sequelize.sync({ force, alter });
        
        // 初始化默认汇率数据
        if (force || alter) {
            await ExchangeRate.initializeDefaultRates();
        }
        
        console.log('数据库同步完成');
    } catch (error) {
        console.error('数据库同步失败:', error);
        throw error;
    }
};

module.exports = {
    sequelize,
    User,
    Product,
    Calculation,
    ExchangeRate,
    initializeAssociations,
    syncDatabase
}; 