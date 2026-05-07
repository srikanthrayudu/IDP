import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { LogOut, Activity, Clock, CheckCircle, PieChart as PieChartIcon, List, Settings, History, Map, Trophy } from 'lucide-react';
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

interface Complaint {
    id: number;
    category?: string;
    department?: string;
    priority?: string;
    progressStatus?: string;
    assignedWorkerName?: string;
    bbmpZone?: string;
    text: string;
    status: string;
    deviceId?: string;
    createdAt?: string;
    isFraud?: boolean;
    shapInterpretations?: string;
    latitude?: number;
    longitude?: number;
}

const WardMemberDashboard = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [complaints, setComplaints] = useState<Complaint[]>([]);

    // History Modal State
    const [selectedHistory, setSelectedHistory] = useState<ComplaintHistory[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [monitoring, setMonitoring] = useState<any>({});

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workerUsername, setWorkerUsername] = useState('');
    const [workerPassword, setWorkerPassword] = useState('');
    const [workerExpertise, setWorkerExpertise] = useState('');
    const [assignmentSelections, setAssignmentSelections] = useState<Record<number, number | ''>>({});

    const navigate = useNavigate();

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];
    const mapCenter: [number, number] = [12.9716, 77.5946];
    const bengaluruBounds: [[number, number], [number, number]] = [
        [12.7343, 77.3790],
        [13.1740, 77.8310]
    ];

    const fetchComplaints = async (isMounted?: () => boolean) => {
        try {
            const [listRes, statsRes, monitoringRes] = await Promise.allSettled([
                api.get('/complaints'),
                api.get('/complaints/dashboard/stats'),
                api.get('/complaints/dashboard/monitoring')
            ]);

            if (listRes.status === 'fulfilled' && (!isMounted || isMounted())) {
                setComplaints(listRes.value.data);
            }
            if (statsRes.status === 'fulfilled' && (!isMounted || isMounted())) {
                setStats(statsRes.value.data);
            }
            if (monitoringRes.status === 'fulfilled' && (!isMounted || isMounted())) {
                setMonitoring(monitoringRes.value.data);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    const fetchWorkers = async (isMounted?: () => boolean) => {
        try {
            const workersRes = await api.get('/workers');
            if (!isMounted || isMounted()) {
                setWorkers(workersRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch workers', error);
        }
    };

    useEffect(() => {
        let mounted = true;
        const isMounted = () => mounted;

        fetchComplaints(isMounted);
        fetchWorkers(isMounted);

        return () => {
            mounted = false;
        };
    }, []);

    const fetchHistory = async (complaintId: number) => {
        try {
            const res = await api.get(`/complaints/${complaintId}/history`);
            setSelectedHistory(res.data);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/complaints/${id}/status?status=${status}`);
            fetchComplaints();
        } catch (error) {
            console.error('Failed to update status', error);
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
            setAssignmentSelections(prev => ({ ...prev, [complaintId]: '' }));
            fetchComplaints();
        } catch (error) {
            console.error('Failed to assign worker', error);
            alert('Failed to assign worker.');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleCreateWorker = async () => {
        if (!workerUsername || !workerPassword) {
            alert('Username and password are required.');
            return;
        }
        try {
            await api.post('/workers', {
                username: workerUsername,
                password: workerPassword,
                categoryExpertise: workerExpertise
            });
            setWorkerUsername('');
            setWorkerPassword('');
            setWorkerExpertise('');
            fetchWorkers();
        } catch (error) {
            console.error('Failed to create worker', error);
            alert('Failed to create worker.');
        }
    };

    const categoryData = Object.keys(stats.categoryCount || {}).map(key => ({
        name: key,
        value: stats.categoryCount[key]
    }));

    const slaBreaches = monitoring.slaBreaches || {};
    const feedbackByCategory = monitoring.feedbackByCategory || [];

    // Calculate a mock "Resolution Score" based on stats
    const resolutionRate = stats.totalComplaints > 0 ? (stats.resolvedComplaints / stats.totalComplaints) * 100 : 0;
    let rank = "Bronze";
    let iconColor = "#cd7f32"; // Bronze
    if (resolutionRate >= 80) {
        rank = "Gold";
        iconColor = "#FFD700";
    } else if (resolutionRate >= 50) {
        rank = "Silver";
        iconColor = "#C0C0C0";
    }

    return (
        <div className="container-fluid mt-4 mb-5 px-4">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
                <h2 className="mb-0 text-primary fw-bold d-flex align-items-center"><Activity size={28} className="me-2"/> Ward Member Dashboard</h2>
                <div className="d-flex align-items-center">
                    <div className="bg-light px-3 py-2 rounded-pill me-3 d-flex align-items-center shadow-sm border">
                        <Trophy size={20} className="me-2" color={iconColor} />
                        <span className="fw-bold text-dark me-2">Rank: {rank}</span>
                        <span className="badge bg-secondary rounded-pill">{resolutionRate.toFixed(1)}% Score</span>
                    </div>
                    <button className="btn btn-outline-danger d-flex align-items-center" onClick={handleLogout}>
                        <LogOut size={18} className="me-2" /> Logout
                    </button>
                </div>
            </div>
            
            <div className="row mb-4 text-center g-4">
                <div className="col-md-4">
                    <div className="card bg-primary bg-gradient text-white border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <Activity size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Assigned Complaints</h5>
                            <h1 className="fw-bold display-5 mb-0">{stats.totalComplaints || 0}</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-warning bg-gradient text-dark border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <Clock size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Pending Action</h5>
                            <h1 className="fw-bold display-5 mb-0">{stats.pendingComplaints || 0}</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-success bg-gradient text-white border-0 shadow-sm h-100">
                        <div className="card-body py-4">
                            <CheckCircle size={32} className="mb-2 opacity-75" />
                            <h5 className="opacity-75">Successfully Resolved</h5>
                            <h1 className="fw-bold display-5 mb-0">{stats.resolvedComplaints || 0}</h1>
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
                            <PieChartIcon size={20} className="me-2 text-primary" /> Workload by Category
                        </div>
                        <div className="card-body" style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                                        {categoryData.map((_entry, index) => (
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
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <Map size={20} className="me-2 text-primary" /> Assigned Ward Map View
                        </div>
                        <div className="card-body p-0" style={{ height: 350 }}>
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
                                    attribution="&copy; OpenStreetMap contributors"
                                />
                                {complaints
                                    .map(c => {
                                        const lat = Number(c.latitude);
                                        const lng = Number(c.longitude);
                                        return Number.isFinite(lat) && Number.isFinite(lng)
                                            ? { ...c, latitude: lat, longitude: lng }
                                            : null;
                                    })
                                    .filter(Boolean)
                                    .map(c => (
                                    <Marker key={`map-${c.id}`} position={[c.latitude as number, c.longitude as number]}>
                                        <Popup>
                                            <strong>#{c.id} - {c.category}</strong><br/>
                                            <span className={`badge ${c.status === 'RESOLVED' ? 'bg-success' : 'bg-warning text-dark'}`}>{c.status}</span>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
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
                                ) : feedbackByCategory.map((row: { category: string; avgRating: number; count: number }, index: number) => (
                                    <tr key={`${row.category || 'unknown'}-${index}`}>
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

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                    <List size={20} className="me-2 text-primary" /> Active Tasks / Assigned Complaints
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">ID</th>
                                    <th>Category</th>
                                    <th>Department</th>
                                    <th>BBMP Zone</th>
                                    <th>Issue Details</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Assigned</th>
                                    <th>Progress</th>
                                    <th>AI Explanation</th>
                                    <th className="pe-4">Actions (Update Status)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-4 text-muted">No items assigned.</td></tr>
                                ) : complaints.map(c => (
                                    <tr key={c.id}>
                                        <td className="ps-4 fw-medium">#{c.id}</td>
                                        <td><div className="fw-bold text-dark">{c.category || 'N/A'}</div></td>
                                        <td><span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span></td>
                                        <td><div className="text-secondary small">{c.bbmpZone || 'N/A'}</div></td>
                                        <td className="text-truncate" style={{maxWidth: "200px"}} title={c.text}>
                                            {c.text}
                                            {c.deviceId && <div className="text-muted small mt-1"><Settings size={12} className="me-1"/> Device: {c.deviceId}</div>}
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
                                            <div className="bg-light p-2 rounded" style={{ maxWidth: '240px' }}>
                                                <ShapTokens raw={c.shapInterpretations} maxTokens={6} emptyText="No XAI data" />
                                            </div>
                                        </td>
                                        <td className="pe-4">
                                            <div className="d-flex flex-wrap gap-1">
                                                {c.status !== 'RESOLVED' && (
                                                    <button
                                                        className="btn btn-sm btn-success d-flex align-items-center"
                                                        onClick={() => handleUpdateStatus(c.id, 'RESOLVED')}
                                                        title="Mark Resolved"
                                                    >
                                                        <CheckCircle size={14} className="me-1"/> Resolve
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-light border text-primary d-flex align-items-center" onClick={() => fetchHistory(c.id)} title="View History">
                                                    <History size={14} className="me-1" /> History
                                                </button>
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
                <div className="card-body">
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Worker username"
                                value={workerUsername}
                                onChange={e => setWorkerUsername(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Temporary password"
                                value={workerPassword}
                                onChange={e => setWorkerPassword(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Category expertise"
                                value={workerExpertise}
                                onChange={e => setWorkerExpertise(e.target.value)}
                            />
                        </div>
                        <div className="col-12">
                            <button className="btn btn-primary" onClick={handleCreateWorker}>Add Worker</button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Worker</th>
                                    <th>Ward</th>
                                    <th>Expertise</th>
                                    <th>Assigned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workers.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-muted">No workers found.</td></tr>
                                ) : workers.map(worker => (
                                    <tr key={worker.id}>
                                        <td className="fw-medium">{worker.username}</td>
                                        <td>{worker.wardNumber || 'N/A'}</td>
                                        <td>{worker.categoryExpertise || 'N/A'}</td>
                                        <td><span className="badge bg-light text-dark border">{worker.assignedCount ?? 0}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
        </div>
    );
};

export default WardMemberDashboard;
