const express = require('express');
const { body, validationResult } = require('express-validator');
const { ExchangeRate } = require('../models');
const CronJobService = require('../services/cronJobs');
const { asyncHandler, ErrorResponses } = require('../middleware/errorHandler');
const { optionalAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取所有汇率（公开接口，支持可选认证）
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const rates = await ExchangeRate.getAllRates();
    const currencies = ExchangeRate.getCurrencyList();

    res.json({
        success: true,
        data: {
            rates,
            currencies
        }
    });
}));

// 获取指定货币对的汇率（公开接口）
router.get('/:fromCurrency/:toCurrency', asyncHandler(async (req, res) => {
    const { fromCurrency, toCurrency } = req.params;

    // 验证货币代码格式
    const currencyCodes = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'];
    if (!currencyCodes.includes(fromCurrency.toUpperCase()) || 
        !currencyCodes.includes(toCurrency.toUpperCase())) {
        throw ErrorResponses.VALIDATION_FAILED('不支持的货币代码');
    }

    try {
        const rate = await ExchangeRate.getRate(fromCurrency, toCurrency);
        
        res.json({
            success: true,
            data: {
                from_currency: fromCurrency.toUpperCase(),
                to_currency: toCurrency.toUpperCase(),
                rate,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        throw ErrorResponses.NOT_FOUND(error.message);
    }
}));

// 货币转换（公开接口）
router.post('/convert', [
    body('amount').isFloat({ min: 0 }).withMessage('金额必须为非负数'),
    body('from_currency').notEmpty().withMessage('源货币不能为空'),
    body('to_currency').notEmpty().withMessage('目标货币不能为空')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { amount, from_currency, to_currency } = req.body;

    try {
        const convertedAmount = await ExchangeRate.convert(amount, from_currency, to_currency);
        const rate = await ExchangeRate.getRate(from_currency, to_currency);

        res.json({
            success: true,
            data: {
                original_amount: amount,
                converted_amount: Math.round(convertedAmount * 100) / 100,
                from_currency: from_currency.toUpperCase(),
                to_currency: to_currency.toUpperCase(),
                rate,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        throw ErrorResponses.BUSINESS_ERROR(error.message);
    }
}));

// 手动更新汇率（管理员权限）
router.post('/update', [
    requireAdmin,
    body('rates').isObject().withMessage('汇率数据格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { rates } = req.body;
    const updatedRates = [];

    for (const [pair, rate] of Object.entries(rates)) {
        if (typeof rate !== 'number' || rate <= 0) {
            continue;
        }

        const [fromCurrency, toCurrency] = pair.split('_');
        if (fromCurrency && toCurrency) {
            try {
                const exchangeRate = await ExchangeRate.setRate(
                    fromCurrency, 
                    toCurrency, 
                    rate, 
                    'manual'
                );
                updatedRates.push({
                    pair,
                    rate,
                    success: true
                });
            } catch (error) {
                updatedRates.push({
                    pair,
                    rate,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    logger.exchange(`管理员手动更新汇率 - 用户: ${req.user.username}`, {
        updatedCount: updatedRates.filter(r => r.success).length,
        failedCount: updatedRates.filter(r => !r.success).length
    });

    res.json({
        success: true,
        message: '汇率更新完成',
        data: updatedRates
    });
}));

// 设置单个汇率（管理员权限）
router.post('/set-rate', [
    requireAdmin,
    body('from_currency').isIn(['CNY', 'USD', 'EUR', 'GBP', 'JPY']).withMessage('源货币代码无效'),
    body('to_currency').isIn(['CNY', 'USD', 'EUR', 'GBP', 'JPY']).withMessage('目标货币代码无效'),
    body('rate').isFloat({ min: 0.000001 }).withMessage('汇率必须为正数')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { from_currency, to_currency, rate } = req.body;

    if (from_currency === to_currency) {
        throw ErrorResponses.VALIDATION_FAILED('源货币和目标货币不能相同');
    }

    const exchangeRate = await ExchangeRate.setRate(from_currency, to_currency, rate, 'manual');

    logger.exchange(`管理员设置汇率 - 用户: ${req.user.username}`, {
        pair: `${from_currency}_${to_currency}`,
        rate
    });

    res.json({
        success: true,
        message: '汇率设置成功',
        data: {
            from_currency,
            to_currency,
            rate,
            source: 'manual'
        }
    });
}));

// 触发汇率更新任务（管理员权限）
router.post('/refresh', requireAdmin, asyncHandler(async (req, res) => {
    try {
        await CronJobService.manualUpdateRates();
        
        logger.exchange(`管理员触发汇率更新 - 用户: ${req.user.username}`);
        
        res.json({
            success: true,
            message: '汇率更新任务已触发'
        });
    } catch (error) {
        throw ErrorResponses.INTERNAL_ERROR('汇率更新任务执行失败');
    }
}));

// 获取汇率历史记录（管理员权限）
router.get('/history', requireAdmin, asyncHandler(async (req, res) => {
    const history = await ExchangeRate.findAll({
        order: [['last_updated_at', 'DESC']],
        limit: 100
    });

    res.json({
        success: true,
        data: history.map(rate => ({
            from_currency: rate.from_currency,
            to_currency: rate.to_currency,
            rate: parseFloat(rate.rate),
            source: rate.source,
            last_updated_at: rate.last_updated_at,
            is_active: rate.is_active
        }))
    });
}));

// 重置为默认汇率（管理员权限）
router.post('/reset-defaults', requireAdmin, asyncHandler(async (req, res) => {
    const defaultRates = ExchangeRate.getDefaultRates();
    const resetResults = [];

    for (const [pair, rate] of Object.entries(defaultRates)) {
        const [fromCurrency, toCurrency] = pair.split('_');
        try {
            await ExchangeRate.setRate(fromCurrency, toCurrency, rate, 'default');
            resetResults.push({
                pair,
                rate,
                success: true
            });
        } catch (error) {
            resetResults.push({
                pair,
                rate,
                success: false,
                error: error.message
            });
        }
    }

    logger.exchange(`管理员重置默认汇率 - 用户: ${req.user.username}`, {
        resetCount: resetResults.filter(r => r.success).length
    });

    res.json({
        success: true,
        message: '默认汇率重置完成',
        data: resetResults
    });
}));

// 获取支持的货币列表（公开接口）
router.get('/meta/currencies', asyncHandler(async (req, res) => {
    const currencies = ExchangeRate.getCurrencyList();

    res.json({
        success: true,
        data: currencies
    });
}));

// 批量货币转换（公开接口）
router.post('/batch-convert', [
    body('conversions').isArray({ min: 1, max: 10 }).withMessage('转换列表应包含1-10项'),
    body('conversions.*.amount').isFloat({ min: 0 }).withMessage('金额必须为非负数'),
    body('conversions.*.from_currency').notEmpty().withMessage('源货币不能为空'),
    body('conversions.*.to_currency').notEmpty().withMessage('目标货币不能为空')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { conversions } = req.body;
    const results = [];

    for (const conversion of conversions) {
        try {
            const { amount, from_currency, to_currency } = conversion;
            const convertedAmount = await ExchangeRate.convert(amount, from_currency, to_currency);
            const rate = await ExchangeRate.getRate(from_currency, to_currency);

            results.push({
                original_amount: amount,
                converted_amount: Math.round(convertedAmount * 100) / 100,
                from_currency: from_currency.toUpperCase(),
                to_currency: to_currency.toUpperCase(),
                rate,
                success: true
            });
        } catch (error) {
            results.push({
                ...conversion,
                success: false,
                error: error.message
            });
        }
    }

    res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
    });
}));

module.exports = router; 