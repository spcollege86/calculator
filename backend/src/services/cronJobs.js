const cron = require('node-cron');
const axios = require('axios');
const { ExchangeRate } = require('../models');
const logger = require('../utils/logger');

class CronJobService {
    static init() {
        // 每小时更新一次汇率
        cron.schedule('0 * * * *', async () => {
            await this.updateExchangeRates();
        });
        
        // 每天凌晨2点清理过期的临时计算记录
        cron.schedule('0 2 * * *', async () => {
            await this.cleanupTempCalculations();
        });
        
        // 每周一凌晨1点进行数据库优化
        cron.schedule('0 1 * * 1', async () => {
            await this.optimizeDatabase();
        });
        
        logger.info('定时任务初始化完成');
    }
    
    /**
     * 更新汇率数据
     */
    static async updateExchangeRates() {
        try {
            logger.exchange('开始更新汇率数据');
            
            // 尝试从多个汇率API获取数据
            const exchangeRates = await this.fetchExchangeRatesFromAPIs();
            
            if (exchangeRates && Object.keys(exchangeRates).length > 0) {
                // 更新数据库中的汇率
                await this.updateRatesInDatabase(exchangeRates);
                logger.exchange('汇率更新成功', { count: Object.keys(exchangeRates).length });
            } else {
                logger.exchange('未获取到有效汇率数据，使用默认汇率');
            }
            
        } catch (error) {
            logger.logError(error, { context: 'updateExchangeRates' });
        }
    }
    
    /**
     * 从多个API获取汇率数据
     */
    static async fetchExchangeRatesFromAPIs() {
        const apis = [
            {
                name: 'ExchangeRate-API',
                url: 'https://api.exchangerate-api.com/v4/latest/USD',
                parser: (data) => this.parseExchangeRateAPI(data)
            },
            {
                name: 'Fixer.io',
                url: `https://api.fixer.io/latest?access_key=${process.env.FIXER_API_KEY}&base=USD&symbols=CNY,EUR,GBP,JPY`,
                parser: (data) => this.parseFixerAPI(data)
            },
            {
                name: 'CurrencyAPI',
                url: `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_KEY}&currencies=CNY,EUR,GBP,JPY&base_currency=USD`,
                parser: (data) => this.parseCurrencyAPI(data)
            }
        ];
        
        for (const api of apis) {
            try {
                if (api.name === 'Fixer.io' && !process.env.FIXER_API_KEY) continue;
                if (api.name === 'CurrencyAPI' && !process.env.CURRENCY_API_KEY) continue;
                
                const response = await axios.get(api.url, { timeout: 10000 });
                const rates = api.parser(response.data);
                
                if (rates && Object.keys(rates).length > 0) {
                    logger.exchange(`成功从 ${api.name} 获取汇率数据`);
                    return rates;
                }
            } catch (error) {
                logger.exchange(`从 ${api.name} 获取汇率失败: ${error.message}`);
                continue;
            }
        }
        
        // 如果所有API都失败，使用默认汇率
        return this.getDefaultRates();
    }
    
    /**
     * 解析ExchangeRate-API数据
     */
    static parseExchangeRateAPI(data) {
        if (!data || !data.rates) return null;
        
        const rates = {};
        const usdRates = data.rates;
        
        // USD作为基准货币的汇率
        if (usdRates.CNY) rates['USD_CNY'] = usdRates.CNY;
        if (usdRates.EUR) rates['USD_EUR'] = usdRates.EUR;
        if (usdRates.GBP) rates['USD_GBP'] = usdRates.GBP;
        if (usdRates.JPY) rates['USD_JPY'] = usdRates.JPY;
        
        // 计算反向汇率
        Object.keys(rates).forEach(pair => {
            const [from, to] = pair.split('_');
            const reversePair = `${to}_${from}`;
            rates[reversePair] = 1 / rates[pair];
        });
        
        // 计算CNY作为基准的汇率
        if (rates.USD_CNY) {
            const usdToCny = rates.USD_CNY;
            if (rates.USD_EUR) rates['CNY_EUR'] = rates.USD_EUR / usdToCny;
            if (rates.USD_GBP) rates['CNY_GBP'] = rates.USD_GBP / usdToCny;
            if (rates.USD_JPY) rates['CNY_JPY'] = rates.USD_JPY / usdToCny;
        }
        
        return rates;
    }
    
    /**
     * 解析Fixer.io数据
     */
    static parseFixerAPI(data) {
        if (!data || !data.rates) return null;
        
        const rates = {};
        const baseRates = data.rates;
        
        Object.entries(baseRates).forEach(([currency, rate]) => {
            rates[`USD_${currency}`] = rate;
            rates[`${currency}_USD`] = 1 / rate;
        });
        
        return rates;
    }
    
    /**
     * 解析CurrencyAPI数据
     */
    static parseCurrencyAPI(data) {
        if (!data || !data.data) return null;
        
        const rates = {};
        
        Object.entries(data.data).forEach(([currency, info]) => {
            if (info.value) {
                rates[`USD_${currency}`] = info.value;
                rates[`${currency}_USD`] = 1 / info.value;
            }
        });
        
        return rates;
    }
    
    /**
     * 获取默认汇率（API失败时使用）
     */
    static getDefaultRates() {
        return {
            'USD_CNY': 7.25,
            'CNY_USD': 0.138,
            'USD_EUR': 0.925,
            'EUR_USD': 1.081,
            'USD_GBP': 0.804,
            'GBP_USD': 1.244,
            'USD_JPY': 145.0,
            'JPY_USD': 0.0069,
            'CNY_EUR': 0.128,
            'EUR_CNY': 7.80,
            'CNY_GBP': 0.111,
            'GBP_CNY': 9.00,
            'CNY_JPY': 20.0,
            'JPY_CNY': 0.05
        };
    }
    
    /**
     * 更新数据库中的汇率
     */
    static async updateRatesInDatabase(rates) {
        const promises = [];
        
        for (const [pair, rate] of Object.entries(rates)) {
            const [fromCurrency, toCurrency] = pair.split('_');
            if (fromCurrency && toCurrency && rate > 0) {
                promises.push(
                    ExchangeRate.setRate(fromCurrency, toCurrency, rate, 'api')
                );
            }
        }
        
        await Promise.all(promises);
    }
    
    /**
     * 清理过期的临时计算记录
     */
    static async cleanupTempCalculations() {
        try {
            logger.info('开始清理过期的临时计算记录');
            
            const { Calculation } = require('../models');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7); // 7天前
            
            const result = await Calculation.destroy({
                where: {
                    is_saved: false,
                    created_at: {
                        [require('sequelize').Op.lt]: cutoffDate
                    }
                }
            });
            
            logger.info(`清理了 ${result} 条过期的临时计算记录`);
            
        } catch (error) {
            logger.logError(error, { context: 'cleanupTempCalculations' });
        }
    }
    
    /**
     * 数据库优化
     */
    static async optimizeDatabase() {
        try {
            logger.info('开始数据库优化');
            
            const { sequelize } = require('../config/database');
            
            // 分析表
            await sequelize.query('ANALYZE TABLE users, products, calculations, exchange_rates');
            
            // 优化表
            await sequelize.query('OPTIMIZE TABLE users, products, calculations, exchange_rates');
            
            logger.info('数据库优化完成');
            
        } catch (error) {
            logger.logError(error, { context: 'optimizeDatabase' });
        }
    }
    
    /**
     * 手动触发汇率更新
     */
    static async manualUpdateRates() {
        await this.updateExchangeRates();
    }
    
    /**
     * 获取定时任务状态
     */
    static getJobStatus() {
        const tasks = cron.getTasks();
        return {
            totalTasks: tasks.size,
            tasks: Array.from(tasks.entries()).map(([id, task]) => ({
                id,
                running: task.running,
                destroyed: task.destroyed
            }))
        };
    }
}

// 初始化定时任务
CronJobService.init();

module.exports = CronJobService; 