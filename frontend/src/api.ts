import axios from 'axios';
import { Device } from './types';

// API 基础URL
const API_BASE_URL = 'http://localhost:8080';

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
    return `ws://localhost:8080/ws/${roomId}`;
  }
};

export default api;