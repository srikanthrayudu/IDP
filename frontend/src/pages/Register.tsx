import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h3>Register</h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleRegister}>
                                <div className="mb-3">
                                    <label>Username</label>
                                    <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
                                </div>
                                <div className="mb-3">
                                    <label>Password</label>
                                    <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                                </div>
                                <div className="mb-3">
                                    <label>Role</label>
                                    <input type="text" className="form-control" value="Citizen" readOnly />
                                </div>
                                <button type="submit" className="btn btn-success w-100">Register</button>
                            </form>
                            <div className="mt-3 text-center">
                                <Link to="/login">Already have an account? Login</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
