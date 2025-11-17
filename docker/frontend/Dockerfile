# 前端 Dockerfile - 使用 Nginx 部署
FROM node:22-slim AS builder

WORKDIR /app

# 复制前端代码
COPY frontend /app/frontend

# 安装 pnpm 和依赖
RUN npm install -g pnpm && \
    cd frontend && \
    pnpm install && \
    pnpm run build

# 生产环境使用 Nginx
FROM nginx:alpine

LABEL maintainer="FIT2CLOUD <support@fit2cloud.com>"

# 复制构建产物
COPY --from=builder /app/frontend/packages/web/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 复制环境变量脚本
COPY docker/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]




