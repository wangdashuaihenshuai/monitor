package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"monitor/model"
	"monitor/service"
)

// WebSocketHandler WebSocket处理器
type WebSocketHandler struct {
	roomService  service.RoomService
	eventService service.EventService
	upgrader     websocket.Upgrader
}

// getCurrentTimestamp 获取当前时间戳（毫秒）
func getCurrentTimestamp() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

// NewWebSocketHandler 创建WebSocket处理器
func NewWebSocketHandler(roomService service.RoomService, eventService service.EventService) *WebSocketHandler {
	return &WebSocketHandler{
		roomService:  roomService,
		eventService: eventService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 允许所有跨域请求
			},
		},
	}
}

// HandleWebSocket 处理WebSocket连接
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	roomID := c.Param("roomId")
	deviceID := c.Query("deviceId")
	deviceType := c.Query("deviceType")

	// 参数检查
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "房间ID不能为空"})
		return
	}

	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "设备ID不能为空"})
		return
	}

	if deviceType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "设备类型不能为空"})
		return
	}

	// 升级HTTP连接为WebSocket连接
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade to websocket"})
		return
	}

	// 创建设备对象
	device := &model.Device{
		ID:         deviceID,
		Type:       model.DeviceType(deviceType),
		Status:     model.DeviceStatusInit,
		RoomID:     roomID,
		CreateTime: 0, // 将在服务层设置
		UpdateTime: 0, // 将在服务层设置
	}

	// 加入房间
	err = h.roomService.JoinRoom(roomID, device, conn)
	if err != nil {
		conn.Close()
		return
	}

	// 处理WebSocket消息
	go h.handleMessages(conn, roomID, deviceID)
}

// handleMessages 处理WebSocket消息
func (h *WebSocketHandler) handleMessages(conn *websocket.Conn, roomID string, deviceID string) {
	defer func() {
		conn.Close()
		h.roomService.LeaveRoom(roomID, deviceID)
	}()

	// 发送连接成功事件
	device, err := h.roomService.GetDeviceById(roomID, deviceID)
	if err == nil {
		devices, _ := h.roomService.GetDevicesInRoom(roomID)

		payload := model.ConnectPayload{
			Device:  device,
			Devices: devices,
		}
		payloadJSON, _ := json.Marshal(payload)

		connectEvent := model.Event{
			Type:      model.EventTypeConnect,
			RoomID:    roomID,
			DeviceID:  deviceID,
			Timestamp: getCurrentTimestamp(),
			Payload:   payloadJSON,
		}

		eventJSON, _ := json.Marshal(connectEvent)
		conn.WriteMessage(websocket.TextMessage, eventJSON)

		// 广播设备加入房间事件
		joinPayload := model.JoinRoomPayload{
			Device: device,
		}
		joinPayloadJSON, _ := json.Marshal(joinPayload)

		joinRoomEvent := model.Event{
			Type:      model.EventTypeJoinRoom,
			RoomID:    roomID,
			DeviceID:  deviceID,
			Timestamp: getCurrentTimestamp(),
			Payload:   joinPayloadJSON,
		}

		h.eventService.BroadcastEvent(roomID, &joinRoomEvent)
	}

	for {
		// 读取消息
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("读取消息错误: %v", err)
			break
		}

		// 解析事件
		var event model.Event
		err = json.Unmarshal(message, &event)
		if err != nil {
			log.Printf("解析事件错误: %v", err)
			errorPayload := model.ErrorPayload{
				Error: "无效的事件格式",
			}
			errorPayloadJSON, _ := json.Marshal(errorPayload)

			errorEvent := model.Event{
				Type:      model.EventTypeError,
				RoomID:    roomID,
				DeviceID:  deviceID,
				Timestamp: getCurrentTimestamp(),
				Payload:   errorPayloadJSON,
			}

			eventJSON, _ := json.Marshal(errorEvent)
			conn.WriteMessage(websocket.TextMessage, eventJSON)
			continue
		}

		// 设置事件的房间ID和设备ID
		event.RoomID = roomID
		event.DeviceID = deviceID
		event.Timestamp = getCurrentTimestamp()

		// 处理事件
		err = h.eventService.ProcessEvent(&event)
		if err != nil {
			log.Printf("处理事件错误: %v", err)
			errorEvent := model.NewErrorEvent(event.RoomID, event.DeviceID, err)
			eventJSON, _ := json.Marshal(errorEvent)
			conn.WriteMessage(websocket.TextMessage, eventJSON)
		}
	}

	// 广播设备离开房间事件
	leaveRoomEvent := model.Event{
		Type:      model.EventTypeLeaveRoom,
		RoomID:    roomID,
		DeviceID:  deviceID,
		Timestamp: getCurrentTimestamp(),
		Payload:   json.RawMessage("{}"), // 离开房间事件没有额外负载
	}
	h.eventService.BroadcastEvent(roomID, &leaveRoomEvent)
}
