# 跨境电商计算器

## 项目简介

跨境电商计算器是一个专为中国制造业向跨境电商转型而设计的分析工具。系统支持多币种计算、实时汇率转换、成本分析、利润预测等功能，帮助跨境电商从业者优化采购与销售策略。

## 🚀 项目状态

**当前进度**: Phase 1 基础架构搭建 - 80% 完成

- ✅ **后端架构**: Express.js + MySQL + Sequelize 完整搭建
- ✅ **核心功能**: 用户认证、产品管理等API已完成
- ✅ **前端基础**: Vue3 + Element Plus 项目初始化
- 🔄 **开发中**: 利润计算核心功能、前端页面开发
- 📋 **规划中**: 数据可视化、高级功能、部署优化

> 📋 **详细进度**: 查看 [项目开发状态与功能规划](docs/project-status.md)

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

## 核心功能

| 模块 | 状态 | 描述 |
|------|------|------|
| **用户管理** | ✅ | 注册登录、权限控制、个人资料管理 |
| **产品管理** | ✅ | 产品CRUD、分类管理、批量操作 |
| **利润计算** | 🔄 | 多币种成本计算、利润分析、价格建议 |
| **数据分析** | 📋 | 图表可视化、趋势分析、成本结构分析 |
| **历史记录** | 📋 | 计算历史、数据导出、对比分析 |
| **系统设置** | 📋 | 汇率管理、费用配置、系统参数 |

> 📋 **功能详情**: 查看 [项目开发状态与功能规划](docs/project-status.md)

## 数据库设计

### 核心表结构
- **用户表** (users) - 用户信息、权限管理
- **产品表** (products) - 产品信息、供应商数据
- **计算记录表** (calculations) - 历史计算数据
- **汇率表** (exchange_rates) - 实时汇率数据
- **系统配置表** (settings) - 系统参数配置

## 项目结构

```
cross-border-calculator/
├── backend/                    # 后端代码 ✅
│   ├── src/controllers/        # API控制器
│   ├── src/models/            # 数据模型
│   ├── src/routes/            # 路由配置
│   ├── src/middleware/        # 中间件
│   └── src/services/          # 业务服务
├── frontend/                   # 前端代码 ✅
│   ├── src/components/        # Vue组件
│   ├── src/views/             # 页面视图
│   ├── src/stores/            # 状态管理
│   └── src/api/               # API接口
├── database/                   # 数据库脚本 ✅
├── docs/                       # 项目文档 ✅
└── docker-compose.yml          # Docker配置 ✅
```

## 快速开始

### 环境要求
- Node.js 16+
- MySQL 5.7+
- npm 或 yarn

### 安装和运行

1. **克隆项目**
```bash
git clone <repository-url>
cd cross-border-calculator
```

2. **数据库设置**
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE cross_border_calculator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# 导入表结构
mysql -u root -p cross_border_calculator < database/schema.sql
```

3. **后端启动**
```bash
cd backend
npm install

# 复制并配置环境变量
cp env.example .env
# 编辑 .env 文件，设置数据库密码和JWT密钥

# 启动开发服务器
npm run dev
```

4. **前端启动**
```bash
cd frontend
npm install
npm run dev
```

5. **访问应用**
- 前端: http://localhost:5173
- 后端API: http://localhost:3000

## API接口概览

### 🔐 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌

### 📦 产品管理
- `GET /api/products` - 获取产品列表
- `POST /api/products` - 创建产品
- `PUT /api/products/:id` - 更新产品
- `DELETE /api/products/:id` - 删除产品

### 🧮 利润计算
- `POST /api/calculate/profit` - 计算利润
- `GET /api/calculate/history` - 获取计算历史

### 💱 汇率管理
- `GET /api/exchange-rates` - 获取汇率数据
- `POST /api/exchange-rates/update` - 更新汇率

> 📚 **完整API文档**: 查看 [API接口文档](docs/api-documentation.md)

## 开发文档

- 📋 [项目开发状态与功能规划](docs/project-status.md)
- 📚 [API接口文档](docs/api-documentation.md)
- 🛠️ [开发指南](docs/development-guide.md)

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目Issues: [GitHub Issues](https://github.com/spcollege86/calculator/issues)

---

**注意**: 这是一个专业的商业工具，请确保在生产环境中使用时注意数据安全和隐私保护。

**当前版本**: 1.0.0-dev  
**最后更新**: 2024年12月