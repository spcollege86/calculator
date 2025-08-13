# API 接口文档

## 概述

跨境电商计算器提供完整的RESTful API接口，支持用户认证、产品管理、利润计算等核心功能。

**基础URL**: `http://localhost:3000/api`

**认证方式**: JWT Bearer Token

**响应格式**: 统一JSON格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

---

## 🔐 认证相关接口

### 用户注册
```http
POST /api/auth/register
```

**请求参数**:
```json
{
  "username": "用户名",
  "email": "邮箱地址",
  "password": "密码",
  "company": "公司名称",
  "phone": "手机号码"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱地址",
      "company": "公司名称",
      "phone": "手机号码",
      "role": "user",
      "created_at": "2024-12-01T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**状态码**: 201 Created

---

### 用户登录
```http
POST /api/auth/login
```

**请求参数**:
```json
{
  "login": "邮箱或用户名",
  "password": "密码"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱地址",
      "company": "公司名称",
      "phone": "手机号码",
      "role": "user",
      "avatar": "头像URL",
      "last_login_at": "2024-12-01T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**状态码**: 200 OK

---

### 刷新访问令牌
```http
POST /api/auth/refresh
```

**请求参数**:
```json
{
  "refreshToken": "刷新令牌"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Token刷新成功",
  "data": {
    "token": "新的访问令牌"
  }
}
```

**状态码**: 200 OK

---

### 获取用户信息
```http
GET /api/auth/profile
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱地址",
      "company": "公司名称",
      "phone": "手机号码",
      "role": "user",
      "avatar": "头像URL",
      "created_at": "2024-12-01T10:30:00Z",
      "updated_at": "2024-12-01T10:30:00Z"
    }
  }
}
```

**状态码**: 200 OK

---

### 更新用户信息
```http
PUT /api/auth/profile
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "username": "新用户名",
  "company": "新公司名称",
  "phone": "新手机号码",
  "avatar": "新头像URL"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "user": {
      "id": 1,
      "username": "新用户名",
      "email": "邮箱地址",
      "company": "新公司名称",
      "phone": "新手机号码",
      "role": "user",
      "avatar": "新头像URL",
      "updated_at": "2024-12-01T10:30:00Z"
    }
  }
}
```

**状态码**: 200 OK

---

### 修改密码
```http
PUT /api/auth/password
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "currentPassword": "当前密码",
  "newPassword": "新密码"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

**状态码**: 200 OK

---

### 用户登出
```http
POST /api/auth/logout
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

**状态码**: 200 OK

---

## 📦 产品管理接口

### 获取产品列表
```http
GET /api/products
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `page` - 页码 (默认: 1)
- `limit` - 每页数量 (默认: 10)
- `category` - 产品分类
- `search` - 搜索关键词
- `sortBy` - 排序字段 (默认: created_at)
- `sortOrder` - 排序方向 (默认: DESC)

**示例请求**:
```
GET /api/products?page=1&limit=20&category=electronics&search=手机&sortBy=name&sortOrder=ASC
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "iPhone保护壳",
        "category": "electronics",
        "description": "高品质手机保护壳",
        "weight": 0.1,
        "supplier": "深圳供应商",
        "sku": "IPHONE-CASE-001",
        "cost_currency": "CNY",
        "cost_price": 15.00,
        "status": "active",
        "created_at": "2024-12-01T10:30:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 5,
      "count": 100,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**状态码**: 200 OK

---

### 获取产品详情
```http
GET /api/products/:id
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "iPhone保护壳",
      "category": "electronics",
      "description": "高品质手机保护壳",
      "weight": 0.1,
      "dimensions": {
        "length": 15.5,
        "width": 7.8,
        "height": 0.3
      },
      "supplier": "深圳供应商",
      "supplier_info": {
        "contact": "张经理",
        "phone": "13800138000",
        "address": "深圳市宝安区"
      },
      "sku": "IPHONE-CASE-001",
      "images": ["case1.jpg", "case2.jpg"],
      "cost_currency": "CNY",
      "cost_price": 15.00,
      "min_order_quantity": 100,
      "lead_time": 7,
      "tags": ["手机配件", "保护壳"],
      "status": "active",
      "created_at": "2024-12-01T10:30:00Z",
      "updated_at": "2024-12-01T10:30:00Z"
    }
  }
}
```

**状态码**: 200 OK

---

### 创建产品
```http
POST /api/products
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "name": "产品名称",
  "category": "electronics",
  "description": "产品描述",
  "weight": 0.1,
  "dimensions": {
    "length": 15.5,
    "width": 7.8,
    "height": 0.3
  },
  "supplier": "供应商名称",
  "supplier_info": {
    "contact": "联系人",
    "phone": "联系电话",
    "address": "地址"
  },
  "sku": "SKU-001",
  "images": ["image1.jpg", "image2.jpg"],
  "cost_currency": "CNY",
  "cost_price": 15.00,
  "min_order_quantity": 100,
  "lead_time": 7,
  "tags": ["标签1", "标签2"],
  "status": "active"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "产品创建成功",
  "data": {
    "product": {
      "id": 1,
      "name": "产品名称",
      "category": "electronics",
      "created_at": "2024-12-01T10:30:00Z"
    }
  }
}
```

**状态码**: 201 Created

---

### 更新产品
```http
PUT /api/products/:id
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**: 同创建产品，所有字段可选

**响应示例**:
```json
{
  "success": true,
  "message": "产品更新成功",
  "data": {
    "product": {
      "id": 1,
      "name": "更新后的产品名称",
      "updated_at": "2024-12-01T10:30:00Z"
    }
  }
}
```

**状态码**: 200 OK

---

### 删除产品
```http
DELETE /api/products/:id
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "产品删除成功"
}
```

**状态码**: 200 OK

---

### 批量删除产品
```http
POST /api/products/bulk-delete
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功删除 5 个产品",
  "data": {
    "deletedCount": 5
  }
}
```

**状态码**: 200 OK

---

### 复制产品
```http
POST /api/products/:id/duplicate
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "产品复制成功",
  "data": {
    "product": {
      "id": 2,
      "name": "iPhone保护壳 (副本)",
      "sku": "IPHONE-CASE-001_copy"
    }
  }
}
```

**状态码**: 201 Created

---

### 获取产品分类统计
```http
GET /api/products/stats/category
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "category": "electronics",
        "count": 25
      },
      {
        "category": "home",
        "count": 18
      },
      {
        "category": "fashion",
        "count": 12
      }
    ]
  }
}
```

**状态码**: 200 OK

---

## 🧮 利润计算接口

### 计算利润
```http
POST /api/calculate/profit
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "product_id": 1,
  "purchase_data": {
    "cost_price": 50.00,
    "currency": "CNY",
    "quantity": 1000,
    "supplier": "深圳供应商"
  },
  "selling_data": {
    "platform": "Amazon",
    "selling_price": 15.99,
    "currency": "USD",
    "fees": {
      "platform_fee": 2.40,
      "shipping_fee": 3.50,
      "advertising_fee": 1.20,
      "customs_duty": 0.80,
      "storage_fee": 0.50
    }
  },
  "exchange_rate": 7.2
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "calculation": {
      "total_cost_cny": 61.00,
      "total_cost_usd": 8.47,
      "revenue_usd": 15.99,
      "profit_usd": 7.52,
      "profit_margin": 47.0,
      "break_even_price": 8.47,
      "roi": 88.8
    }
  }
}
```

**状态码**: 200 OK

---

### 获取计算模板
```http
GET /api/calculate/templates
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": 1,
        "name": "Amazon标准模板",
        "platform": "Amazon",
        "fees": {
          "platform_fee": 0.15,
          "shipping_fee": 3.50,
          "advertising_fee": 0.10
        }
      }
    ]
  }
}
```

**状态码**: 200 OK

---

### 保存计算记录
```http
POST /api/calculate/save
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "calculation_name": "iPhone保护壳利润分析",
  "product_id": 1,
  "purchase_data": { ... },
  "selling_data": { ... },
  "results": { ... }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "计算记录保存成功",
  "data": {
    "calculation_id": 1
  }
}
```

**状态码**: 201 Created

---

### 获取计算历史
```http
GET /api/calculate/history
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `page` - 页码
- `limit` - 每页数量
- `product_id` - 产品ID筛选
- `date_from` - 开始日期
- `date_to` - 结束日期

**响应示例**:
```json
{
  "success": true,
  "data": {
    "calculations": [
      {
        "id": 1,
        "calculation_name": "iPhone保护壳利润分析",
        "product_name": "iPhone保护壳",
        "profit_margin": 47.0,
        "created_at": "2024-12-01T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

**状态码**: 200 OK

---

## 💱 汇率管理接口

### 获取汇率数据
```http
GET /api/exchange-rates
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `from_currency` - 源货币 (默认: USD)
- `to_currency` - 目标货币 (默认: CNY)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "from_currency": "USD",
        "to_currency": "CNY",
        "rate": 7.2,
        "updated_at": "2024-12-01T10:30:00Z"
      },
      {
        "from_currency": "EUR",
        "to_currency": "CNY",
        "rate": 7.8,
        "updated_at": "2024-12-01T10:30:00Z"
      }
    ]
  }
}
```

**状态码**: 200 OK

---

### 更新汇率
```http
POST /api/exchange-rates/update
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求参数**:
```json
{
  "from_currency": "USD",
  "to_currency": "CNY",
  "rate": 7.25
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "汇率更新成功",
  "data": {
    "rate": {
      "from_currency": "USD",
      "to_currency": "CNY",
      "rate": 7.25,
      "updated_at": "2024-12-01T10:30:00Z"
    }
  }
}
```

**状态码**: 200 OK

---

## 👥 用户管理接口

### 获取用户列表 (管理员)
```http
GET /api/users
```

**请求头**:
```
Authorization: Bearer <admin_token>
```

**查询参数**:
- `page` - 页码
- `limit` - 每页数量
- `role` - 角色筛选
- `search` - 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "用户名",
        "email": "邮箱地址",
        "company": "公司名称",
        "role": "user",
        "is_active": true,
        "created_at": "2024-12-01T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

**状态码**: 200 OK

---

### 更新用户状态 (管理员)
```http
PUT /api/users/:id/status
```

**请求头**:
```
Authorization: Bearer <admin_token>
```

**请求参数**:
```json
{
  "is_active": false
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户状态更新成功"
}
```

**状态码**: 200 OK

---

## 📊 数据分析接口

### 获取利润趋势
```http
GET /api/analytics/profit-trend
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `period` - 时间周期 (daily/weekly/monthly)
- `date_from` - 开始日期
- `date_to` - 结束日期

**响应示例**:
```json
{
  "success": true,
  "data": {
    "trend": [
      {
        "date": "2024-12-01",
        "total_profit": 1250.50,
        "profit_margin": 45.2
      }
    ]
  }
}
```

**状态码**: 200 OK

---

### 获取成本结构分析
```http
GET /api/analytics/cost-structure
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "structure": [
      {
        "category": "采购成本",
        "amount": 5000.00,
        "percentage": 60.0
      },
      {
        "category": "运费",
        "amount": 1500.00,
        "percentage": 18.0
      }
    ]
  }
}
```

**状态码**: 200 OK

---

## 🔧 系统接口

### 健康检查
```http
GET /api/health
```

**响应示例**:
```json
{
  "success": true,
  "message": "服务运行正常",
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-01T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**状态码**: 200 OK

---

### 获取系统信息
```http
GET /api/system/info
```

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "environment": "development",
    "database": "connected",
    "uptime": "2 days, 5 hours"
  }
}
```

**状态码**: 200 OK

---

## 📝 错误处理

### 错误响应格式
```json
{
  "success": false,
  "message": "错误描述",
  "errors": [
    {
      "field": "字段名",
      "message": "字段错误信息"
    }
  ]
}
```

### 常见HTTP状态码

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 请求成功 | GET, PUT, DELETE操作成功 |
| 201 | 创建成功 | POST创建资源成功 |
| 400 | 请求参数错误 | 验证失败、参数缺失 |
| 401 | 未授权 | Token无效或过期 |
| 403 | 权限不足 | 访问被拒绝 |
| 404 | 资源不存在 | 产品、用户不存在 |
| 409 | 资源冲突 | 用户名、SKU重复 |
| 500 | 服务器内部错误 | 数据库连接失败 |

---

## 🔒 安全说明

### 认证要求
- 除登录、注册接口外，所有接口都需要在请求头中携带有效的JWT Token
- Token格式: `Authorization: Bearer <token>`

### 权限控制
- 普通用户只能访问自己的数据
- 管理员可以访问所有用户数据
- 敏感操作需要相应的角色权限

### 限流保护
- 登录接口: 15分钟内最多5次尝试
- 注册接口: 1小时内最多3次尝试
- 其他接口: 15分钟内最多100次请求

---

## 📚 使用示例

### 完整的产品管理流程

1. **用户登录获取Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "user@example.com", "password": "password123"}'
```

2. **创建产品**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试产品", "category": "electronics", "cost_price": 100}'
```

3. **获取产品列表**
```bash
curl -X GET "http://localhost:3000/api/products?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

4. **计算利润**
```bash
curl -X POST http://localhost:3000/api/calculate/profit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "purchase_data": {...}, "selling_data": {...}}'
```

---

**最后更新**: 2024年12月  
**API版本**: v1.0.0 