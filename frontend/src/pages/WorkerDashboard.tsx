import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, CheckCircle, Clock, MessageSquare, MapPin } from 'lucide-react';
import api from '../services/api';
import ShapTokens from '../components/ShapTokens';

interface Complaint {
  id: number;
  text: string;
  category: string;
  department?: string;
  priority: string;
  status: string;
  progressStatus: string;
  location?: string;
  wardNumber?: string;
  assignedAt?: string;
  workerRemarks?: string;
  shapInterpretations?: string;
}

const progressOptions = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' }
];

const WorkerDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [progress, setProgress] = useState<Record<number, string>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitoring, setMonitoring] = useState<any>({});
  const navigate = useNavigate();

  const fetchAssigned = async () => {
    try {
      const [assignedRes, monitoringRes] = await Promise.all([
        api.get('/complaints/assigned'),
        api.get('/complaints/dashboard/monitoring')
      ]);
      setComplaints(assignedRes.data);
      setMonitoring(monitoringRes.data);
    } catch (error) {
      console.error('Failed to fetch assigned complaints', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssigned();
  }, []);

  const handleProgressUpdate = async (id: number) => {
    try {
      const nextStatus = progress[id] || 'IN_PROGRESS';
      const remark = remarks[id] || '';
      await api.put(`/complaints/${id}/progress?progressStatus=${nextStatus}&remarks=${encodeURIComponent(remark)}`);
      fetchAssigned();
    } catch (error) {
      console.error('Failed to update progress', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
        <h2 className="mb-0 text-primary fw-bold d-flex align-items-center">
          <ClipboardList size={28} className="me-2" /> Worker Dashboard
        </h2>
        <button className="btn btn-outline-danger d-flex align-items-center" onClick={handleLogout}>
          <LogOut size={18} className="me-2" /> Logout
        </button>
      </div>

      <div className="row mb-4 g-3">
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

      <div className="row mb-4 g-3">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom fw-bold text-dark">My Performance</div>
            <div className="card-body">
              <div className="d-flex justify-content-between"><span>Open</span><span className="badge bg-warning text-dark">{monitoring.openCount || 0}</span></div>
              <div className="d-flex justify-content-between mt-2"><span>Resolved</span><span className="badge bg-success">{monitoring.resolvedCount || 0}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
          <ClipboardList size={20} className="me-2 text-primary" /> Assigned Tasks
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>AI Explanation</th>
                  <th className="pe-4">Update</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No assigned tasks.</td></tr>
                ) : complaints.map(c => (
                  <tr key={c.id}>
                    <td className="ps-4 fw-medium">#{c.id}</td>
                    <td><span className={`badge ${c.priority === 'HIGH' ? 'bg-danger' : c.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{c.priority || 'MEDIUM'}</span></td>
                    <td className="fw-bold text-dark">{c.category || 'N/A'}</td>
                    <td><span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span></td>
                    <td>
                      <div className="text-secondary small">
                        <MapPin size={12} className="me-1" /> {c.location || 'N/A'}
                      </div>
                      <div className="text-muted small">Ward: {c.wardNumber || 'N/A'}</div>
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'RESOLVED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={progress[c.id] || c.progressStatus || 'ASSIGNED'}
                        onChange={e => setProgress(prev => ({ ...prev, [c.id]: e.target.value }))}
                      >
                        {progressOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="mt-2">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><MessageSquare size={12} /></span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Remarks"
                            value={remarks[c.id] || c.workerRemarks || ''}
                            onChange={e => setRemarks(prev => ({ ...prev, [c.id]: e.target.value }))}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="bg-light p-2 rounded" style={{ maxWidth: '220px' }}>
                        <ShapTokens raw={c.shapInterpretations} maxTokens={5} emptyText="No XAI data" />
                      </div>
                    </td>
                    <td className="pe-4">
                      <button className="btn btn-sm btn-primary d-flex align-items-center" onClick={() => handleProgressUpdate(c.id)}>
                        {progress[c.id] === 'COMPLETED' ? <CheckCircle size={14} className="me-1" /> : <Clock size={14} className="me-1" />}
                        Save
                      </button>
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

export default WorkerDashboard;

