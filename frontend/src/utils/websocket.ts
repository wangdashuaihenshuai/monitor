import { Event } from '../types';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private eventListeners: Map<string, ((event: Event) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: number | null = null;

  constructor(public url: string) { }

  // 连接WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket连接成功');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as Event;
            this.handleEvent(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket连接关闭');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        reject(error);
      }
    });
  }

  // 断开WebSocket连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // 发送事件
  sendEvent(event: Event): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      console.error('WebSocket未连接，无法发送事件');
    }
  }

  // 添加事件监听器
  addEventListener(eventType: string, callback: (event: Event) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)?.push(callback);
  }

  // 移除事件监听器
  removeEventListener(eventType: string, callback: (event: Event) => void): void {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 处理接收到的事件
  private handleEvent(event: Event): void {
    console.log('收到事件:', event);

    // 调用所有注册的事件监听器
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(callback => callback(event));

    // 调用通用事件监听器
    const allListeners = this.eventListeners.get('*') || [];
    allListeners.forEach(callback => callback(event));
  }

  // 尝试重新连接
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，延迟: ${delay}ms`);

      this.reconnectTimeout = window.setTimeout(() => {
        this.connect().catch(error => {
          console.error('重新连接失败:', error);
        });
      }, delay);
    } else {
      console.error('达到最大重连次数，停止重连');
    }
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}