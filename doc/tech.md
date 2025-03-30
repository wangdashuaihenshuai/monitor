

# 多端视频监控系统技术文档

## 系统架构

系统由以下几个主要部分组成：
1. 拍摄端（Camera设备）：移动设备，负责视频采集和传输
2. 监控端（Monitor设备）：负责接收和展示多路视频流，可同时连接并显示多个Camera设备的视频流

## 房间事件系统

房间内有两种设备类型：
- Camera设备：视频拍摄端，一个房间可以有多个Camera设备
- Monitor设备：视频监控端，一个房间只能有一个Monitor设备

房间相关事件包括：
- camera ready事件：Camera设备准备好进行视频录制
- monitor ready事件：Monitor设备准备好进行视频展示
- 设备 connect事件：设备与房间建立连接成功事件，返回设备信息
- 设备加入房间
- 设备离开房间
- 设备信息更新

房间只能有一个Monitor设备，其余Monitor设备连接请求将被拒绝。

WebRTC相关事件包括：
- Offer事件
- Answer事件
- ICE Candidate事件

## 设备状态与消息处理

### Camera设备状态流转

Camera设备有以下几种状态：
1. **初始化状态(INIT)**：设备刚启动，尚未连接到房间
2. **已连接状态(CONNECTED)**：已连接到房间，但尚未准备好视频流
3. **准备就绪状态(READY)**：视频流已准备好，可以开始传输
4. **传输中状态(STREAMING)**：正在传输视频流
5. **错误状态(ERROR)**：发生错误

#### 状态转换与消息处理

| 当前状态 | 收到消息 | 执行操作 | 下一状态 |
|---------|---------|---------|---------|
| INIT | 用户触发加入房间 | 1. 连接信令服务器<br>2. 发送加入房间请求 | WAIT |
| WAIT | 设备 connect事件 | 1. 更新设备信息 | CONNECTED |
| CONNECTED | 加入房间成功响应或者新的monitor设备进入房间 | 1. 初始化本地媒体流<br>2.获取到 monitor 设备ID <br>3. 发送camera ready事件 | READY |
| CONNECTED | 加入房间失败响应 | 1. 显示错误信息<br>2. 断开连接 | ERROR |
| READY | monitor ready事件 | 1. 创建RTCPeerConnection<br>2. 添加本地媒体流<br>3. 创建并发送Offer | STREAMING |
| READY | 设备离开房间事件(Monitor) | 1. 停止准备中的媒体流<br>2. 等待新的Monitor设备 | CONNECTED |
| STREAMING | Answer事件 | 1. 设置远程描述<br>2. 开始传输视频流 | STREAMING |
| STREAMING | ICE Candidate事件 | 添加ICE Candidate | STREAMING |
| STREAMING | 设备离开房间事件(Monitor) | 1. 关闭RTCPeerConnection<br>2. 停止传输<br>3. 等待新的Monitor设备 | CONNECTED |
| 任意状态 | 连接断开 | 1. 清理资源<br>2. 尝试重新连接 | INIT/ERROR |

### Monitor设备状态流转

Monitor设备状态分为两个层次：全局状态和每个Camera连接的状态。

#### 全局状态流转

Monitor设备全局状态有以下几种：
1. **初始化状态(INIT)**：设备刚启动，尚未连接到房间
2. **等待连接状态(WAIT)**：已发送加入房间请求，等待连接响应
3. **已连接状态(CONNECTED)**：已连接到房间，可以接收和处理房间事件
4. **错误状态(ERROR)**：发生全局性错误

##### 全局状态转换与消息处理

| 当前状态 | 收到消息 | 执行操作 | 下一状态 |
|---------|---------|---------|---------|
| INIT | 用户触发加入房间 | 1. 连接信令服务器<br>2. 发送加入房间请求 | WAIT |
| WAIT | 设备 connect事件 | 1. 更新设备信息 | CONNECTED |
| CONNECTED | 加入房间成功响应 | 1. 获取房间内所有Camera设备列表<br>2. 初始化多路视频显示组件<br>3. 为每个已存在的Camera创建连接状态机 | CONNECTED |
| CONNECTED | 加入房间失败响应 | 1. 显示错误信息(如房间已有Monitor)<br>2. 断开连接 | ERROR |
| CONNECTED | 设备加入房间事件(Camera) | 1. 为新Camera创建连接状态机<br>2. 创建新的视频显示组件 | CONNECTED |
| CONNECTED | 设备离开房间事件(Camera) | 1. 移除对应Camera的连接状态机<br>2. 移除对应的视频显示<br>3. 更新UI布局 | CONNECTED |
| 任意状态 | 连接断开 | 1. 清理所有Camera连接资源<br>2. 尝试重新连接 | INIT/ERROR |

#### 单个Camera连接状态流转

对每个Camera设备，Monitor需要维护一个独立的连接状态机：
1. **初始状态(INIT)**：刚检测到Camera设备，尚未建立WebRTC连接
2. **准备就绪状态(READY)**：已准备好接收该Camera的视频流，等待建立连接
3. **连接中状态(CONNECTING)**：正在与Camera建立WebRTC连接
4. **接收中状态(RECEIVING)**：正在接收并显示该Camera的视频流
5. **错误状态(ERROR)**：与该Camera的连接发生错误

##### 单个Camera连接状态转换与消息处理

| 当前状态 | 收到消息 | 执行操作 | 下一状态 |
|---------|---------|---------|---------|
| INIT | Camera设备加入房间 | 1. 创建视频显示组件<br>2. 等待Camera ready事件 | INIT |
| INIT | Camera ready事件 | 1. 为该Camera创建RTCPeerConnection<br>2. 准备接收该Camera的远程媒体流<br>3. 发送monitor ready事件 | READY |
| READY | 收到该Camera的Offer事件 | 1. 设置对应Camera的远程描述<br>2. 创建并发送Answer | CONNECTING |
| CONNECTING | ICE Candidate事件 | 添加对应Camera连接的ICE Candidate | CONNECTING |
| CONNECTING | 连接建立成功(ontrack触发) | 1. 显示该Camera的视频流<br>2. 更新UI状态 | RECEIVING |
| CONNECTING | 连接超时/失败 | 1. 关闭当前连接<br>2. 尝试重新建立连接 | ERROR/INIT |
| RECEIVING | ICE Candidate事件 | 添加对应Camera连接的ICE Candidate | RECEIVING |
| RECEIVING | 连接状态变化(断开) | 1. 显示连接中断提示<br>2. 尝试恢复连接 | ERROR/INIT |
| RECEIVING | Camera设备离开房间 | 1. 关闭RTCPeerConnection<br>2. 移除视频显示<br>3. 释放资源 | - (状态机销毁) |
| ERROR | 用户触发重连 | 1. 清理现有连接<br>2. 重新初始化连接 | INIT |

## 设计说明
1. 全局状态机 ：
   
   - 负责管理与信令服务器的连接
   - 处理房间级别的事件（加入/离开房间）
   - 管理所有Camera连接状态机的生命周期
2. Camera连接状态机 ：
   
   - 为每个Camera设备创建独立的状态机实例
   - 管理与单个Camera的WebRTC连接生命周期
   - 处理特定Camera的媒体流接收和显示
3. 状态机交互 ：
   
   - 全局状态机负责创建和销毁Camera连接状态机
   - Camera连接状态机的错误不会直接影响全局状态
   - 全局状态机断开会导致所有Camera连接状态机重置
这种拆分设计使Monitor设备能够独立管理与每个Camera的连接，更好地处理多Camera场景下的各种状态变化和错误情况。

## 错误处理机制

两种设备在状态转换过程中可能遇到的常见错误及处理方式：

1. **网络连接错误**：
   - 自动重连机制，最多尝试3次
   - 显示网络状态指示器
   - 提供手动重连选项

2. **媒体设备错误**：
   - Camera设备无法访问摄像头/麦克风时提示用户授权
   - 提供设备选择功能，允许用户切换摄像头/麦克风

3. **WebRTC连接错误**：
   - ICE连接失败时尝试使用TURN服务器中继
   - 提供连接质量指示器
   - 在严重错误时自动重置连接
