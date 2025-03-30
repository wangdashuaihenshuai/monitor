package service

import (
	"monitor/model"

	"github.com/gorilla/websocket"
)

// RoomService 房间服务接口
type RoomService interface {
	// CreateRoom 创建房间
	CreateRoom(name string) (*model.Room, error)

	GetRooms() ([]*model.Room, error)
	// GetRoom 获取房间信息
	GetRoom(roomID string) (*model.Room, error)

	// JoinRoom 设备加入房间
	JoinRoom(roomID string, device *model.Device, conn *websocket.Conn) error

	// LeaveRoom 设备离开房间
	LeaveRoom(roomID string, deviceID string) error

	// UpdateDeviceStatus 更新设备状态
	UpdateDeviceStatus(roomID string, deviceID string, status model.DeviceStatus) error

	// GetDevicesInRoom 获取房间内所有设备
	GetDevicesInRoom(roomID string) ([]*model.Device, error)

	// GetCamerasInRoom 获取房间内所有Camera设备
	GetCamerasInRoom(roomID string) ([]*model.Device, error)

	// GetMonitorInRoom 获取房间内的Monitor设备
	GetMonitorInRoom(roomID string) (*model.Device, error)

	// GetDeviceById 根据设备ID获取设备信息
	GetDeviceById(roomID string, deviceID string) (*model.Device, error)

	// GetDeviceConnection 获取设备WebSocket连接
	GetDeviceConnection(roomID string, deviceID string) (*model.SafeConn, error)
}
