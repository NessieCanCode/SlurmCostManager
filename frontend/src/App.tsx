import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import CostCalculator from './components/CostCalculator';

const App: React.FC = () => {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">SlurmCostManager</h1>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/costs" element={isAuthenticated ? <CostCalculator /> : <Navigate to="/login" />} />
          <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
