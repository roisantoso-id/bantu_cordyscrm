# Cordys CRM Docker 前后端分离部署指南

## 🎯 概述

本文档介绍如何使用 Docker 将 Cordys CRM 前后端分离部署。

## 📁 文件结构

```
bantu_cordyscrm/
├── docker/
│   ├── frontend/
│   │   ├── Dockerfile          # 前端生产环境 Dockerfile
│   │   ├── Dockerfile.dev      # 前端开发环境 Dockerfile
│   │   ├── nginx.conf          # Nginx 配置文件
│   │   └── docker-entrypoint.sh # 入口脚本
│   ├── backend/
│   │   └── Dockerfile          # 后端 Dockerfile
│   ├── start.sh                # 快速启动脚本
│   └── README.md               # 详细文档
├── docker-compose.yml          # 生产环境编排文件
├── docker-compose.dev.yml      # 开发环境编排文件
└── cordys-data/                # 数据目录（自动创建）
    ├── conf/                   # 配置文件
    ├── data/                   # 数据文件
    └── logs/                   # 日志文件
```

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

```bash
# 执行启动脚本
./docker/start.sh
```

### 方式二：手动执行

```bash
# 1. 创建数据目录
mkdir -p cordys-data/{conf,data,logs}

# 2. 复制配置文件
cp installer/conf/cordys-crm.properties cordys-data/conf/

# 3. 构建并启动
docker compose up -d --build

# 或者使用旧版本命令
docker-compose up -d --build
```

## 📋 服务说明

### 服务列表

| 服务名 | 端口 | 说明 |
|--------|------|------|
| frontend | 80 | 前端服务（Nginx） |
| backend | 8081 | 后端 API 服务 |
| backend | 8082 | MCP 服务端口 |

### 网络架构

```
浏览器 → Nginx (80) → Spring Boot (8081)
                ↓
            API 代理
```

## 🔧 配置说明

### 前端配置

前端使用 Nginx 部署，配置文件：`docker/frontend/nginx.conf`

主要功能：
- 静态资源服务
- API 代理（`/api/*` → `http://backend:8081`）
- 文件上传代理
- SSE 支持

### 后端配置

后端配置文件：`cordys-data/conf/cordys-crm.properties`

可以修改以下配置：
- MySQL 连接
- Redis 连接
- MCP 服务配置

## 📝 常用命令

### 启动服务

```bash
docker compose up -d
```

### 停止服务

```bash
docker compose down
```

### 查看日志

```bash
# 查看所有日志
docker compose logs -f

# 查看后端日志
docker compose logs -f backend

# 查看前端日志
docker compose logs -f frontend
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart backend
docker compose restart frontend
```

### 重新构建

```bash
# 重新构建所有服务
docker compose build

# 重新构建特定服务
docker compose build backend
docker compose build frontend

# 重新构建并启动
docker compose up -d --build
```

### 查看服务状态

```bash
docker compose ps
```

## 🔍 验证部署

### 1. 检查服务状态

```bash
docker compose ps
```

应该看到两个服务都在运行：
- `cordys-crm-backend` (Up)
- `cordys-crm-frontend` (Up)

### 2. 检查端口

```bash
# 检查端口占用
netstat -tlnp | grep -E '80|8081'
```

### 3. 访问服务

- **前端**: http://localhost
- **后端健康检查**: http://localhost:8081/actuator/health
- **Swagger 文档**: http://localhost:8081/swagger-ui.html

### 4. 测试 API

```bash
# 测试后端 API
curl http://localhost:8081/actuator/health

# 通过前端代理测试
curl http://localhost/api/actuator/health
```

## 🐛 故障排查

### 问题 1: 前端无法访问后端

**检查步骤**:
1. 确认后端服务运行: `docker compose ps`
2. 检查网络连接: `docker network inspect cordys-crm_cordys-network`
3. 查看后端日志: `docker compose logs backend`
4. 测试后端直接访问: `curl http://localhost:8081/actuator/health`

**解决方案**:
- 检查 Nginx 配置中的 `proxy_pass` 地址
- 确认 Docker 网络正常

### 问题 2: 端口冲突

**解决方案**:
修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # 改为其他端口
  backend:
    ports:
      - "18081:8081"  # 改为其他端口
```

### 问题 3: 文件权限问题

**解决方案**:
```bash
# 修复数据目录权限
sudo chown -R $USER:$USER cordys-data/
chmod -R 755 cordys-data/
```

### 问题 4: 构建失败

**解决方案**:
```bash
# 清理构建缓存
docker compose down
docker system prune -a

# 重新构建
docker compose build --no-cache
```

## 🔄 更新部署

### 更新代码

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker compose up -d --build
```

### 更新配置

```bash
# 1. 修改配置文件
vim cordys-data/conf/cordys-crm.properties

# 2. 重启后端服务
docker compose restart backend
```

## 📊 监控和维护

### 查看资源使用

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats cordys-crm-backend cordys-crm-frontend
```

### 备份数据

```bash
# 备份数据目录
tar -czf cordys-backup-$(date +%Y%m%d).tar.gz cordys-data/

# 恢复数据
tar -xzf cordys-backup-YYYYMMDD.tar.gz
```

### 清理资源

```bash
# 停止并删除容器
docker compose down

# 删除数据卷（谨慎操作）
docker compose down -v

# 清理未使用的镜像
docker image prune -a
```

## 🌐 生产环境建议

### 1. 使用 HTTPS

配置 SSL 证书，修改 Nginx 配置支持 HTTPS。

### 2. 配置域名

修改 Nginx 配置中的 `server_name`，使用实际域名。

### 3. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 4. 日志管理

配置日志轮转：

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 📚 更多信息

详细文档请参考：`docker/README.md`

## 🎉 完成

部署完成后，您可以：

1. 访问前端: http://localhost
2. 访问后端 API: http://localhost:8081
3. 查看 API 文档: http://localhost:8081/swagger-ui.html

默认登录信息：
- 用户名: `admin`
- 密码: `CordysCRM`

祝使用愉快！🚀




