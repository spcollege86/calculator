const { Product } = require('../models');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * 获取产品列表
 */
exports.getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const userId = req.user.userId;
        const offset = (page - 1) * limit;

        // 构建查询条件
        const whereCondition = { user_id: userId };

        // 分类筛选
        if (category && category !== 'all') {
            whereCondition.category = category;
        }

        // 搜索功能
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
                { supplier: { [Op.like]: `%${search}%` } }
            ];
        }

        // 查询产品
        const { count, rows: products } = await Product.findAndCountAll({
            where: whereCondition,
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: { exclude: ['user_id'] }
        });

        // 计算分页信息
        const totalPages = Math.ceil(count / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    current: parseInt(page),
                    total: totalPages,
                    count,
                    limit: parseInt(limit),
                    hasNext: hasNextPage,
                    hasPrev: hasPrevPage
                }
            }
        });

    } catch (error) {
        logger.error('获取产品列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取产品列表失败'
        });
    }
};

/**
 * 获取单个产品详情
 */
exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const product = await Product.findOne({
            where: { id, user_id: userId },
            attributes: { exclude: ['user_id'] }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        res.json({
            success: true,
            data: { product }
        });

    } catch (error) {
        logger.error('获取产品详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取产品详情失败'
        });
    }
};

/**
 * 创建产品
 */
exports.createProduct = async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
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
            cost_currency,
            cost_price,
            min_order_quantity,
            lead_time,
            tags,
            status
        } = req.body;

        const userId = req.user.userId;

        // 检查SKU是否重复（如果提供了SKU）
        if (sku) {
            const existingProduct = await Product.findOne({
                where: {
                    user_id: userId,
                    sku
                }
            });

            if (existingProduct) {
                return res.status(409).json({
                    success: false,
                    message: 'SKU已存在'
                });
            }
        }

        // 创建产品
        const product = await Product.create({
            user_id: userId,
            name,
            category,
            description,
            weight,
            dimensions,
            supplier,
            supplier_info,
            sku,
            images,
            cost_currency: cost_currency || 'CNY',
            cost_price,
            min_order_quantity,
            lead_time,
            tags,
            status: status || 'active'
        });

        logger.info(`用户 ${userId} 创建产品成功: ${product.name}`);

        res.status(201).json({
            success: true,
            message: '产品创建成功',
            data: {
                product: {
                    ...product.dataValues,
                    user_id: undefined
                }
            }
        });

    } catch (error) {
        logger.error('创建产品失败:', error);
        res.status(500).json({
            success: false,
            message: '创建产品失败'
        });
    }
};

/**
 * 更新产品
 */
exports.updateProduct = async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const userId = req.user.userId;
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
            cost_currency,
            cost_price,
            min_order_quantity,
            lead_time,
            tags,
            status
        } = req.body;

        // 检查产品是否存在
        const product = await Product.findOne({
            where: { id, user_id: userId }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        // 检查SKU是否重复（如果修改了SKU）
        if (sku && sku !== product.sku) {
            const existingProduct = await Product.findOne({
                where: {
                    user_id: userId,
                    sku,
                    id: { [Op.ne]: id }
                }
            });

            if (existingProduct) {
                return res.status(409).json({
                    success: false,
                    message: 'SKU已存在'
                });
            }
        }

        // 更新产品
        await product.update({
            name: name || product.name,
            category: category || product.category,
            description,
            weight,
            dimensions,
            supplier,
            supplier_info,
            sku,
            images,
            cost_currency: cost_currency || product.cost_currency,
            cost_price,
            min_order_quantity,
            lead_time,
            tags,
            status: status || product.status
        });

        logger.info(`用户 ${userId} 更新产品成功: ${product.name}`);

        res.json({
            success: true,
            message: '产品更新成功',
            data: {
                product: {
                    ...product.dataValues,
                    user_id: undefined
                }
            }
        });

    } catch (error) {
        logger.error('更新产品失败:', error);
        res.status(500).json({
            success: false,
            message: '更新产品失败'
        });
    }
};

/**
 * 删除产品
 */
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const product = await Product.findOne({
            where: { id, user_id: userId }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        // 软删除
        await product.destroy();

        logger.info(`用户 ${userId} 删除产品: ${product.name}`);

        res.json({
            success: true,
            message: '产品删除成功'
        });

    } catch (error) {
        logger.error('删除产品失败:', error);
        res.status(500).json({
            success: false,
            message: '删除产品失败'
        });
    }
};

/**
 * 批量删除产品
 */
exports.bulkDeleteProducts = async (req, res) => {
    try {
        const { ids } = req.body;
        const userId = req.user.userId;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请提供要删除的产品ID列表'
            });
        }

        // 查找用户的产品
        const products = await Product.findAll({
            where: {
                id: { [Op.in]: ids },
                user_id: userId
            }
        });

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: '没有找到可删除的产品'
            });
        }

        // 批量删除
        const deletedCount = await Product.destroy({
            where: {
                id: { [Op.in]: ids },
                user_id: userId
            }
        });

        logger.info(`用户 ${userId} 批量删除了 ${deletedCount} 个产品`);

        res.json({
            success: true,
            message: `成功删除 ${deletedCount} 个产品`,
            data: { deletedCount }
        });

    } catch (error) {
        logger.error('批量删除产品失败:', error);
        res.status(500).json({
            success: false,
            message: '批量删除产品失败'
        });
    }
};

/**
 * 获取产品分类统计
 */
exports.getCategoryStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const stats = await Product.findAll({
            where: { user_id: userId },
            attributes: [
                'category',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['category'],
            raw: true
        });

        res.json({
            success: true,
            data: { stats }
        });

    } catch (error) {
        logger.error('获取分类统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取分类统计失败'
        });
    }
};

/**
 * 复制产品
 */
exports.duplicateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const originalProduct = await Product.findOne({
            where: { id, user_id: userId }
        });

        if (!originalProduct) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        // 创建产品副本
        const productData = originalProduct.dataValues;
        delete productData.id;
        delete productData.created_at;
        delete productData.updated_at;
        
        // 修改名称和SKU以避免重复
        productData.name = `${productData.name} (副本)`;
        productData.sku = productData.sku ? `${productData.sku}_copy` : null;

        const newProduct = await Product.create(productData);

        logger.info(`用户 ${userId} 复制产品成功: ${newProduct.name}`);

        res.status(201).json({
            success: true,
            message: '产品复制成功',
            data: {
                product: {
                    ...newProduct.dataValues,
                    user_id: undefined
                }
            }
        });

    } catch (error) {
        logger.error('复制产品失败:', error);
        res.status(500).json({
            success: false,
            message: '复制产品失败'
        });
    }
}; 