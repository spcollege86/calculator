# 跨境电商计算器

## 项目简介

跨境电商计算器是一个专为中国制造业向跨境电商转型而设计的分析工具。系统支持多币种计算、实时汇率转换、成本分析、利润预测等功能，帮助跨境电商从业者优化采购与销售策略。

## 技术栈

### 前端
- **Vue.js 3** - 渐进式JavaScript框架
- **Vue Router** - 官方路由管理器
- **Pinia** - 状态管理库
- **Element Plus** - Vue 3 UI组件库
- **Chart.js** - 数据可视化图表库
- **Axios** - HTTP客户端
- **Tailwind CSS** - 原子化CSS框架

### 后端
- **Node.js** - JavaScript运行环境
- **Express.js** - Web应用框架
- **MySQL 8.0** - 关系型数据库
- **Sequelize** - ORM框架
- **JWT** - 身份验证
- **Bcrypt** - 密码加密
- **Multer** - 文件上传处理
- **Node-cron** - 定时任务（汇率更新）

### 开发工具
- **Vite** - 前端构建工具
- **ESLint + Prettier** - 代码规范化
- **PM2** - Node.js进程管理
- **Docker** - 容器化部署

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue.js 前端    │ -> │   Node.js API   │ -> │   MySQL 数据库   │
│                 │    │                 │    │                 │
│ - 用户界面       │    │ - RESTful API   │    │ - 用户数据       │
│ - 状态管理       │    │ - 身份验证       │    │ - 产品数据       │
│ - 路由管理       │    │ - 业务逻辑       │    │ - 计算记录       │
│ - 数据可视化     │    │ - 数据验证       │    │ - 汇率数据       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 功能模块

### 1. 用户管理模块
- 用户注册/登录
- 个人信息管理
- 权限控制
- 密码重置

### 2. 产品管理模块
- 产品信息录入（名称、类别、重量、供应商等）
- 产品分类管理
- 产品模板创建
- 批量导入/导出

### 3. 利润计算模块
- 多币种采购成本计算
- 销售价格设置
- 各项费用配置（平台佣金、运费、广告费等）
- 实时汇率获取和转换
- 利润率分析
- 保本价格计算
- 目标价格建议

### 4. 数据分析模块
- 成本结构分析（饼图/柱状图）
- 利润趋势分析
- 产品盈利能力对比
- 供应商成本分析
- 市场价格监控

### 5. 历史记录模块
- 计算历史保存
- 记录查询和筛选
- 数据导出（CSV/Excel）
- 记录对比分析

### 6. 系统设置模块
- 汇率设置和更新
- 默认费用配置
- 系统参数设置
- 数据备份恢复

## 数据库设计

### 用户表 (users)
- id, username, email, password_hash, created_at, updated_at

### 产品表 (products)
- id, user_id, name, category, weight, supplier, created_at, updated_at

### 计算记录表 (calculations)
- id, user_id, product_id, purchase_data, selling_data, results, created_at

### 汇率表 (exchange_rates)
- id, from_currency, to_currency, rate, updated_at

### 系统配置表 (settings)
- id, key, value, description, updated_at

## 项目结构

```
cross-border-calculator/
├── backend/                    # 后端代码
│   ├── src/
│   │   ├── controllers/        # 控制器
│   │   ├── models/            # 数据模型
│   │   ├── routes/            # 路由配置
│   │   ├── middleware/        # 中间件
│   │   ├── services/          # 业务服务
│   │   ├── utils/             # 工具函数
│   │   └── config/            # 配置文件
│   ├── package.json
│   └── server.js              # 服务入口
├── frontend/                   # 前端代码
│   ├── src/
│   │   ├── components/        # 组件
│   │   ├── views/             # 页面视图
│   │   ├── stores/            # 状态管理
│   │   ├── router/            # 路由配置
│   │   ├── utils/             # 工具函数
│   │   ├── assets/            # 静态资源
│   │   └── api/               # API接口
│   ├── package.json
│   └── vite.config.js
├── database/                   # 数据库脚本
│   ├── migrations/            # 数据库迁移
│   ├── seeds/                 # 初始数据
│   └── schema.sql             # 表结构
├── docker-compose.yml          # Docker配置
├── docs/                       # 文档目录
└── README.md
```

## 开发计划

### Phase 1: 基础架构搭建 (1-2周)
- [x] 项目结构设计
- [ ] 后端API框架搭建
- [ ] 前端Vue项目初始化
- [ ] 数据库表结构设计
- [ ] 基础的用户认证系统

### Phase 2: 核心功能开发 (2-3周)
- [ ] 利润计算核心算法
- [ ] 产品管理功能
- [ ] 多币种和汇率系统
- [ ] 基础UI界面开发

### Phase 3: 数据分析和可视化 (1-2周)
- [ ] 图表数据可视化
- [ ] 历史记录管理
- [ ] 导出功能实现
- [ ] 数据统计分析

### Phase 4: 优化和部署 (1周)
- [ ] 性能优化
- [ ] 安全加固
- [ ] Docker部署配置
- [ ] 生产环境测试

## 安装和运行

### 环境要求
- Node.js 16+
- MySQL 5.7+
- npm 或 yarn

### 本地开发
1. 克隆项目
```bash
git clone <repository-url>
cd cross-border-calculator
```

2. 安装依赖
```bash
# 后端依赖
cd backend && npm install

# 前端依赖
cd ../frontend && npm install
```

3. 数据库配置
```bash
# 创建数据库
mysql -u root -p < database/schema.sql

# 运行迁移
cd backend && npm run migrate
```

4. 启动服务
```bash
# 后端服务 (端口: 3000)
cd backend && npm run dev

# 前端服务 (端口: 5173)
cd frontend && npm run dev
```

## API文档

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新token

### 产品管理
- `GET /api/products` - 获取产品列表
- `POST /api/products` - 创建产品
- `PUT /api/products/:id` - 更新产品
- `DELETE /api/products/:id` - 删除产品

### 计算相关
- `POST /api/calculate/profit` - 计算利润
- `GET /api/calculate/history` - 获取计算历史
- `POST /api/calculate/save` - 保存计算记录

### 汇率相关
- `GET /api/exchange-rates` - 获取汇率数据
- `POST /api/exchange-rates/update` - 更新汇率

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目Issues: [GitHub Issues](https://github.com/spcollege86/calculator/issues)
- 邮箱: your-email@example.com

---

**注意**: 这是一个专业的商业工具，请确保在生产环境中使用时注意数据安全和隐私保护。 