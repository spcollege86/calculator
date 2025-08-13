const { ExchangeRate } = require('../models');
const logger = require('../utils/logger');
const { BusinessError } = require('../middleware/errorHandler');

class CalculationService {
    /**
     * 计算利润的主要方法
     * @param {Object} purchaseData - 采购数据
     * @param {Object} sellingData - 销售数据
     * @param {number} targetProfitRate - 目标利润率（可选）
     * @returns {Object} 计算结果
     */
    static async calculateProfit(purchaseData, sellingData, targetProfitRate = 15) {
        try {
            // 验证输入数据
            this.validateInputData(purchaseData, sellingData);
            
            // 获取汇率
            const purchaseRate = await ExchangeRate.getRate(purchaseData.currency, 'CNY');
            const sellingRate = await ExchangeRate.getRate(sellingData.currency, 'CNY');
            
            // 计算采购成本（转换为人民币）
            const purchaseCosts = this.calculatePurchaseCosts(purchaseData, purchaseRate);
            
            // 计算销售金额和各项费用（转换为人民币）
            const sellingAmounts = this.calculateSellingAmounts(sellingData, sellingRate, purchaseData.quantity);
            
            // 计算成本分解
            const costBreakdown = this.calculateCostBreakdown(purchaseCosts, sellingAmounts, sellingData);
            
            // 计算利润结果
            const results = this.calculateResults(
                purchaseCosts,
                sellingAmounts,
                costBreakdown,
                purchaseData.quantity,
                sellingRate
            );
            
            // 计算建议价格
            const priceRecommendations = this.calculateRecommendedPrices(
                purchaseCosts,
                sellingData,
                sellingRate,
                purchaseData.quantity,
                targetProfitRate
            );
            
            // 生成利润建议
            const suggestions = this.generateProfitSuggestions(results, costBreakdown, sellingData);
            
            const calculationResult = {
                purchase_data: {
                    ...purchaseData,
                    exchange_rate: purchaseRate,
                    total_cost_original: purchaseCosts.totalOriginal,
                    total_cost_cny: purchaseCosts.totalCNY
                },
                selling_data: {
                    ...sellingData,
                    exchange_rate: sellingRate,
                    total_sales_amount: sellingAmounts.totalSalesAmountCNY
                },
                cost_breakdown: costBreakdown,
                results: {
                    ...results,
                    ...priceRecommendations
                },
                suggestions,
                calculation_version: '1.0',
                calculated_at: new Date().toISOString()
            };
            
            logger.calculation('利润计算完成', { 
                profitCNY: results.total_profit_cny,
                profitRate: results.profit_rate 
            });
            
            return calculationResult;
            
        } catch (error) {
            logger.logError(error, { context: 'calculateProfit', purchaseData, sellingData });
            throw error;
        }
    }
    
    /**
     * 验证输入数据
     */
    static validateInputData(purchaseData, sellingData) {
        // 采购数据验证
        if (!purchaseData.quantity || purchaseData.quantity <= 0) {
            throw new BusinessError('采购数量必须大于0');
        }
        if (!purchaseData.unit_price || purchaseData.unit_price <= 0) {
            throw new BusinessError('采购单价必须大于0');
        }
        if (!purchaseData.currency) {
            throw new BusinessError('采购币种不能为空');
        }
        
        // 销售数据验证
        if (!sellingData.unit_price || sellingData.unit_price <= 0) {
            throw new BusinessError('销售单价必须大于0');
        }
        if (!sellingData.currency) {
            throw new BusinessError('销售币种不能为空');
        }
        if (sellingData.platform_commission_rate < 0 || sellingData.platform_commission_rate > 100) {
            throw new BusinessError('平台佣金率必须在0-100之间');
        }
        if (sellingData.return_rate < 0 || sellingData.return_rate > 100) {
            throw new BusinessError('退货率必须在0-100之间');
        }
    }
    
    /**
     * 计算采购成本
     */
    static calculatePurchaseCosts(purchaseData, exchangeRate) {
        const {
            quantity,
            unit_price,
            freight = 0,
            other_costs = 0
        } = purchaseData;
        
        // 原币种总成本
        const totalOriginal = quantity * unit_price + freight + other_costs;
        
        // 转换为人民币
        const totalCNY = totalOriginal * exchangeRate;
        
        return {
            totalOriginal,
            totalCNY,
            unitCostOriginal: unit_price,
            unitCostCNY: unit_price * exchangeRate,
            freight: freight * exchangeRate,
            otherCosts: other_costs * exchangeRate
        };
    }
    
    /**
     * 计算销售金额和费用
     */
    static calculateSellingAmounts(sellingData, exchangeRate, quantity) {
        const {
            unit_price,
            international_freight = 0,
            advertising_cost = 0,
            other_costs = 0
        } = sellingData;
        
        // 总销售金额（人民币）
        const totalSalesAmountCNY = quantity * unit_price * exchangeRate;
        
        // 各项费用（人民币）
        const totalShippingCost = quantity * international_freight * exchangeRate;
        const totalAdvertisingCost = quantity * advertising_cost * exchangeRate;
        const totalOtherCosts = other_costs * exchangeRate;
        
        return {
            totalSalesAmountCNY,
            totalSalesAmountOriginal: quantity * unit_price,
            unitPriceCNY: unit_price * exchangeRate,
            totalShippingCost,
            totalAdvertisingCost,
            totalOtherCosts
        };
    }
    
    /**
     * 计算成本分解
     */
    static calculateCostBreakdown(purchaseCosts, sellingAmounts, sellingData) {
        const { platform_commission_rate = 0, return_rate = 0 } = sellingData;
        
        // 平台佣金
        const platformCommission = sellingAmounts.totalSalesAmountCNY * (platform_commission_rate / 100);
        
        // 退货损失
        const returnLoss = sellingAmounts.totalSalesAmountCNY * (return_rate / 100);
        
        // 总成本
        const totalCost = purchaseCosts.totalCNY + 
                         platformCommission + 
                         sellingAmounts.totalShippingCost + 
                         sellingAmounts.totalAdvertisingCost + 
                         returnLoss + 
                         sellingAmounts.totalOtherCosts;
        
        return {
            purchase_cost: purchaseCosts.totalCNY,
            platform_commission: platformCommission,
            shipping_cost: sellingAmounts.totalShippingCost,
            advertising_cost: sellingAmounts.totalAdvertisingCost,
            return_loss: returnLoss,
            other_costs: sellingAmounts.totalOtherCosts,
            total_cost: totalCost
        };
    }
    
    /**
     * 计算利润结果
     */
    static calculateResults(purchaseCosts, sellingAmounts, costBreakdown, quantity, sellingRate) {
        // 总利润（人民币）
        const totalProfitCNY = sellingAmounts.totalSalesAmountCNY - costBreakdown.total_cost;
        
        // 总利润（原币种）
        const totalProfitOriginal = totalProfitCNY / sellingRate;
        
        // 利润率
        const profitRate = sellingAmounts.totalSalesAmountCNY > 0 
            ? (totalProfitCNY / sellingAmounts.totalSalesAmountCNY) * 100 
            : 0;
        
        // 每件利润
        const profitPerUnit = quantity > 0 ? totalProfitCNY / quantity : 0;
        
        return {
            total_profit_cny: Math.round(totalProfitCNY * 100) / 100,
            total_profit_original: Math.round(totalProfitOriginal * 100) / 100,
            profit_rate: Math.round(profitRate * 100) / 100,
            profit_per_unit: Math.round(profitPerUnit * 100) / 100,
            total_sales_amount_cny: Math.round(sellingAmounts.totalSalesAmountCNY * 100) / 100,
            total_sales_amount_original: Math.round(sellingAmounts.totalSalesAmountOriginal * 100) / 100
        };
    }
    
    /**
     * 计算建议价格
     */
    static calculateRecommendedPrices(purchaseCosts, sellingData, sellingRate, quantity, targetProfitRate) {
        const {
            platform_commission_rate = 0,
            return_rate = 0,
            international_freight = 0,
            advertising_cost = 0,
            other_costs = 0
        } = sellingData;
        
        // 固定成本（人民币）
        const fixedCostsCNY = purchaseCosts.totalCNY + 
                             quantity * (international_freight + advertising_cost) * sellingRate + 
                             other_costs * sellingRate;
        
        // 保本售价计算
        const denomBreakEven = quantity * sellingRate * (1 - (platform_commission_rate / 100) - (return_rate / 100));
        const breakEvenPriceOriginal = denomBreakEven > 0 ? fixedCostsCNY / denomBreakEven : 0;
        const breakEvenPriceCNY = breakEvenPriceOriginal * sellingRate;
        
        // 目标利润率售价计算
        const targetRate = targetProfitRate / 100;
        const denomTarget = quantity * sellingRate * (1 - (platform_commission_rate / 100) - (return_rate / 100) - targetRate);
        const recommendedPriceOriginal = denomTarget > 0 ? fixedCostsCNY / denomTarget : 0;
        
        return {
            break_even_price_original: Math.round(breakEvenPriceOriginal * 100) / 100,
            break_even_price_cny: Math.round(breakEvenPriceCNY * 100) / 100,
            recommended_price_original: Math.round(recommendedPriceOriginal * 100) / 100
        };
    }
    
    /**
     * 生成利润建议
     */
    static generateProfitSuggestions(results, costBreakdown, sellingData) {
        const suggestions = [];
        const { profit_rate, total_profit_cny } = results;
        
        // 基于利润率的建议
        if (total_profit_cny < 0) {
            suggestions.push({
                type: 'warning',
                icon: 'exclamation-circle',
                message: '当前交易预计亏损，建议提高售价或降低采购成本'
            });
        } else if (profit_rate < 10) {
            suggestions.push({
                type: 'info',
                icon: 'info-circle',
                message: '利润率较低（<10%），建议优化成本结构'
            });
        } else if (profit_rate < 20) {
            suggestions.push({
                type: 'success',
                icon: 'check-circle',
                message: '利润率良好（10%-20%），可维持当前策略'
            });
        } else {
            suggestions.push({
                type: 'success',
                icon: 'star',
                message: '利润率优秀（>20%），建议考虑增加推广力度'
            });
        }
        
        // 基于成本结构的建议
        const totalCost = costBreakdown.total_cost;
        
        // 平台佣金建议
        if (costBreakdown.platform_commission / totalCost > 0.15) {
            suggestions.push({
                type: 'tip',
                icon: 'lightbulb-o',
                message: '平台佣金占比较高（>15%），可尝试通过平台活动降低佣金比例'
            });
        }
        
        // 运费建议
        if (costBreakdown.shipping_cost / totalCost > 0.20) {
            suggestions.push({
                type: 'tip',
                icon: 'lightbulb-o',
                message: '运费占比过高（>20%），可考虑优化物流方案或提高售价'
            });
        }
        
        // 广告费建议
        if (costBreakdown.advertising_cost / totalCost > 0.15) {
            suggestions.push({
                type: 'tip',
                icon: 'lightbulb-o',
                message: '广告成本占比较高（>15%），可优化广告投放策略提高ROI'
            });
        }
        
        // 退货率建议
        if (sellingData.return_rate > 5) {
            suggestions.push({
                type: 'warning',
                icon: 'exclamation-triangle',
                message: '退货率较高（>5%），建议提高产品质量或完善产品描述'
            });
        }
        
        return suggestions;
    }
    
    /**
     * 批量计算利润（用于产品对比分析）
     */
    static async batchCalculateProfit(calculationList) {
        const results = [];
        
        for (const calc of calculationList) {
            try {
                const result = await this.calculateProfit(
                    calc.purchaseData,
                    calc.sellingData,
                    calc.targetProfitRate
                );
                results.push({
                    ...calc,
                    result,
                    success: true
                });
            } catch (error) {
                results.push({
                    ...calc,
                    error: error.message,
                    success: false
                });
            }
        }
        
        return results;
    }
}

module.exports = CalculationService; 