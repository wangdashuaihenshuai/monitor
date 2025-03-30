package model

import (
	"sync"

	"github.com/gorilla/websocket"
)

// DeviceConnection 设备连接信息
type DeviceConnection struct {
	Device *Device   // 设备信息
	Conn   *SafeConn // 安全的WebSocket连接
}

// Room 房间信息
type Room struct {
	ID         string `json:"id"`         // 房间唯一标识
	Name       string `json:"name"`       // 房间名称
	CreateTime int64  `json:"createTime"` // 创建时间
	UpdateTime int64  `json:"updateTime"` // 更新时间

	// 新增字段
	deviceConns sync.Map // 设备连接映射表，key为deviceID，value为DeviceConnection
}

// NewRoom 创建新房间
func NewRoom(id string, name string, createTime int64) *Room {
	return &Room{
		ID:          id,
		Name:        name,
		CreateTime:  createTime,
		UpdateTime:  createTime,
		deviceConns: sync.Map{},
	}
}

// AddDevice 添加设备到房间
func (r *Room) AddDevice(device *Device, conn *websocket.Conn) {
	// 存储设备连接信息
	r.deviceConns.Store(device.ID, &DeviceConnection{
		Device: device,
		Conn:   NewSafeConn(conn),
	})
}

// GetConnection 获取设备连接
func (r *Room) GetConnection(deviceID string) (*SafeConn, bool) {
	value, exists := r.deviceConns.Load(deviceID)
	if !exists {
		return nil, false
	}

	deviceConn := value.(*DeviceConnection)
	return deviceConn.Conn, true
}

// RemoveDevice 从房间移除设备
func (r *Room) RemoveDevice(deviceID string) {
	// 从设备连接映射表中删除
	r.deviceConns.Delete(deviceID)
}

// GetDevice 获取设备信息
func (r *Room) GetDevice(deviceID string) (*Device, bool) {
	value, exists := r.deviceConns.Load(deviceID)
	if !exists {
		return nil, false
	}

	deviceConn := value.(*DeviceConnection)
	return deviceConn.Device, true
}

// GetAllDevices 获取所有设备
func (r *Room) GetAllDevices() []*Device {
	devices := make([]*Device, 0)

	// 遍历所有设备连接，提取设备信息
	r.deviceConns.Range(func(key, value interface{}) bool {
		deviceConn := value.(*DeviceConnection)
		devices = append(devices, deviceConn.Device)
		return true
	})

	return devices
}

// GetCameras 获取所有Camera设备
func (r *Room) GetCameras() []*Device {
	cameras := make([]*Device, 0)

	// 遍历所有设备连接，筛选Camera类型设备
	r.deviceConns.Range(func(key, value interface{}) bool {
		deviceConn := value.(*DeviceConnection)
		if deviceConn.Device.Type == DeviceTypeCamera {
			cameras = append(cameras, deviceConn.Device)
		}
		return true
	})

	return cameras
}

// GetMonitor 获取Monitor设备
func (r *Room) GetMonitor() (*Device, bool) {
	var monitor *Device
	found := false

	// 遍历所有设备连接，查找Monitor类型设备
	r.deviceConns.Range(func(key, value interface{}) bool {
		deviceConn := value.(*DeviceConnection)
		if deviceConn.Device.Type == DeviceTypeMonitor {
			monitor = deviceConn.Device
			found = true
			return false // 找到后停止遍历
		}
		return true
	})

	return monitor, found
}

// HasMonitor 检查是否有Monitor设备
func (r *Room) HasMonitor() bool {
	hasMonitor := false

	// 遍历所有设备连接，检查是否有Monitor类型设备
	r.deviceConns.Range(func(key, value interface{}) bool {
		deviceConn := value.(*DeviceConnection)
		if deviceConn.Device.Type == DeviceTypeMonitor {
			hasMonitor = true
			return false // 找到后停止遍历
		}
		return true
	})

	return hasMonitor
}
