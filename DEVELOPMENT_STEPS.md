# Cordys CRM 二次业务开发完整步骤指南

## 📋 目录

1. [开发环境准备](#开发环境准备)
2. [业务需求分析](#业务需求分析)
3. [数据库设计](#数据库设计)
4. [后端开发步骤](#后端开发步骤)
5. [前端开发步骤](#前端开发步骤)
6. [权限配置](#权限配置)
7. [测试验证](#测试验证)
8. [部署上线](#部署上线)

---

## 开发环境准备

### 1.1 后端环境

```bash
# 检查 Java 版本
java -version  # 需要 Java 21

# 检查 Maven
mvn -version  # 需要 Maven 3.6+

# 检查 MySQL
mysql --version  # 需要 MySQL 8.0+

# 检查 Redis
redis-cli --version  # 需要 Redis 6.0+
```

### 1.2 前端环境

```bash
# 检查 Node.js
node -v  # 需要 Node.js 18+

# 检查 pnpm
pnpm -v  # 需要 pnpm 8+

# 如果没有 pnpm，安装它
npm install -g pnpm
```

### 1.3 开发工具

- IDE: IntelliJ IDEA / VS Code
- 数据库工具: DBeaver / Navicat
- API 测试: Postman / Apifox
- Git: 版本控制

---

## 业务需求分析

### 2.1 需求梳理

假设我们要开发一个**订单管理模块**，需要：

1. **订单基本信息**
   - 订单编号、订单名称
   - 关联客户、关联商机
   - 订单金额、订单状态
   - 创建时间、更新时间

2. **订单功能**
   - 订单列表（分页、筛选、排序）
   - 订单详情
   - 订单创建/编辑/删除
   - 订单状态流转
   - 订单导出

3. **权限控制**
   - 查看权限
   - 创建权限
   - 编辑权限
   - 删除权限

---

## 数据库设计

### 3.1 创建数据库迁移脚本

**文件位置**: `backend/crm/src/main/resources/migration/1.3.3/ddl/V1.3.3_1__order.sql`

```sql
-- 订单表
CREATE TABLE `order` (
    `id` VARCHAR(32) NOT NULL COMMENT '订单ID',
    `order_no` VARCHAR(100) NOT NULL COMMENT '订单编号',
    `name` VARCHAR(255) NOT NULL COMMENT '订单名称',
    `customer_id` VARCHAR(32) COMMENT '客户ID',
    `opportunity_id` VARCHAR(32) COMMENT '商机ID',
    `amount` DECIMAL(18,2) COMMENT '订单金额',
    `status` VARCHAR(50) COMMENT '订单状态',
    `organization_id` VARCHAR(32) NOT NULL COMMENT '组织ID',
    `owner` VARCHAR(32) COMMENT '负责人',
    `create_time` BIGINT NOT NULL COMMENT '创建时间',
    `update_time` BIGINT NOT NULL COMMENT '更新时间',
    `create_user` VARCHAR(32) NOT NULL COMMENT '创建人',
    `update_user` VARCHAR(32) NOT NULL COMMENT '更新人',
    PRIMARY KEY (`id`),
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_opportunity_id` (`opportunity_id`),
    INDEX `idx_organization_id` (`organization_id`),
    INDEX `idx_owner` (`owner`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单扩展字段表（支持自定义字段）
CREATE TABLE `order_field` (
    `id` VARCHAR(32) NOT NULL COMMENT 'ID',
    `order_id` VARCHAR(32) NOT NULL COMMENT '订单ID',
    `field_key` VARCHAR(100) NOT NULL COMMENT '字段键',
    `field_value` TEXT COMMENT '字段值',
    `organization_id` VARCHAR(32) NOT NULL COMMENT '组织ID',
    PRIMARY KEY (`id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_organization_id` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单扩展字段表';
```

### 3.2 执行数据库迁移

```bash
# 启动应用，Flyway 会自动执行迁移脚本
# 或者手动执行
cd backend/app
mvn flyway:migrate
```

---

## 后端开发步骤

### 4.1 步骤 1: 创建 Domain 实体类

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/domain/Order.java`

```java
package cn.cordys.crm.order.domain;

import cn.cordys.common.domain.BaseModel;
import cn.cordys.common.util.BigDecimalNoTrailingZeroSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订单实体
 *
 * @author your-name
 * @date 2025-11-15
 */
@Data
@Table(name = "order")
public class Order extends BaseModel {

    @Schema(description = "订单编号")
    private String orderNo;

    @Schema(description = "订单名称")
    private String name;

    @Schema(description = "客户ID")
    private String customerId;

    @Schema(description = "商机ID")
    private String opportunityId;

    @Schema(description = "订单金额")
    @JsonSerialize(using = BigDecimalNoTrailingZeroSerializer.class)
    private BigDecimal amount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "组织ID")
    private String organizationId;

    @Schema(description = "负责人")
    private String owner;
}
```

**扩展字段实体**: `backend/crm/src/main/java/cn/cordys/crm/order/domain/OrderField.java`

```java
package cn.cordys.crm.order.domain;

import cn.cordys.common.domain.BaseModel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Table(name = "order_field")
public class OrderField extends BaseModel {
    
    @Schema(description = "订单ID")
    private String orderId;
    
    @Schema(description = "字段键")
    private String fieldKey;
    
    @Schema(description = "字段值")
    private String fieldValue;
    
    @Schema(description = "组织ID")
    private String organizationId;
}
```

### 4.2 步骤 2: 创建 DTO 类

#### 4.2.1 Request DTO

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/dto/request/OrderAddRequest.java`

```java
package cn.cordys.crm.order.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "订单添加请求")
public class OrderAddRequest {

    @NotBlank(message = "订单名称不能为空")
    @Schema(description = "订单名称", required = true)
    private String name;

    @Schema(description = "客户ID")
    private String customerId;

    @Schema(description = "商机ID")
    private String opportunityId;

    @NotNull(message = "订单金额不能为空")
    @Schema(description = "订单金额", required = true)
    private BigDecimal amount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "负责人")
    private String owner;
}
```

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/dto/request/OrderUpdateRequest.java`

```java
package cn.cordys.crm.order.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "订单更新请求")
public class OrderUpdateRequest {

    @NotBlank(message = "订单ID不能为空")
    @Schema(description = "订单ID", required = true)
    private String id;

    @Schema(description = "订单名称")
    private String name;

    @Schema(description = "订单金额")
    private BigDecimal amount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "负责人")
    private String owner;
}
```

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/dto/request/OrderPageRequest.java`

```java
package cn.cordys.crm.order.dto.request;

import cn.cordys.common.dto.BasePageRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "订单分页查询请求")
public class OrderPageRequest extends BasePageRequest {

    @Schema(description = "视图ID")
    private String viewId;

    @Schema(description = "订单名称（模糊查询）")
    private String name;

    @Schema(description = "客户ID")
    private String customerId;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "负责人")
    private String owner;
}
```

#### 4.2.2 Response DTO

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/dto/response/OrderListResponse.java`

```java
package cn.cordys.crm.order.dto.response;

import cn.cordys.common.domain.BaseModuleFieldValue;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Schema(description = "订单列表响应")
public class OrderListResponse {

    @Schema(description = "订单ID")
    private String id;

    @Schema(description = "订单编号")
    private String orderNo;

    @Schema(description = "订单名称")
    private String name;

    @Schema(description = "客户ID")
    private String customerId;

    @Schema(description = "客户名称")
    private String customerName;

    @Schema(description = "商机ID")
    private String opportunityId;

    @Schema(description = "订单金额")
    private BigDecimal amount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "负责人ID")
    private String owner;

    @Schema(description = "负责人名称")
    private String ownerName;

    @Schema(description = "创建人")
    private String createUser;

    @Schema(description = "创建人名称")
    private String createUserName;

    @Schema(description = "创建时间")
    private Long createTime;

    @Schema(description = "扩展字段")
    private List<BaseModuleFieldValue> moduleFields;
}
```

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/dto/response/OrderDetailResponse.java`

```java
package cn.cordys.crm.order.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Schema(description = "订单详情响应")
public class OrderDetailResponse {

    @Schema(description = "订单ID")
    private String id;

    @Schema(description = "订单编号")
    private String orderNo;

    @Schema(description = "订单名称")
    private String name;

    @Schema(description = "客户ID")
    private String customerId;

    @Schema(description = "客户名称")
    private String customerName;

    @Schema(description = "商机ID")
    private String opportunityId;

    @Schema(description = "订单金额")
    private BigDecimal amount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "负责人ID")
    private String owner;

    @Schema(description = "负责人名称")
    private String ownerName;

    @Schema(description = "扩展字段")
    private Map<String, Object> fields;
}
```

### 4.3 步骤 3: 创建 Mapper 接口

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/mapper/ExtOrderMapper.java`

```java
package cn.cordys.crm.order.mapper;

import cn.cordys.common.dto.DeptDataPermissionDTO;
import cn.cordys.crm.order.domain.Order;
import cn.cordys.crm.order.dto.request.OrderPageRequest;
import cn.cordys.crm.order.dto.response.OrderListResponse;
import cn.cordys.mybatis.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 订单 Mapper
 */
public interface ExtOrderMapper {

    /**
     * 查询订单列表
     */
    List<OrderListResponse> selectList(
        @Param("request") OrderPageRequest request,
        @Param("orgId") String orgId,
        @Param("userId") String userId,
        @Param("deptDataPermission") DeptDataPermissionDTO deptDataPermission
    );

    /**
     * 查询订单详情
     */
    OrderListResponse selectDetail(@Param("id") String id, @Param("orgId") String orgId);
}
```

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/mapper/ExtOrderMapper.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="cn.cordys.crm.order.mapper.ExtOrderMapper">

    <resultMap id="OrderListResultMap" type="cn.cordys.crm.order.dto.response.OrderListResponse">
        <id column="id" property="id"/>
        <result column="order_no" property="orderNo"/>
        <result column="name" property="name"/>
        <result column="customer_id" property="customerId"/>
        <result column="customer_name" property="customerName"/>
        <result column="opportunity_id" property="opportunityId"/>
        <result column="amount" property="amount"/>
        <result column="status" property="status"/>
        <result column="owner" property="owner"/>
        <result column="owner_name" property="ownerName"/>
        <result column="create_user" property="createUser"/>
        <result column="create_user_name" property="createUserName"/>
        <result column="create_time" property="createTime"/>
    </resultMap>

    <select id="selectList" resultMap="OrderListResultMap">
        SELECT 
            o.id,
            o.order_no,
            o.name,
            o.customer_id,
            c.name AS customer_name,
            o.opportunity_id,
            o.amount,
            o.status,
            o.owner,
            u.name AS owner_name,
            o.create_user,
            u2.name AS create_user_name,
            o.create_time
        FROM `order` o
        LEFT JOIN customer c ON o.customer_id = c.id
        LEFT JOIN sys_user u ON o.owner = u.id
        LEFT JOIN sys_user u2 ON o.create_user = u2.id
        WHERE o.organization_id = #{orgId}
        <if test="request.name != null and request.name != ''">
            AND o.name LIKE CONCAT('%', #{request.name}, '%')
        </if>
        <if test="request.customerId != null and request.customerId != ''">
            AND o.customer_id = #{request.customerId}
        </if>
        <if test="request.status != null and request.status != ''">
            AND o.status = #{request.status}
        </if>
        <if test="request.owner != null and request.owner != ''">
            AND o.owner = #{request.owner}
        </if>
        <!-- 数据权限过滤 -->
        <if test="deptDataPermission != null and deptDataPermission.scopeType != null">
            <choose>
                <when test="deptDataPermission.scopeType == 'SELF'">
                    AND o.owner = #{userId}
                </when>
                <when test="deptDataPermission.scopeType == 'DEPT'">
                    AND o.owner IN (
                        SELECT user_id FROM sys_organization_user 
                        WHERE organization_id = #{orgId} 
                        AND dept_id = #{deptDataPermission.deptId}
                    )
                </when>
            </choose>
        </if>
        ORDER BY o.create_time DESC
    </select>

    <select id="selectDetail" resultMap="OrderListResultMap">
        SELECT 
            o.id,
            o.order_no,
            o.name,
            o.customer_id,
            c.name AS customer_name,
            o.opportunity_id,
            o.amount,
            o.status,
            o.owner,
            u.name AS owner_name,
            o.create_user,
            u2.name AS create_user_name,
            o.create_time
        FROM `order` o
        LEFT JOIN customer c ON o.customer_id = c.id
        LEFT JOIN sys_user u ON o.owner = u.id
        LEFT JOIN sys_user u2 ON o.create_user = u2.id
        WHERE o.id = #{id} AND o.organization_id = #{orgId}
    </select>

</mapper>
```

### 4.4 步骤 4: 创建 Service 类

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/service/OrderService.java`

```java
package cn.cordys.crm.order.service;

import cn.cordys.aspectj.annotation.OperationLog;
import cn.cordys.aspectj.constants.LogModule;
import cn.cordys.aspectj.constants.LogType;
import cn.cordys.common.dto.DeptDataPermissionDTO;
import cn.cordys.common.pager.PageUtils;
import cn.cordys.common.pager.PagerWithOption;
import cn.cordys.common.service.DataScopeService;
import cn.cordys.common.uid.IDGenerator;
import cn.cordys.common.utils.ConditionFilterUtils;
import cn.cordys.crm.order.domain.Order;
import cn.cordys.crm.order.dto.request.OrderAddRequest;
import cn.cordys.crm.order.dto.request.OrderPageRequest;
import cn.cordys.crm.order.dto.request.OrderUpdateRequest;
import cn.cordys.crm.order.dto.response.OrderDetailResponse;
import cn.cordys.crm.order.dto.response.OrderListResponse;
import cn.cordys.crm.order.mapper.ExtOrderMapper;
import cn.cordys.mybatis.BaseMapper;
import cn.cordys.mybatis.lambda.LambdaQueryWrapper;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 订单服务
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class OrderService {

    @Resource
    private BaseMapper<Order> orderMapper;

    @Resource
    private ExtOrderMapper extOrderMapper;

    @Resource
    private DataScopeService dataScopeService;

    /**
     * 订单列表
     */
    public PagerWithOption<List<OrderListResponse>> list(
        OrderPageRequest request,
        String userId,
        String orgId,
        DeptDataPermissionDTO deptDataPermission
    ) {
        Page<Object> page = PageHelper.startPage(request.getCurrent(), request.getPageSize());
        List<OrderListResponse> list = extOrderMapper.selectList(request, orgId, userId, deptDataPermission);
        return PageUtils.setPageInfo(page, list);
    }

    /**
     * 订单详情
     */
    public OrderDetailResponse get(String id, String orgId) {
        OrderListResponse order = extOrderMapper.selectDetail(id, orgId);
        if (order == null) {
            throw new GenericException(CrmHttpResultCode.NOT_FOUND, "订单不存在");
        }
        
        OrderDetailResponse response = new OrderDetailResponse();
        // 复制属性
        BeanUtils.copyProperties(order, response);
        
        // 加载扩展字段
        // TODO: 加载扩展字段逻辑
        
        return response;
    }

    /**
     * 添加订单
     */
    @OperationLog(module = LogModule.ORDER, type = LogType.ADD)
    public Order add(OrderAddRequest request, String userId, String orgId) {
        Order order = new Order();
        order.setId(IDGenerator.nextId());
        order.setOrderNo(generateOrderNo(orgId));
        order.setName(request.getName());
        order.setCustomerId(request.getCustomerId());
        order.setOpportunityId(request.getOpportunityId());
        order.setAmount(request.getAmount());
        order.setStatus(request.getStatus() != null ? request.getStatus() : "DRAFT");
        order.setOwner(request.getOwner() != null ? request.getOwner() : userId);
        order.setOrganizationId(orgId);
        
        orderMapper.insert(order);
        return order;
    }

    /**
     * 更新订单
     */
    @OperationLog(module = LogModule.ORDER, type = LogType.UPDATE)
    public Order update(OrderUpdateRequest request, String userId, String orgId) {
        Order order = orderMapper.selectById(request.getId());
        if (order == null || !orgId.equals(order.getOrganizationId())) {
            throw new GenericException(CrmHttpResultCode.NOT_FOUND, "订单不存在");
        }

        if (StringUtils.isNotBlank(request.getName())) {
            order.setName(request.getName());
        }
        if (request.getAmount() != null) {
            order.setAmount(request.getAmount());
        }
        if (StringUtils.isNotBlank(request.getStatus())) {
            order.setStatus(request.getStatus());
        }
        if (StringUtils.isNotBlank(request.getOwner())) {
            order.setOwner(request.getOwner());
        }

        orderMapper.updateById(order);
        return order;
    }

    /**
     * 删除订单
     */
    @OperationLog(module = LogModule.ORDER, type = LogType.DELETE)
    public void delete(String id, String userId, String orgId) {
        Order order = orderMapper.selectById(id);
        if (order == null || !orgId.equals(order.getOrganizationId())) {
            throw new GenericException(CrmHttpResultCode.NOT_FOUND, "订单不存在");
        }
        orderMapper.deleteById(id);
    }

    /**
     * 生成订单编号
     */
    private String generateOrderNo(String orgId) {
        // 格式: ORD-YYYYMMDD-XXXXX
        String prefix = "ORD-" + System.currentTimeMillis() / 1000;
        return prefix + "-" + IDGenerator.nextId().substring(0, 5).toUpperCase();
    }
}
```

### 4.5 步骤 5: 创建 Controller 类

**文件位置**: `backend/crm/src/main/java/cn/cordys/crm/order/controller/OrderController.java`

```java
package cn.cordys.crm.order.controller;

import cn.cordys.common.constants.PermissionConstants;
import cn.cordys.common.dto.DeptDataPermissionDTO;
import cn.cordys.common.pager.PagerWithOption;
import cn.cordys.common.service.DataScopeService;
import cn.cordys.common.utils.ConditionFilterUtils;
import cn.cordys.context.OrganizationContext;
import cn.cordys.crm.order.domain.Order;
import cn.cordys.crm.order.dto.request.OrderAddRequest;
import cn.cordys.crm.order.dto.request.OrderPageRequest;
import cn.cordys.crm.order.dto.request.OrderUpdateRequest;
import cn.cordys.crm.order.dto.response.OrderDetailResponse;
import cn.cordys.crm.order.dto.response.OrderListResponse;
import cn.cordys.crm.order.service.OrderService;
import cn.cordys.security.SessionUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 订单控制器
 */
@Tag(name = "订单")
@RestController
@RequestMapping("/order")
public class OrderController {

    @Resource
    private OrderService orderService;

    @Resource
    private DataScopeService dataScopeService;

    @PostMapping("/page")
    @RequiresPermissions(PermissionConstants.ORDER_MANAGEMENT_READ)
    @Operation(summary = "订单列表")
    public PagerWithOption<List<OrderListResponse>> list(
        @Validated @RequestBody OrderPageRequest request
    ) {
        ConditionFilterUtils.parseCondition(request);
        DeptDataPermissionDTO deptDataPermission = dataScopeService.getDeptDataPermission(
            SessionUtils.getUserId(),
            OrganizationContext.getOrganizationId(),
            request.getViewId(),
            PermissionConstants.ORDER_MANAGEMENT_READ
        );
        return orderService.list(
            request,
            SessionUtils.getUserId(),
            OrganizationContext.getOrganizationId(),
            deptDataPermission
        );
    }

    @GetMapping("/get/{id}")
    @RequiresPermissions(PermissionConstants.ORDER_MANAGEMENT_READ)
    @Operation(summary = "订单详情")
    public OrderDetailResponse get(@PathVariable String id) {
        return orderService.get(id, OrganizationContext.getOrganizationId());
    }

    @PostMapping("/add")
    @RequiresPermissions(PermissionConstants.ORDER_MANAGEMENT_ADD)
    @Operation(summary = "添加订单")
    public Order add(@Validated @RequestBody OrderAddRequest request) {
        return orderService.add(
            request,
            SessionUtils.getUserId(),
            OrganizationContext.getOrganizationId()
        );
    }

    @PostMapping("/update")
    @RequiresPermissions(PermissionConstants.ORDER_MANAGEMENT_UPDATE)
    @Operation(summary = "更新订单")
    public Order update(@Validated @RequestBody OrderUpdateRequest request) {
        return orderService.update(
            request,
            SessionUtils.getUserId(),
            OrganizationContext.getOrganizationId()
        );
    }

    @GetMapping("/delete/{id}")
    @RequiresPermissions(PermissionConstants.ORDER_MANAGEMENT_DELETE)
    @Operation(summary = "删除订单")
    public void delete(@PathVariable String id) {
        orderService.delete(id, SessionUtils.getUserId(), OrganizationContext.getOrganizationId());
    }
}
```

### 4.6 步骤 6: 添加权限常量

**文件位置**: `backend/crm/src/main/java/cn/cordys/common/constants/PermissionConstants.java`

```java
// 在 PermissionConstants 类中添加

/*------ start: ORDER_MANAGEMENT ------*/
public static final String ORDER_MANAGEMENT_READ = "ORDER_MANAGEMENT:READ";
public static final String ORDER_MANAGEMENT_ADD = "ORDER_MANAGEMENT:ADD";
public static final String ORDER_MANAGEMENT_UPDATE = "ORDER_MANAGEMENT:UPDATE";
public static final String ORDER_MANAGEMENT_DELETE = "ORDER_MANAGEMENT:DELETE";
public static final String ORDER_MANAGEMENT_EXPORT = "ORDER_MANAGEMENT:EXPORT";
/*------ end: ORDER_MANAGEMENT ------*/
```

### 4.7 步骤 7: 添加日志模块常量

**文件位置**: `backend/crm/src/main/java/cn/cordys/aspectj/constants/LogModule.java`

```java
// 添加订单模块
ORDER("订单管理"),
```

---

## 前端开发步骤

### 5.1 步骤 1: 创建 API URL 定义

**文件位置**: `frontend/packages/lib-shared/api/requrls/order.ts`

```typescript
// 订单相关 API URL
export const GetOrderListUrl = '/order/page';
export const GetOrderUrl = '/order/get';
export const AddOrderUrl = '/order/add';
export const UpdateOrderUrl = '/order/update';
export const DeleteOrderUrl = '/order/delete';
```

### 5.2 步骤 2: 创建 API 接口

**文件位置**: `frontend/packages/lib-shared/api/modules/order.ts`

```typescript
import type { CordysAxios } from '@lib/shared/api/http/Axios';
import {
  GetOrderListUrl,
  GetOrderUrl,
  AddOrderUrl,
  UpdateOrderUrl,
  DeleteOrderUrl,
} from '@lib/shared/api/requrls/order';
import type {
  CommonList,
  TableQueryParams,
} from '@lib/shared/models/common';
import type {
  OrderListItem,
  OrderDetail,
  SaveOrderParams,
  UpdateOrderParams,
  OrderTableParams,
} from '@lib/shared/models/order';

export default function useOrderApi(CDR: CordysAxios) {
  // 获取订单列表
  function getOrderList(data: OrderTableParams) {
    return CDR.post<CommonList<OrderListItem>>({ url: GetOrderListUrl, data });
  }

  // 获取订单详情
  function getOrder(id: string) {
    return CDR.get<OrderDetail>({ url: `${GetOrderUrl}/${id}` });
  }

  // 添加订单
  function addOrder(data: SaveOrderParams) {
    return CDR.post({ url: AddOrderUrl, data });
  }

  // 更新订单
  function updateOrder(data: UpdateOrderParams) {
    return CDR.post({ url: UpdateOrderUrl, data });
  }

  // 删除订单
  function deleteOrder(id: string) {
    return CDR.get({ url: `${DeleteOrderUrl}/${id}` });
  }

  return {
    getOrderList,
    getOrder,
    addOrder,
    updateOrder,
    deleteOrder,
  };
}
```

### 5.3 步骤 3: 创建数据模型

**文件位置**: `frontend/packages/lib-shared/models/order.ts`

```typescript
import type { BaseTableItem } from './common';

// 订单列表项
export interface OrderListItem extends BaseTableItem {
  id: string;
  orderNo: string;
  name: string;
  customerId: string;
  customerName: string;
  opportunityId: string;
  amount: number;
  status: string;
  owner: string;
  ownerName: string;
  createUser: string;
  createUserName: string;
  createTime: number;
}

// 订单详情
export interface OrderDetail {
  id: string;
  orderNo: string;
  name: string;
  customerId: string;
  customerName: string;
  opportunityId: string;
  amount: number;
  status: string;
  owner: string;
  ownerName: string;
  fields: Record<string, any>;
}

// 订单表格参数
export interface OrderTableParams extends TableQueryParams {
  name?: string;
  customerId?: string;
  status?: string;
  owner?: string;
}

// 保存订单参数
export interface SaveOrderParams {
  name: string;
  customerId?: string;
  opportunityId?: string;
  amount: number;
  status?: string;
  owner?: string;
}

// 更新订单参数
export interface UpdateOrderParams {
  id: string;
  name?: string;
  amount?: number;
  status?: string;
  owner?: string;
}
```

### 5.4 步骤 4: 创建页面组件

**文件位置**: `frontend/packages/web/src/views/order/index.vue`

```vue
<template>
  <div class="order-page">
    <n-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>订单管理</span>
          <n-button type="primary" @click="handleAdd">
            <template #icon>
              <n-icon><AddOutline /></n-icon>
            </template>
            新建订单
          </n-button>
        </div>
      </template>

      <!-- 搜索表单 -->
      <n-form ref="searchFormRef" :model="searchForm" inline>
        <n-form-item label="订单名称" path="name">
          <n-input v-model:value="searchForm.name" placeholder="请输入订单名称" clearable />
        </n-form-item>
        <n-form-item label="订单状态" path="status">
          <n-select v-model:value="searchForm.status" placeholder="请选择状态" clearable />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="handleSearch">查询</n-button>
          <n-button @click="handleReset">重置</n-button>
        </n-form-item>
      </n-form>

      <!-- 数据表格 -->
      <n-data-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <!-- 添加/编辑对话框 -->
    <OrderFormModal
      v-model:show="formModalVisible"
      :form-data="formData"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NCard, NButton, NIcon, NForm, NFormItem, NInput, NSelect, NDataTable } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import { useOrderApi } from '@/api';
import type { OrderListItem, OrderTableParams, SaveOrderParams } from '@lib/shared/models/order';
import OrderFormModal from './components/OrderFormModal.vue';

const orderApi = useOrderApi();

// 搜索表单
const searchForm = ref<OrderTableParams>({
  current: 1,
  pageSize: 10,
});

// 表格数据
const tableData = ref<OrderListItem[]>([]);
const loading = ref(false);

// 分页
const pagination = ref({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
});

// 表格列
const columns = [
  { title: '订单编号', key: 'orderNo', width: 150 },
  { title: '订单名称', key: 'name', width: 200 },
  { title: '客户名称', key: 'customerName', width: 150 },
  { title: '订单金额', key: 'amount', width: 120 },
  { title: '订单状态', key: 'status', width: 100 },
  { title: '负责人', key: 'ownerName', width: 100 },
  { title: '创建时间', key: 'createTime', width: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: OrderListItem) => {
      return [
        h(NButton, { size: 'small', onClick: () => handleEdit(row) }, '编辑'),
        h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, '删除'),
      ];
    },
  },
];

// 表单对话框
const formModalVisible = ref(false);
const formData = ref<SaveOrderParams | null>(null);

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const res = await orderApi.getOrderList({
      ...searchForm.value,
      current: pagination.value.page,
      pageSize: pagination.value.pageSize,
    });
    tableData.value = res.data.list;
    pagination.value.itemCount = res.data.total;
  } catch (error) {
    console.error('加载订单列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.value.page = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.value = {
    current: 1,
    pageSize: 10,
  };
  handleSearch();
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.page = page;
  loadData();
};

const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize;
  pagination.value.page = 1;
  loadData();
};

// 添加
const handleAdd = () => {
  formData.value = null;
  formModalVisible.value = true;
};

// 编辑
const handleEdit = (row: OrderListItem) => {
  formData.value = { ...row } as any;
  formModalVisible.value = true;
};

// 删除
const handleDelete = async (row: OrderListItem) => {
  // 确认对话框
  // ...
  try {
    await orderApi.deleteOrder(row.id);
    window.$message.success('删除成功');
    loadData();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 表单成功回调
const handleFormSuccess = () => {
  formModalVisible.value = false;
  loadData();
};

onMounted(() => {
  loadData();
});
</script>
```

### 5.5 步骤 5: 创建表单组件

**文件位置**: `frontend/packages/web/src/views/order/components/OrderFormModal.vue`

```vue
<template>
  <n-modal v-model:show="show" preset="dialog" title="订单信息" :mask-closable="false">
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="80">
      <n-form-item label="订单名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入订单名称" />
      </n-form-item>
      <n-form-item label="客户" path="customerId">
        <n-select v-model:value="formData.customerId" placeholder="请选择客户" />
      </n-form-item>
      <n-form-item label="订单金额" path="amount">
        <n-input-number v-model:value="formData.amount" placeholder="请输入订单金额" :min="0" />
      </n-form-item>
      <n-form-item label="订单状态" path="status">
        <n-select v-model:value="formData.status" placeholder="请选择状态" />
      </n-form-item>
    </n-form>
    <template #action>
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleSubmit" :loading="submitting">确定</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NButton } from 'naive-ui';
import { useOrderApi } from '@/api';
import type { SaveOrderParams } from '@lib/shared/models/order';

const props = defineProps<{
  show: boolean;
  formData?: SaveOrderParams | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  success: [];
}>();

const orderApi = useOrderApi();
const formRef = ref();
const submitting = ref(false);

const formData = ref<SaveOrderParams>({
  name: '',
  customerId: '',
  amount: 0,
  status: 'DRAFT',
});

const rules = {
  name: [{ required: true, message: '请输入订单名称', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入订单金额', trigger: 'blur' }],
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      if (props.formData) {
        formData.value = { ...props.formData };
      } else {
        formData.value = {
          name: '',
          customerId: '',
          amount: 0,
          status: 'DRAFT',
        };
      }
    }
  }
);

const handleCancel = () => {
  emit('update:show', false);
};

const handleSubmit = async () => {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (props.formData?.id) {
      await orderApi.updateOrder(formData.value as any);
    } else {
      await orderApi.addOrder(formData.value);
    }
    window.$message.success('操作成功');
    emit('success');
  } catch (error) {
    console.error('提交失败:', error);
  } finally {
    submitting.value = false;
  }
};
</script>
```

### 5.6 步骤 6: 添加路由配置

**文件位置**: `frontend/packages/web/src/router/routes/order.ts`

```typescript
export default {
  path: '/order',
  name: 'Order',
  component: () => import('@/views/order/index.vue'),
  meta: {
    requiresAuth: true,
    permission: 'ORDER_MANAGEMENT:READ',
    title: '订单管理',
  },
};
```

**在路由入口文件中引入**:

```typescript
// router/routes/index.ts
import orderRoutes from './order';

export default [
  // ... 其他路由
  orderRoutes,
];
```

### 5.7 步骤 7: 添加菜单配置

在系统管理中添加菜单项，配置路由和权限。

---

## 权限配置

### 6.1 在权限配置文件中添加权限

**文件位置**: `backend/crm/src/main/resources/permission.json`

```json
{
  "ORDER_MANAGEMENT:READ": "订单管理-查看",
  "ORDER_MANAGEMENT:ADD": "订单管理-添加",
  "ORDER_MANAGEMENT:UPDATE": "订单管理-编辑",
  "ORDER_MANAGEMENT:DELETE": "订单管理-删除",
  "ORDER_MANAGEMENT:EXPORT": "订单管理-导出"
}
```

### 6.2 为角色分配权限

在系统管理 -> 角色管理中，为相应角色分配订单管理权限。

---

## 测试验证

### 7.1 后端测试

```bash
# 启动后端服务
cd backend/app
mvn spring-boot:run

# 访问 Swagger 文档
http://localhost:8081/swagger-ui.html
```

### 7.2 前端测试

```bash
# 启动前端服务
cd frontend/packages/web
pnpm dev

# 访问前端
http://localhost:5173
```

### 7.3 API 测试

使用 Postman 测试各个接口：
- POST `/order/page` - 订单列表
- GET `/order/get/{id}` - 订单详情
- POST `/order/add` - 添加订单
- POST `/order/update` - 更新订单
- GET `/order/delete/{id}` - 删除订单

---

## 部署上线

### 8.1 构建后端

```bash
cd backend
mvn clean package -DskipTests
```

### 8.2 构建前端

```bash
cd frontend
pnpm build
```

### 8.3 Docker 构建

```bash
docker build -t cordys-crm:latest -f installer/Dockerfile .
```

### 8.4 运行容器

```bash
docker run -d \
  --name cordys-crm \
  -p 8081:8081 \
  -p 8082:8082 \
  -v ~/cordys:/opt/cordys \
  cordys-crm:latest
```

---

## 开发检查清单

### 后端检查项
- [ ] Domain 实体类创建
- [ ] DTO 类创建（Request/Response）
- [ ] Mapper 接口和 XML 创建
- [ ] Service 类实现
- [ ] Controller 类实现
- [ ] 权限常量添加
- [ ] 数据库迁移脚本创建
- [ ] 单元测试编写

### 前端检查项
- [ ] API URL 定义
- [ ] API 接口封装
- [ ] 数据模型定义
- [ ] 页面组件创建
- [ ] 表单组件创建
- [ ] 路由配置
- [ ] 菜单配置
- [ ] 权限控制

### 通用检查项
- [ ] 代码规范检查
- [ ] 功能测试
- [ ] 权限测试
- [ ] 性能测试
- [ ] 文档更新

---

## 常见问题

### Q1: 如何添加自定义字段？
A: 使用扩展字段表（如 `order_field`），通过模块配置管理。

### Q2: 如何实现数据权限？
A: 在 Service 层调用 `DataScopeService.getDeptDataPermission()` 获取数据权限，在 Mapper XML 中添加权限过滤条件。

### Q3: 如何添加操作日志？
A: 在 Service 方法上添加 `@OperationLog` 注解。

### Q4: 前端如何调用 API？
A: 使用 `useOrderApi()` hook，通过 `CDR.post()` 等方法调用。

---

## 总结

按照以上步骤，您可以完整地开发一个新的业务模块。关键点：

1. **遵循现有架构模式** - 保持代码风格一致
2. **完整的权限控制** - 确保功能安全
3. **数据权限隔离** - 多租户支持
4. **前后端分离** - API 接口清晰
5. **可扩展设计** - 支持自定义字段

祝开发顺利！🚀


