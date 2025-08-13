const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Calculation, Product } = require('../models');
const CalculationService = require('../services/calculationService');
const { asyncHandler, ErrorResponses } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// 实时计算利润（不保存）
router.post('/calculate', [
    body('purchase_data').isObject().withMessage('采购数据格式错误'),
    body('purchase_data.currency').notEmpty().withMessage('采购币种不能为空'),
    body('purchase_data.quantity').isFloat({ min: 0.01 }).withMessage('采购数量必须大于0'),
    body('purchase_data.unit_price').isFloat({ min: 0.01 }).withMessage('采购单价必须大于0'),
    body('selling_data').isObject().withMessage('销售数据格式错误'),
    body('selling_data.currency').notEmpty().withMessage('销售币种不能为空'),
    body('selling_data.unit_price').isFloat({ min: 0.01 }).withMessage('销售单价必须大于0'),
    body('target_profit_rate').optional().isFloat({ min: 0, max: 90 }).withMessage('目标利润率应在0-90之间')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { purchase_data, selling_data, target_profit_rate = 15 } = req.body;

    // 执行利润计算
    const result = await CalculationService.calculateProfit(
        purchase_data,
        selling_data,
        target_profit_rate
    );

    logger.calculation(`实时计算完成 - 用户: ${req.user.username}`, {
        profit: result.results.total_profit_cny,
        profitRate: result.results.profit_rate
    });

    res.json({
        success: true,
        data: result
    });
}));

// 保存计算记录
router.post('/save', [
    body('product_name').notEmpty().withMessage('产品名称不能为空'),
    body('purchase_data').isObject().withMessage('采购数据格式错误'),
    body('selling_data').isObject().withMessage('销售数据格式错误'),
    body('results').isObject().withMessage('计算结果格式错误'),
    body('product_id').optional().isInt().withMessage('产品ID格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const {
        product_id,
        product_name,
        purchase_data,
        selling_data,
        cost_breakdown,
        results,
        target_profit_rate,
        notes,
        tags
    } = req.body;

    // 验证产品是否属于当前用户（如果指定了产品ID）
    if (product_id) {
        const product = await Product.findOne({
            where: {
                id: product_id,
                user_id: req.user.id
            }
        });
        
        if (!product) {
            throw ErrorResponses.NOT_FOUND('产品不存在或无权限');
        }

        // 更新产品统计
        await product.updateStats(results.profit_rate);
    }

    // 创建计算记录
    const calculation = await Calculation.create({
        user_id: req.user.id,
        product_id: product_id || null,
        product_name,
        purchase_data,
        selling_data,
        cost_breakdown,
        results,
        target_profit_rate,
        notes,
        tags,
        is_saved: true,
        calculation_version: '1.0'
    });

    logger.calculation(`计算记录保存成功 - 用户: ${req.user.username}`, {
        calculationId: calculation.id,
        productName: product_name
    });

    res.status(201).json({
        success: true,
        message: '计算记录保存成功',
        data: calculation.toJSON()
    });
}));

// 获取计算历史记录
router.get('/history', [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须为正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页条数应在1-100之间'),
    query('product_id').optional().isInt().withMessage('产品ID格式错误'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式错误'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const {
        page = 1,
        limit = 20,
        product_id,
        start_date,
        end_date
    } = req.query;

    const offset = (page - 1) * limit;

    const options = {
        product_id,
        start_date,
        end_date,
        limit: parseInt(limit),
        offset,
        is_saved: true
    };

    const { rows: calculations, count } = await Calculation.findByUser(req.user.id, options);

    res.json({
        success: true,
        data: {
            calculations: calculations.map(calc => calc.toJSON()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        }
    });
}));

// 获取单个计算记录详情
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const calculation = await Calculation.findOne({
        where: {
            id,
            user_id: req.user.id,
            is_saved: true
        },
        include: [
            {
                model: Product,
                as: 'product',
                required: false,
                attributes: ['id', 'name', 'category', 'supplier']
            }
        ]
    });

    if (!calculation) {
        throw ErrorResponses.NOT_FOUND('计算记录不存在');
    }

    res.json({
        success: true,
        data: calculation.toJSON()
    });
}));

// 删除计算记录
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const calculation = await Calculation.findOne({
        where: {
            id,
            user_id: req.user.id
        }
    });

    if (!calculation) {
        throw ErrorResponses.NOT_FOUND('计算记录不存在');
    }

    await calculation.destroy();

    logger.calculation(`计算记录删除 - 用户: ${req.user.username}`, {
        calculationId: id
    });

    res.json({
        success: true,
        message: '计算记录删除成功'
    });
}));

// 更新计算记录
router.put('/:id', [
    body('product_name').optional().notEmpty().withMessage('产品名称不能为空'),
    body('notes').optional().isString().withMessage('备注必须为字符串'),
    body('tags').optional().isArray().withMessage('标签必须为数组')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { id } = req.params;
    const { product_name, notes, tags } = req.body;

    const calculation = await Calculation.findOne({
        where: {
            id,
            user_id: req.user.id
        }
    });

    if (!calculation) {
        throw ErrorResponses.NOT_FOUND('计算记录不存在');
    }

    // 更新记录
    const updateData = {};
    if (product_name) updateData.product_name = product_name;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;

    await calculation.update(updateData);

    logger.calculation(`计算记录更新 - 用户: ${req.user.username}`, {
        calculationId: id
    });

    res.json({
        success: true,
        message: '计算记录更新成功',
        data: calculation.toJSON()
    });
}));

// 获取用户的计算统计
router.get('/stats/summary', [
    query('start_date').optional().isISO8601().withMessage('开始日期格式错误'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { start_date, end_date } = req.query;

    const stats = await Calculation.getStatsByUser(req.user.id, {
        start_date,
        end_date
    });

    res.json({
        success: true,
        data: stats
    });
}));

// 批量计算利润（用于产品对比）
router.post('/batch-calculate', [
    body('calculations').isArray({ min: 1 }).withMessage('计算列表不能为空'),
    body('calculations.*.purchase_data').isObject().withMessage('采购数据格式错误'),
    body('calculations.*.selling_data').isObject().withMessage('销售数据格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { calculations } = req.body;

    // 限制批量计算数量
    if (calculations.length > 10) {
        throw ErrorResponses.BUSINESS_ERROR('批量计算数量不能超过10个');
    }

    const results = await CalculationService.batchCalculateProfit(calculations);

    logger.calculation(`批量计算完成 - 用户: ${req.user.username}`, {
        count: calculations.length
    });

    res.json({
        success: true,
        data: results
    });
}));

// 导出计算记录到CSV
router.get('/export/csv', [
    query('start_date').optional().isISO8601().withMessage('开始日期格式错误'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式错误'),
    query('product_id').optional().isInt().withMessage('产品ID格式错误')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { start_date, end_date, product_id } = req.query;

    const { rows: calculations } = await Calculation.findByUser(req.user.id, {
        start_date,
        end_date,
        product_id,
        is_saved: true,
        limit: 1000, // 限制导出数量
        offset: 0
    });

    // 生成CSV数据
    const csvHeader = [
        '产品名称', '采购数量', '采购单价', '采购币种', '销售单价', '销售币种',
        '总利润(元)', '利润率(%)', '每件利润(元)', '计算时间'
    ];

    const csvRows = calculations.map(calc => {
        const purchaseData = calc.purchase_data;
        const sellingData = calc.selling_data;
        const results = calc.results;
        
        return [
            calc.product_name,
            purchaseData.quantity,
            purchaseData.unit_price,
            purchaseData.currency,
            sellingData.unit_price,
            sellingData.currency,
            results.total_profit_cny,
            results.profit_rate,
            results.profit_per_unit,
            new Date(calc.created_at).toLocaleString('zh-CN')
        ];
    });

    // 构建CSV内容
    const csvContent = [csvHeader, ...csvRows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="profit_calculations.csv"');
    
    // 添加BOM以支持Excel正确显示中文
    res.write('\ufeff');
    res.write(csvContent);
    res.end();

    logger.calculation(`计算记录导出 - 用户: ${req.user.username}`, {
        count: calculations.length
    });
}));

module.exports = router; 