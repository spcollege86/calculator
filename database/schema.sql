-- 跨境电商利润计算器数据库初始化脚本
-- 创建时间: 2024年
-- 版本: 1.0

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `cross_border_calculator` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `cross_border_calculator`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
    `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `company` VARCHAR(100) DEFAULT NULL COMMENT '公司名称',
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT '用户角色',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `email_verified_at` DATETIME DEFAULT NULL COMMENT '邮箱验证时间',
    `settings` JSON DEFAULT NULL COMMENT '用户设置',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间',
    
    INDEX `idx_email` (`email`),
    INDEX `idx_username` (`username`),
    INDEX `idx_is_active` (`is_active`),
    INDEX `idx_role` (`role`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB COMMENT='用户表';

-- 产品表
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL COMMENT '用户ID',
    `name` VARCHAR(200) NOT NULL COMMENT '产品名称',
    `category` ENUM('electronics', 'home', 'fashion', 'beauty', 'toys', 'sports', 'automotive', 'books', 'health', 'other') 
        NOT NULL DEFAULT 'other' COMMENT '产品类别',
    `description` TEXT DEFAULT NULL COMMENT '产品描述',
    `weight` DECIMAL(8,3) DEFAULT NULL COMMENT '产品重量(kg)',
    `dimensions` JSON DEFAULT NULL COMMENT '产品尺寸(长宽高)',
    `supplier` VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
    `supplier_info` JSON DEFAULT NULL COMMENT '供应商详细信息',
    `sku` VARCHAR(100) DEFAULT NULL COMMENT 'SKU编码',
    `images` JSON DEFAULT NULL COMMENT '产品图片URLs',
    `tags` JSON DEFAULT NULL COMMENT '产品标签',
    `default_purchase_currency` VARCHAR(3) DEFAULT 'CNY' COMMENT '默认采购币种',
    `default_purchase_price` DECIMAL(10,2) DEFAULT NULL COMMENT '默认采购价格',
    `default_selling_currency` VARCHAR(3) DEFAULT 'USD' COMMENT '默认销售币种',
    `default_selling_price` DECIMAL(10,2) DEFAULT NULL COMMENT '默认销售价格',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    `stats` JSON DEFAULT NULL COMMENT '产品统计信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间',
    
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_category` (`category`),
    INDEX `idx_supplier` (`supplier`),
    INDEX `idx_is_active` (`is_active`),
    INDEX `idx_sku` (`sku`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB COMMENT='产品表';

-- 计算记录表
CREATE TABLE IF NOT EXISTS `calculations` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL COMMENT '用户ID',
    `product_id` INT DEFAULT NULL COMMENT '产品ID',
    `product_name` VARCHAR(200) NOT NULL COMMENT '产品名称快照',
    `purchase_data` JSON NOT NULL COMMENT '采购相关数据',
    `selling_data` JSON NOT NULL COMMENT '销售相关数据',
    `cost_breakdown` JSON NOT NULL COMMENT '成本分解',
    `results` JSON NOT NULL COMMENT '计算结果',
    `target_profit_rate` DECIMAL(5,2) DEFAULT 15.0 COMMENT '目标利润率(%)',
    `notes` TEXT DEFAULT NULL COMMENT '备注信息',
    `tags` JSON DEFAULT NULL COMMENT '标签',
    `is_saved` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已保存',
    `calculation_version` VARCHAR(10) NOT NULL DEFAULT '1.0' COMMENT '计算算法版本',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间',
    
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_product_id` (`product_id`),
    INDEX `idx_is_saved` (`is_saved`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_user_created` (`user_id`, `created_at`),
    INDEX `idx_user_saved` (`user_id`, `is_saved`)
) ENGINE=InnoDB COMMENT='计算记录表';

-- 汇率表
CREATE TABLE IF NOT EXISTS `exchange_rates` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `from_currency` VARCHAR(3) NOT NULL COMMENT '源币种',
    `to_currency` VARCHAR(3) NOT NULL COMMENT '目标币种',
    `rate` DECIMAL(12,6) NOT NULL COMMENT '汇率值',
    `source` VARCHAR(50) NOT NULL DEFAULT 'manual' COMMENT '汇率来源',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    `last_updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY `unique_currency_pair` (`from_currency`, `to_currency`),
    INDEX `idx_from_currency` (`from_currency`),
    INDEX `idx_to_currency` (`to_currency`),
    INDEX `idx_is_active` (`is_active`),
    INDEX `idx_last_updated` (`last_updated_at`)
) ENGINE=InnoDB COMMENT='汇率表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    `value` TEXT DEFAULT NULL COMMENT '配置值',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '配置描述',
    `type` ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string' COMMENT '数据类型',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX `idx_key` (`key`)
) ENGINE=InnoDB COMMENT='系统配置表';

-- 插入默认汇率数据
INSERT INTO `exchange_rates` (`from_currency`, `to_currency`, `rate`, `source`, `last_updated_at`) VALUES
('CNY', 'USD', 0.138000, 'default', NOW()),
('USD', 'CNY', 7.250000, 'default', NOW()),
('CNY', 'EUR', 0.128000, 'default', NOW()),
('EUR', 'CNY', 7.800000, 'default', NOW()),
('CNY', 'GBP', 0.111000, 'default', NOW()),
('GBP', 'CNY', 9.000000, 'default', NOW()),
('CNY', 'JPY', 20.000000, 'default', NOW()),
('JPY', 'CNY', 0.050000, 'default', NOW()),
('USD', 'EUR', 0.925000, 'default', NOW()),
('EUR', 'USD', 1.081000, 'default', NOW()),
('USD', 'GBP', 0.804000, 'default', NOW()),
('GBP', 'USD', 1.244000, 'default', NOW()),
('USD', 'JPY', 145.000000, 'default', NOW()),
('JPY', 'USD', 0.006900, 'default', NOW()),
('EUR', 'GBP', 0.869000, 'default', NOW()),
('GBP', 'EUR', 1.151000, 'default', NOW()),
('EUR', 'JPY', 156.700000, 'default', NOW()),
('JPY', 'EUR', 0.006400, 'default', NOW()),
('GBP', 'JPY', 180.300000, 'default', NOW()),
('JPY', 'GBP', 0.005500, 'default', NOW());

-- 插入默认系统配置
INSERT INTO `settings` (`key`, `value`, `description`, `type`) VALUES
('app_name', '跨境电商利润计算器', '应用名称', 'string'),
('app_version', '1.0.0', '应用版本', 'string'),
('default_currency', 'CNY', '默认货币', 'string'),
('exchange_rate_update_interval', '3600', '汇率更新间隔（秒）', 'number'),
('max_calculation_history', '1000', '最大计算历史记录数', 'number'),
('enable_email_notifications', 'true', '启用邮件通知', 'boolean'),
('default_platform_commission', '5.0', '默认平台佣金率(%)', 'number'),
('default_return_rate', '3.0', '默认退货率(%)', 'number'),
('supported_currencies', '["CNY","USD","EUR","GBP","JPY"]', '支持的货币列表', 'json');

-- 创建默认管理员用户（密码：admin123，请在生产环境中修改）
INSERT INTO `users` (`username`, `email`, `password_hash`, `role`) VALUES
('admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfpkxF/8cHNpQ6G', 'admin');

-- 创建测试产品数据
INSERT INTO `products` (`user_id`, `name`, `category`, `description`, `weight`, `supplier`, `default_purchase_currency`, `default_purchase_price`, `default_selling_currency`, `default_selling_price`) VALUES
(1, '无线蓝牙耳机', 'electronics', '高品质无线蓝牙耳机，支持降噪功能', 0.250, '深圳科技有限公司', 'CNY', 50.00, 'USD', 16.67),
(1, '智能手表', 'electronics', '多功能智能手表，支持健康监测', 0.180, '广州电子厂', 'CNY', 120.00, 'USD', 35.00),
(1, '便携充电宝', 'electronics', '大容量便携式充电宝，快充支持', 0.400, '东莞制造商', 'CNY', 35.00, 'USD', 12.99);

COMMIT; 