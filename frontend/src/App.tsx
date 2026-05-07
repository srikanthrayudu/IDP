import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WardMemberDashboard from './pages/WardMemberDashboard';
import './App.css'
import './i18n'; // Import i18n for translations

const roleToRoute = (role: string | null) => {
  if (role === 'ROLE_ADMIN') return '/admin';
  if (role === 'ROLE_WARD_MEMBER') return '/ward-member';
  if (role === 'ROLE_USER') return '/';
  return null;
};

function PrivateRoute({ children, role }: { children: React.JSX.Element; role?: string }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const homeRoute = roleToRoute(userRole);
  if (!homeRoute) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to={homeRoute} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={
          <PrivateRoute role="ROLE_USER">
            <UserDashboard />
          </PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <PrivateRoute role="ROLE_ADMIN">
            <AdminDashboard />
          </PrivateRoute>
        } />

        <Route path="/ward-member" element={
          <PrivateRoute role="ROLE_WARD_MEMBER">
            <WardMemberDashboard />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
