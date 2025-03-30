#!/bin/bash

# 设置变量
IMAGE_NAME="monitor"
IMAGE_TAG="latest"

# 显示构建信息
echo "开始构建 Docker 镜像: ${IMAGE_NAME}:${IMAGE_TAG}"

# 构建 Docker 镜像
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "Docker 镜像构建成功: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    # 显示镜像信息
    echo "镜像详情:"
    docker images ${IMAGE_NAME}:${IMAGE_TAG}
else
    echo "Docker 镜像构建失败"
    exit 1
fi

echo "构建脚本执行完毕"