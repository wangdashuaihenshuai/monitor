import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CreateRoomRequest, Room } from '../api';
import '../styles/neumorphism.css'; // 导入样式文件

const CreateRoomPage: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const navigate = useNavigate();

  // 处理移动端视图滚动
  useEffect(() => {
    if (createdRoom && window.innerWidth < 768) {
      const roomCreatedElement = document.getElementById('roomCreated');
      if (roomCreatedElement) {
        roomCreatedElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [createdRoom]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('请输入房间名称');
      return;
    }

    setIsLoading(true);
    try {
      const request: CreateRoomRequest = {
        name: roomName.trim()
      };

      // 模拟延迟，与原型保持一致
      setTimeout(async () => {
        try {
          const room = await api.createRoom(request);
          setCreatedRoom(room);
        } catch (error) {
          console.error('创建房间失败:', error);
          alert('创建房间失败，请重试');
        } finally {
          setIsLoading(false);
        }
      }, 1500);
    } catch (error) {
      console.error('创建房间失败:', error);
      alert('创建房间失败，请重试');
      setIsLoading(false);
    }
  };

  const handleEnterRoom = () => {
    if (createdRoom) {
      navigate(`/room/${createdRoom.id}`);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const copyRoomId = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.id);
      alert('房间ID已复制到剪贴板');
    }
  };

  const shareInviteLink = () => {
    if (createdRoom) {
      const url = `${window.location.origin}/join/${createdRoom.id}`;
      navigator.clipboard.writeText(url);
      alert('邀请链接已复制到剪贴板');
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-800" style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#f8fafc',
      WebkitTapHighlightColor: 'transparent',
      overscrollBehavior: 'none'
    }}>
      {/* 头部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-slate-600 hover:text-slate-900"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-xl font-semibold">创建监控房间</h1>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-xl">
        {!createdRoom ? (
          // 房间设置卡片 - 未创建房间时显示
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">房间设置</h2>

            <form>
              <div className="space-y-4">
                {/* 房间名称 */}
                <div>
                  <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">房间名称</label>
                  <div className="relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-tag text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      id="roomName"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="input-focus block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：办公室监控"
                    />
                  </div>
                </div>

                {/* 房间密码（可选） */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">访问密码</label>
                    <span className="text-xs text-gray-500">可选</span>
                  </div>
                  <div className="relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-lock text-gray-400"></i>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-focus block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="设置访问密码"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">如不设置密码，任何人都可使用房间ID进入</p>
                </div>
              </div>

              {/* 创建按钮 */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition duration-150 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin mr-2"></i>
                      创建中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus-circle mr-2"></i>
                      创建监控房间
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          // 房间创建成功卡片 - 创建房间后显示
          <div id="roomCreated" className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center flex-col">
              <div className="w-full mb-6">
                <div className="rounded-full bg-green-100 text-green-600 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-check-circle text-3xl"></i>
                </div>
                <h2 className="text-xl font-semibold text-center mb-1">房间创建成功！</h2>
                <p className="text-gray-500 text-sm text-center">请使用以下房间ID或二维码邀请设备加入</p>
              </div>

              {/* 房间ID显示 */}
              <div className="bg-slate-50 rounded-lg py-3 px-4 flex justify-between items-center w-full mb-6">
                <div>
                  <div className="text-sm text-gray-500">房间ID</div>
                  <div className="text-2xl font-semibold tracking-wider">{createdRoom.id}</div>
                </div>
                <button
                  onClick={copyRoomId}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>

              {/* 二维码 */}
              <div className="qr-container flex flex-col items-center mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=room:${createdRoom.id}`}
                  alt="房间二维码"
                  className="w-40 h-40"
                />
                <div className="text-xs text-gray-500 mt-2">扫描此二维码快速加入房间</div>
              </div>

              <div className="w-full space-y-3">
                {/* 添加进入房间按钮 */}
                <button
                  onClick={handleEnterRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition duration-150 flex items-center justify-center"
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  进入监控房间
                </button>

                <button
                  onClick={shareInviteLink}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-md transition duration-150 flex items-center justify-center"
                >
                  <i className="fas fa-share-alt mr-2"></i>
                  分享邀请链接
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreateRoomPage;