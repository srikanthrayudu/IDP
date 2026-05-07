import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

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
                    <div className="card shadow-lg border-0 rounded-pilled">
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
                                    <input type="text" className="form-control form-control-lg bg-light" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter username" />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-medium text-secondary">
                                        <Lock size={18} className="me-2" /> Password
                                    </label>
                                    <input type="password" className="form-control form-control-lg bg-light" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold">Login</button>
                            </form>
                            <div className="mt-4 text-center">
                                <Link to="/register" className="text-decoration-none text-primary fw-medium">Don't have an account? Register</Link>
                            </div>
                            <div className="mt-4 p-3 bg-light border rounded">
                                <div className="fw-bold text-dark mb-2">Demo Login Credentials</div>
                                <ul className="list-unstyled mb-0 small">
                                    <li><span className="fw-medium">Admin:</span> admin / Admin@123</li>
                                    <li><span className="fw-medium">Ward (generic):</span> ward / Ward@123</li>
                                    <li><span className="fw-medium">Ward members 1-20:</span> ward1..ward20 / Ward@1231..Ward@12320</li>
                                    <li><span className="fw-medium">Citizens 1-10:</span> citizen1..citizen10 / Citizen@1231..Citizen@12310</li>
                                    <li><span className="fw-medium">Workers 1-10:</span> worker1..worker10 / Worker@1231..Worker@12310</li>
                                    <li><span className="fw-medium">Department officers:</span> dept_roads / Department@123 (see other dept_* users)</li>
                                    <li><span className="fw-medium">Customer care:</span> care / Care@123</li>
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
