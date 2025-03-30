package service

import (
	"errors"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"monitor/model"
)

// RoomServiceImpl 房间服务实现
type RoomServiceImpl struct {
	rooms sync.Map // 房间映射表，使用sync.Map减少锁的使用
}

// NewRoomService 创建房间服务
func NewRoomService() RoomService {
	// 初始化随机数生成器
	rand.Seed(time.Now().UnixNano())
	return &RoomServiceImpl{
		rooms: sync.Map{},
	}
}

// CreateRoom 创建房间
func (s *RoomServiceImpl) CreateRoom(name string) (*model.Room, error) {
	// 创建房间对象
	now := time.Now().UnixNano() / int64(time.Millisecond)
	roomID := generateRoomID()
	// 检查ID是否已存在，如果存在则重新生成
	for s.roomExists(roomID) {
		roomID = s.generateSixDigitRoomID()
	}

	room := model.NewRoom(roomID, name, now)
	// 保存房间
	s.rooms.Store(roomID, room)

	return room, nil
}

func (s *RoomServiceImpl) GetRooms() ([]*model.Room, error) {
	var rooms []*model.Room

	// 遍历所有房间
	s.rooms.Range(func(key, value interface{}) bool {
		room := value.(*model.Room)
		rooms = append(rooms, room)
		return true
	})

	// 如果没有房间，返回空数组而不是 nil
	if rooms == nil {
		rooms = make([]*model.Room, 0)
	}

	return rooms, nil
}

// GetRoom 获取房间信息
func (s *RoomServiceImpl) GetRoom(roomID string) (*model.Room, error) {
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return nil, errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)
	return room, nil
}

// JoinRoom 设备加入房间
func (s *RoomServiceImpl) JoinRoom(roomID string, device *model.Device, conn *websocket.Conn) error {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	var room *model.Room

	if !exists {
		// 如果房间不存在，则创建房间
		now := time.Now().UnixNano() / int64(time.Millisecond)
		room = model.NewRoom(roomID, "Room "+roomID, now)
		s.rooms.Store(roomID, room)
	} else {
		room = roomObj.(*model.Room)
	}

	// 如果是Monitor设备，检查房间是否已有Monitor设备
	if device.Type == model.DeviceTypeMonitor && room.HasMonitor() {
		return errors.New("房间已有Monitor设备")
	}

	// 设置设备信息
	now := time.Now().UnixNano() / int64(time.Millisecond)
	device.Status = model.DeviceStatusConnected
	device.RoomID = roomID
	device.CreateTime = now
	device.UpdateTime = now

	// 将设备添加到房间
	room.AddDevice(device, conn)
	room.UpdateTime = now

	return nil
}

// LeaveRoom 设备离开房间
func (s *RoomServiceImpl) LeaveRoom(roomID string, deviceID string) error {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)

	// 从房间中移除设备
	room.RemoveDevice(deviceID)

	// 更新房间信息
	room.UpdateTime = time.Now().UnixNano() / int64(time.Millisecond)

	// 如果房间内没有设备，则删除房间
	if len(room.GetAllDevices()) == 0 {
		s.rooms.Delete(roomID)
	}

	return nil
}

// UpdateDeviceStatus 更新设备状态
func (s *RoomServiceImpl) UpdateDeviceStatus(roomID string, deviceID string, status model.DeviceStatus) error {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)

	// 检查设备是否存在
	device, exists := room.GetDevice(deviceID)
	if !exists {
		return errors.New("设备不存在")
	}

	// 检查设备是否在指定房间
	if device.RoomID != roomID {
		return errors.New("设备不在指定房间")
	}

	// 更新设备状态
	device.Status = status
	device.UpdateTime = time.Now().UnixNano() / int64(time.Millisecond)

	return nil
}

// GetDevicesInRoom 获取房间内所有设备
func (s *RoomServiceImpl) GetDevicesInRoom(roomID string) ([]*model.Device, error) {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return nil, errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)
	return room.GetAllDevices(), nil
}

// GetCamerasInRoom 获取房间内所有Camera设备
func (s *RoomServiceImpl) GetCamerasInRoom(roomID string) ([]*model.Device, error) {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return nil, errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)
	return room.GetCameras(), nil
}

// GetMonitorInRoom 获取房间内的Monitor设备
func (s *RoomServiceImpl) GetMonitorInRoom(roomID string) (*model.Device, error) {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return nil, errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)
	monitor, exists := room.GetMonitor()
	if !exists {
		return nil, errors.New("房间内没有Monitor设备")
	}

	return monitor, nil
}

// GetDeviceById 根据设备ID获取设备信息
func (s *RoomServiceImpl) GetDeviceById(roomID string, deviceID string) (*model.Device, error) {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return nil, errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)
	device, exists := room.GetDevice(deviceID)
	if !exists {
		return nil, errors.New("设备不存在")
	}

	return device, nil
}

// GetDeviceConnection 获取设备WebSocket连接
func (s *RoomServiceImpl) GetDeviceConnection(roomID string, deviceID string) (*model.SafeConn, error) {
	// 检查房间是否存在
	roomObj, exists := s.rooms.Load(roomID)
	if !exists {
		return nil, errors.New("房间不存在")
	}

	room := roomObj.(*model.Room)
	conn, exists := room.GetConnection(deviceID)
	if !exists {
		return nil, errors.New("设备连接不存在")
	}

	return conn, nil
}

// generateSixDigitRoomID 生成六位数字的房间ID
func (s *RoomServiceImpl) generateSixDigitRoomID() string {
	// 生成100000-999999之间的随机数
	min := 100000
	max := 999999
	roomID := min + rand.Intn(max-min+1)
	return strconv.Itoa(roomID)
}

// roomExists 检查房间ID是否已存在
func (s *RoomServiceImpl) roomExists(roomID string) bool {
	_, exists := s.rooms.Load(roomID)
	return exists
}

func generateRoomID() string {
	min := 100000
	max := 999999
	roomID := min + rand.Intn(max-min+1)
	return strconv.Itoa(roomID)
}

func generateID() string {
	return uuid.New().String()
}
