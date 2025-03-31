import axios from 'axios';
import { Device } from './types';

// API 基础URL - 根据环境变量或构建环境确定
const getApiBaseUrl = () => {
  // 生产环境下使用相对路径，这样可以通过反向代理访问API
  return '';
};

const API_BASE_URL = getApiBaseUrl();

// WebSocket URL
export const getWebSocketBaseUrl = () => {
  // 生产环境使用相对路径并自动判断协议
  const isSecure = window.location.protocol === 'https:';
  return `${isSecure ? 'wss' : 'ws'}://${window.location.host}`;
};

const WS_BASE_URL = getWebSocketBaseUrl();

// 房间类型定义
export interface Room {
  id: string;
  name: string;
  createdAt: string;
}

// 创建房间请求参数
export interface CreateRoomRequest {
  name: string;
}

// API 类
export const api = {
  // 创建房间
  createRoom: async (request: CreateRoomRequest): Promise<Room> => {
    const response = await axios.post(`${API_BASE_URL}/api/room`, request);
    return response.data;
  },

  // 获取所有房间列表
  getRooms: async (): Promise<Room[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/rooms`);
    return response.data;
  },

  // 获取单个房间信息
  getRoom: async (roomId: string): Promise<Room> => {
    const response = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`);
    return response.data;
  },

  // 获取房间内设备列表
  getRoomDevices: async (roomId: string): Promise<Device[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}/devices`);
    return response.data;
  },

  // WebSocket 连接URL生成函数
  getWebSocketUrl: (roomId: string): string => {
    return `${WS_BASE_URL}/ws/${roomId}`;
  }
};

export default api;