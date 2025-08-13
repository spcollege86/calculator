const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Calculation = sequelize.define('Calculation', {
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
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    product_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '产品名称快照'
    },
    purchase_data: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '采购相关数据',
        defaultValue: {
            currency: 'CNY',
            exchange_rate: 1.0,
            quantity: 0,
            unit_price: 0,
            freight: 0,
            other_costs: 0,
            total_cost_original: 0,
            total_cost_cny: 0
        }
    },
    selling_data: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '销售相关数据',
        defaultValue: {
            currency: 'USD',
            exchange_rate: 7.2,
            unit_price: 0,
            platform_commission_rate: 0,
            international_freight: 0,
            advertising_cost: 0,
            return_rate: 0,
            other_costs: 0,
            total_sales_amount: 0
        }
    },
    cost_breakdown: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '成本分解',
        defaultValue: {
            purchase_cost: 0,
            platform_commission: 0,
            shipping_cost: 0,
            advertising_cost: 0,
            return_loss: 0,
            other_costs: 0,
            total_cost: 0
        }
    },
    results: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '计算结果',
        defaultValue: {
            total_profit_cny: 0,
            total_profit_original: 0,
            profit_rate: 0,
            profit_per_unit: 0,
            break_even_price_original: 0,
            break_even_price_cny: 0,
            recommended_price_original: 0,
            total_sales_amount_cny: 0,
            total_sales_amount_original: 0
        }
    },
    target_profit_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 15.0,
        comment: '目标利润率(%)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注信息'
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: '标签'
    },
    is_saved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: '是否已保存(区分临时计算和正式保存)'
    },
    calculation_version: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '1.0',
        comment: '计算算法版本'
    }
}, {
    tableName: 'calculations',
    timestamps: true,
    paranoid: true, // 软删除
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['is_saved']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['user_id', 'created_at']
        },
        {
            fields: ['user_id', 'is_saved']
        }
    ]
});

// 实例方法
Calculation.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.deleted_at;
    return values;
};

Calculation.prototype.calculateProfitSummary = function() {
    const results = this.results || {};
    const purchaseData = this.purchase_data || {};
    
    return {
        product_name: this.product_name,
        quantity: purchaseData.quantity || 0,
        total_profit: results.total_profit_cny || 0,
        profit_rate: results.profit_rate || 0,
        profit_per_unit: results.profit_per_unit || 0,
        created_at: this.created_at
    };
};

// 类方法
Calculation.findByUser = async function(userId, options = {}) {
    const {
        product_id,
        is_saved = true,
        start_date,
        end_date,
        limit = 20,
        offset = 0,
        order = [['created_at', 'DESC']]
    } = options;
    
    const where = { user_id: userId };
    
    if (product_id) {
        where.product_id = product_id;
    }
    
    if (is_saved !== null) {
        where.is_saved = is_saved;
    }
    
    if (start_date) {
        where.created_at = {
            [sequelize.Sequelize.Op.gte]: start_date
        };
    }
    
    if (end_date) {
        if (where.created_at) {
            where.created_at[sequelize.Sequelize.Op.lte] = end_date;
        } else {
            where.created_at = {
                [sequelize.Sequelize.Op.lte]: end_date
            };
        }
    }
    
    return Calculation.findAndCountAll({
        where,
        limit,
        offset,
        order,
        include: [
            {
                model: sequelize.models.Product,
                as: 'product',
                required: false,
                attributes: ['id', 'name', 'category', 'supplier']
            }
        ]
    });
};

Calculation.getStatsByUser = async function(userId, options = {}) {
    const { start_date, end_date } = options;
    const where = { 
        user_id: userId, 
        is_saved: true 
    };
    
    if (start_date) {
        where.created_at = {
            [sequelize.Sequelize.Op.gte]: start_date
        };
    }
    
    if (end_date) {
        if (where.created_at) {
            where.created_at[sequelize.Sequelize.Op.lte] = end_date;
        } else {
            where.created_at = {
                [sequelize.Sequelize.Op.lte]: end_date
            };
        }
    }
    
    const calculations = await Calculation.findAll({
        where,
        attributes: ['results', 'purchase_data', 'created_at']
    });
    
    if (calculations.length === 0) {
        return {
            total_calculations: 0,
            total_profit: 0,
            avg_profit_rate: 0,
            profitable_count: 0,
            loss_count: 0
        };
    }
    
    let totalProfit = 0;
    let totalProfitRate = 0;
    let profitableCount = 0;
    let lossCount = 0;
    
    calculations.forEach(calc => {
        const profit = calc.results?.total_profit_cny || 0;
        const profitRate = calc.results?.profit_rate || 0;
        
        totalProfit += profit;
        totalProfitRate += profitRate;
        
        if (profit > 0) {
            profitableCount++;
        } else if (profit < 0) {
            lossCount++;
        }
    });
    
    return {
        total_calculations: calculations.length,
        total_profit: Math.round(totalProfit * 100) / 100,
        avg_profit_rate: Math.round((totalProfitRate / calculations.length) * 100) / 100,
        profitable_count: profitableCount,
        loss_count: lossCount,
        break_even_count: calculations.length - profitableCount - lossCount
    };
};

module.exports = Calculation; 