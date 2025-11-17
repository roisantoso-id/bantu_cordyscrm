# 二次开发快速检查清单

## 📝 开发流程检查清单

### 阶段 1: 数据库设计 ✅

- [ ] 创建数据库迁移脚本 `migration/X.X.X/ddl/VX.X.X_X__table_name.sql`
- [ ] 设计主表结构（包含基础字段：id, create_time, update_time, create_user, update_user, organization_id）
- [ ] 设计扩展字段表（如 `xxx_field`）
- [ ] 添加必要的索引
- [ ] 执行迁移脚本验证

### 阶段 2: 后端开发 ✅

#### 2.1 Domain 层
- [ ] 创建实体类 `domain/EntityName.java`
- [ ] 继承 `BaseModel`
- [ ] 添加 `@Table` 注解指定表名
- [ ] 添加 `@Schema` 注解用于 API 文档

#### 2.2 DTO 层
- [ ] 创建 `dto/request/EntityAddRequest.java`
- [ ] 创建 `dto/request/EntityUpdateRequest.java`
- [ ] 创建 `dto/request/EntityPageRequest.java` (继承 `BasePageRequest`)
- [ ] 创建 `dto/response/EntityListResponse.java`
- [ ] 创建 `dto/response/EntityDetailResponse.java`
- [ ] 添加 `@Validated` 和 `@NotNull/@NotBlank` 校验注解

#### 2.3 Mapper 层
- [ ] 创建 `mapper/ExtEntityMapper.java` 接口
- [ ] 创建 `mapper/ExtEntityMapper.xml` MyBatis 映射文件
- [ ] 实现列表查询方法（包含数据权限过滤）
- [ ] 实现详情查询方法
- [ ] 在 XML 中添加数据权限过滤逻辑

#### 2.4 Service 层
- [ ] 创建 `service/EntityService.java`
- [ ] 添加 `@Service` 和 `@Transactional` 注解
- [ ] 实现 `list()` 方法（分页查询）
- [ ] 实现 `get()` 方法（详情查询）
- [ ] 实现 `add()` 方法（添加，添加 `@OperationLog`）
- [ ] 实现 `update()` 方法（更新，添加 `@OperationLog`）
- [ ] 实现 `delete()` 方法（删除，添加 `@OperationLog`）
- [ ] 处理组织ID隔离
- [ ] 处理用户ID记录

#### 2.5 Controller 层
- [ ] 创建 `controller/EntityController.java`
- [ ] 添加 `@Tag` 注解用于 API 分组
- [ ] 添加 `@RequestMapping` 指定基础路径
- [ ] 实现列表接口 `POST /entity/page`
  - [ ] 添加 `@RequiresPermissions` 权限控制
  - [ ] 调用 `ConditionFilterUtils.parseCondition()`
  - [ ] 获取数据权限 `DataScopeService.getDeptDataPermission()`
- [ ] 实现详情接口 `GET /entity/get/{id}`
- [ ] 实现添加接口 `POST /entity/add`
- [ ] 实现更新接口 `POST /entity/update`
- [ ] 实现删除接口 `GET /entity/delete/{id}`
- [ ] 所有接口添加 `@Operation` 注解

#### 2.6 权限配置
- [ ] 在 `PermissionConstants.java` 添加权限常量
- [ ] 在 `permission.json` 添加权限描述
- [ ] 在 `LogModule.java` 添加日志模块常量（如需要）

### 阶段 3: 前端开发 ✅

#### 3.1 API 层
- [ ] 创建 `api/requrls/entity.ts` 定义 URL
- [ ] 创建 `api/modules/entity.ts` 封装 API 方法
- [ ] 实现 `getEntityList()` 方法
- [ ] 实现 `getEntity()` 方法
- [ ] 实现 `addEntity()` 方法
- [ ] 实现 `updateEntity()` 方法
- [ ] 实现 `deleteEntity()` 方法

#### 3.2 Model 层
- [ ] 创建 `models/entity.ts` 定义类型
- [ ] 定义 `EntityListItem` 接口
- [ ] 定义 `EntityDetail` 接口
- [ ] 定义 `EntityTableParams` 接口
- [ ] 定义 `SaveEntityParams` 接口
- [ ] 定义 `UpdateEntityParams` 接口

#### 3.3 View 层
- [ ] 创建 `views/entity/index.vue` 列表页面
  - [ ] 搜索表单
  - [ ] 数据表格
  - [ ] 分页组件
  - [ ] 添加/编辑按钮
  - [ ] 操作列（编辑/删除）
- [ ] 创建 `views/entity/components/EntityFormModal.vue` 表单组件
  - [ ] 表单验证
  - [ ] 提交逻辑
  - [ ] 成功回调

#### 3.4 路由配置
- [ ] 创建 `router/routes/entity.ts`
- [ ] 在 `router/routes/index.ts` 中引入
- [ ] 配置路由 meta（权限、标题等）

#### 3.5 菜单配置
- [ ] 在系统管理中添加菜单项
- [ ] 配置菜单权限

### 阶段 4: 测试验证 ✅

#### 4.1 后端测试
- [ ] 启动后端服务
- [ ] 访问 Swagger 文档验证接口
- [ ] 测试列表接口（分页、筛选）
- [ ] 测试详情接口
- [ ] 测试添加接口
- [ ] 测试更新接口
- [ ] 测试删除接口
- [ ] 测试权限控制
- [ ] 测试数据权限隔离

#### 4.2 前端测试
- [ ] 启动前端服务
- [ ] 访问页面验证显示
- [ ] 测试搜索功能
- [ ] 测试分页功能
- [ ] 测试添加功能
- [ ] 测试编辑功能
- [ ] 测试删除功能
- [ ] 测试权限控制（无权限时按钮隐藏）

#### 4.3 集成测试
- [ ] 完整业务流程测试
- [ ] 多租户数据隔离测试
- [ ] 权限边界测试

### 阶段 5: 代码质量 ✅

- [ ] 代码格式化（后端：Maven，前端：Prettier）
- [ ] 代码检查（后端：Sonar，前端：ESLint）
- [ ] 注释完善
- [ ] 异常处理完善
- [ ] 日志记录完善

### 阶段 6: 文档更新 ✅

- [ ] 更新 API 文档（Swagger 自动生成）
- [ ] 更新开发文档
- [ ] 更新用户手册（如需要）

---

## 🔍 代码模板快速参考

### 后端 Controller 模板

```java
@PostMapping("/page")
@RequiresPermissions(PermissionConstants.ENTITY_READ)
@Operation(summary = "列表")
public PagerWithOption<List<EntityListResponse>> list(
    @Validated @RequestBody EntityPageRequest request
) {
    ConditionFilterUtils.parseCondition(request);
    DeptDataPermissionDTO deptDataPermission = dataScopeService.getDeptDataPermission(
        SessionUtils.getUserId(),
        OrganizationContext.getOrganizationId(),
        request.getViewId(),
        PermissionConstants.ENTITY_READ
    );
    return entityService.list(request, SessionUtils.getUserId(), 
        OrganizationContext.getOrganizationId(), deptDataPermission);
}
```

### 前端 API 模板

```typescript
function getEntityList(data: EntityTableParams) {
  return CDR.post<CommonList<EntityListItem>>({ url: GetEntityListUrl, data });
}
```

### 前端页面模板

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEntityApi } from '@/api';

const entityApi = useEntityApi();
const tableData = ref<EntityListItem[]>([]);
const loading = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await entityApi.getEntityList({ current: 1, pageSize: 10 });
    tableData.value = res.data.list;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>
```

---

## ⚠️ 常见错误检查

- [ ] 忘记添加 `@RequiresPermissions` 权限控制
- [ ] 忘记调用 `ConditionFilterUtils.parseCondition()`
- [ ] 忘记获取数据权限 `DataScopeService.getDeptDataPermission()`
- [ ] 忘记设置 `organizationId` 进行数据隔离
- [ ] 忘记添加 `@OperationLog` 操作日志
- [ ] 忘记添加 `@Validated` 参数校验
- [ ] 忘记在 `PermissionConstants` 添加权限常量
- [ ] 忘记在 `permission.json` 添加权限描述
- [ ] 前端忘记添加权限控制
- [ ] 前端忘记处理错误情况

---

## 📚 相关文档

- [完整开发步骤指南](./DEVELOPMENT_STEPS.md)
- [二次开发指南](./SECONDARY_DEVELOPMENT_GUIDE.md)
- [API 文档](http://localhost:8081/swagger-ui.html)

---

**提示**: 开发时按照此清单逐项检查，确保不遗漏任何步骤！




