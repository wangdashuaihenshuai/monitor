#!/bin/bash

# 设置变量
IMAGE_NAME="monitor"
IMAGE_TAG="latest"

# 显示构建信息
echo "开始构建 Docker 镜像: ${IMAGE_NAME}:${IMAGE_TAG}"

# 使用 Docker Compose 构建
docker-compose build

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "Docker 镜像构建成功"
    echo "使用以下命令启动服务:"
    echo "docker-compose up -d"
    echo ""
    echo "使用以下命令查看日志:"
    echo "docker-compose logs -f"
    echo ""
    echo "使用以下命令停止服务:"
    echo "docker-compose down"
else
    echo "Docker 镜像构建失败"
    exit 1
fi