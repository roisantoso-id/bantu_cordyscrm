#!/bin/bash
# 快速启动脚本

set -e

echo "🚀 启动 Cordys CRM (前后端分离部署)"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif docker-compose --version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo "✅ 使用命令: $COMPOSE_CMD"
echo ""

# 创建数据目录
echo "📁 创建数据目录..."
mkdir -p cordys-data/{conf,data,logs}

# 复制配置文件（如果不存在）
if [ ! -f "cordys-data/conf/cordys-crm.properties" ]; then
    echo "📋 复制配置文件..."
    cp installer/conf/cordys-crm.properties cordys-data/conf/
fi

# 构建并启动
echo "🔨 构建 Docker 镜像..."
$COMPOSE_CMD build

echo "🚀 启动服务..."
$COMPOSE_CMD up -d

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📊 服务状态:"
$COMPOSE_CMD ps

echo ""
echo "🌐 访问地址:"
echo "   - 前端: http://localhost"
echo "   - 后端 API: http://localhost:8081"
echo "   - Swagger: http://localhost:8081/swagger-ui.html"
echo ""
echo "📝 查看日志:"
echo "   $COMPOSE_CMD logs -f"
echo ""
echo "🛑 停止服务:"
echo "   $COMPOSE_CMD down"




