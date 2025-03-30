import React, { useEffect, useRef, useState } from 'react';
import { CameraStateMachine } from '../machines/CameraStateMachine';
import { DeviceStatus } from '../types';
import '../styles/camera.css';
import { useSearchParams } from 'react-router-dom';
const CameraPage: React.FC = () => {
  // 状态管理
  const [searchParams] = useSearchParams();
  const [deviceId] = useState<string>('camera_' + Math.random().toString(36).substring(2, 9));
  const [roomId] = useState<string | null>(searchParams.get('roomId'));
  const [status, setStatus] = useState<DeviceStatus>(DeviceStatus.Init);
  const [wsUrl] = useState<string>('ws://localhost:8080/ws/room');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [networkQuality] = useState<number>(3); // 1-4, 4为最佳
  const [bitrate] = useState<string>('3.2 Mbps');
  const [resolution] = useState<string>('高清 (720p)');
  const [isCameraPermissionDenied, setIsCameraPermissionDenied] = useState<boolean>(false);
  const [isNetworkDisconnected, setIsNetworkDisconnected] = useState<boolean>(false);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  console.log(errorMessage)

  const videoRef = useRef<HTMLVideoElement>(null);
  const stateMachineRef = useRef<CameraStateMachine | null>(null);

  // 请求摄像头权限
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setIsCameraPermissionDenied(false);

      // 直接设置本地视频流到视频元素
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 不再尝试调用不存在的setLocalStream方法
      // 如果状态机已经初始化，可以考虑重新初始化或使用其他方法关联流
      if (stateMachineRef.current) {
        // 这里可能需要根据CameraStateMachine的实际接口进行调整
        // 例如，可能需要先离开房间，然后用新的流重新加入
        stateMachineRef.current.leaveRoom();
        setTimeout(() => {
          if (stateMachineRef.current) {
            stateMachineRef.current.joinRoom();
          }
        }, 500);
      }
    } catch (error) {
      console.error('摄像头权限被拒绝:', error);
      setIsCameraPermissionDenied(true);
    }
  };

  // 初始化状态机
  useEffect(() => {
    if (!roomId) {
      alert('房间ID不能为空');
      return;
    }

    // 请求摄像头权限 - 移到这里确保尽早获取摄像头流
    requestCameraPermission();

    if (!stateMachineRef.current) {
      console.log('初始化状态机');
      const stateMachine = new CameraStateMachine(deviceId, roomId, wsUrl);
      stateMachine.setStatusChangeCallback((newStatus) => {
        setStatus(newStatus);
        if (newStatus === DeviceStatus.Error) {
          setErrorMessage('发生错误，请检查控制台日志');
          setIsNetworkDisconnected(true);
        } else if (newStatus === DeviceStatus.Connected) {
          setIsNetworkDisconnected(false);
        } else if (newStatus === DeviceStatus.Connecting) {
          setIsNetworkDisconnected(true);
        } else {
          setErrorMessage('');
        }
      });
      stateMachineRef.current = stateMachine;
    }

    return () => {
      // 组件卸载时清理资源
      if (stateMachineRef.current) {
        stateMachineRef.current.leaveRoom();
      }
    };
  }, [deviceId, roomId, wsUrl]);

  // 移除或修改这个useEffect，因为我们已经在requestCameraPermission中设置了视频流
  // 更新视频流
  useEffect(() => {
    // 只在状态变化且本地视频流未设置时更新
    if (stateMachineRef.current && videoRef.current && !videoRef.current.srcObject) {
      const localStream = stateMachineRef.current.getLocalStream();
      if (localStream) {
        videoRef.current.srcObject = localStream;
      }
    }
  }, [status]);

  // 加入房间
  const handleJoinRoom = async () => {
    if (stateMachineRef.current) {
      try {
        await stateMachineRef.current.joinRoom();
      } catch (error) {
        console.error('加入房间失败:', error);
        setErrorMessage('加入房间失败');
      }
    }
  };

  // 离开房间
  const handleLeaveRoom = () => {
    if (stateMachineRef.current) {
      stateMachineRef.current.leaveRoom();
    }
  };

  // 切换摄像头
  const toggleCamera = () => {
    // 实际应用中需要实现摄像头切换逻辑
    setIsFrontCamera(!isFrontCamera);
  };

  // 开始/停止录制
  const toggleRecording = () => {
    if (isRecording && stateMachineRef.current) {
      stateMachineRef.current.leaveRoom();
    }

    setIsRecording(!isRecording);
    // 实际应用中需要实现录制逻辑
  };

  // 打开设置页面
  const openSettings = () => {
    // 实际应用中需要实现导航逻辑
    console.log('打开设置页面');
  };

  // 手动重连
  const handleReconnect = () => {
    if (stateMachineRef.current) {
      handleLeaveRoom();
      setTimeout(() => {
        handleJoinRoom();
      }, 1000);
    }
  };

  // 获取连接状态文本
  const getConnectionStatusText = () => {
    if (status === DeviceStatus.Connected) return '已连接';
    if (status === DeviceStatus.Connecting) return '连接中';
    if (status === DeviceStatus.Wait) return '等待中';
    if (status === DeviceStatus.Streaming) return '推流中';
    if (status === DeviceStatus.Error) return '连接失败';
    return '初始化中';
  };

  // 获取连接状态类名
  const getConnectionStatusClass = () => {
    if (status === DeviceStatus.Connected) return '';
    if (status === DeviceStatus.Connecting) return 'connecting';
    return 'offline';
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* 视频预览区域 */}
      <div className="flex-1 relative">
        <div className="video-container bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          <div className="video-overlay"></div>

          {/* 顶部状态栏 */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
            {/* 房间信息 */}
            <div className="flex items-center">
              <div className="bg-black/60 py-1 px-3 rounded-full flex items-center">
                <i className="fas fa-users mr-2"></i>
                <span className="text-sm font-medium">房间 {roomId}</span>
              </div>

              {/* 录制状态指示器 - 新增 */}
              {isRecording && (
                <div className="bg-black/60 py-1 px-3 rounded-full flex items-center ml-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 recording-dot"></div>
                  <span className="text-sm font-medium text-red-500">正在录制</span>
                </div>
              )}
            </div>

            {/* 连接状态 */}
            <div className="flex items-center bg-black/60 py-1 px-3 rounded-full">
              <div className={`status-indicator ${getConnectionStatusClass()} mr-2`}>
                <span className="text-sm font-medium">{getConnectionStatusText()}</span>
              </div>

              {/* 网络质量指示器 */}
              <div className="network-indicator ml-2">
                <div className={`network-bar ${networkQuality >= 1 ? 'network-active' : ''}`}></div>
                <div className={`network-bar ${networkQuality >= 2 ? 'network-active' : ''}`}></div>
                <div className={`network-bar ${networkQuality >= 3 ? 'network-active' : ''}`}></div>
                <div className={`network-bar ${networkQuality >= 4 ? 'network-active' : ''}`}></div>
              </div>
            </div>
          </div>
          {/* 底部控制栏 */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-5 pt-20">
            <div className="flex justify-between items-center">
              {/* 左侧：设置按钮 */}
              <button
                className="control-button bg-white/20 w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-lg"
                onClick={openSettings}>
                <i className="fas fa-cog text-white text-xl"></i>
              </button>

              {/* 中间：录制按钮 */}
              <button
                className={`control-button ${isRecording ? 'bg-red-600' : 'bg-red-500'} w-20 h-20 rounded-full flex items-center justify-center shadow-lg`}
                onClick={toggleRecording}>
                <div className={`${isRecording ? 'w-10 h-10 rounded-sm' : 'w-16 h-16 rounded-full'} border-4 border-white`}></div>
              </button>

              {/* 右侧：摄像头切换 */}
              <button
                className="control-button bg-white/20 w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-lg"
                onClick={toggleCamera}>
                <i className="fas fa-camera-rotate text-white text-xl"></i>
              </button>
            </div>

            {/* 参数状态信息 */}
            <div className="mt-5 flex justify-center">
              <div className="bg-black/60 py-2 px-4 rounded-full flex items-center text-xs space-x-3">
                <div className="flex items-center">
                  <i className="fas fa-video mr-1"></i>
                  <span>{resolution}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                <div className="flex items-center">
                  <i className="fas fa-wifi mr-1"></i>
                  <span>{bitrate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 摄像头权限提示 */}
      <div className={`${isCameraPermissionDenied ? 'flex' : 'hidden'} absolute inset-0 bg-black flex-col items-center justify-center p-8 z-50`}>
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <i className="fas fa-video-slash text-4xl text-white/80"></i>
        </div>
        <h3 className="text-xl font-bold mb-2">需要访问摄像头</h3>
        <p className="text-white/70 text-center mb-8">请允许应用访问您的摄像头以开始视频共享</p>
        <button
          className="bg-blue-500 py-3 px-8 rounded-lg font-medium"
          onClick={requestCameraPermission}>
          授权访问
        </button>
      </div>

      {/* 网络断开提示 */}
      <div className={`${isNetworkDisconnected ? 'flex' : 'hidden'} absolute inset-0 bg-black/90 flex-col items-center justify-center p-8 z-50`}>
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <i className="fas fa-wifi-slash text-4xl text-white/80"></i>
        </div>
        <h3 className="text-xl font-bold mb-2">网络连接断开</h3>
        <p className="text-white/70 text-center mb-6">正在尝试重新连接...</p>
        <div className="w-40 h-1 bg-white/20 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-blue-500 w-1/2 rounded-full"></div>
        </div>
        <button
          className="border border-white/30 bg-white/10 py-3 px-8 rounded-lg font-medium"
          onClick={handleReconnect}>
          手动重连
        </button>
      </div>
    </div>
  );
};

export default CameraPage;