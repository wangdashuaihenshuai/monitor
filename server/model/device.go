package model

// DeviceType 设备类型
type DeviceType string

const (
	// DeviceTypeCamera 拍摄端设备
	DeviceTypeCamera DeviceType = "camera"
	// DeviceTypeMonitor 监控端设备
	DeviceTypeMonitor DeviceType = "monitor"
)

// DeviceStatus 设备状态
type DeviceStatus string

const (
	// 通用状态
	DeviceStatusInit      DeviceStatus = "init"      // 初始化状态
	DeviceStatusConnected DeviceStatus = "connected" // 已连接状态
	DeviceStatusReady     DeviceStatus = "ready"     // 准备就绪状态
	DeviceStatusError     DeviceStatus = "error"     // 错误状态

	// Camera 特有状态
	DeviceStatusStreaming DeviceStatus = "streaming" // 传输中状态

	// Monitor 特有状态
	DeviceStatusReceiving DeviceStatus = "receiving" // 接收中状态
)

// Device 设备信息
type Device struct {
	ID         string                 `json:"id"`         // 设备唯一标识
	Type       DeviceType             `json:"type"`       // 设备类型
	Status     DeviceStatus           `json:"status"`     // 设备状态
	RoomID     string                 `json:"roomId"`     // 所在房间ID
	Name       string                 `json:"name"`       // 设备名称
	Info       map[string]interface{} `json:"info"`       // 设备信息
	CreateTime int64                  `json:"createTime"` // 创建时间
	UpdateTime int64                  `json:"updateTime"` // 更新时间
}
