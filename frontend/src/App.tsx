import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WardMemberDashboard from './pages/WardMemberDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import DepartmentDashboard from './pages/DepartmentDashboard';
import CustomerCareDashboard from './pages/CustomerCareDashboard';
import './App.css'
import './i18n'; // Import i18n for translations

const roleToRoute = (role: string | null) => {
  if (role === 'ROLE_ADMIN') return '/admin';
  if (role === 'ROLE_WARD_MEMBER') return '/ward-member';
  if (role === 'ROLE_WORKER') return '/worker';
  if (role === 'ROLE_DEPARTMENT') return '/department';
  if (role === 'ROLE_CUSTOMER_CARE') return '/customer-care';
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

        <Route path="/worker" element={
          <PrivateRoute role="ROLE_WORKER">
            <WorkerDashboard />
          </PrivateRoute>
        } />

        <Route path="/department" element={
          <PrivateRoute role="ROLE_DEPARTMENT">
            <DepartmentDashboard />
          </PrivateRoute>
        } />

        <Route path="/customer-care" element={
          <PrivateRoute role="ROLE_CUSTOMER_CARE">
            <CustomerCareDashboard />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
