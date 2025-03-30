import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [cameraRoomId, setCameraRoomId] = useState('');
  const [monitorRoomId, setMonitorRoomId] = useState('');

  const handleCameraJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (cameraRoomId.trim()) {
      navigate(`/camera?roomId=${cameraRoomId.trim()}`);
    }
  };

  const handleMonitorJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (monitorRoomId.trim()) {
      navigate(`/monitor?roomId=${monitorRoomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 头部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center justify-center">
          <h1 className="text-xl font-semibold text-center">多端视频监控系统</h1>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1 container mx-auto px-5 py-8">
        {/* 欢迎文本 */}
        <div className="mb-8 text-center">
          <i className="fa-solid fa-video text-blue-500 text-5xl mb-3"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎使用</h2>
          <p className="text-gray-600">请选择您需要的功能</p>
        </div>

        {/* 功能卡片区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 创建房间卡片 */}
          <div
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/create-room')}
          >
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-4">
              <i className="fas fa-plus-circle text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">创建监控房间</h3>
            <p className="text-gray-500 text-sm">创建一个新的监控房间，邀请设备加入</p>
          </div>

          {/* 摄像头卡片 */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4">
              <i className="fas fa-camera text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">摄像头模式</h3>
            <p className="text-gray-500 text-sm mb-3">将此设备作为摄像头加入监控房间</p>
            <form onSubmit={handleCameraJoin} className="mt-2">
              <div className="flex">
                <input
                  type="text"
                  placeholder="输入房间ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  value={cameraRoomId}
                  onChange={(e) => setCameraRoomId(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-r-md hover:bg-green-600"
                >
                  加入
                </button>
              </div>
            </form>
          </div>

          {/* 监控中心卡片 */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 mb-4">
              <i className="fas fa-desktop text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">监控中心</h3>
            <p className="text-gray-500 text-sm mb-3">查看所有连接的摄像头画面</p>
            <form onSubmit={handleMonitorJoin} className="mt-2">
              <div className="flex">
                <input
                  type="text"
                  placeholder="输入房间ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  value={monitorRoomId}
                  onChange={(e) => setMonitorRoomId(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="bg-purple-500 text-white px-4 py-2 rounded-r-md hover:bg-purple-600"
                >
                  进入
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 最近使用的房间 */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4">最近使用的房间</h3>
          <div className="space-y-3">
            <div
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              onClick={() => navigate('/monitor?roomId=531892')}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                  <i className="fas fa-building"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">办公室监控</p>
                  <p className="text-xs text-gray-500">房间ID: 531892</p>
                </div>
              </div>
              <div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
            </div>

            <div
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              onClick={() => navigate('/monitor?roomId=678321')}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-500">
                  <i className="fas fa-home"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">家庭摄像头</p>
                  <p className="text-xs text-gray-500">房间ID: 678321</p>
                </div>
              </div>
              <div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 底部版本信息 */}
      <footer className="py-4 px-5 text-center text-gray-500 text-xs">
        <p>多端视频监控系统 v1.0</p>
      </footer>
    </div>
  );
};

export default HomePage;