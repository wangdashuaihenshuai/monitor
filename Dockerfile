# 第一阶段：构建前端
FROM node:23-alpine AS frontend-builder

WORKDIR /app

# 复制前端代码
COPY ./frontend /app/

# 安装依赖并构建
RUN yarn install && yarn build

# 第二阶段：构建后端
FROM golang:1.24-alpine AS backend-builder

WORKDIR /app

# 复制 go.mod 和 go.sum 文件
COPY ./server/go.mod ./server/go.sum ./
RUN go mod download

# 复制源代码
COPY ./server .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -o monitor .

# 第三阶段：最终镜像
FROM alpine:latest

WORKDIR /app

# 从后端构建阶段复制二进制文件
COPY --from=backend-builder /app/monitor .

# 创建 public 目录并从前端构建阶段复制构建产物
RUN mkdir -p /app/public
COPY --from=frontend-builder /app/dist/ /app/public/

# 设置环境变量
ENV PORT=11100
ENV ALLOW_ORIGIN=*

# 暴露应用端口
EXPOSE 11100

# 运行应用
CMD ["./monitor"]