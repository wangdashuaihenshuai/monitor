import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreateRoomPage from './pages/CreateRoomPage';
import CameraPage from './pages/CameraPage';
import MonitorPage from './pages/MonitorPage';
import HomePage from './pages/HomePage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-room" element={<CreateRoomPage />} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
      </Routes>
    </Router>
  );
};

export default App;