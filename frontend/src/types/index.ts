// 设备类型
export enum DeviceType {
  Camera = "camera",
  Monitor = "monitor"
}

// 设备状态
export enum DeviceStatus {
  Init = "init",
  Wait = "wait",
  Connected = "connected",
  Connecting = "connecting",
  Ready = "ready",
  Streaming = "streaming",
  Receiving = "receiving",
  Error = "error"
}

// 事件类型
export enum EventType {
  Connect = "connect",
  JoinRoom = "join_room",
  LeaveRoom = "leave_room",
  DeviceUpdate = "device_update",
  CameraReady = "camera_ready",
  MonitorReady = "monitor_ready",
  Error = "error",
  Offer = "offer",
  Answer = "answer",
  IceCandidate = "ice_candidate"
}

// 设备信息
export interface Device {
  id: string;
  type: DeviceType;
  status: DeviceStatus;
  roomId: string;
  createTime: number;
  updateTime: number;
}

// 基础事件接口
export interface Event {
  type: EventType;
  roomId: string;
  deviceId: string;
  timestamp: number;
  payload: any;
}

// 各种事件的Payload接口
export interface ErrorPayload {
  error: string;
}

export interface ConnectPayload {
  device: Device;
  devices: Device[];
}

export interface JoinRoomPayload {
  device: Device;
}

export interface DeviceUpdatePayload {
  device: Device;
}

export interface ReadyPayload {
  targetDeviceId: string;
}

export interface WebRTCOfferPayload {
  targetDeviceId: string;
  sdp: string;
}

export interface WebRTCAnswerPayload {
  targetDeviceId: string;
  sdp: string;
}

export interface WebRTCIceCandidatePayload {
  targetDeviceId: string;
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
}