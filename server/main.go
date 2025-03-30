package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"monitor/handler"
	"monitor/service"
)

func main() {
	// 获取环境变量或使用默认值
	port := os.Getenv("PORT")
	if port == "" {
		port = "11100"
	}

	// 允许的跨域来源
	allowOrigin := os.Getenv("ALLOW_ORIGIN")
	if allowOrigin == "" {
		allowOrigin = "*"
	}

	// 创建服务实例
	roomService := service.NewRoomService()
	eventService := service.NewEventService(roomService)
	webSocketHandler := handler.NewWebSocketHandler(roomService, eventService)

	// 创建Gin路由
	r := gin.Default()

	// 设置CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// 注册WebSocket路由
	r.GET("/ws/:roomId", webSocketHandler.HandleWebSocket)

	// 注册API路由
	api := r.Group("/api")
	{
		// 创建房间
		api.POST("/room", func(c *gin.Context) {
			var req struct {
				Name string `json:"name"`
			}
			if err := c.BindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			// 由后端生成六位数字房间号
			room, err := roomService.CreateRoom(req.Name)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, room)
		})

		// 获取所有房间列表
		api.GET("/rooms", func(c *gin.Context) {
			rooms, err := roomService.GetRooms()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, rooms)
		})

		// 获取房间信息
		api.GET("/rooms/:roomId", func(c *gin.Context) {
			roomID := c.Param("roomId")
			room, err := roomService.GetRoom(roomID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, room)
		})

		// 获取房间内设备列表
		api.GET("/rooms/:roomId/devices", func(c *gin.Context) {
			roomID := c.Param("roomId")
			devices, err := roomService.GetDevicesInRoom(roomID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, devices)
		})
	}

	// 提供前端静态文件
	r.NoRoute(func(c *gin.Context) {
		// 静态文件目录路径
		staticDir := "./public"
		filePath := filepath.Join(staticDir, c.Request.URL.Path)

		// 如果请求的文件不存在，返回 index.html
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			c.File(filepath.Join(staticDir, "index.html"))
			return
		}

		// 提供静态文件
		c.File(filePath)
	})

	// 启动服务器
	log.Printf("Server started on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
