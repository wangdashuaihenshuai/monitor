package service

import (
	"encoding/json"
	"errors"
	"log"

	"github.com/gorilla/websocket"

	"monitor/model"
)

// EventServiceImpl 事件服务实现
type EventServiceImpl struct {
	roomService RoomService
}

// NewEventService 创建事件服务
func NewEventService(roomService RoomService) EventService {
	return &EventServiceImpl{
		roomService: roomService,
	}
}

// ProcessEvent 处理事件
func (s *EventServiceImpl) ProcessEvent(event *model.Event) error {
	switch event.Type {
	case model.EventTypeCameraReady:
		var payload model.ReadyPayload
		if err := event.ParsePayload(&payload); err != nil {
			return err
		}
		return s.HandleCameraReady(event, &payload)

	case model.EventTypeMonitorReady:
		var payload model.ReadyPayload
		if err := event.ParsePayload(&payload); err != nil {
			return err
		}
		return s.HandleMonitorReady(event, &payload)

	case model.EventTypeOffer:
		var payload model.WebRTCOfferPayload
		if err := event.ParsePayload(&payload); err != nil {
			return err
		}
		return s.HandleWebRTCOffer(event, &payload)

	case model.EventTypeAnswer:
		var payload model.WebRTCAnswerPayload
		if err := event.ParsePayload(&payload); err != nil {
			return err
		}
		return s.HandleWebRTCAnswer(event, &payload)

	case model.EventTypeIceCandidate:
		var payload model.WebRTCIceCandidatePayload
		if err := event.ParsePayload(&payload); err != nil {
			return err
		}
		return s.HandleWebRTCIceCandidate(event, &payload)

	default:
		return errors.New("未知事件类型")
	}
}

// HandleCameraReady 处理Camera设备准备就绪事件
func (s *EventServiceImpl) HandleCameraReady(event *model.Event, payload *model.ReadyPayload) error {
	// 更新Camera设备状态为Ready
	err := s.roomService.UpdateDeviceStatus(event.RoomID, event.DeviceID, model.DeviceStatusReady)
	if err != nil {
		return err
	}

	// 如果指定了目标Monitor设备，则向该设备发送Camera Ready事件
	if payload.TargetDeviceID != "" {
		return s.SendEventToDevice(event.RoomID, payload.TargetDeviceID, event)
	}

	// 否则，获取房间内的Monitor设备，并向其发送Camera Ready事件
	monitor, err := s.roomService.GetMonitorInRoom(event.RoomID)
	if err != nil {
		// 如果房间内没有Monitor设备，则等待Monitor设备加入
		return nil
	}

	return s.SendEventToDevice(event.RoomID, monitor.ID, event)
}

// HandleMonitorReady 处理Monitor设备准备就绪事件
func (s *EventServiceImpl) HandleMonitorReady(event *model.Event, payload *model.ReadyPayload) error {
	// 更新Monitor设备状态为Ready
	err := s.roomService.UpdateDeviceStatus(event.RoomID, event.DeviceID, model.DeviceStatusReady)
	if err != nil {
		return err
	}

	// 如果指定了目标Camera设备，则向该设备发送Monitor Ready事件
	if payload.TargetDeviceID != "" {
		return s.SendEventToDevice(event.RoomID, payload.TargetDeviceID, event)
	}

	// 否则，获取房间内的所有Camera设备，并向其发送Monitor Ready事件
	cameras, err := s.roomService.GetCamerasInRoom(event.RoomID)
	if err != nil {
		return err
	}

	for _, camera := range cameras {
		if camera.Status == model.DeviceStatusReady {
			err := s.SendEventToDevice(camera.RoomID, camera.ID, event)
			if err != nil {
				log.Printf("向Camera设备 %s 发送Monitor Ready事件失败: %v", camera.ID, err)
			}
		}
	}

	return nil
}

// HandleWebRTCOffer 处理WebRTC Offer事件
func (s *EventServiceImpl) HandleWebRTCOffer(event *model.Event, payload *model.WebRTCOfferPayload) error {
	// 如果Camera设备状态为Ready，则更新为Streaming
	device, err := s.getDeviceById(event.RoomID, event.DeviceID)
	if err == nil && device.Type == model.DeviceTypeCamera && device.Status == model.DeviceStatusReady {
		err := s.roomService.UpdateDeviceStatus(event.RoomID, event.DeviceID, model.DeviceStatusStreaming)
		if err != nil {
			log.Printf("更新Camera设备 %s 状态失败: %v", event.DeviceID, err)
		}
	}

	// 将Offer事件转发给目标设备
	return s.SendEventToDevice(event.RoomID, payload.TargetDeviceID, event)
}

// HandleWebRTCAnswer 处理WebRTC Answer事件
func (s *EventServiceImpl) HandleWebRTCAnswer(event *model.Event, payload *model.WebRTCAnswerPayload) error {
	// 如果Monitor设备状态为Ready，则更新为Receiving
	device, err := s.getDeviceById(event.RoomID, event.DeviceID)
	if err == nil && device.Type == model.DeviceTypeMonitor && device.Status == model.DeviceStatusReady {
		err := s.roomService.UpdateDeviceStatus(event.RoomID, event.DeviceID, model.DeviceStatusReceiving)
		if err != nil {
			log.Printf("更新Monitor设备 %s 状态失败: %v", event.DeviceID, err)
		}
	}

	// 将Answer事件转发给目标设备
	return s.SendEventToDevice(event.RoomID, payload.TargetDeviceID, event)
}

// HandleWebRTCIceCandidate 处理WebRTC ICE Candidate事件
func (s *EventServiceImpl) HandleWebRTCIceCandidate(event *model.Event, payload *model.WebRTCIceCandidatePayload) error {
	// 将ICE Candidate事件转发给目标设备
	return s.SendEventToDevice(event.RoomID, payload.TargetDeviceID, event)
}

// 移除不再需要的mapEvent函数，因为现在使用Event.ParsePayload方法
// BroadcastEvent 广播事件到房间内所有设备
func (s *EventServiceImpl) BroadcastEvent(roomID string, event *model.Event) error {
	// 获取房间内所有设备
	devices, err := s.roomService.GetDevicesInRoom(roomID)
	if err != nil {
		return err
	}

	// 广播事件到所有设备
	for _, device := range devices {
		err := s.SendEventToDevice(roomID, device.ID, event)
		if err != nil {
			log.Printf("向设备 %s 发送事件失败: %v", device.ID, err)
		}
	}

	return nil
}

// SendEventToDevice 发送事件到特定设备
func (s *EventServiceImpl) SendEventToDevice(roomID string, deviceID string, event *model.Event) error {
	// 获取设备连接
	conn, err := s.getDeviceConnection(roomID, deviceID)
	if err != nil {
		return err
	}

	// 序列化事件
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}

	// 发送事件 - 使用安全连接的WriteMessage方法
	return conn.WriteMessage(websocket.TextMessage, eventJSON)
}

// 辅助函数：获取设备连接
func (s *EventServiceImpl) getDeviceConnection(roomID string, deviceID string) (*model.SafeConn, error) {
	conn, err := s.roomService.GetDeviceConnection(roomID, deviceID)
	if err != nil {
		return nil, err
	}
	return conn, nil
}

// 辅助函数：根据设备ID获取设备信息
func (s *EventServiceImpl) getDeviceById(roomID string, deviceID string) (*model.Device, error) {
	return s.roomService.GetDeviceById(roomID, deviceID)
}
