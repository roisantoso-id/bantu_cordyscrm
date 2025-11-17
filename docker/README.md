# Cordys CRM Docker 部署指南

## 📋 目录

1. [部署架构](#部署架构)
2. [快速开始](#快速开始)
3. [生产环境部署](#生产环境部署)
4. [开发环境部署](#开发环境部署)
5. [配置说明](#配置说明)
6. [常见问题](#常见问题)

---

## 部署架构

### 前后端分离架构

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ HTTP
       │
┌──────▼──────────┐      ┌──────────────┐
│  Frontend       │      │  Backend     │
│  (Nginx)        │──────▶│  (Spring)    │
│  Port: 80       │  API  │  Port: 8081  │
└─────────────────┘      └──────────────┘
```

### 服务说明

- **Frontend**: Nginx 服务器，提供前端静态资源和 API 代理
- **Backend**: Spring Boot 应用，提供 API 服务
- **Network**: Docker 网络，前后端服务通信

---

## 快速开始

### 1. 准备环境

```bash
# 确保已安装 Docker 和 Docker Compose
docker --version
docker-compose --version

# 创建数据目录
mkdir -p cordys-data/{conf,data,logs}
```

### 2. 复制配置文件

```bash
# 复制后端配置文件
cp installer/conf/cordys-crm.properties cordys-data/conf/
```

### 3. 构建和启动

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 4. 访问应用

- **前端**: http://localhost
- **后端 API**: http://localhost:8081
- **Swagger 文档**: http://localhost:8081/swagger-ui.html

---

## 生产环境部署

### 使用 docker-compose.yml

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 环境变量配置

创建 `.env` 文件：

```env
# 后端配置
BACKEND_PORT=8081
MCP_PORT=8082

# 前端配置
FRONTEND_PORT=80
VITE_API_BASE_URL=/api

# 数据库配置（如果使用外部数据库）
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=cordys-crm
MYSQL_USER=root
MYSQL_PASSWORD=CordysCRM@mysql

# Redis 配置（如果使用外部 Redis）
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CordysCRM@redis
```

### 使用外部数据库和 Redis

修改 `docker-compose.yml`：

```yaml
services:
  backend:
    # ... 其他配置
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/cordys-crm
      - SPRING_DATASOURCE_USERNAME=root
      - SPRING_DATASOURCE_PASSWORD=your_password
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
      - SPRING_DATA_REDIS_PASSWORD=your_redis_password

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: cordys-crm
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - cordys-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_redis_password
    volumes:
      - redis-data:/data
    networks:
      - cordys-network

volumes:
  mysql-data:
  redis-data:
```

---

## 开发环境部署

### 使用 docker-compose.dev.yml

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 开发模式特性

- **前端**: 使用 Vite 开发服务器，支持热重载
- **后端**: 支持远程调试（端口 5005）
- **代码挂载**: 代码变更实时生效

---

## 配置说明

### Nginx 配置

前端 Nginx 配置位于 `docker/frontend/nginx.conf`，主要功能：

1. **静态资源服务**: 提供前端构建产物
2. **API 代理**: 将 `/api/*` 请求代理到后端
3. **文件上传代理**: 处理文件上传请求
4. **SSE 支持**: 支持服务器推送事件

### 后端配置

后端配置文件位于 `cordys-data/conf/cordys-crm.properties`，主要配置：

- MySQL 连接配置
- Redis 连接配置
- MCP 服务配置
- 其他系统配置

### 网络配置

Docker Compose 创建了 `cordys-network` 网络，前后端服务通过服务名通信：

- 前端访问后端: `http://backend:8081`
- 后端访问其他服务: 通过服务名

---

## 常见问题

### Q1: 前端无法访问后端 API

**解决方案**:
1. 检查 Nginx 配置中的 `proxy_pass` 地址是否正确
2. 检查 Docker 网络是否正常: `docker network ls`
3. 检查后端服务是否启动: `docker-compose ps`

### Q2: 跨域问题

**解决方案**:
Nginx 配置中已包含 CORS 头设置，如果仍有问题，检查后端 CORS 配置。

### Q3: 文件上传失败

**解决方案**:
1. 检查 Nginx 配置中的 `client_max_body_size` 设置
2. 检查后端文件上传大小限制

### Q4: 前端页面刷新 404

**解决方案**:
Nginx 配置中已包含 `try_files` 配置，确保所有路由都返回 `index.html`。

### Q5: 如何修改 API 地址

**解决方案**:
1. 修改 `docker/frontend/nginx.conf` 中的 `proxy_pass` 地址
2. 或使用环境变量 `VITE_API_BASE_URL`（需要重新构建）

### Q6: 如何查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### Q7: 如何重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

### Q8: 如何更新代码

```bash
# 重新构建并启动
docker-compose up -d --build

# 仅重新构建特定服务
docker-compose build backend
docker-compose up -d backend
```

---

## 生产环境优化建议

### 1. 使用 HTTPS

配置 SSL 证书，修改 Nginx 配置支持 HTTPS。

### 2. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 3. 日志管理

配置日志轮转和集中管理：

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 健康检查

已配置健康检查，可以配合监控系统使用。

### 5. 备份策略

定期备份 `cordys-data` 目录：

```bash
# 备份数据
tar -czf cordys-backup-$(date +%Y%m%d).tar.gz cordys-data/

# 恢复数据
tar -xzf cordys-backup-YYYYMMDD.tar.gz
```

---

## 总结

通过 Docker Compose 可以轻松部署前后端分离的 Cordys CRM 系统。主要优势：

1. **前后端分离**: 独立部署，便于扩展
2. **易于管理**: 一键启动/停止所有服务
3. **环境隔离**: 开发/生产环境分离
4. **资源优化**: 可以独立扩展前后端资源

祝部署顺利！🚀




