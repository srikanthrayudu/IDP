import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    LogIn, 
    User, 
    Lock, 
    Shield, 
    Users, 
    Wrench, 
    Building, 
    Headphones, 
    Sparkles, 
    Check, 
    ArrowRight
} from 'lucide-react';
import api from '../services/api';

const DEPARTMENTS = [
    "Roads",
    "Water Supply",
    "Sanitation",
    "Electricity",
    "Drainage",
    "Public Health",
    "Traffic",
    "Forest",
    "Animal Welfare",
    "Pollution Control",
    "Town Planning",
    "Parks & Horticulture"
];

interface DemoRole {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    defaultUser: string;
    defaultPass: string;
    type: 'single' | 'indexed' | 'department';
    prefix?: string;
    count?: number;
    passPrefix?: string;
}

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('admin');
    const [selectedNumber, setSelectedNumber] = useState<number | undefined>(undefined);
    const [selectedDept, setSelectedDept] = useState<string | undefined>(undefined);
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const roles: DemoRole[] = [
        {
            id: 'admin',
            name: 'Administrator',
            icon: <Shield size={18} />,
            description: 'Manage users, systems & assignments',
            defaultUser: 'admin',
            defaultPass: 'Admin@123',
            type: 'single'
        },
        {
            id: 'citizen',
            name: 'Citizen',
            icon: <User size={18} />,
            description: 'File public complaints & track updates',
            defaultUser: 'citizen1',
            defaultPass: 'Citizen@1231',
            type: 'indexed',
            prefix: 'citizen',
            count: 10,
            passPrefix: 'Citizen@123'
        },
        {
            id: 'ward',
            name: 'Ward Member',
            icon: <Users size={18} />,
            description: 'Monitor all ward-specific operations',
            defaultUser: 'ward1',
            defaultPass: 'Ward@1231',
            type: 'indexed',
            prefix: 'ward',
            count: 20,
            passPrefix: 'Ward@123'
        },
        {
            id: 'worker',
            name: 'Field Worker',
            icon: <Wrench size={18} />,
            description: 'Execute and resolve assigned tasks',
            defaultUser: 'worker1',
            defaultPass: 'Worker@1231',
            type: 'indexed',
            prefix: 'worker',
            count: 10,
            passPrefix: 'Worker@123'
        },
        {
            id: 'dept',
            name: 'Dept. Officer',
            icon: <Building size={18} />,
            description: 'Oversee departments and categories',
            defaultUser: 'dept_roads',
            defaultPass: 'Department@123',
            type: 'department',
            passPrefix: 'Department@123'
        },
        {
            id: 'care',
            name: 'Customer Care',
            icon: <Headphones size={18} />,
            description: 'Helpdesk ticket logging & support',
            defaultUser: 'care',
            defaultPass: 'Care@123',
            type: 'single'
        }
    ];

    const getDeptUsername = (deptName: string) => {
        return "dept_" + deptName.toLowerCase().replace(/\s+/g, "_").replace(/&/g, "and");
    };

    const triggerHighlight = () => {
        setIsHighlighting(true);
        setTimeout(() => setIsHighlighting(false), 600);
    };

    const selectRole = (role: DemoRole) => {
        setSelectedRole(role.id);
        triggerHighlight();
        if (role.type === 'single') {
            setUsername(role.defaultUser);
            setPassword(role.defaultPass);
            setSelectedNumber(undefined);
            setSelectedDept(undefined);
        } else if (role.type === 'indexed') {
            const index = 1;
            setSelectedNumber(index);
            setSelectedDept(undefined);
            setUsername(`${role.prefix}${index}`);
            setPassword(`${role.passPrefix}${index}`);
        } else if (role.type === 'department') {
            const dept = 'Roads';
            setSelectedDept(dept);
            setSelectedNumber(undefined);
            setUsername(getDeptUsername(dept));
            setPassword(role.defaultPass);
        }
    };

    const selectIndex = (role: DemoRole, index: number) => {
        setSelectedNumber(index);
        triggerHighlight();
        setUsername(`${role.prefix}${index}`);
        setPassword(`${role.passPrefix}${index}`);
    };

    const selectDept = (role: DemoRole, deptName: string) => {
        setSelectedDept(deptName);
        triggerHighlight();
        setUsername(getDeptUsername(deptName));
        setPassword(role.defaultPass);
    };

    // Initialize with default admin credentials
    useEffect(() => {
        setUsername('admin');
        setPassword('Admin@123');
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
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
            alert('Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const activeRoleData = roles.find(r => r.id === selectedRole);

    return (
        <div className="login-page-wrapper">
            <div className="container">
                <div className="row justify-content-center align-items-stretch g-4">
                    {/* Left Column: Login Form */}
                    <div className="col-lg-5 col-md-8 d-flex flex-column justify-content-center">
                        <div className="card login-card p-4 p-sm-5 h-100 d-flex flex-column justify-content-center">
                            <div className="text-center mb-4">
                                <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle p-3 mb-3 border border-primary border-opacity-25 shadow-sm" style={{ width: '80px', height: '80px' }}>
                                    <LogIn size={40} className="text-indigo" style={{ color: '#818cf8' }} />
                                </div>
                                <h2 className="fw-extrabold text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Smart City Grievance</h2>
                                <p className="text-secondary small">Sign in to access your administrative or citizen portal</p>
                            </div>

                            <form onSubmit={handleLogin} className="needs-validation">
                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-semibold text-secondary small mb-2">
                                        <User size={16} className="me-2" /> Username
                                    </label>
                                    <div className="login-input-group">
                                        <input 
                                            type="text" 
                                            className={`form-control login-input ${isHighlighting ? 'autofill-highlight' : ''}`}
                                            value={username} 
                                            onChange={e => setUsername(e.target.value)} 
                                            required 
                                            placeholder="Enter username" 
                                        />
                                        <User size={18} className="login-input-icon" />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label d-flex align-items-center fw-semibold text-secondary small mb-2">
                                        <Lock size={16} className="me-2" /> Password
                                    </label>
                                    <div className="login-input-group">
                                        <input 
                                            type="password" 
                                            className={`form-control login-input ${isHighlighting ? 'autofill-highlight' : ''}`}
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                            placeholder="Enter password" 
                                        />
                                        <Lock size={18} className="login-input-icon" />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn w-100 login-btn-primary mt-2" 
                                    disabled={loading}
                                >
                                    {loading ? 'Authenticating...' : (
                                        <>
                                            Sign In <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-center">
                                <span className="text-secondary small">Don't have an account? </span>
                                <Link to="/register" className="text-indigo fw-semibold text-decoration-none small" style={{ color: '#818cf8' }}>
                                    Register as Citizen
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Demo sandbox */}
                    <div className="col-lg-6 col-md-10 d-flex flex-column justify-content-center">
                        <div className="card demo-sandbox-card p-4 p-sm-5 h-100">
                            <div className="d-flex align-items-center mb-4">
                                <div className="bg-warning bg-opacity-10 p-2 rounded-3 border border-warning border-opacity-25 me-3">
                                    <Sparkles size={24} className="text-warning" />
                                </div>
                                <div>
                                    <h4 className="fw-bold text-white mb-0">Demo Sandbox Environment</h4>
                                    <p className="text-secondary small mb-0">Select any pre-configured role card to test specific platform views.</p>
                                </div>
                            </div>

                            <div className="demo-role-grid mb-3">
                                {roles.map(role => (
                                    <div 
                                        key={role.id} 
                                        className={`demo-role-card ${selectedRole === role.id ? 'active' : ''}`}
                                        onClick={() => selectRole(role)}
                                    >
                                        <div className="role-icon-wrapper">
                                            {role.icon}
                                        </div>
                                        <div className="role-title d-flex justify-content-between align-items-center">
                                            {role.name}
                                            {selectedRole === role.id && (
                                                <span className="badge bg-primary bg-opacity-20 text-indigo border border-primary border-opacity-25 rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px', fontSize: '10px' }}>
                                                    <Check size={12} style={{ color: '#818cf8' }} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="role-desc">{role.description}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Sub-options for indexed/department roles */}
                            {activeRoleData && (activeRoleData.type === 'indexed' || activeRoleData.type === 'department') && (
                                <div className="demo-sub-options-panel">
                                    {activeRoleData.type === 'indexed' && (
                                        <>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="fw-semibold text-white small">Select Demo Account:</span>
                                                <span className="badge bg-secondary bg-opacity-25 text-light small" style={{ fontSize: '10px' }}>
                                                    Password ends with selected index number
                                                </span>
                                            </div>
                                            <div className="pill-grid">
                                                {Array.from({ length: activeRoleData.count || 0 }, (_, i) => i + 1).map(num => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        className={`demo-pill ${selectedNumber === num ? 'active' : ''}`}
                                                        onClick={() => selectIndex(activeRoleData, num)}
                                                    >
                                                        {activeRoleData.prefix} {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {activeRoleData.type === 'department' && (
                                        <>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="fw-semibold text-white small">Select Department Officer:</span>
                                                <span className="badge bg-secondary bg-opacity-25 text-light small" style={{ fontSize: '10px' }}>
                                                    Shared Password: Department@123
                                                </span>
                                            </div>
                                            <div className="demo-dept-grid">
                                                {DEPARTMENTS.map(dept => (
                                                    <button
                                                        key={dept}
                                                        type="button"
                                                        className={`demo-dept-btn ${selectedDept === dept ? 'active' : ''}`}
                                                        onClick={() => selectDept(activeRoleData, dept)}
                                                        title={dept}
                                                    >
                                                        🏢 {dept}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Active credential details status bar */}
                            {activeRoleData && (
                                <div className="mt-auto pt-3 border-top border-secondary border-opacity-10 text-secondary small d-flex flex-wrap align-items-center justify-content-between gap-2">
                                    <div>
                                        <span className="text-muted">Target Username: </span>
                                        <code className="text-light fs-6 fw-mono px-2 py-1 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-10">{username}</code>
                                    </div>
                                    <div>
                                        <span className="text-muted">Target Password: </span>
                                        <code className="text-light fs-6 fw-mono px-2 py-1 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-10">{password}</code>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
