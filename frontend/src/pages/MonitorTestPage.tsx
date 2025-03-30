import React, { useEffect, useRef, useState } from 'react';
import { MonitorStateMachine } from '../machines/MonitorStateMachine';
import { DeviceStatus } from '../types';

const MonitorTestPage: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string>('monitor_' + Math.random().toString(36).substring(2, 9));
  const [roomId, setRoomId] = useState<string>('test_room');
  const [status, setStatus] = useState<DeviceStatus>(DeviceStatus.Init);
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8080/ws/room');
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cameraStreams, setCameraStreams] = useState<Map<string, MediaStream>>(new Map());

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const stateMachineRef = useRef<MonitorStateMachine | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 初始化状态机
  useEffect(() => {
    if (!stateMachineRef.current) {
      const stateMachine = new MonitorStateMachine(deviceId, roomId, wsUrl);
      stateMachine.setStatusChangeCallback((newStatus) => {
        setStatus(newStatus);
        if (newStatus === DeviceStatus.Error) {
          setErrorMessage('发生错误，请检查控制台日志');
        } else {
          setErrorMessage('');
        }
      });

      stateMachine.setCameraConnectionCallback((cameraId, status, stream) => {
        if (status === 'added' || status === 'updated') {
          if (stream) {
            setCameraStreams(prev => {
              const newStreams = new Map(prev);
              newStreams.set(cameraId, stream);
              return newStreams;
            });
          }
        } else if (status === 'removed') {
          setCameraStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(cameraId);
            return newStreams;
          });
        }
      });

      stateMachineRef.current = stateMachine;
    }
  }, [deviceId, roomId, wsUrl]);

  // 更新视频流
  useEffect(() => {
    cameraStreams.forEach((stream, cameraId) => {
      const videoElement = videoRefs.current.get(cameraId);
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [cameraStreams]);

  // 加入房间
  const handleJoinRoom = async () => {
    if (stateMachineRef.current) {
      try {
        await stateMachineRef.current.joinRoom();
        setIsJoined(true);
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
      setIsJoined(false);
      setCameraStreams(new Map());
    }
  };

  // 设置视频元素引用
  const setVideoRef = (cameraId: string, element: HTMLVideoElement | null) => {
    if (element) {
      videoRefs.current.set(cameraId, element);
    } else {
      videoRefs.current.delete(cameraId);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Monitor 测试页面</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">设备ID:</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={isJoined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">房间ID:</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={isJoined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">WebSocket URL:</label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              disabled={isJoined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleJoinRoom}
            disabled={isJoined}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            加入房间
          </button>
          <button
            onClick={handleLeaveRoom}
            disabled={!isJoined}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            离开房间
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">当前状态: <span className="font-semibold text-gray-900">{status}</span></p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">连接的Camera数量: <span className="font-semibold text-gray-900">{cameraStreams.size}</span></p>
          </div>
          {errorMessage && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6" ref={videoContainerRef}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">远程视频流</h2>
        {cameraStreams.size === 0 ? (
          <p className="text-gray-500 italic">没有可用的Camera视频流</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(cameraStreams.keys()).map(cameraId => (
              <div key={cameraId} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                <h3 className="text-md font-medium text-gray-700 mb-2">Camera: {cameraId}</h3>
                <video
                  ref={(el) => setVideoRef(cameraId, el)}
                  autoPlay
                  playsInline
                  className="w-full h-auto rounded border border-gray-200"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorTestPage;