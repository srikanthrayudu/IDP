import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleDemoClick = (user: string, pass: string) => {
        setUsername(user);
        setPassword(pass);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.role);
            localStorage.setItem('id', response.data.id);
            if (response.data.role === 'ROLE_ADMIN') {
                navigate('/admin');
            } else if (response.data.role === 'ROLE_WARD_MEMBER') {
                navigate('/ward-member');
            } else if (response.data.role === 'ROLE_WORKER') {
                navigate('/worker');
            } else if (response.data.role === 'ROLE_DEPARTMENT') {
                navigate('/department');
            } else if (response.data.role === 'ROLE_CUSTOMER_CARE') {
                navigate('/customer-care');
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Login failed', error);
            alert('Login failed');
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow-lg border-0 rounded-4">
                        <div className="card-header bg-white text-center py-4 border-0">
                            <LogIn size={48} className="text-primary mb-2" />
                            <h3 className="fw-bold text-dark">Welcome Back</h3>
                            <p className="text-muted mb-0">Please login to your account</p>
                        </div>
                        <div className="card-body px-5 pb-5">
                            <form onSubmit={handleLogin}>
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-medium text-secondary">
                                        <User size={18} className="me-2" /> Username
                                    </label>
                                    <input type="text" className="form-control form-control-lg bg-light border-0 shadow-sm" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter username" />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-medium text-secondary">
                                        <Lock size={18} className="me-2" /> Password
                                    </label>
                                    <input type="password" className="form-control form-control-lg bg-light border-0 shadow-sm" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold shadow-sm">Login</button>
                            </form>
                            <div className="mt-4 text-center">
                                <Link to="/register" className="text-decoration-none text-primary fw-medium">Don't have an account? Register</Link>
                            </div>
                            <div className="mt-4 p-3 bg-light border rounded shadow-sm">
                                <div className="fw-bold text-primary mb-2">🔑 Demo Login Credentials</div>
                                <ul className="list-unstyled mb-0 small text-secondary">
                                    <li className="mb-1" style={{cursor: 'pointer'}} onClick={() => handleDemoClick('admin', 'Admin@123')}><span className="fw-bold text-dark">Admin:</span> admin / Admin@123</li>
                                    <li className="mb-1" style={{cursor: 'pointer'}} onClick={() => handleDemoClick('citizen1', 'Citizen@123')}><span className="fw-bold text-dark">Citizens (1-8):</span> citizen1..citizen8 / Citizen@123</li>
                                    <li className="mb-1" style={{cursor: 'pointer'}} onClick={() => handleDemoClick('ward1', 'Ward@123')}><span className="fw-bold text-dark">Ward Members (1-10):</span> ward1..ward10 / Ward@123</li>
                                    <li className="mb-1" style={{cursor: 'pointer'}} onClick={() => handleDemoClick('worker1', 'Worker@123')}><span className="fw-bold text-dark">Workers (1-8):</span> worker1..worker8 / Worker@123</li>
                                    <li className="mb-1" style={{cursor: 'pointer'}} onClick={() => handleDemoClick('dept_roads', 'Ward@123')}><span className="fw-bold text-dark">Department Officers:</span> dept_roads / Ward@123 <span className="text-muted">(or dept_water_supply, dept_sanitation)</span></li>
                                    <li className="mb-1" style={{cursor: 'pointer'}} onClick={() => handleDemoClick('care', 'Ward@123')}><span className="fw-bold text-dark">Customer Care:</span> care / Ward@123</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
