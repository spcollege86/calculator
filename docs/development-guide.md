# 跨境电商计算器 - 开发指南

## 项目当前状态 ✅

### 已完成的部分

#### 后端 (Node.js + Express + MySQL)
- ✅ 项目结构已搭建完成
- ✅ 数据库模型已创建 (User, Product, Calculation, ExchangeRate)
- ✅ 路由结构已配置 (auth, products, calculations, exchangeRates, users)
- ✅ 核心控制器已创建:
  - `authController.js` - 用户认证 (注册/登录/刷新token/个人资料)
  - `productController.js` - 产品管理 (CRUD + 搜索/分类)
- ✅ 中间件已配置:
  - `auth.js` - JWT认证、角色验证、限流
  - `errorHandler.js` - 统一错误处理
  - `logger.js` - 日志记录
- ✅ 服务器配置完整 (安全、CORS、压缩、限流)
- ✅ 环境变量模板 (env.example)

#### 前端 (Vue.js 3)
- ✅ 项目结构初始化
- ✅ 构建配置 (Vite + Vue3 + Element Plus)
- ✅ 依赖配置 (Vue Router, Pinia, Chart.js, Tailwind CSS)
- ✅ 基础文件创建 (package.json, vite.config.js, index.html, main.js, App.vue)

#### 数据库
- ✅ 完整的数据库表结构设计 (schema.sql)
- ✅ 支持用户、产品、计算记录、汇率等核心表

### 需要完成的部分

#### 后端
1. **缺失的控制器**:
   - `calculationController.js` - 利润计算核心功能
   - `exchangeRateController.js` - 汇率管理
   - `userController.js` - 用户管理

2. **服务层**:
   - 计算服务 - 利润算法实现
   - 汇率服务 - 第三方API集成
   - 邮件服务 - 找回密码等功能

3. **环境配置**:
   - 创建 `.env` 文件
   - 数据库初始化和数据迁移

#### 前端
1. **核心功能页面**:
   - 用户登录/注册页面
   - 主仪表盘
   - 产品管理页面
   - 利润计算器页面
   - 数据分析图表

2. **状态管理**:
   - Pinia stores (user, app, product, calculation)

3. **API集成**:
   - HTTP请求封装
   - 错误处理和拦截器

## 快速启动指南

### 环境要求
- Node.js 16+
- MySQL 5.7+ 或 8.0+
- npm 或 yarn

### 1. 数据库准备

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE cross_border_calculator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# 导入表结构
mysql -u root -p cross_border_calculator < database/schema.sql
```

### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖 (如果还没有安装)
npm install

# 复制环境变量文件
cp env.example .env

# 修改 .env 文件中的数据库配置
# 特别是：DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 启动开发服务器
npm run dev
```

**默认后端地址**: http://localhost:3000

### 3. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**默认前端地址**: http://localhost:5173

### 4. 验证服务

- 后端API测试: http://localhost:3000/api/health (需要创建健康检查接口)
- 前端页面: http://localhost:5173

## 下一步开发计划

### 优先级 1 - 核心功能完善 (1-2周)

1. **完成后端控制器**:
   ```bash
   # 需要创建的文件
   backend/src/controllers/calculationController.js
   backend/src/controllers/exchangeRateController.js  
   backend/src/controllers/userController.js
   ```

2. **创建服务层**:
   ```bash
   backend/src/services/calculationService.js
   backend/src/services/exchangeRateService.js
   backend/src/services/emailService.js
   ```

3. **前端核心页面**:
   ```bash
   frontend/src/views/Login.vue
   frontend/src/views/Dashboard.vue
   frontend/src/views/Products.vue
   frontend/src/views/Calculator.vue
   ```

4. **状态管理**:
   ```bash
   frontend/src/stores/user.js
   frontend/src/stores/app.js
   frontend/src/stores/product.js
   ```

### 优先级 2 - 功能增强 (1周)

1. **数据可视化**: Chart.js 图表集成
2. **文件上传**: 产品图片上传功能
3. **数据导出**: Excel/CSV 导出功能
4. **实时汇率**: 定时任务集成

### 优先级 3 - 优化和部署 (1周)

1. **性能优化**: 缓存、分页、查询优化
2. **安全加固**: 输入验证、SQL注入防护
3. **测试**: 单元测试和集成测试
4. **部署**: Docker 容器化部署

## 开发注意事项

### 代码规范
- 使用 ESLint + Prettier 保持代码风格一致
- 所有API返回格式统一使用 `{ success: boolean, message: string, data?: any }`
- 前端组件采用 Composition API 写法
- 遵循RESTful API设计原则

### 错误处理
- 后端已配置统一错误处理中间件
- 前端需要配置全局错误拦截器
- 所有异步操作都要有错误处理

### 安全考虑
- JWT token 过期处理和刷新机制
- 密码强度验证
- XSS 和 CSRF 防护
- 文件上传类型和大小限制

### 性能优化
- 数据库查询优化和索引
- 前端懒加载和代码分割
- API 请求防抖和节流
- 图片压缩和CDN

## 常见问题解决

### 数据库连接失败
```bash
# 检查MySQL服务状态
systemctl status mysql  # Linux
net start mysql         # Windows

# 检查端口占用
netstat -an | grep 3306
```

### 端口占用
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/Mac  
lsof -ti:3000 | xargs kill -9
```

### 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 技术支持

如遇到问题，请检查：
1. 日志文件: `backend/logs/`
2. 控制台错误信息
3. 数据库连接状态
4. 环境变量配置

---

**最后更新**: 2024年12月  
**版本**: 1.0.0-dev 