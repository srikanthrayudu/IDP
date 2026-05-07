import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, Activity, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import ShapTokens from '../components/ShapTokens';

interface Complaint {
  id: number;
  text: string;
  category?: string;
  department?: string;
  priority?: string;
  status: string;
  progressStatus?: string;
  assignedWorkerName?: string;
  bbmpZone?: string;
  wardNumber?: string;
  createdAt?: string;
  shapInterpretations?: string;
}

const DepartmentDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitoring, setMonitoring] = useState<any>({});
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [listRes, statsRes, monitoringRes] = await Promise.all([
        api.get('/complaints'),
        api.get('/complaints/dashboard/stats'),
        api.get('/complaints/dashboard/monitoring')
      ]);
      setComplaints(listRes.data);
      setStats(statsRes.data);
      setMonitoring(monitoringRes.data);
    } catch (error) {
      console.error('Failed to fetch department data', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="container-fluid mt-4 mb-5 px-4">
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
        <h2 className="mb-0 text-primary fw-bold d-flex align-items-center">
          <Activity size={28} className="me-2" /> Department Dashboard
        </h2>
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
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom fw-bold text-dark">SLA Breaches</div>
            <div className="card-body">
              <div className="d-flex justify-content-between"><span>High</span><span className="badge bg-danger">{monitoring.slaBreaches?.HIGH || 0}</span></div>
              <div className="d-flex justify-content-between mt-2"><span>Medium</span><span className="badge bg-warning text-dark">{monitoring.slaBreaches?.MEDIUM || 0}</span></div>
              <div className="d-flex justify-content-between mt-2"><span>Low</span><span className="badge bg-secondary">{monitoring.slaBreaches?.LOW || 0}</span></div>
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

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
          <ClipboardList size={20} className="me-2 text-primary" /> Department Complaints
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
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Progress</th>
                  <th>AI Explanation</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-4 text-muted">No complaints found.</td></tr>
                ) : complaints.map(c => (
                  <tr key={c.id}>
                    <td className="ps-4 fw-medium">#{c.id}</td>
                    <td><span className="badge bg-light text-primary border border-primary-subtle">{c.category || 'N/A'}</span></td>
                    <td><span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span></td>
                    <td><div className="text-secondary small">{c.bbmpZone || 'N/A'}</div></td>
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
                    <td><div className="text-secondary small">{c.assignedWorkerName || 'Unassigned'}</div></td>
                    <td><span className="badge bg-light text-dark border">{c.progressStatus || 'NEW'}</span></td>
                    <td>
                      <div className="bg-light p-2 rounded" style={{ maxWidth: '220px' }}>
                        <ShapTokens raw={c.shapInterpretations} maxTokens={5} emptyText="No XAI data" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboard;

