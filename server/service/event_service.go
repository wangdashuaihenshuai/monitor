package service

import (
	"monitor/model"
)

// EventService 事件服务接口
type EventService interface {
	// ProcessEvent 处理事件
	ProcessEvent(event *model.Event) error

	// BroadcastEvent 广播事件到房间内所有设备
	BroadcastEvent(roomID string, event *model.Event) error

	// SendEventToDevice 发送事件到特定设备
	SendEventToDevice(roomID string, deviceID string, event *model.Event) error

	// HandleCameraReady 处理Camera设备准备就绪事件
	HandleCameraReady(event *model.Event, payload *model.ReadyPayload) error

	// HandleMonitorReady 处理Monitor设备准备就绪事件
	HandleMonitorReady(event *model.Event, payload *model.ReadyPayload) error

	// HandleWebRTCOffer 处理WebRTC Offer事件
	HandleWebRTCOffer(event *model.Event, payload *model.WebRTCOfferPayload) error

	// HandleWebRTCAnswer 处理WebRTC Answer事件
	HandleWebRTCAnswer(event *model.Event, payload *model.WebRTCAnswerPayload) error

	// HandleWebRTCIceCandidate 处理WebRTC ICE Candidate事件
	HandleWebRTCIceCandidate(event *model.Event, payload *model.WebRTCIceCandidatePayload) error
}
