package model

import (
	"sync"

	"github.com/gorilla/websocket"
)

// SafeConn 安全的WebSocket连接
type SafeConn struct {
	conn  *websocket.Conn
	mutex sync.Mutex // 写锁，防止并发写入
}

// NewSafeConn 创建安全的WebSocket连接
func NewSafeConn(conn *websocket.Conn) *SafeConn {
	return &SafeConn{
		conn:  conn,
		mutex: sync.Mutex{},
	}
}

// WriteMessage 安全地写入消息
func (s *SafeConn) WriteMessage(messageType int, data []byte) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return s.conn.WriteMessage(messageType, data)
}

// GetConn 获取原始连接
func (s *SafeConn) GetConn() *websocket.Conn {
	return s.conn
}
