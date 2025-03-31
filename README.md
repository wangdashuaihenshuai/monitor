# Monitor - 多端视频监控系统

一个基于 WebRTC 的多端视频监控系统，支持多个摄像头设备（Camera）同时向一个监控端（Monitor）传输视频流。

## 系统架构

系统主要由以下部分组成：
1. 拍摄端（Camera设备）：移动设备，负责视频采集和传输
2. 监控端（Monitor设备）：负责接收和展示多路视频流
3. 后端服务：处理设备连接、房间管理和信令转发

## 技术栈

- 前端：React + TypeScript + Vite
- 后端：Go
- 实时通信：WebRTC + WebSocket
- 容器化：Docker

## 快速开始

### 开发环境

1. 克隆项目
```bash
git clone https://github.com/yourusername/monitor.git
cd monitor
```

2. 前端开发
```bash
cd frontend
yarn install
yarn dev
 ```

3. 后端开发
```bash
cd server
go mod download
go run main.go
 ```

### 部署
项目提供了完整的 Docker 部署方案：

1. 构建 Docker 镜像
```bash
./build.sh
 ```

2. 使用 Docker Compose 运行
```bash
docker-compose up -d
 ```

服务将在 11100 端口启动。

## 项目结构
```plaintext
.
├── frontend/          # 前端代码
├── server/           # 后端代码
├── doc/             # 技术文档
├── Dockerfile       # Docker 构建文件
├── docker-compose.yml # Docker Compose 配置
└── build.sh         # 构建脚本
 ```

## 主要功能
- 支持多个摄像头设备同时连接
- 实时视频流传输
- 房间管理系统
- 自动重连机制
- 设备状态监控
- 错误处理和恢复

## 配置说明
### 环境变量
- PORT : 服务端口（默认：11100）
- ALLOW_ORIGIN : CORS 配置（默认：*）
### Docker 部署配置
可以通过修改 docker-compose.yml 来自定义部署配置：

```yaml
version: '3'

services:
  monitor:
    image: monitor:latest
    ports:
      - "11100:11100"
    environment:
      - PORT=11100
      - ALLOW_ORIGIN=*
    restart: always
    volumes:
      - ./logs:/app/logs
 ```

## 贡献指南
欢迎提交 Issue 和 Pull Request。