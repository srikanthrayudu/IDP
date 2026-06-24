import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Shield } from 'lucide-react';
import api from '../services/api';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role] = useState('ROLE_USER');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', { username, password, role });
            alert('Registration successful, please login.');
            navigate('/login');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Registration failed', error);
            alert(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow-lg border-0 rounded-4">
                        <div className="card-header bg-white text-center py-4 border-0">
                            <UserPlus size={48} className="text-success mb-2" />
                            <h3 className="fw-bold text-dark">Create Account</h3>
                            <p className="text-muted mb-0">Join our municipal complaint network</p>
                        </div>
                        <div className="card-body px-5 pb-5">
                            <form onSubmit={handleRegister}>
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-medium text-secondary">
                                        <User size={18} className="me-2" /> Username
                                    </label>
                                    <input 
                                        type="text" 
                                        className="form-control form-control-lg bg-light border-0 shadow-sm" 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                        required 
                                        placeholder="Choose a username" 
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-medium text-secondary">
                                        <Lock size={18} className="me-2" /> Password
                                    </label>
                                    <input 
                                        type="password" 
                                        className="form-control form-control-lg bg-light border-0 shadow-sm" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        placeholder="Create a password" 
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-medium text-secondary">
                                        <Shield size={18} className="me-2" /> Access Role
                                    </label>
                                    <input 
                                        type="text" 
                                        className="form-control form-control-lg bg-light border-0 text-muted" 
                                        value="Citizen" 
                                        readOnly 
                                    />
                                </div>
                                <button type="submit" className="btn btn-success btn-lg w-100 fw-bold shadow-sm">Register</button>
                            </form>
                            <div className="mt-4 text-center">
                                <Link to="/login" className="text-decoration-none text-success fw-medium">Already have an account? Login</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
