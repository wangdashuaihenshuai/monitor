package model

import (
	"encoding/json"
	"time"
)

// EventType 事件类型
type EventType string

const (
	// 房间相关事件
	EventTypeConnect      EventType = "connect"       // connect事件，返回设备信息和房间设备列表
	EventTypeJoinRoom     EventType = "join_room"     // 加入房间
	EventTypeLeaveRoom    EventType = "leave_room"    // 离开房间
	EventTypeDeviceUpdate EventType = "device_update" // 设备信息更新
	EventTypeCameraReady  EventType = "camera_ready"  // Camera设备准备就绪
	EventTypeMonitorReady EventType = "monitor_ready" // Monitor设备准备就绪
	EventTypeError        EventType = "error"         // 错误事件

	// WebRTC相关事件
	EventTypeOffer        EventType = "offer"         // Offer
	EventTypeAnswer       EventType = "answer"        // Answer
	EventTypeIceCandidate EventType = "ice_candidate" // ICE Candidate
)

// Event 事件基础结构
type Event struct {
	Type      EventType       `json:"type"`      // 事件类型
	RoomID    string          `json:"roomId"`    // 房间ID
	DeviceID  string          `json:"deviceId"`  // 发送事件的设备ID
	Timestamp int64           `json:"timestamp"` // 事件时间戳
	Payload   json.RawMessage `json:"payload"`   // 事件负载数据，根据事件类型不同而不同
}

// 各种事件的Payload结构定义

// ErrorPayload 错误事件负载
type ErrorPayload struct {
	Error string `json:"error"` // 错误信息
}

// NewErrorEvent 创建一个错误事件
func NewErrorEvent(roomID, deviceID string, err error) *Event {
	payload := ErrorPayload{
		Error: err.Error(),
	}
	payloadJSON, _ := json.Marshal(payload)

	return &Event{
		Type:      EventTypeError,
		RoomID:    roomID,
		DeviceID:  deviceID,
		Timestamp: time.Now().UnixNano() / int64(time.Millisecond),
		Payload:   payloadJSON,
	}
}

// ConnectPayload 连接事件负载
type ConnectPayload struct {
	Device  *Device   `json:"device"`  // 设备信息
	Devices []*Device `json:"devices"` // 房间设备信息
}

// JoinRoomPayload 加入房间事件负载
type JoinRoomPayload struct {
	Device *Device `json:"device"` // 设备信息
}

// DeviceUpdatePayload 设备信息更新事件负载
type DeviceUpdatePayload struct {
	Device Device `json:"device"` // 更新后的设备信息
}

// ReadyPayload Camera/Monitor设备准备就绪事件负载
type ReadyPayload struct {
	TargetDeviceID string `json:"targetDeviceId"` // 目标设备ID
}

// WebRTCOfferPayload WebRTC Offer事件负载
type WebRTCOfferPayload struct {
	TargetDeviceID string `json:"targetDeviceId"` // 目标设备ID
	SDP            string `json:"sdp"`            // SDP描述
}

// WebRTCAnswerPayload WebRTC Answer事件负载
type WebRTCAnswerPayload struct {
	TargetDeviceID string `json:"targetDeviceId"` // 目标设备ID
	SDP            string `json:"sdp"`            // SDP描述
}

// WebRTCIceCandidatePayload WebRTC ICE Candidate事件负载
type WebRTCIceCandidatePayload struct {
	TargetDeviceID string `json:"targetDeviceId"` // 目标设备ID
	Candidate      string `json:"candidate"`      // ICE候选者
	SdpMid         string `json:"sdpMid"`         // SDP媒体标识符
	SdpMLineIndex  int    `json:"sdpMLineIndex"`  // SDP媒体行索引
}

// 辅助方法：根据事件类型解析Payload
func (e *Event) ParsePayload(v interface{}) error {
	return json.Unmarshal(e.Payload, v)
}
