import { WebRTCOfferPayload, WebRTCIceCandidatePayload, DeviceStatus, ReadyPayload, DeviceType, EventType, Event } from '../types';
import { WebSocketManager } from '../utils/websocket';

// 单个Camera连接的状态机
class CameraConnectionStateMachine {
  private status: DeviceStatus = DeviceStatus.Init;
  private cameraDeviceId: string;
  private monitorDeviceId: string;
  private roomId: string;
  private wsManager: WebSocketManager;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' }
  ];
  private statusChangeCallback: ((status: DeviceStatus) => void) | null = null;
  private remoteStreamCallback: ((stream: MediaStream) => void) | null = null;

  constructor(cameraDeviceId: string, monitorDeviceId: string, roomId: string, wsManager: WebSocketManager) {
    this.cameraDeviceId = cameraDeviceId;
    this.monitorDeviceId = monitorDeviceId;
    this.roomId = roomId;
    this.wsManager = wsManager;
  }

  // 设置状态变化回调
  setStatusChangeCallback(callback: (status: DeviceStatus) => void): void {
    this.statusChangeCallback = callback;
  }

  // 设置远程流回调
  setRemoteStreamCallback(callback: (stream: MediaStream) => void): void {
    this.remoteStreamCallback = callback;
  }

  // 获取当前状态
  getStatus(): DeviceStatus {
    return this.status;
  }

  // 获取Camera设备ID
  getCameraDeviceId(): string {
    return this.cameraDeviceId;
  }

  // 获取远程流
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // 更新状态
  private updateStatus(newStatus: DeviceStatus): void {
    console.log(`Camera连接 ${this.cameraDeviceId} 状态从 ${this.status} 变为 ${newStatus}`);
    this.status = newStatus;
    if (this.statusChangeCallback) {
      this.statusChangeCallback(newStatus);
    }
  }

  // 处理Camera Ready事件
  handleCameraReady(): void {
    if (this.status === DeviceStatus.Init) {
      this.createPeerConnection();
      this.sendMonitorReadyEvent();
      this.updateStatus(DeviceStatus.Ready);
    }
  }

  // 处理Offer事件
  async handleOffer(payload: WebRTCOfferPayload): Promise<void> {
    if (this.status === DeviceStatus.Ready && this.peerConnection) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'offer',
          sdp: payload.sdp
        }));

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        const event: Event = {
          type: EventType.Answer,
          roomId: this.roomId,
          deviceId: this.monitorDeviceId,
          timestamp: Date.now(),
          payload: {
            targetDeviceId: this.cameraDeviceId,
            sdp: answer.sdp
          }
        };

        this.wsManager.sendEvent(event);
        this.updateStatus(DeviceStatus.Connecting);
      } catch (error) {
        console.error('处理Offer失败:', error);
        this.updateStatus(DeviceStatus.Error);
      }
    }
  }

  // 处理ICE Candidate事件
  handleIceCandidate(payload: WebRTCIceCandidatePayload): void {
    if ((this.status === DeviceStatus.Connecting || this.status === DeviceStatus.Receiving) && this.peerConnection) {
      try {
        const candidate = new RTCIceCandidate({
          candidate: payload.candidate,
          sdpMid: payload.sdpMid,
          sdpMLineIndex: payload.sdpMLineIndex
        });

        this.peerConnection.addIceCandidate(candidate).catch(error => {
          console.error('添加ICE候选者失败:', error);
        });
      } catch (error) {
        console.error('创建ICE候选者失败:', error);
      }
    }
  }

  // 创建PeerConnection
  private createPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

      // 创建远程流
      this.remoteStream = new MediaStream();

      // 监听track事件
      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });

        if (this.remoteStreamCallback && this.remoteStream) {
          this.remoteStreamCallback(this.remoteStream);
        }

        this.updateStatus(DeviceStatus.Receiving);
      };

      // 监听ICE候选者事件
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendIceCandidate(event.candidate);
        }
      };

      // 监听ICE连接状态变化
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log(`Camera ${this.cameraDeviceId} ICE连接状态:`, this.peerConnection?.iceConnectionState);

        if (this.peerConnection?.iceConnectionState === 'disconnected' ||
          this.peerConnection?.iceConnectionState === 'failed') {
          console.warn(`Camera ${this.cameraDeviceId} ICE连接断开或失败`);
          if (this.status === DeviceStatus.Receiving) {
            this.updateStatus(DeviceStatus.Error);
          }
        }
      };
    } catch (error) {
      console.error('创建PeerConnection失败:', error);
      this.updateStatus(DeviceStatus.Error);
    }
  }

  // 发送Monitor Ready事件
  private sendMonitorReadyEvent(): void {
    const payload: ReadyPayload = {
      targetDeviceId: this.cameraDeviceId
    };

    const event: Event = {
      type: EventType.MonitorReady,
      roomId: this.roomId,
      deviceId: this.monitorDeviceId,
      timestamp: Date.now(),
      payload
    };

    this.wsManager.sendEvent(event);
  }

  // 发送ICE候选者
  private sendIceCandidate(candidate: RTCIceCandidate): void {
    const event: Event = {
      type: EventType.IceCandidate,
      roomId: this.roomId,
      deviceId: this.monitorDeviceId,
      timestamp: Date.now(),
      payload: {
        targetDeviceId: this.cameraDeviceId,
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex
      }
    };

    this.wsManager.sendEvent(event);
  }

  // 重置连接
  reset(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.updateStatus(DeviceStatus.Init);
  }

  // 关闭连接
  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
  }
}

// Monitor全局状态机
export class MonitorStateMachine {
  private status: DeviceStatus = DeviceStatus.Init;
  private deviceId: string;
  private roomId: string;
  private wsManager: WebSocketManager;
  private cameraConnections: Map<string, CameraConnectionStateMachine> = new Map();
  private statusChangeCallback: ((status: DeviceStatus) => void) | null = null;
  private cameraConnectionCallback: ((cameraId: string, status: 'added' | 'updated' | 'removed', stream?: MediaStream) => void) | null = null;

  constructor(deviceId: string, roomId: string, wsUrl: string) {
    this.deviceId = deviceId;
    this.roomId = roomId;
    this.wsManager = new WebSocketManager(wsUrl);
    this.setupEventListeners();
  }

  // 设置状态变化回调
  setStatusChangeCallback(callback: (status: DeviceStatus) => void): void {
    this.statusChangeCallback = callback;
  }

  // 设置Camera连接回调
  setCameraConnectionCallback(callback: (cameraId: string, status: 'added' | 'updated' | 'removed', stream?: MediaStream) => void): void {
    this.cameraConnectionCallback = callback;
  }

  // 获取当前状态
  getStatus(): DeviceStatus {
    return this.status;
  }

  // 获取所有Camera连接
  getCameraConnections(): Map<string, CameraConnectionStateMachine> {
    return this.cameraConnections;
  }

  // 更新状态
  private updateStatus(newStatus: DeviceStatus): void {
    console.log(`Monitor状态从 ${this.status} 变为 ${newStatus}`);
    this.status = newStatus;
    if (this.statusChangeCallback) {
      this.statusChangeCallback(newStatus);
    }
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    // 连接事件
    this.wsManager.addEventListener(EventType.Connect, (event) => {
      if (this.status === DeviceStatus.Wait) {
        this.updateStatus(DeviceStatus.Connected);

        // 获取房间内所有Camera设备
        const payload = event.payload as { devices: any[] };
        const cameraDevices = payload.devices.filter(device => device.type === DeviceType.Camera);

        // 为每个Camera设备创建连接状态机
        cameraDevices.forEach(camera => {
          this.createCameraConnection(camera.id);
        });
      }
    });

    // 设备加入房间事件
    this.wsManager.addEventListener(EventType.JoinRoom, (event) => {
      if (this.status === DeviceStatus.Connected) {
        const payload = event.payload as { device: any };
        if (payload.device.type === DeviceType.Camera) {
          this.createCameraConnection(payload.device.id);
        }
      }
    });

    // 设备离开房间事件
    this.wsManager.addEventListener(EventType.LeaveRoom, (event) => {
      const deviceId = event.deviceId;
      if (this.cameraConnections.has(deviceId)) {
        this.removeCameraConnection(deviceId);
      }
    });

    // Camera设备准备就绪事件
    this.wsManager.addEventListener(EventType.CameraReady, (event) => {
      const cameraId = event.deviceId;
      if (this.cameraConnections.has(cameraId)) {
        const cameraConnection = this.cameraConnections.get(cameraId);
        cameraConnection?.handleCameraReady();
      } else {
        this.createCameraConnection(cameraId);
        const cameraConnection = this.cameraConnections.get(cameraId);
        cameraConnection?.handleCameraReady();
      }
    });

    // Offer事件
    this.wsManager.addEventListener(EventType.Offer, (event) => {
      const payload = event.payload as WebRTCOfferPayload;
      const cameraId = event.deviceId;

      if (this.cameraConnections.has(cameraId)) {
        const cameraConnection = this.cameraConnections.get(cameraId);
        cameraConnection?.handleOffer(payload);
      }
    });

    // ICE Candidate事件
    this.wsManager.addEventListener(EventType.IceCandidate, (event) => {
      const payload = event.payload as WebRTCIceCandidatePayload;
      const cameraId = event.deviceId;

      if (this.cameraConnections.has(cameraId)) {
        const cameraConnection = this.cameraConnections.get(cameraId);
        cameraConnection?.handleIceCandidate(payload);
      }
    });

    // 错误事件
    this.wsManager.addEventListener(EventType.Error, (event) => {
      console.error('收到错误事件:', event.payload);
      this.updateStatus(DeviceStatus.Error);
    });
  }

  // 加入房间
  async joinRoom(): Promise<void> {
    if (this.status !== DeviceStatus.Init) {
      console.warn('只有在Init状态才能加入房间');
      return;
    }

    this.updateStatus(DeviceStatus.Wait);

    try {
      // 构建WebSocket URL
      const wsUrl = `${this.wsManager.url}?deviceId=${this.deviceId}&deviceType=${DeviceType.Monitor}&roomId=${this.roomId}`;
      this.wsManager = new WebSocketManager(wsUrl);
      this.setupEventListeners();

      await this.wsManager.connect();
    } catch (error) {
      console.error('加入房间失败:', error);
      this.updateStatus(DeviceStatus.Error);
    }
  }

  // 创建Camera连接
  private createCameraConnection(cameraId: string): void {
    if (this.cameraConnections.has(cameraId)) {
      return;
    }

    const cameraConnection = new CameraConnectionStateMachine(
      cameraId,
      this.deviceId,
      this.roomId,
      this.wsManager
    );

    // 设置状态变化回调
    cameraConnection.setStatusChangeCallback(() => {
      if (this.cameraConnectionCallback) {
        this.cameraConnectionCallback(cameraId, 'updated');
      }
    });

    // 设置远程流回调
    cameraConnection.setRemoteStreamCallback((stream) => {
      if (this.cameraConnectionCallback) {
        this.cameraConnectionCallback(cameraId, 'updated', stream);
      }
    });

    this.cameraConnections.set(cameraId, cameraConnection);

    if (this.cameraConnectionCallback) {
      this.cameraConnectionCallback(cameraId, 'added');
    }
  }

  // 移除Camera连接
  private removeCameraConnection(cameraId: string): void {
    if (!this.cameraConnections.has(cameraId)) {
      return;
    }

    const cameraConnection = this.cameraConnections.get(cameraId);
    cameraConnection?.close();
    this.cameraConnections.delete(cameraId);

    if (this.cameraConnectionCallback) {
      this.cameraConnectionCallback(cameraId, 'removed');
    }
  }

  // 关闭所有Camera连接
  private closeAllCameraConnections(): void {
    this.cameraConnections.forEach((connection, cameraId) => {
      connection.close();
      if (this.cameraConnectionCallback) {
        this.cameraConnectionCallback(cameraId, 'removed');
      }
    });
    this.cameraConnections.clear();
  }

  // 离开房间
  leaveRoom(): void {
    this.closeAllCameraConnections();
    this.wsManager.disconnect();
    this.updateStatus(DeviceStatus.Init);
  }

  // 尝试重新连接
  async reconnect(): Promise<void> {
    this.closeAllCameraConnections();
    this.wsManager.disconnect();
    this.updateStatus(DeviceStatus.Init);
    await this.joinRoom();
  }
}