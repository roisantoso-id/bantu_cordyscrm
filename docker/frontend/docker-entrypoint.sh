#!/bin/sh
set -e

# 替换环境变量（如果需要在运行时配置）
if [ -n "$VITE_API_BASE_URL" ]; then
    # 如果需要在运行时替换 API 地址，可以在这里处理
    echo "API Base URL: $VITE_API_BASE_URL"
fi

# 执行 Nginx
exec "$@"




