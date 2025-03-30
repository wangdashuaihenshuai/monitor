import { DeviceStatus, DeviceType, EventType, Event, ReadyPayload, WebRTCAnswerPayload, WebRTCIceCandidatePayload } from '../types';
import { WebSocketManager } from '../utils/websocket';

export class CameraStateMachine {
  private status: DeviceStatus = DeviceStatus.Init;
  private deviceId: string;
  private roomId: string;
  private wsManager: WebSocketManager;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private monitorDeviceId: string | null = null;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' }
  ];
  private statusChangeCallback: ((status: DeviceStatus) => void) | null = null;

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

  // 获取当前状态
  getStatus(): DeviceStatus {
    return this.status;
  }

  // 更新状态
  private updateStatus(newStatus: DeviceStatus): void {
    console.log(`Camera状态从 ${this.status} 变为 ${newStatus}`);
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

        // 检查房间内是否有Monitor设备
        const payload = event.payload as { devices: any[] };
        const monitorDevice = payload.devices.find(device => device.type === DeviceType.Monitor);

        if (monitorDevice) {
          this.monitorDeviceId = monitorDevice.id;
          this.initLocalStream();
        }
      }
    });

    // 设备加入房间事件
    this.wsManager.addEventListener(EventType.JoinRoom, (event) => {
      if (this.status === DeviceStatus.Connected) {
        const payload = event.payload as { device: any };
        if (payload.device.type === DeviceType.Monitor) {
          this.monitorDeviceId = payload.device.id;
          this.initLocalStream();
        }
      }
    });

    // Monitor设备准备就绪事件
    this.wsManager.addEventListener(EventType.MonitorReady, () => {
      if (this.status === DeviceStatus.Ready) {
        this.createPeerConnection();
        this.createAndSendOffer();
      }
    });

    // Answer事件
    this.wsManager.addEventListener(EventType.Answer, (event) => {
      if (this.status === DeviceStatus.Streaming && this.peerConnection) {
        const payload = event.payload as WebRTCAnswerPayload;
        const sdp = payload.sdp;

        this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp
        })).catch(error => {
          console.error('设置远程描述失败:', error);
        });
      }
    });

    // ICE Candidate事件
    this.wsManager.addEventListener(EventType.IceCandidate, (event) => {
      if ((this.status === DeviceStatus.Streaming || this.status === DeviceStatus.Ready) && this.peerConnection) {
        const payload = event.payload as WebRTCIceCandidatePayload;

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
    });

    // 设备离开房间事件
    this.wsManager.addEventListener(EventType.LeaveRoom, (event) => {
      if (event.deviceId === this.monitorDeviceId) {
        if (this.status === DeviceStatus.Streaming) {
          this.closePeerConnection();
          this.updateStatus(DeviceStatus.Connected);
        } else if (this.status === DeviceStatus.Ready) {
          this.updateStatus(DeviceStatus.Connected);
        }
        this.monitorDeviceId = null;
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
      const wsUrl = `${this.wsManager.url}?deviceId=${this.deviceId}&deviceType=${DeviceType.Camera}&roomId=${this.roomId}`;
      this.wsManager = new WebSocketManager(wsUrl);
      this.setupEventListeners();

      await this.wsManager.connect();
    } catch (error) {
      console.error('加入房间失败:', error);
      this.updateStatus(DeviceStatus.Error);
    }
  }

  // 初始化本地媒体流
  private async initLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // 发送Camera Ready事件
      this.sendCameraReadyEvent();
      this.updateStatus(DeviceStatus.Ready);
    } catch (error) {
      console.error('获取本地媒体流失败:', error);
      this.updateStatus(DeviceStatus.Error);
    }
  }

  // 发送Camera Ready事件
  private sendCameraReadyEvent(): void {
    if (!this.monitorDeviceId) {
      console.warn('没有Monitor设备ID，无法发送Camera Ready事件');
      return;
    }

    const payload: ReadyPayload = {
      targetDeviceId: this.monitorDeviceId
    };

    const event: Event = {
      type: EventType.CameraReady,
      roomId: this.roomId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      payload
    };

    this.wsManager.sendEvent(event);
  }

  // 创建RTCPeerConnection
  private createPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

      // 添加本地媒体流
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }

      // 监听ICE候选者事件
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendIceCandidate(event.candidate);
        }
      };

      // 监听ICE连接状态变化
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE连接状态:', this.peerConnection?.iceConnectionState);

        if (this.peerConnection?.iceConnectionState === 'disconnected' ||
          this.peerConnection?.iceConnectionState === 'failed') {
          console.warn('ICE连接断开或失败');
          if (this.status === DeviceStatus.Streaming) {
            this.closePeerConnection();
            this.updateStatus(DeviceStatus.Connected);
          }
        }
      };
    } catch (error) {
      console.error('创建PeerConnection失败:', error);
      this.updateStatus(DeviceStatus.Error);
    }
  }

  // 创建并发送Offer
  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection || !this.monitorDeviceId) {
      console.warn('PeerConnection或Monitor设备ID不存在，无法创建Offer');
      return;
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

      await this.peerConnection.setLocalDescription(offer);

      const event: Event = {
        type: EventType.Offer,
        roomId: this.roomId,
        deviceId: this.deviceId,
        timestamp: Date.now(),
        payload: {
          targetDeviceId: this.monitorDeviceId,
          sdp: offer.sdp
        }
      };

      this.wsManager.sendEvent(event);
      this.updateStatus(DeviceStatus.Streaming);
    } catch (error) {
      console.error('创建Offer失败:', error);
      this.updateStatus(DeviceStatus.Error);
    }
  }

  // 发送ICE候选者
  private sendIceCandidate(candidate: RTCIceCandidate): void {
    if (!this.monitorDeviceId) {
      console.warn('没有Monitor设备ID，无法发送ICE候选者');
      return;
    }

    const event: Event = {
      type: EventType.IceCandidate,
      roomId: this.roomId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      payload: {
        targetDeviceId: this.monitorDeviceId,
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex
      }
    };

    this.wsManager.sendEvent(event);
  }

  // 关闭PeerConnection
  private closePeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  // 离开房间
  leaveRoom(): void {
    this.closePeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.wsManager.disconnect();
    this.updateStatus(DeviceStatus.Init);
  }

  // 获取本地视频流
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}