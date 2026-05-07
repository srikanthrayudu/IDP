import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { LogOut, Activity, Clock, CheckCircle, PieChart as PieChartIcon, BarChart2, List, Settings, History, AlertTriangle, ShieldOff, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';
import ShapTokens from '../components/ShapTokens';

// Fix leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Complaint {
    id: number;
    category: string;
    department?: string;
    priority?: string;
    progressStatus?: string;
    assignedWorkerName?: string;
    bbmpZone: string;
    text: string;
    status: string;
    deviceId: string;
    createdAt: string;
    isFraud: boolean;
    shapInterpretations?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    feedbackRating?: number;
}

interface ComplaintHistory {
    id: number;
    oldStatus: string;
    newStatus: string;
    remarks: string;
    changedAt: string;
}

interface Worker {
    id: number;
    username: string;
    wardNumber?: number;
    categoryExpertise?: string;
    assignedCount?: number;
}

interface Ward {
    id: number;
    number: number;
}

interface WardMember {
    id: number;
    username: string;
    wardNumber?: number;
}

const AdminDashboard = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [monitoring, setMonitoring] = useState<any>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [complaints, setComplaints] = useState<any[]>([]);
    const [selectedFraudComplaint, setSelectedFraudComplaint] = useState<Complaint | null>(null);
    const [showFraudModal, setShowFraudModal] = useState(false);

    // History Modal State
    const [selectedHistory, setSelectedHistory] = useState<ComplaintHistory[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [workerEdits, setWorkerEdits] = useState<Record<number, { wardNumber?: number; categoryExpertise?: string }>>({});
    const [assignmentSelections, setAssignmentSelections] = useState<Record<number, number | ''>>({});

    const [wardMembers, setWardMembers] = useState<WardMember[]>([]);
    const [wardMemberUsername, setWardMemberUsername] = useState('');
    const [wardMemberPassword, setWardMemberPassword] = useState('');
    const [wardMemberWard, setWardMemberWard] = useState<number | ''>('');
    const [wardMemberEdits, setWardMemberEdits] = useState<Record<number, { wardNumber?: number | ''; password?: string }>>({});

    const navigate = useNavigate();

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

    const fetchData = async () => {
        const [statsRes, monitoringRes, listRes] = await Promise.allSettled([
            api.get('/complaints/dashboard/stats'),
            api.get('/complaints/dashboard/monitoring'),
            api.get('/complaints/admin')
        ]);

        if (statsRes.status === 'fulfilled') {
            setStats(statsRes.value.data);
        } else {
            console.error('Failed to fetch stats', statsRes.reason);
        }

        if (monitoringRes.status === 'fulfilled') {
            setMonitoring(monitoringRes.value.data);
        } else {
            console.error('Failed to fetch monitoring', monitoringRes.reason);
        }

        if (listRes.status === 'fulfilled') {
            setComplaints(listRes.value.data);
        } else {
            console.error('Failed to fetch complaints list', listRes.reason);
        }
    };

    const fetchWorkers = async () => {
        try {
            const [workersRes, wardsRes] = await Promise.all([
                api.get('/workers'),
                api.get('/wards')
            ]);
            setWorkers(workersRes.data);
            setWards(wardsRes.data);
        } catch (error) {
            console.error('Failed to fetch workers', error);
        }
    };

    const fetchWardMembers = async () => {
        try {
            const response = await api.get('/ward-members');
            setWardMembers(response.data);
        } catch (error) {
            console.error('Failed to fetch ward members', error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchWorkers();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchWardMembers();
    }, []);

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/complaints/${id}/status?status=${status}`);
            fetchData();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleMarkFraud = async (id: number, currentFraudState: boolean) => {
        try {
            await api.put(`/complaints/${id}/fraud?isFraud=${!currentFraudState}`);
            fetchData();
        } catch (error) {
            console.error('Failed to mark as fraud', error);
        }
    };

    const fetchHistory = async (complaintId: number) => {
        try {
            const res = await api.get(`/complaints/${complaintId}/history`);
            setSelectedHistory(res.data);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleWorkerChange = (id: number, changes: { wardNumber?: number; categoryExpertise?: string }) => {
        setWorkerEdits(prev => ({
            ...prev,
            [id]: {
                wardNumber: changes.wardNumber ?? prev[id]?.wardNumber,
                categoryExpertise: changes.categoryExpertise ?? prev[id]?.categoryExpertise
            }
        }));
    };

    const saveWorker = async (worker: Worker) => {
        const edits = workerEdits[worker.id] || {};
        const payload = {
            wardNumber: edits.wardNumber ?? worker.wardNumber ?? null,
            categoryExpertise: edits.categoryExpertise ?? worker.categoryExpertise ?? null
        };
        try {
            await api.put(`/workers/${worker.id}`, payload);
            fetchWorkers();
        } catch (error) {
            console.error('Failed to update worker', error);
        }
    };

    const handleAssignWorker = async (complaintId: number) => {
        const workerId = assignmentSelections[complaintId];
        if (!workerId) {
            alert('Select a worker first.');
            return;
        }
        try {
            await api.put(`/complaints/${complaintId}/assign`, { workerId });
            fetchData();
        } catch (error) {
            console.error('Failed to assign worker', error);
            alert('Failed to assign worker.');
        }
    };

    const handleWardMemberEdit = (id: number, changes: { wardNumber?: number | ''; password?: string }) => {
        setWardMemberEdits(prev => ({
            ...prev,
            [id]: {
                wardNumber: changes.wardNumber ?? prev[id]?.wardNumber,
                password: changes.password ?? prev[id]?.password
            }
        }));
    };

    const saveWardMember = async (member: WardMember) => {
        const edits = wardMemberEdits[member.id] || {};
        const wardNumber = edits.wardNumber === '' ? member.wardNumber : (edits.wardNumber ?? member.wardNumber);
        const payload: { wardNumber?: number; password?: string } = {
            wardNumber: wardNumber ?? undefined
        };
        if (edits.password && edits.password.trim().length > 0) {
            payload.password = edits.password.trim();
        }
        try {
            await api.put(`/ward-members/${member.id}`, payload);
            setWardMemberEdits(prev => ({ ...prev, [member.id]: {} }));
            fetchWardMembers();
        } catch (error) {
            console.error('Failed to update ward member', error);
            alert('Failed to update ward member.');
        }
    };

    const handleCreateWardMember = async () => {
        if (!wardMemberUsername || !wardMemberPassword || wardMemberWard === '') {
            alert('Username, password, and ward number are required.');
            return;
        }
        try {
            await api.post('/ward-members', {
                username: wardMemberUsername,
                password: wardMemberPassword,
                wardNumber: Number(wardMemberWard)
            });
            setWardMemberUsername('');
            setWardMemberPassword('');
            setWardMemberWard('');
            fetchWardMembers();
        } catch (error) {
            console.error('Failed to create ward member', error);
            alert('Failed to create ward member.');
        }
    };

    const categoryData = Object.keys(stats.categoryCount || {}).map(key => ({
        name: key,
        value: stats.categoryCount[key]
    }));

    const priorityData = (stats.byPriority || []).map((row: { priority: string; count: number }) => ({
        name: row.priority || 'UNKNOWN',
        value: row.count
    }));

    const workerData = (stats.byWorker || []).map((row: { worker: string; count: number }) => ({
        name: row.worker || 'Unassigned',
        value: row.count
    }));

    const slaBreaches = monitoring.slaBreaches || {};
    const feedbackByCategory = monitoring.feedbackByCategory || [];
    const feedbackByWorker = monitoring.feedbackByWorker || [];

    const mapCenter: [number, number] = [12.9716, 77.5946];
    const bengaluruBounds: [[number, number], [number, number]] = [
        [12.7343, 77.3790],
        [13.1740, 77.8310]
    ];

    return (
        <div className="container-fluid mt-4 mb-5 px-4">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
                <h2 className="mb-0 text-primary fw-bold d-flex align-items-center"><Activity size={28} className="me-2"/> Admin Dashboard - Analytics</h2>
                <button className="btn btn-outline-danger d-flex align-items-center" onClick={handleLogout}>
                    <LogOut size={18} className="me-2" /> Logout
                </button>
            </div>
            
            <div className="row mb-4 text-center g-4">
                <div className="col-md-4">
                    <div className="card bg-primary bg-gradient text-white border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <Activity size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Total Complaints</h5>
                            <h1 className="fw-bold display-5 mb-0">{stats.totalComplaints || 0}</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-warning bg-gradient text-dark border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <Clock size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Pending Resolution</h5>
                            <h1 className="fw-bold display-5 mb-0">{stats.pendingComplaints || 0}</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-success bg-gradient text-white border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <CheckCircle size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Resolved Complaints</h5>
                            <h1 className="fw-bold display-5 mb-0">{stats.resolvedComplaints || 0}</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-info bg-gradient text-white border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <CheckCircle size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Average Rating</h5>
                            <h1 className="fw-bold display-5 mb-0">{(stats.averageRating || 0).toFixed(1)}</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4 g-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom fw-bold text-dark">SLA Breaches</div>
                        <div className="card-body">
                            <div className="d-flex justify-content-between"><span>High</span><span className="badge bg-danger">{slaBreaches.HIGH || 0}</span></div>
                            <div className="d-flex justify-content-between mt-2"><span>Medium</span><span className="badge bg-warning text-dark">{slaBreaches.MEDIUM || 0}</span></div>
                            <div className="d-flex justify-content-between mt-2"><span>Low</span><span className="badge bg-secondary">{slaBreaches.LOW || 0}</span></div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom fw-bold text-dark">Avg Resolution (hrs)</div>
                        <div className="card-body d-flex align-items-center justify-content-center">
                            <h2 className="mb-0">{(monitoring.avgResolutionHours || 0).toFixed(1)}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom fw-bold text-dark">Average Rating</div>
                        <div className="card-body d-flex align-items-center justify-content-center">
                            <h2 className="mb-0">{(monitoring.averageRating || 0).toFixed(1)}</h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4 g-4">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <PieChartIcon size={20} className="me-2 text-primary" /> Complaints by Category
                        </div>
                        <div className="card-body" style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                                        {categoryData.map((_entry: { name: string; value: number }, index: number) => (
                                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                         ))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <BarChart2 size={20} className="me-2 text-primary" /> BBMP Zone Statistics
                        </div>
                        <div className="card-body" style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4 g-4">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom fw-bold text-dark">Feedback by Category</div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Category</th>
                                            <th>Avg Rating</th>
                                            <th>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feedbackByCategory.length === 0 ? (
                                            <tr><td colSpan={3} className="text-center text-muted py-3">No feedback yet.</td></tr>
                                        ) : feedbackByCategory.map((row: { category: string; avgRating: number; count: number }) => (
                                            <tr key={row.category || 'unknown'}>
                                                <td>{row.category || 'Unknown'}</td>
                                                <td>{Number(row.avgRating || 0).toFixed(2)}</td>
                                                <td>{row.count || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom fw-bold text-dark">Feedback by Worker</div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Worker</th>
                                            <th>Avg Rating</th>
                                            <th>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feedbackByWorker.length === 0 ? (
                                            <tr><td colSpan={3} className="text-center text-muted py-3">No feedback yet.</td></tr>
                                        ) : feedbackByWorker.map((row: { worker: string; avgRating: number; count: number }) => (
                                            <tr key={row.worker || 'unknown'}>
                                                <td>{row.worker || 'Unassigned'}</td>
                                                <td>{Number(row.avgRating || 0).toFixed(2)}</td>
                                                <td>{row.count || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4 g-4">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <PieChartIcon size={20} className="me-2 text-primary" /> Complaints by Priority
                        </div>
                        <div className="card-body" style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={priorityData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                                        {priorityData.map((_entry: { name: string; value: number }, index: number) => (
                                             <Cell key={`priority-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                         ))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <BarChart2 size={20} className="me-2 text-primary" /> Worker Load
                        </div>
                        <div className="card-body" style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workerData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                                    <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Integration */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                    <Map size={20} className="me-2 text-primary" /> Geospatial Complaint Heatmap
                </div>
                <div className="card-body p-0" style={{ height: 400 }}>
                    <MapContainer
                        center={mapCenter}
                        zoom={11}
                        maxBounds={bengaluruBounds}
                        maxBoundsViscosity={1.0}
                        minZoom={10}
                        style={{ height: '100%', width: '100%', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: 0 }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                        />
                        {complaints.filter(c => c.latitude && c.longitude).map(c => (
                            <Marker key={`map-${c.id}`} position={[c.latitude!, c.longitude!]}>
                                <Popup>
                                    <strong>#{c.id} - {c.category}</strong>
                                    <br />
                                    <span>{c.text.substring(0, 50)}...</span>
                                    <br />
                                    <span className={`badge ${c.status === 'RESOLVED' ? 'bg-success' : 'bg-warning text-dark'}`}>{c.status}</span>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                    <List size={20} className="me-2 text-primary" /> All Submitted Complaints
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">ID</th>
                                    <th>Category & Zone</th>
                                    <th>Department</th>
                                    <th>Text snippet</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Assigned</th>
                                    <th>Progress</th>
                                    <th>Fraud Status</th>
                                    <th>Actions</th>
                                    <th className="pe-4">SHAP XAI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-4 text-muted">No complaints found.</td></tr>
                                ) : complaints.map(c => (
                                    <tr key={c.id}>
                                        <td className="ps-4 fw-medium">#{c.id}</td>
                                        <td>
                                            <div className="fw-bold text-dark">{c.category || 'N/A'}</div>
                                            <div className="text-secondary small">{c.bbmpZone || 'N/A'}</div>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span>
                                        </td>
                                        <td className="text-truncate" style={{maxWidth: "200px"}} title={c.text}>
                                            {c.text}
                                            {c.deviceId && <div className="text-muted small mt-1"><Settings size={12} className="me-1"/> {c.deviceId}</div>}
                                        </td>
                                        <td>
                                            <span className={`badge ${c.status === 'RESOLVED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${c.priority === 'HIGH' ? 'bg-danger' : c.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                {c.priority || 'MEDIUM'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-secondary small">{c.assignedWorkerName || 'Unassigned'}</div>
                                            <div className="d-flex gap-2 mt-2">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={assignmentSelections[c.id] ?? ''}
                                                    onChange={e => setAssignmentSelections(prev => ({ ...prev, [c.id]: e.target.value ? Number(e.target.value) : '' }))}
                                                >
                                                    <option value="">Assign worker</option>
                                                    {workers.map(worker => (
                                                        <option key={worker.id} value={worker.id}>{worker.username}</option>
                                                    ))}
                                                </select>
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => handleAssignWorker(c.id)}>
                                                    Assign
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border">{c.progressStatus || 'NEW'}</span>
                                        </td>
                                        <td>
                                            {c.isFraud ? (
                                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">Fraud / Blocked</span>
                                            ) : (
                                                <span className="badge bg-light text-secondary border">Clean</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="d-flex flex-wrap gap-1">
                                                {!c.isFraud && c.status !== 'RESOLVED' && (
                                                    <button className="btn btn-sm btn-success d-flex align-items-center" onClick={() => handleUpdateStatus(c.id, 'RESOLVED')} title="Mark Resolved">
                                                        <CheckCircle size={14} className="me-1"/> Resolve
                                                    </button>
                                                )}
                                                {!c.isFraud && c.status === 'RESOLVED' && (
                                                    <button className="btn btn-sm btn-warning text-dark d-flex align-items-center" onClick={() => handleUpdateStatus(c.id, 'PENDING')} title="Mark Pending">
                                                        <Clock size={14} className="me-1"/> Pending
                                                    </button>
                                                )}
                                                <button className={`btn btn-sm ${c.isFraud ? 'btn-outline-secondary' : 'btn-danger'} d-flex align-items-center`} onClick={() => handleMarkFraud(c.id, c.isFraud)} title={c.isFraud ? 'Unmark Fraud' : 'Report Fraud'}>
                                                    <ShieldOff size={14} className="me-1"/> {c.isFraud ? 'Unflag' : 'Flag'}
                                                </button>
                                                {c.isFraud && (
                                                    <button className="btn btn-sm btn-outline-warning text-dark d-flex align-items-center" onClick={() => { setSelectedFraudComplaint(c); setShowFraudModal(true); }} title="View AI Details">
                                                        <AlertTriangle size={14} className="me-1"/> AI Info
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-light border text-primary d-flex align-items-center" onClick={() => fetchHistory(c.id)} title="View History">
                                                    <History size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="pe-4">
                                            <div className="bg-light p-2 rounded" style={{ maxHeight: "90px", overflowY: 'auto' }}>
                                                <ShapTokens raw={c.shapInterpretations} maxTokens={8} emptyText="No XAI data" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mt-4">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                    <Settings size={20} className="me-2 text-primary" /> Worker Management
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Worker</th>
                                    <th>Assigned</th>
                                    <th>Ward</th>
                                    <th>Expertise</th>
                                    <th className="pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workers.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-4 text-muted">No workers found.</td></tr>
                                ) : workers.map(worker => {
                                    const edit = workerEdits[worker.id] || {};
                                    const wardValue = edit.wardNumber ?? worker.wardNumber ?? '';
                                    const expertiseValue = edit.categoryExpertise ?? worker.categoryExpertise ?? '';
                                    return (
                                        <tr key={worker.id}>
                                            <td className="ps-4 fw-medium">{worker.username}</td>
                                            <td><span className="badge bg-light text-dark border">{worker.assignedCount ?? 0}</span></td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={wardValue}
                                                    onChange={e => handleWorkerChange(worker.id, { wardNumber: e.target.value ? Number(e.target.value) : undefined })}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {wards.map(ward => (
                                                        <option key={ward.id} value={ward.number}>{ward.number}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Category expertise"
                                                    value={expertiseValue}
                                                    onChange={e => handleWorkerChange(worker.id, { categoryExpertise: e.target.value })}
                                                />
                                            </td>
                                            <td className="pe-4">
                                                <button className="btn btn-sm btn-primary" onClick={() => saveWorker(worker)}>Save</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* AI Fraud / Spam Detection Modal */}
            {showFraudModal && selectedFraudComplaint && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card w-50 max-h-75 overflow-auto border-0 shadow-lg">
                        <div className="card-header bg-danger text-white border-bottom py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold d-flex align-items-center"><AlertTriangle size={20} className="me-2"/> AI Fraud / Spam Analysis</h5>
                            <button className="btn-close btn-close-white" onClick={() => setShowFraudModal(false)}></button>
                        </div>
                        <div className="card-body p-4">
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">Complaint ID</div>
                                <div className="col-sm-8 text-dark fw-bold">#{selectedFraudComplaint.id}</div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">Category</div>
                                <div className="col-sm-8">{selectedFraudComplaint.category}</div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">BBMP Zone</div>
                                <div className="col-sm-8">{selectedFraudComplaint.bbmpZone}</div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">Text Snippet</div>
                                <div className="col-sm-8">{selectedFraudComplaint.text}</div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">Status</div>
                                <div className="col-sm-8">
                                    <span className={`badge ${selectedFraudComplaint.status === 'RESOLVED' ? 'bg-success' : 'bg-warning'}`}>
                                        {selectedFraudComplaint.status}
                                    </span>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">Device ID</div>
                                <div className="col-sm-8 text-monospace">{selectedFraudComplaint.deviceId}</div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-sm-4 text-secondary fw-medium">Coordinates</div>
                                <div className="col-sm-8">{selectedFraudComplaint.latitude}, {selectedFraudComplaint.longitude}</div>
                            </div>
                            {selectedFraudComplaint.imageUrl && (
                                <div className="mt-4 text-center">
                                    <p className="fw-medium text-secondary text-start mb-2">Attached Evidence:</p>
                                    <img src={selectedFraudComplaint.imageUrl} alt="Complaint Evidence" className="img-fluid rounded shadow-sm border" style={{maxHeight: '300px'}} />
                                </div>
                            )}
                        </div>
                        <div className="card-footer bg-white border-top text-end py-3">
                            <button type="button" className="btn btn-secondary px-4 fw-bold" onClick={() => setShowFraudModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card w-50 max-h-75 overflow-auto border-0 shadow-lg">
                        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold d-flex align-items-center"><History size={20} className="me-2 text-primary"/> Complaint Timeline</h5>
                            <button className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
                        </div>
                        <div className="card-body p-4">
                            {selectedHistory.length === 0 ? (
                                <p className="text-center text-muted my-4">No history available.</p>
                            ) : (
                                <div className="position-relative border-start border-2 border-primary ms-3">
                                    {selectedHistory.map(h => (
                                        <div key={h.id} className="mb-4 position-relative ps-4">
                                            <div className="position-absolute rounded-circle bg-primary" style={{width: "12px", height: "12px", left: "-7px", top: "4px"}}></div>
                                            <div className="fw-bold text-dark">{new Date(h.changedAt).toLocaleString()}</div>
                                            <div className="text-secondary mt-1">
                                                Status changed from <span className="btn btn-sm btn-light px-2 py-0 mx-1">{h.oldStatus}</span>
                                                to <span className={`badge ${h.newStatus === 'RESOLVED' ? 'bg-success' : 'bg-warning text-dark'} mx-1`}>{h.newStatus}</span>
                                            </div>
                                            {h.remarks && <p className="mb-0 mt-2 p-2 bg-light rounded text-muted" style={{fontSize: "0.9rem"}}>{h.remarks}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="card border-0 shadow-sm mt-4">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                    <Settings size={20} className="me-2 text-primary" /> Ward Member Management
                </div>
                <div className="card-body">
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ward member username"
                                value={wardMemberUsername}
                                onChange={e => setWardMemberUsername(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Temporary password"
                                value={wardMemberPassword}
                                onChange={e => setWardMemberPassword(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <select
                                className="form-select"
                                value={wardMemberWard}
                                onChange={e => setWardMemberWard(e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">Select ward</option>
                                {wards.map(ward => (
                                    <option key={ward.id} value={ward.number}>{ward.number}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12">
                            <button className="btn btn-primary" onClick={handleCreateWardMember}>Add Ward Member</button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Ward Member</th>
                                    <th>Ward</th>
                                    <th>Reset Password</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wardMembers.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-muted">No ward members found.</td></tr>
                                ) : wardMembers.map(member => {
                                    const edit = wardMemberEdits[member.id] || {};
                                    const wardValue = edit.wardNumber ?? member.wardNumber ?? '';
                                    const passwordValue = edit.password ?? '';
                                    return (
                                        <tr key={member.id}>
                                            <td className="fw-medium">{member.username}</td>
                                            <td style={{ minWidth: 120 }}>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={wardValue}
                                                    onChange={e => handleWardMemberEdit(member.id, { wardNumber: e.target.value ? Number(e.target.value) : '' })}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {wards.map(ward => (
                                                        <option key={ward.id} value={ward.number}>{ward.number}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ minWidth: 180 }}>
                                                <input
                                                    type="password"
                                                    className="form-control form-control-sm"
                                                    placeholder="New password"
                                                    value={passwordValue}
                                                    onChange={e => handleWardMemberEdit(member.id, { password: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-primary" onClick={() => saveWardMember(member)}>Save</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
