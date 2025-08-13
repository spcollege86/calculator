const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Product } = require('../models');
const { asyncHandler, ErrorResponses } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// 获取产品列表
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须为正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页条数应在1-100之间'),
    query('category').optional().isString().withMessage('分类格式错误'),
    query('supplier').optional().isString().withMessage('供应商格式错误'),
    query('search').optional().isString().withMessage('搜索关键词格式错误')
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
        category,
        supplier,
        search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { user_id: req.user.id };

    // 添加搜索条件
    if (category && category !== 'all') {
        where.category = category;
    }

    if (supplier) {
        where.supplier = supplier;
    }

    if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
            { sku: { [Op.like]: `%${search}%` } }
        ];
    }

    const { rows: products, count } = await Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['updated_at', 'DESC']]
    });

    res.json({
        success: true,
        data: {
            products: products.map(product => product.toJSON()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        }
    });
}));

// 获取单个产品详情
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findOne({
        where: {
            id,
            user_id: req.user.id
        }
    });

    if (!product) {
        throw ErrorResponses.NOT_FOUND('产品不存在');
    }

    res.json({
        success: true,
        data: product.toJSON()
    });
}));

// 创建产品
router.post('/', [
    body('name').notEmpty().isLength({ max: 200 }).withMessage('产品名称不能为空且不超过200字符'),
    body('category').isIn([
        'electronics', 'home', 'fashion', 'beauty', 'toys', 
        'sports', 'automotive', 'books', 'health', 'other'
    ]).withMessage('产品类别无效'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('产品重量必须为非负数'),
    body('supplier').optional().isLength({ max: 100 }).withMessage('供应商名称不能超过100字符'),
    body('sku').optional().isLength({ max: 100 }).withMessage('SKU不能超过100字符'),
    body('default_purchase_price').optional().isFloat({ min: 0 }).withMessage('默认采购价格必须为非负数'),
    body('default_selling_price').optional().isFloat({ min: 0 }).withMessage('默认销售价格必须为非负数')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const {
        name,
        category,
        description,
        weight,
        dimensions,
        supplier,
        supplier_info,
        sku,
        images,
        tags,
        default_purchase_currency,
        default_purchase_price,
        default_selling_currency,
        default_selling_price
    } = req.body;

    // 检查SKU是否重复（如果提供）
    if (sku) {
        const existingProduct = await Product.findOne({
            where: {
                user_id: req.user.id,
                sku
            }
        });

        if (existingProduct) {
            throw ErrorResponses.BUSINESS_ERROR('SKU已存在');
        }
    }

    const product = await Product.create({
        user_id: req.user.id,
        name,
        category,
        description,
        weight,
        dimensions,
        supplier,
        supplier_info,
        sku,
        images,
        tags,
        default_purchase_currency,
        default_purchase_price,
        default_selling_currency,
        default_selling_price,
        stats: {
            total_calculations: 0,
            avg_profit_rate: 0,
            last_calculated_at: null
        }
    });

    logger.info(`产品创建成功 - 用户: ${req.user.username}`, {
        productId: product.id,
        productName: name
    });

    res.status(201).json({
        success: true,
        message: '产品创建成功',
        data: product.toJSON()
    });
}));

// 更新产品
router.put('/:id', [
    body('name').optional().notEmpty().isLength({ max: 200 }).withMessage('产品名称不能为空且不超过200字符'),
    body('category').optional().isIn([
        'electronics', 'home', 'fashion', 'beauty', 'toys', 
        'sports', 'automotive', 'books', 'health', 'other'
    ]).withMessage('产品类别无效'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('产品重量必须为非负数'),
    body('supplier').optional().isLength({ max: 100 }).withMessage('供应商名称不能超过100字符'),
    body('sku').optional().isLength({ max: 100 }).withMessage('SKU不能超过100字符'),
    body('default_purchase_price').optional().isFloat({ min: 0 }).withMessage('默认采购价格必须为非负数'),
    body('default_selling_price').optional().isFloat({ min: 0 }).withMessage('默认销售价格必须为非负数')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findOne({
        where: {
            id,
            user_id: req.user.id
        }
    });

    if (!product) {
        throw ErrorResponses.NOT_FOUND('产品不存在');
    }

    // 检查SKU是否重复（如果更新SKU）
    if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await Product.findOne({
            where: {
                user_id: req.user.id,
                sku: updateData.sku
            }
        });

        if (existingProduct) {
            throw ErrorResponses.BUSINESS_ERROR('SKU已存在');
        }
    }

    await product.update(updateData);

    logger.info(`产品更新成功 - 用户: ${req.user.username}`, {
        productId: id,
        productName: product.name
    });

    res.json({
        success: true,
        message: '产品更新成功',
        data: product.toJSON()
    });
}));

// 删除产品
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findOne({
        where: {
            id,
            user_id: req.user.id
        }
    });

    if (!product) {
        throw ErrorResponses.NOT_FOUND('产品不存在');
    }

    await product.destroy();

    logger.info(`产品删除成功 - 用户: ${req.user.username}`, {
        productId: id,
        productName: product.name
    });

    res.json({
        success: true,
        message: '产品删除成功'
    });
}));

// 获取产品分类列表
router.get('/meta/categories', asyncHandler(async (req, res) => {
    const categories = Product.getCategories();

    res.json({
        success: true,
        data: categories
    });
}));

// 获取用户的供应商列表
router.get('/meta/suppliers', asyncHandler(async (req, res) => {
    const { Op } = require('sequelize');
    
    const suppliers = await Product.findAll({
        where: {
            user_id: req.user.id,
            supplier: {
                [Op.ne]: null,
                [Op.ne]: ''
            }
        },
        attributes: ['supplier'],
        group: ['supplier'],
        order: [['supplier', 'ASC']]
    });

    const supplierList = suppliers.map(item => item.supplier).filter(Boolean);

    res.json({
        success: true,
        data: supplierList
    });
}));

// 批量导入产品
router.post('/batch-import', [
    body('products').isArray({ min: 1 }).withMessage('产品列表不能为空'),
    body('products.*.name').notEmpty().withMessage('产品名称不能为空')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ErrorResponses.VALIDATION_FAILED(
            errors.array().map(err => err.msg).join(', ')
        );
    }

    const { products } = req.body;

    // 限制批量导入数量
    if (products.length > 50) {
        throw ErrorResponses.BUSINESS_ERROR('批量导入数量不能超过50个');
    }

    const results = [];
    const errors_list = [];

    for (let i = 0; i < products.length; i++) {
        try {
            const productData = {
                ...products[i],
                user_id: req.user.id
            };

            // 检查SKU重复
            if (productData.sku) {
                const existingProduct = await Product.findOne({
                    where: {
                        user_id: req.user.id,
                        sku: productData.sku
                    }
                });

                if (existingProduct) {
                    errors_list.push({
                        index: i + 1,
                        name: productData.name,
                        error: 'SKU已存在'
                    });
                    continue;
                }
            }

            const product = await Product.create(productData);
            results.push({
                index: i + 1,
                id: product.id,
                name: product.name,
                success: true
            });

        } catch (error) {
            errors_list.push({
                index: i + 1,
                name: products[i].name || '未知',
                error: error.message
            });
        }
    }

    logger.info(`批量导入产品完成 - 用户: ${req.user.username}`, {
        total: products.length,
        success: results.length,
        failed: errors_list.length
    });

    res.json({
        success: true,
        message: `批量导入完成，成功: ${results.length}，失败: ${errors_list.length}`,
        data: {
            success_list: results,
            error_list: errors_list
        }
    });
}));

// 复制产品
router.post('/:id/copy', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const originalProduct = await Product.findOne({
        where: {
            id,
            user_id: req.user.id
        }
    });

    if (!originalProduct) {
        throw ErrorResponses.NOT_FOUND('产品不存在');
    }

    // 复制产品数据
    const productData = originalProduct.toJSON();
    delete productData.id;
    delete productData.created_at;
    delete productData.updated_at;
    delete productData.deleted_at;
    
    // 修改名称和SKU以避免重复
    productData.name = `${productData.name} - 副本`;
    if (productData.sku) {
        productData.sku = `${productData.sku}_copy_${Date.now()}`;
    }

    // 重置统计数据
    productData.stats = {
        total_calculations: 0,
        avg_profit_rate: 0,
        last_calculated_at: null
    };

    const newProduct = await Product.create(productData);

    logger.info(`产品复制成功 - 用户: ${req.user.username}`, {
        originalId: id,
        newId: newProduct.id,
        productName: newProduct.name
    });

    res.status(201).json({
        success: true,
        message: '产品复制成功',
        data: newProduct.toJSON()
    });
}));

module.exports = router; 