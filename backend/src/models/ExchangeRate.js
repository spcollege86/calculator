const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExchangeRate = sequelize.define('ExchangeRate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    from_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        validate: {
            len: [3, 3],
            isUppercase: true,
            isIn: [['CNY', 'USD', 'EUR', 'GBP', 'JPY']]
        }
    },
    to_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        validate: {
            len: [3, 3],
            isUppercase: true,
            isIn: [['CNY', 'USD', 'EUR', 'GBP', 'JPY']]
        }
    },
    rate: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: false,
        validate: {
            min: 0.000001
        },
        comment: '汇率值'
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'manual',
        comment: '汇率来源：manual|api|bank'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    last_updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'exchange_rates',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['from_currency', 'to_currency'],
            name: 'unique_currency_pair'
        },
        {
            fields: ['from_currency']
        },
        {
            fields: ['to_currency']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['last_updated_at']
        }
    ]
});

// 实例方法
ExchangeRate.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
};

ExchangeRate.prototype.isStale = function(maxAgeMinutes = 60) {
    const now = new Date();
    const ageMs = now - new Date(this.last_updated_at);
    const ageMinutes = ageMs / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
};

// 类方法
ExchangeRate.getRate = async function(fromCurrency, toCurrency) {
    // 如果是相同货币，返回1.0
    if (fromCurrency === toCurrency) {
        return 1.0;
    }
    
    const rate = await ExchangeRate.findOne({
        where: {
            from_currency: fromCurrency.toUpperCase(),
            to_currency: toCurrency.toUpperCase(),
            is_active: true
        }
    });
    
    if (!rate) {
        // 尝试反向查询
        const reverseRate = await ExchangeRate.findOne({
            where: {
                from_currency: toCurrency.toUpperCase(),
                to_currency: fromCurrency.toUpperCase(),
                is_active: true
            }
        });
        
        if (reverseRate) {
            return 1 / parseFloat(reverseRate.rate);
        }
        
        throw new Error(`汇率不存在: ${fromCurrency} -> ${toCurrency}`);
    }
    
    return parseFloat(rate.rate);
};

ExchangeRate.setRate = async function(fromCurrency, toCurrency, rate, source = 'manual') {
    const [exchangeRate, created] = await ExchangeRate.upsert({
        from_currency: fromCurrency.toUpperCase(),
        to_currency: toCurrency.toUpperCase(),
        rate: rate,
        source: source,
        last_updated_at: new Date(),
        is_active: true
    });
    
    return exchangeRate;
};

ExchangeRate.getAllRates = async function() {
    const rates = await ExchangeRate.findAll({
        where: {
            is_active: true
        },
        order: [['from_currency', 'ASC'], ['to_currency', 'ASC']]
    });
    
    // 转换为易于使用的格式
    const rateMap = {};
    rates.forEach(rate => {
        const key = `${rate.from_currency}_${rate.to_currency}`;
        rateMap[key] = {
            rate: parseFloat(rate.rate),
            source: rate.source,
            lastUpdated: rate.last_updated_at
        };
    });
    
    return rateMap;
};

ExchangeRate.getDefaultRates = function() {
    return {
        'CNY_USD': 0.138,
        'USD_CNY': 7.25,
        'CNY_EUR': 0.128,
        'EUR_CNY': 7.80,
        'CNY_GBP': 0.111,
        'GBP_CNY': 9.00,
        'CNY_JPY': 20.0,
        'JPY_CNY': 0.05,
        'USD_EUR': 0.925,
        'EUR_USD': 1.081,
        'USD_GBP': 0.804,
        'GBP_USD': 1.244,
        'USD_JPY': 145.0,
        'JPY_USD': 0.0069,
        'EUR_GBP': 0.869,
        'GBP_EUR': 1.151,
        'EUR_JPY': 156.7,
        'JPY_EUR': 0.0064,
        'GBP_JPY': 180.3,
        'JPY_GBP': 0.0055
    };
};

ExchangeRate.initializeDefaultRates = async function() {
    const defaultRates = ExchangeRate.getDefaultRates();
    const promises = [];
    
    for (const [pair, rate] of Object.entries(defaultRates)) {
        const [fromCurrency, toCurrency] = pair.split('_');
        promises.push(
            ExchangeRate.setRate(fromCurrency, toCurrency, rate, 'default')
        );
    }
    
    await Promise.all(promises);
    console.log('默认汇率初始化完成');
};

ExchangeRate.getCurrencyList = function() {
    return [
        { code: 'CNY', name: '人民币', symbol: '¥' },
        { code: 'USD', name: '美元', symbol: '$' },
        { code: 'EUR', name: '欧元', symbol: '€' },
        { code: 'GBP', name: '英镑', symbol: '£' },
        { code: 'JPY', name: '日元', symbol: '¥' }
    ];
};

// 批量转换货币
ExchangeRate.convert = async function(amount, fromCurrency, toCurrency) {
    const rate = await ExchangeRate.getRate(fromCurrency, toCurrency);
    return amount * rate;
};

module.exports = ExchangeRate; 