# Cordys CRM 二次开发指南

## 📋 目录

1. [项目架构概览](#项目架构概览)
2. [后端架构深入分析](#后端架构深入分析)
3. [前端架构深入分析](#前端架构深入分析)
4. [核心业务模块分析](#核心业务模块分析)
5. [权限系统详解](#权限系统详解)
6. [数据库设计](#数据库设计)
7. [二次开发最佳实践](#二次开发最佳实践)
8. [扩展点识别](#扩展点识别)

---

## 项目架构概览

### 技术栈总览

**后端**:
- Spring Boot 3.5.7 (Java 21)
- MyBatis + PageHelper
- Apache Shiro 2.0.4 (认证授权)
- Redis + Redisson (缓存/分布式锁)
- Quartz (任务调度)
- Flyway (数据库版本管理)
- SpringDoc OpenAPI (API 文档)

**前端**:
- Vue.js 3.5.22
- Naive UI (Web端) / Vant UI (移动端)
- Pinia (状态管理)
- Vue Router 4
- Axios (HTTP 客户端)
- Vite (构建工具)

### 项目结构

```
bantu_cordyscrm/
├── backend/              # 后端模块
│   ├── app/             # 应用启动模块
│   ├── crm/             # 核心业务模块
│   └── framework/       # 框架基础模块
├── frontend/            # 前端模块
│   ├── packages/
│   │   ├── web/         # PC Web 应用
│   │   ├── mobile/       # 移动端应用
│   │   └── lib-shared/  # 共享库
└── installer/           # 安装部署脚本
```

---

## 后端架构深入分析

### 1. 模块划分

#### 1.1 app 模块
- **职责**: 应用启动入口
- **关键文件**: `Application.java`
- **配置**: 
  - 排除自动配置: Quartz, Ldap, Neo4j
  - 配置文件: `commons.properties`, `/opt/cordys/conf/cordys-crm.properties`

#### 1.2 framework 模块
- **职责**: 提供框架级基础能力
- **包含**:
  - 安全框架 (`cn.cordys.security`)
  - 通用工具 (`cn.cordys.common`)
  - MyBatis 扩展 (`cn.cordys.mybatis`)
  - Excel 处理 (`cn.cordys.excel`)
  - 文件处理 (`cn.cordys.file`)

#### 1.3 crm 模块
- **职责**: 核心业务逻辑
- **子模块**:
  - `clue/` - 线索管理
  - `customer/` - 客户管理
  - `opportunity/` - 商机管理
  - `system/` - 系统管理
  - `follow/` - 跟进管理
  - `dashboard/` - 仪表盘
  - `integration/` - 第三方集成
  - `search/` - 搜索功能

### 2. 分层架构

```
Controller Layer (控制器层)
    ↓
Service Layer (服务层)
    ↓
Mapper Layer (数据访问层)
    ↓
Database (数据库)
```

#### 2.1 Controller 层模式

**标准 Controller 结构**:
```java
@Tag(name = "客户")
@RestController
@RequestMapping("/account")
public class CustomerController {
    
    @Resource
    private CustomerService customerService;
    
    @PostMapping("/page")
    @RequiresPermissions(PermissionConstants.CUSTOMER_MANAGEMENT_READ)
    @Operation(summary = "客户列表")
    public PagerWithOption<List<CustomerListResponse>> list(
        @Validated @RequestBody CustomerPageRequest request
    ) {
        // 1. 解析条件过滤
        ConditionFilterUtils.parseCondition(request);
        
        // 2. 获取数据权限
        DeptDataPermissionDTO deptDataPermission = dataScopeService.getDeptDataPermission(
            SessionUtils.getUserId(),
            OrganizationContext.getOrganizationId(),
            request.getViewId(),
            PermissionConstants.CUSTOMER_MANAGEMENT_READ
        );
        
        // 3. 调用服务层
        return customerService.list(request, SessionUtils.getUserId(), 
            OrganizationContext.getOrganizationId(), deptDataPermission);
    }
}
```

**关键注解**:
- `@RequiresPermissions`: Shiro 权限控制
- `@Validated`: 参数校验
- `@Operation`: Swagger API 文档

#### 2.2 Service 层模式

**标准 Service 结构**:
```java
@Service
@Transactional(rollbackFor = Exception.class)
public class CustomerService {
    
    @Resource
    private BaseMapper<Customer> customerMapper;
    
    @Resource
    private ExtCustomerMapper extCustomerMapper;
    
    // 业务方法
    public Customer add(CustomerAddRequest request, String userId, String orgId) {
        // 1. 参数校验
        // 2. 业务逻辑处理
        // 3. 数据持久化
        // 4. 操作日志记录
        // 5. 返回结果
    }
}
```

**设计模式**:
- **事务管理**: `@Transactional` 确保数据一致性
- **依赖注入**: 使用 `@Resource` 注入依赖
- **操作日志**: 通过 AOP 自动记录 (`@OperationLog`)

#### 2.3 Mapper 层模式

**BaseMapper**: 提供基础 CRUD 操作
```java
public interface BaseMapper<T> {
    int insert(T entity);
    int updateById(T entity);
    int deleteById(String id);
    T selectById(String id);
    // ...
}
```

**ExtMapper**: 扩展 Mapper，提供复杂查询
```java
public interface ExtCustomerMapper {
    List<CustomerListResponse> selectList(CustomerPageRequest request);
    // 自定义 SQL 查询
}
```

### 3. 安全架构

#### 3.1 Shiro 配置

**核心配置类**: `ShiroConfig.java`

**过滤器链**:
```
preApikey → apikey → csrf → authc
```

**自定义 Realm**: `LocalRealm`
- 认证: `doGetAuthenticationInfo()`
- 授权: `doGetAuthorizationInfo()`
- 权限检查: `isPermitted()`

#### 3.2 权限常量

**权限命名规范**: `模块:操作`
```java
// 示例
CUSTOMER_MANAGEMENT_READ = "CUSTOMER_MANAGEMENT:READ"
CUSTOMER_MANAGEMENT_ADD = "CUSTOMER_MANAGEMENT:ADD"
CUSTOMER_MANAGEMENT_UPDATE = "CUSTOMER_MANAGEMENT:UPDATE"
CUSTOMER_MANAGEMENT_DELETE = "CUSTOMER_MANAGEMENT:DELETE"
```

#### 3.3 多租户支持

**组织上下文**: `OrganizationContext`
- 使用 `ThreadLocal` 存储组织ID
- 通过 `Organization-Id` HTTP 头传递
- 自动权限校验

**实现原理**:
```java
public class OrganizationContext {
    private static final ThreadLocal<String> ORGANIZATION_ID = 
        new InheritableThreadLocal<>();
    
    public static String getOrganizationId() {
        // 1. 从 ThreadLocal 获取
        // 2. 从用户会话获取
        // 3. 权限校验
        // 4. 返回组织ID
    }
}
```

### 4. 数据权限

**数据权限服务**: `DataScopeService`
- 支持部门级数据权限
- 支持用户级数据权限
- 支持自定义视图权限

**权限类型**:
- `ALL`: 全部数据
- `DEPT`: 部门数据
- `DEPT_AND_SUB`: 部门及子部门数据
- `SELF`: 仅自己数据

---

## 前端架构深入分析

### 1. 项目结构

```
frontend/packages/
├── web/                 # PC Web 应用
│   ├── src/
│   │   ├── api/        # API 接口
│   │   ├── views/      # 页面组件
│   │   ├── components/ # 业务组件
│   │   ├── router/     # 路由配置
│   │   ├── store/      # 状态管理
│   │   └── utils/      # 工具函数
├── mobile/              # 移动端应用
└── lib-shared/          # 共享库
    ├── api/            # API 封装
    ├── models/         # 数据模型
    ├── enums/          # 枚举定义
    └── method/         # 工具方法
```

### 2. API 封装

#### 2.1 HTTP 客户端

**Axios 封装**: `lib-shared/api/http/Axios.ts`

**特性**:
- 请求/响应拦截器
- 自动错误处理
- 请求取消机制
- 文件上传支持

**使用示例**:
```typescript
import { defHttp } from '@/api/http';

// GET 请求
const data = await defHttp.get<CustomerListResponse>({
  url: '/account/page',
  params: request
});

// POST 请求
const result = await defHttp.post<Customer>({
  url: '/account/add',
  data: request
});
```

#### 2.2 API 模块化

**模块划分**:
- `customer.ts` - 客户相关 API
- `opportunity.ts` - 商机相关 API
- `clue.ts` - 线索相关 API
- `sys.ts` - 系统相关 API

**URL 管理**: `requrls/` 目录统一管理 API 路径

### 3. 状态管理

**Pinia Store 结构**:
```typescript
// store/modules/user.ts
export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: '',
    organizationId: ''
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  
  actions: {
    async login(credentials) {
      // 登录逻辑
    },
    
    async logout() {
      // 登出逻辑
    }
  },
  
  persist: true // 持久化存储
});
```

### 4. 路由管理

**路由结构**:
```typescript
// router/routes/
├── business/    # 业务路由
├── system/      # 系统路由
└── base/        # 基础路由
```

**路由守卫**: `router/guard/index.ts`
- 认证检查
- 权限验证
- 组织切换

### 5. 组件设计

**组件分类**:
- `business/` - 业务组件
- `pure/` - 纯 UI 组件

**组件规范**:
- 使用 Composition API
- TypeScript 类型定义
- Props 验证
- 事件命名规范

---

## 核心业务模块分析

### 1. 客户管理模块

#### 1.1 核心实体

**Customer (客户)**:
```java
@Table(name = "customer")
public class Customer extends BaseModel {
    private String name;              // 客户名称
    private String owner;            // 负责人
    private String poolId;            // 公海ID
    private Boolean inSharedPool;     // 是否在公海池
    private String organizationId;     // 组织ID
    private String follower;          // 最新跟进人
    private Long followTime;          // 最新跟进时间
}
```

#### 1.2 核心功能

**客户 CRUD**:
- `add()` - 添加客户
- `update()` - 更新客户
- `delete()` - 删除客户
- `get()` - 获取客户详情
- `list()` - 客户列表（支持分页、筛选）

**公海管理**:
- `toPool()` - 移入公海
- `pick()` - 从公海领取
- `assign()` - 分配客户

**批量操作**:
- `batchTransfer()` - 批量转移
- `batchDelete()` - 批量删除
- `batchUpdate()` - 批量更新

**导入导出**:
- `export()` - 导出客户
- `import()` - 导入客户
- `downloadImportTpl()` - 下载导入模板

#### 1.3 数据权限

**权限控制点**:
- 列表查询: 根据数据权限过滤
- 详情查看: 权限校验
- 操作权限: `@RequiresPermissions` 注解

### 2. 商机管理模块

#### 2.1 核心实体

**Opportunity (商机)**:
```java
@Table(name = "opportunity")
public class Opportunity extends BaseModel {
    private String customerId;        // 客户ID
    private String name;              // 商机名称
    private BigDecimal amount;        // 金额
    private BigDecimal possible;      // 可能性
    private List<String> products;    // 意向产品
    private String stage;             // 商机阶段
    private String owner;             // 责任人
    private Long expectedEndTime;     // 结束时间
}
```

#### 2.2 核心功能

**商机管理**:
- 商机 CRUD
- 阶段管理
- 阶段看板（拖拽排序）
- 商机关联联系人

**统计分析**:
- 商机统计
- 图表分析
- 数据导出

### 3. 线索管理模块

**与客户管理类似，但针对线索（Leads）**

### 4. 系统管理模块

#### 4.1 用户管理
- 用户 CRUD
- 角色分配
- 组织关联
- 密码重置

#### 4.2 组织管理
- 组织树结构
- 组织配置
- 组织用户管理

#### 4.3 角色权限
- 角色 CRUD
- 权限分配
- 数据权限配置

#### 4.4 模块配置
- 表单设计
- 字段配置
- 视图配置

---

## 权限系统详解

### 1. 权限模型

**三层权限模型**:
1. **功能权限**: 控制功能访问 (`@RequiresPermissions`)
2. **数据权限**: 控制数据范围 (`DataScopeService`)
3. **字段权限**: 控制字段可见性 (`ModuleFormCacheService`)

### 2. 权限常量定义

**位置**: `PermissionConstants.java`

**命名规范**:
```
模块名:操作类型
```

**示例**:
```java
CUSTOMER_MANAGEMENT_READ = "CUSTOMER_MANAGEMENT:READ"
CUSTOMER_MANAGEMENT_ADD = "CUSTOMER_MANAGEMENT:ADD"
CUSTOMER_MANAGEMENT_UPDATE = "CUSTOMER_MANAGEMENT:UPDATE"
CUSTOMER_MANAGEMENT_DELETE = "CUSTOMER_MANAGEMENT:DELETE"
```

### 3. 权限检查流程

```
请求 → Shiro Filter → AuthFilter → Controller
                              ↓
                    @RequiresPermissions
                              ↓
                    PermissionUtils.hasPermission()
                              ↓
                    权限缓存/数据库查询
```

### 4. 数据权限实现

**数据权限类型**:
- `ALL`: 全部数据
- `DEPT`: 部门数据
- `DEPT_AND_SUB`: 部门及子部门
- `SELF`: 仅自己

**实现方式**:
```java
DeptDataPermissionDTO deptDataPermission = 
    dataScopeService.getDeptDataPermission(
        userId,
        organizationId,
        viewId,
        permission
    );
```

---

## 数据库设计

### 1. 核心表结构

#### 1.1 客户表 (customer)
```sql
CREATE TABLE customer (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner VARCHAR(32),
    pool_id VARCHAR(32),
    organization_id VARCHAR(32) NOT NULL,
    in_shared_pool BIT(1) DEFAULT 0,
    -- 基础字段
    create_time BIGINT NOT NULL,
    update_time BIGINT NOT NULL,
    create_user VARCHAR(32) NOT NULL,
    update_user VARCHAR(32) NOT NULL
);
```

#### 1.2 商机表 (opportunity)
```sql
CREATE TABLE opportunity (
    id VARCHAR(32) PRIMARY KEY,
    customer_id VARCHAR(32),
    name VARCHAR(255),
    amount DECIMAL(18,2),
    possible DECIMAL(5,2),
    stage VARCHAR(32),
    owner VARCHAR(32),
    organization_id VARCHAR(32) NOT NULL
);
```

#### 1.3 用户表 (sys_user)
```sql
CREATE TABLE sys_user (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    password VARCHAR(255),
    last_organization_id VARCHAR(32)
);
```

### 2. 数据库版本管理

**工具**: Flyway

**迁移脚本位置**: 
```
backend/crm/src/main/resources/migration/
├── 1.0.0/
│   ├── ddl/    # 数据定义
│   └── dml/    # 数据迁移
├── 1.0.1/
└── ...
```

**命名规范**: `V{version}_{序号}__{描述}.sql`

### 3. 扩展字段机制

**动态字段表**:
- `customer_field` - 客户扩展字段
- `customer_field_blob` - 大字段存储
- `opportunity_field` - 商机扩展字段

**设计优势**:
- 支持自定义字段
- 无需修改表结构
- 灵活配置

---

## 二次开发最佳实践

### 1. 添加新业务模块

#### 步骤 1: 创建 Domain 实体
```java
@Data
@Table(name = "your_module")
public class YourModule extends BaseModel {
    private String name;
    // 其他字段
}
```

#### 步骤 2: 创建 Mapper
```java
public interface YourModuleMapper extends BaseMapper<YourModule> {
    // 基础 CRUD 已继承
}

public interface ExtYourModuleMapper {
    // 扩展查询方法
    List<YourModuleResponse> selectList(YourModulePageRequest request);
}
```

#### 步骤 3: 创建 Service
```java
@Service
@Transactional(rollbackFor = Exception.class)
public class YourModuleService {
    
    @Resource
    private BaseMapper<YourModule> mapper;
    
    @OperationLog(module = LogModule.YOUR_MODULE, type = LogType.ADD)
    public YourModule add(YourModuleAddRequest request, String userId, String orgId) {
        // 业务逻辑
    }
}
```

#### 步骤 4: 创建 Controller
```java
@Tag(name = "你的模块")
@RestController
@RequestMapping("/your-module")
public class YourModuleController {
    
    @Resource
    private YourModuleService service;
    
    @PostMapping("/add")
    @RequiresPermissions("YOUR_MODULE:ADD")
    @Operation(summary = "添加")
    public YourModule add(@Validated @RequestBody YourModuleAddRequest request) {
        return service.add(request, 
            SessionUtils.getUserId(), 
            OrganizationContext.getOrganizationId());
    }
}
```

#### 步骤 5: 添加权限常量
```java
// PermissionConstants.java
public static final String YOUR_MODULE_READ = "YOUR_MODULE:READ";
public static final String YOUR_MODULE_ADD = "YOUR_MODULE:ADD";
// ...
```

#### 步骤 6: 数据库迁移
```sql
-- migration/1.x.x/ddl/V1.x.x_1__your_module.sql
CREATE TABLE your_module (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255),
    organization_id VARCHAR(32) NOT NULL,
    create_time BIGINT NOT NULL,
    -- ...
);
```

### 2. 扩展现有模块

#### 2.1 添加新字段
- **方式 1**: 使用扩展字段表（推荐）
- **方式 2**: 数据库迁移添加列

#### 2.2 添加新功能
- 在现有 Service 中添加方法
- 在现有 Controller 中添加端点
- 保持代码风格一致

### 3. 前端开发

#### 3.1 添加新页面

**步骤 1**: 创建页面组件
```vue
<!-- views/your-module/index.vue -->
<template>
  <div>Your Module Page</div>
</template>

<script setup lang="ts">
// 组件逻辑
</script>
```

**步骤 2**: 添加路由
```typescript
// router/routes/your-module.ts
export default {
  path: '/your-module',
  name: 'YourModule',
  component: () => import('@/views/your-module/index.vue'),
  meta: {
    requiresAuth: true,
    permission: 'YOUR_MODULE:READ'
  }
};
```

**步骤 3**: 添加 API
```typescript
// api/modules/your-module.ts
export const yourModuleApi = {
  list: (params: YourModulePageRequest) => 
    defHttp.post<YourModuleListResponse>({
      url: '/your-module/page',
      data: params
    })
};
```

### 4. 代码规范

#### 4.1 命名规范
- **类名**: 大驼峰 (PascalCase)
- **方法名**: 小驼峰 (camelCase)
- **常量**: 大写下划线 (UPPER_SNAKE_CASE)
- **数据库表**: 小写下划线 (snake_case)

#### 4.2 注释规范
```java
/**
 * 类/方法描述
 * 
 * @param param 参数说明
 * @return 返回值说明
 * @author 作者
 * @date 日期
 */
```

#### 4.3 异常处理
```java
// 使用自定义异常
throw new GenericException(CrmHttpResultCode.ERROR, "错误信息");

// 使用国际化
throw new GenericException(CrmHttpResultCode.ERROR, 
    Translator.get("error.message.key"));
```

---

## 扩展点识别

### 1. 可扩展的接口

#### 1.1 自定义过滤器
```java
// 实现 Filter 接口
public class CustomFilter implements Filter {
    // 自定义逻辑
}

// 在 ShiroConfig 中注册
filters.put("custom", new CustomFilter());
```

#### 1.2 自定义 Realm
```java
// 扩展 LocalRealm
public class CustomRealm extends LocalRealm {
    // 自定义认证/授权逻辑
}
```

#### 1.3 自定义拦截器
```java
// 实现 HandlerInterceptor
public class CustomInterceptor implements HandlerInterceptor {
    // 自定义拦截逻辑
}
```

### 2. 可扩展的服务

#### 2.1 数据权限扩展
- 实现 `DataScopeService` 接口
- 自定义数据权限规则

#### 2.2 通知服务扩展
- 实现 `NoticeSendService` 接口
- 支持多种通知渠道

#### 2.3 导入导出扩展
- 实现 `ExcelImportHandler`
- 自定义导入逻辑

### 3. 配置扩展点

#### 3.1 模块配置
- 表单配置 (`ModuleForm`)
- 字段配置 (`ModuleField`)
- 视图配置 (`UserView`)

#### 3.2 系统配置
- 组织配置 (`OrganizationConfig`)
- 字典配置 (`Dict`)

### 4. 集成扩展点

#### 4.1 第三方集成
- 企业微信 (`integration/wecom/`)
- 钉钉 (`integration/dingtalk/`)
- 飞书 (`integration/lark/`)
- SSO (`integration/sso/`)

#### 4.2 AI 集成
- MCP Server (`integration/agent/`)
- MaxKB 集成
- SQLBot 集成

---

## 开发环境搭建

### 1. 后端环境

**要求**:
- JDK 21
- Maven 3.6+
- MySQL 8.0+
- Redis 6.0+

**启动步骤**:
```bash
# 1. 安装依赖
./mvnw install -N

# 2. 构建后端
./mvnw clean install -DskipTests --file backend/pom.xml

# 3. 配置数据库
# 修改 application.properties

# 4. 启动应用
cd backend/app
mvn spring-boot:run
```

### 2. 前端环境

**要求**:
- Node.js 18+
- pnpm 8+

**启动步骤**:
```bash
# 1. 安装依赖
cd frontend
pnpm install

# 2. 启动开发服务器
cd packages/web
pnpm dev
```

### 3. 数据库初始化

**Flyway 自动执行迁移脚本**

**手动初始化**:
```bash
# 查看迁移状态
mvn flyway:info

# 执行迁移
mvn flyway:migrate
```

---

## 常见问题

### 1. 权限问题
- **问题**: `@RequiresPermissions` 不生效
- **解决**: 检查权限常量定义，确保用户有对应权限

### 2. 组织上下文问题
- **问题**: `OrganizationContext.getOrganizationId()` 返回 null
- **解决**: 确保请求头包含 `Organization-Id`，或用户有默认组织

### 3. 事务问题
- **问题**: 事务不生效
- **解决**: 确保 Service 方法被 Spring 代理，避免内部调用

### 4. 前端 API 调用问题
- **问题**: 请求被拦截或返回 401
- **解决**: 检查 Token 是否有效，确保请求头包含认证信息

---

## 参考资料

### 官方文档
- [Spring Boot 文档](https://spring.io/projects/spring-boot)
- [Apache Shiro 文档](https://shiro.apache.org/)
- [Vue.js 文档](https://vuejs.org/)
- [Naive UI 文档](https://www.naiveui.com/)

### 项目文档
- `README.md` - 项目说明
- `BUILD.md` - 构建说明
- `CONTRIBUTING.md` - 贡献指南

---

## 总结

Cordys CRM 是一个架构清晰、设计良好的企业级 CRM 系统。二次开发时，建议：

1. **遵循现有架构模式**: 保持代码风格一致
2. **充分利用扩展点**: 使用配置而非硬编码
3. **注意权限控制**: 确保新功能有正确的权限控制
4. **保持数据隔离**: 注意多租户数据隔离
5. **编写测试**: 确保代码质量

祝开发顺利！🚀

