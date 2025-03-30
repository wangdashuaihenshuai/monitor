import React, { useEffect, useRef, useState } from 'react';
import { CameraStateMachine } from '../machines/CameraStateMachine';
import { DeviceStatus } from '../types';

const CameraTestPage: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string>('camera_' + Math.random().toString(36).substring(2, 9));
  const [roomId, setRoomId] = useState<string>('test_room');
  const [status, setStatus] = useState<DeviceStatus>(DeviceStatus.Init);
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8080/ws/room');
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const stateMachineRef = useRef<CameraStateMachine | null>(null);

  // 初始化状态机
  useEffect(() => {
    if (!stateMachineRef.current) {
      const stateMachine = new CameraStateMachine(deviceId, roomId, wsUrl);
      stateMachine.setStatusChangeCallback((newStatus) => {
        setStatus(newStatus);
        if (newStatus === DeviceStatus.Error) {
          setErrorMessage('发生错误，请检查控制台日志');
        } else {
          setErrorMessage('');
        }
      });
      stateMachineRef.current = stateMachine;
    }
  }, [deviceId, roomId, wsUrl]);

  // 更新视频流
  useEffect(() => {
    if (stateMachineRef.current && videoRef.current) {
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Camera 测试页面</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">WebSocket URL:</label>
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            disabled={isJoined}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
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

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-2">
          <p className="mr-2">当前状态:</p>
          <span className={`font-medium px-2 py-1 rounded-full text-sm ${status === DeviceStatus.Connected ? 'bg-green-100 text-green-800' :
            status === DeviceStatus.Error ? 'bg-red-100 text-red-800' :
              status === DeviceStatus.Connecting ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
            }`}>
            {status}
          </span>
        </div>
        {errorMessage && <p className="text-red-600 mt-2">{errorMessage}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">本地视频预览</h2>
        <div className="flex justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-2xl rounded-lg border border-gray-200 shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default CameraTestPage;