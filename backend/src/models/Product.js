const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            len: [1, 200],
            notEmpty: true
        }
    },
    category: {
        type: DataTypes.ENUM(
            'electronics', 
            'home', 
            'fashion', 
            'beauty', 
            'toys', 
            'sports',
            'automotive',
            'books',
            'health',
            'other'
        ),
        allowNull: false,
        defaultValue: 'other'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    weight: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: true,
        validate: {
            min: 0
        },
        comment: '产品重量(kg)'
    },
    dimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            length: null,
            width: null,
            height: null,
            unit: 'cm'
        },
        comment: '产品尺寸(长宽高)'
    },
    supplier: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '供应商名称'
    },
    supplier_info: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: '供应商详细信息'
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'SKU编码'
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: '产品图片URLs'
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: '产品标签'
    },
    default_purchase_currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'CNY',
        validate: {
            isIn: [['CNY', 'USD', 'EUR', 'GBP', 'JPY']]
        }
    },
    default_purchase_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    default_selling_currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'USD',
        validate: {
            isIn: [['CNY', 'USD', 'EUR', 'GBP', 'JPY']]
        }
    },
    default_selling_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    stats: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            total_calculations: 0,
            avg_profit_rate: 0,
            last_calculated_at: null
        },
        comment: '产品统计信息'
    }
}, {
    tableName: 'products',
    timestamps: true,
    paranoid: true, // 软删除
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['category']
        },
        {
            fields: ['supplier']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['sku']
        },
        {
            fields: ['created_at']
        }
    ]
});

// 实例方法
Product.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.deleted_at;
    return values;
};

Product.prototype.updateStats = async function(profitRate) {
    const currentStats = this.stats || {
        total_calculations: 0,
        avg_profit_rate: 0,
        last_calculated_at: null
    };
    
    const newTotal = currentStats.total_calculations + 1;
    const newAvgRate = ((currentStats.avg_profit_rate * currentStats.total_calculations) + profitRate) / newTotal;
    
    await this.update({
        stats: {
            total_calculations: newTotal,
            avg_profit_rate: Math.round(newAvgRate * 100) / 100,
            last_calculated_at: new Date()
        }
    });
};

// 类方法
Product.findByUser = async function(userId, options = {}) {
    const {
        category,
        supplier,
        is_active = true,
        limit = 20,
        offset = 0,
        order = [['updated_at', 'DESC']]
    } = options;
    
    const where = { user_id: userId };
    
    if (category && category !== 'all') {
        where.category = category;
    }
    
    if (supplier) {
        where.supplier = supplier;
    }
    
    if (is_active !== null) {
        where.is_active = is_active;
    }
    
    return Product.findAndCountAll({
        where,
        limit,
        offset,
        order
    });
};

Product.getCategories = function() {
    return [
        { value: 'electronics', label: '电子产品' },
        { value: 'home', label: '家居用品' },
        { value: 'fashion', label: '时尚配饰' },
        { value: 'beauty', label: '美妆个护' },
        { value: 'toys', label: '玩具礼品' },
        { value: 'sports', label: '运动户外' },
        { value: 'automotive', label: '汽车用品' },
        { value: 'books', label: '图书文具' },
        { value: 'health', label: '健康保健' },
        { value: 'other', label: '其他类别' }
    ];
};

module.exports = Product; 