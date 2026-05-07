import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { LogOut, Activity, Clock, CheckCircle, PieChart as PieChartIcon, BarChart2, List, Settings, History, AlertTriangle, ShieldOff, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';

// Fix leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Complaint {
    id: number;
    category: string;
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
}

interface ComplaintHistory {
    id: number;
    oldStatus: string;
    newStatus: string;
    remarks: string;
    changedAt: string;
}

const AdminDashboard = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [complaints, setComplaints] = useState<any[]>([]);
    const [selectedFraudComplaint, setSelectedFraudComplaint] = useState<Complaint | null>(null);
    const [showFraudModal, setShowFraudModal] = useState(false);

    // History Modal State
    const [selectedHistory, setSelectedHistory] = useState<ComplaintHistory[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const navigate = useNavigate();

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

    const fetchData = async () => {
        try {
            const statsRes = await api.get('/complaints/dashboard/stats');
            setStats(statsRes.data);
            const listRes = await api.get('/complaints');
            setComplaints(listRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
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

    const categoryData = Object.keys(stats.categoryCount || {}).map(key => ({
        name: key,
        value: stats.categoryCount[key]
    }));

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
                                    <th>Text snippet</th>
                                    <th>Status</th>
                                    <th>Fraud Status</th>
                                    <th>Actions</th>
                                    <th className="pe-4">SHAP XAI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-4 text-muted">No complaints found.</td></tr>
                                ) : complaints.map(c => (
                                    <tr key={c.id}>
                                        <td className="ps-4 fw-medium">#{c.id}</td>
                                        <td>
                                            <div className="fw-bold text-dark">{c.category || 'N/A'}</div>
                                            <div className="text-secondary small">{c.bbmpZone || 'N/A'}</div>
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
                                            <div className="bg-light p-2 rounded" style={{maxHeight: "80px", overflowY: 'auto', fontSize: "0.75rem", fontFamily: "monospace"}}>
                                                {c.shapInterpretations || <span className="text-muted">No XAI data</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
        </div>
    );
};

export default AdminDashboard;
