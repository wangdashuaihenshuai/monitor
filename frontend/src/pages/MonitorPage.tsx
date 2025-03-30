import React, { useEffect, useRef, useState } from 'react';
import { MonitorStateMachine } from '../machines/MonitorStateMachine';
import { DeviceStatus } from '../types';

const MonitorPage: React.FC = () => {
  // 状态管理
  const [deviceId] = useState<string>('monitor_' + Math.random().toString(36).substring(2, 9));
  // 从 URL 查询参数中获取 roomId
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('roomId');
    return roomIdParam || '';
  });
  const [roomIdError, setRoomIdError] = useState<boolean>(roomId === '');
  const [status, setStatus] = useState<DeviceStatus>(DeviceStatus.Init);
  const [wsUrl] = useState<string>('ws://localhost:8080/ws/room');
  const [isJoined, setIsJoined] = useState<boolean>(roomId !== '');  // 修改：有房间号时默认加入
  const [errorMessage, setErrorMessage] = useState<string>(roomId === '' ? '请提供房间ID' : '');
  const [cameraStreams, setCameraStreams] = useState<Map<string, MediaStream>>(new Map());
  console.log(errorMessage, roomIdError)
  // UI 状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(window.innerWidth < 1024); // 修改：PC端默认显示侧边栏，移动端默认隐藏
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [fullscreenCameraId, setFullscreenCameraId] = useState<string | null>(null);

  // Refs
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

      // 在 setCameraStreams 回调中修复 prev 未定义的问题
      stateMachine.setCameraConnectionCallback((cameraId, status, stream) => {
        if (status === 'added' || status === 'updated') {
          if (stream) {
            setCameraStreams(prev => {
              const newStreams = new Map(prev);
              newStreams.set(cameraId, stream);
              return newStreams;
            });
            // 如果是第一个摄像头，自动选择它
            if (!selectedCameraId) {
              setSelectedCameraId(cameraId);
            }
          }
        } else if (status === 'removed') {
          setCameraStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(cameraId);

            // 如果删除的是当前选中的摄像头，重置选择
            if (selectedCameraId === cameraId) {
              const remainingCameras = Array.from(newStreams.keys());
              if (remainingCameras.length > 0) {
                setSelectedCameraId(remainingCameras[0]);
              } else {
                setSelectedCameraId('');
              }
            }

            return newStreams;
          });
        }

      });

      stateMachineRef.current = stateMachine;
      stateMachineRef.current.joinRoom();
    }
  }, [deviceId, roomId, wsUrl, selectedCameraId]);

  useEffect(() => {
    console.log('选中的摄像头已更改:', selectedCameraId);
  }, [selectedCameraId]);

  // 更新视频流
  useEffect(() => {
    cameraStreams.forEach((stream, cameraId) => {
      const videoElement = videoRefs.current.get(cameraId);
      if (videoElement && videoElement.srcObject !== stream) {
        console.log(`设置视频流 (${cameraId})`, stream);
        videoElement.srcObject = stream;

        // 添加元数据加载和播放事件处理
        videoElement.onloadedmetadata = () => {
          console.log(`视频元数据已加载 (${cameraId})`);
          videoElement.play().catch(err => {
            console.error(`播放视频流失败 (${cameraId}):`, err);
          });
        };

        // 添加错误处理
        videoElement.onerror = (e) => {
          console.error(`视频元素错误 (${cameraId}):`, e);
        };
      }
    });
  }, [cameraStreams]);

  // 加入房间
  const handleJoinRoom = async () => {
    if (!roomId) {
      setErrorMessage('请提供有效的房间ID');
      setRoomIdError(true);
      return;
    }

    if (stateMachineRef.current) {
      try {
        await stateMachineRef.current.joinRoom();
        setIsJoined(true);
        // 移动端自动隐藏侧边栏
        if (window.innerWidth < 1024) {
          setIsSidebarHidden(true);
        }
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
      setSelectedCameraId('');
      setFullscreenCameraId(null);
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

  // 切换全屏模式
  const toggleFullscreen = (cameraId: string) => {
    if (fullscreenCameraId === cameraId) {
      setFullscreenCameraId(null);
    } else {
      setFullscreenCameraId(cameraId);
    }
  };

  // 获取摄像头状态样式
  const getCameraStatusClass = (cameraId: string) => {
    // 根据摄像头连接状态机的状态来确定显示样式
    if (stateMachineRef.current) {
      const cameraConnections = stateMachineRef.current.getCameraConnections();
      const cameraConnection = cameraConnections.get(cameraId);

      if (cameraConnection) {
        const status = cameraConnection.getStatus();

        // 根据状态返回对应的样式类
        switch (status) {
          case DeviceStatus.Receiving:
            return 'bg-green-500'; // 在线/接收中
          case DeviceStatus.Connecting:
            return 'bg-blue-500'; // 连接中
          case DeviceStatus.Ready:
            return 'bg-yellow-500'; // 准备就绪
          case DeviceStatus.Error:
            return 'bg-red-500'; // 错误
          default:
            return 'bg-gray-500'; // 其他状态
        }
      }
    }

    // 默认返回灰色（未知状态）
    return 'bg-gray-500';
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-200 bg-slate-800/95">
      {/* 侧边栏 */}
      <aside
        className={`sidebar bg-slate-900/95 border-r border-slate-700/50 transition-all duration-300 ease-in-out z-40
                   ${isSidebarCollapsed ? 'sidebar-collapsed w-[60px]' : 'w-[280px]'}
                   ${isSidebarHidden ? 'transform -translate-x-full' : ''} 
                   lg:transform-none lg:static absolute top-0 bottom-0 left-0`}
      >
        {/* 侧边栏完整内容 */}
        <div className={`${isSidebarCollapsed ? 'hidden' : 'block'}`}>
          <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                <i className="fas fa-video"></i>
              </div>
              <h1 className="text-lg font-bold">监控中心</h1>
            </div>
            <div className="flex items-center">
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded mr-2">房间 #{roomId}</span>
              <button
                className="p-1 hover:bg-slate-700/50 rounded"
                onClick={() => setIsSidebarCollapsed(true)}
              >
                <i className="fas fa-angle-left"></i>
              </button>
            </div>
          </div>

          {/* 状态统计信息 */}
          <div className="p-3 border-b border-slate-700/50 flex flex-wrap gap-3">
            <div className="flex items-center bg-slate-800/70 rounded-md px-3 py-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-sm">{cameraStreams.size} 在线</span>
            </div>
            <div className="flex items-center bg-slate-800/70 rounded-md px-3 py-1.5">
              <i className="fas fa-signal mr-2 text-sm"></i>
              <span className="text-sm">连接正常</span>
            </div>
          </div>

          {/* 设备列表标题 */}
          <div className="p-2 text-sm font-medium flex justify-between items-center">
            <span>在线设备 ({cameraStreams.size})</span>
            {/* 全部/单个视图切换按钮 */}
            <div className="view-toggle text-xs flex bg-slate-800/70 rounded p-0.5">
              <div
                className={`px-2 py-1 rounded cursor-pointer transition-all ${viewMode === 'all' ? 'bg-blue-600/50' : 'hover:bg-slate-700/50'}`}
                onClick={() => setViewMode('all')}
              >
                全部
              </div>
              <div
                className={`px-2 py-1 rounded cursor-pointer transition-all ${viewMode === 'single' ? 'bg-blue-600/50' : 'hover:bg-slate-700/50'}`}
                onClick={() => setViewMode('single')}
              >
                单个
              </div>
            </div>
          </div>

          {/* 设备列表 */}
          <div className="max-h-[calc(100vh-230px)] overflow-y-auto">
            {Array.from(cameraStreams.keys()).map(cameraId => (
              <div
                key={cameraId}
                className={`px-3 py-2 cursor-pointer transition-all border-l-[3px] ${selectedCameraId === cameraId ? 'bg-blue-600/15 border-l-blue-500' : 'border-l-transparent hover:bg-slate-800/30'}`}
                onClick={() => setSelectedCameraId(cameraId)}
              >
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${getCameraStatusClass(cameraId)}`}></span>
                  <span>Camera: {cameraId}</span>
                </div>
                <div className="text-xs text-gray-400 pl-4 mt-1">
                  {/* 这里可以显示摄像头的一些状态信息 */}
                  720p | 正常
                </div>
              </div>
            ))}

            {cameraStreams.size === 0 && (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">
                {isJoined ? '没有可用的摄像头' : '请先加入房间'}
              </div>
            )}
          </div>

          {/* 底部操作区 */}
          <div className="p-3 border-t border-slate-700/50 mt-2">
            {!isJoined ? (
              <button
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm transition-colors"
                onClick={handleJoinRoom}
              >
                <i className="fas fa-sign-in-alt mr-2"></i> 加入房间
              </button>
            ) : (
              <button
                className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 py-2 rounded text-sm transition-colors"
                onClick={handleLeaveRoom}
              >
                <i className="fas fa-sign-out-alt mr-2"></i> 离开房间
              </button>
            )}
          </div>
        </div>

        {/* 折叠状态下的迷你侧边栏内容 */}
        <div className={`flex-col h-full p-2 ${isSidebarCollapsed ? 'flex' : 'hidden'}`}>
          <div className="flex justify-center mb-4 mt-2">
            <button
              className="p-1 hover:bg-slate-700/50 rounded"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <i className="fas fa-angle-right"></i>
            </button>
          </div>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-video"></i>
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            <i className="fas fa-signal text-sm"></i>
          </div>
          <div className="flex-1"></div>
          <div className="flex flex-col items-center gap-3 mt-4">
            {Array.from(cameraStreams.keys()).map(cameraId => (
              <span
                key={cameraId}
                className={`w-3 h-3 rounded-full ${getCameraStatusClass(cameraId)} cursor-pointer ${selectedCameraId === cameraId ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => setSelectedCameraId(cameraId)}
              ></span>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            {!isJoined ? (
              <button
                className="p-1 hover:bg-blue-700 bg-blue-600 rounded w-8 h-8 flex items-center justify-center"
                onClick={handleJoinRoom}
              >
                <i className="fas fa-sign-in-alt text-xs"></i>
              </button>
            ) : (
              <button
                className="p-1 hover:bg-red-700 bg-red-600 rounded w-8 h-8 flex items-center justify-center"
                onClick={handleLeaveRoom}
              >
                <i className="fas fa-sign-out-alt text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 主要内容区域 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 py-2 px-3 flex items-center justify-between">
          {/* 移动端菜单按钮 */}
          <button
            className="lg:hidden p-2 hover:bg-slate-700/50 rounded"
            onClick={() => setIsSidebarHidden(!isSidebarHidden)}
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* 页面标题 */}
          <h1 className="text-lg font-medium lg:ml-2">监控视图</h1>

          {/* 状态显示 */}
          <div className="text-sm">
            <span className={`px-2 py-1 rounded ${status === DeviceStatus.Connected ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
              {status}
            </span>
          </div>
        </div>

        {/* 视频网格容器 */}
        <div className="flex-1 p-2 overflow-auto" ref={videoContainerRef}>
          {!isJoined ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center p-6 bg-slate-900/50 rounded-lg max-w-md">
                <h2 className="text-xl font-bold mb-4">房间错误</h2>
                <p className="mb-6 text-gray-400">{errorMessage}</p>

                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-400 mb-1">房间ID</label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleJoinRoom}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm transition-colors"
                  >
                    加入房间
                  </button>
                </div>
              </div>
            </div>
          ) : cameraStreams.size === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="fas fa-video-slash text-4xl text-gray-500 mb-4"></i>
                <p className="text-gray-400">没有可用的摄像头视频流</p>
              </div>
            </div>
          ) : (
            <div className={`video-grid gap-4 ${viewMode === 'single'
              ? 'grid grid-cols-1'
              : 'grid grid-cols-1 sm:grid-cols-2'
              } overflow-y-auto p-2`}>
              {Array.from(cameraStreams.entries())
                .filter(([cameraId]) => viewMode === 'all' || cameraId === selectedCameraId)
                .map(([cameraId, stream]) => (
                  <div
                    key={cameraId}
                    className={`bg-black rounded shadow-md relative ${fullscreenCameraId === cameraId
                      ? 'fixed top-0 left-0 w-screen h-screen z-50'
                      : 'aspect-video w-full'
                      }`}
                  >
                    <video
                      ref={(el) => {
                        if (el) {
                          setVideoRef(cameraId, el);
                          if (el.srcObject !== stream) {
                            el.srcObject = stream;
                            el.onloadedmetadata = () => {
                              el.play().catch(err => {
                                console.error(`播放视频流失败 (${cameraId}):`, err);
                              });
                            };
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />

                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${getCameraStatusClass(cameraId)}`}></span>
                          <span className="text-sm font-medium">Camera: {cameraId}</span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            className="p-1 bg-black/30 hover:bg-black/50 rounded-full transition-colors"
                            onClick={() => toggleFullscreen(cameraId)}
                          >
                            <i className={`fas ${fullscreenCameraId === cameraId ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MonitorPage;