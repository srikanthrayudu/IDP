import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Headphones, Activity, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import ShapTokens from '../components/ShapTokens';

interface Complaint {
  id: number;
  text: string;
  category?: string;
  // raw ML ranked categories JSON (camelCase or snake_case depending on API)
  rankedCategories?: string;
  ranked_categories?: string;
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

const CustomerCareDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitoring, setMonitoring] = useState<any>({});
  const navigate = useNavigate();

  // Filing complaint on behalf of a citizen
  const [showFileModal, setShowFileModal] = useState(false);
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formWard, setFormWard] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openFileModal = () => {
    setFormText('');
    setFormCategory('');
    setFormWard('');
    setShowFileModal(true);
  };
  const closeFileModal = () => setShowFileModal(false);

  const submitOnBehalf = async () => {
    if (!formText || formText.trim().length < 5) {
      alert('Please enter a descriptive complaint text (min 5 chars).');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = { text: formText.trim() };
      if (formCategory) payload.category = formCategory.trim();
      if (formWard) payload.wardNumber = formWard.trim();
      await api.post('/complaints', payload);
      setShowFileModal(false);
      fetchData();
      alert('Complaint filed on behalf of citizen.');
    } catch (err) {
      console.error('Failed to submit complaint', err);
      alert('Failed to file complaint.');
    } finally {
      setSubmitting(false);
    }
  };

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
      console.error('Failed to fetch customer care data', error);
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
          <Headphones size={28} className="me-2" /> Customer Care Dashboard
        </h2>
        <div className="d-flex gap-2">
          <button className="btn btn-primary d-flex align-items-center" onClick={openFileModal}>
            <Headphones size={16} className="me-2" /> File Complaint
          </button>
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
          <Headphones size={20} className="me-2 text-primary" /> Central Complaint View
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Category</th>
                  <th>ML Prediction</th>
                  <th>Department</th>
                  <th>Ward</th>
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
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No complaints found.</td></tr>
                ) : complaints.map(c => {
                  const rankedJson = c.rankedCategories || (c as any).ranked_categories || c.ranked_categories;
                  let mlTop = null; let mlScore = null;
                  try {
                    const arr = rankedJson ? JSON.parse(rankedJson) : null;
                    if (Array.isArray(arr) && arr.length > 0) {
                      mlTop = arr[0].category;
                      mlScore = arr[0].score;
                    }
                  } catch (e) {
                    // silent parse error
                  }
                  return (
                  <tr key={c.id}>
                    <td className="ps-4 fw-medium">#{c.id}</td>
                    <td><span className="badge bg-light text-primary border border-primary-subtle">{c.category || 'N/A'}</span></td>
                    <td>
                      <div style={{minWidth:120}}>
                        {mlTop ? (
                          <div className="small text-secondary">{mlTop} <span className="text-muted">{mlScore ? `(${(mlScore*100).toFixed(0)}%)` : ''}</span></div>
                        ) : <div className="small text-muted">No ML data</div>}
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span></td>
                    <td><span className="badge bg-light text-dark border">{c.wardNumber || 'N/A'}</span></td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showFileModal && (
        <div className="modal-backdrop d-flex justify-content-center align-items-center" style={{position:'fixed',inset:0,zIndex:1050}}>
          <div className="card p-4" style={{width:640,maxWidth:'96%'}}>
            <div className="d-flex justify-content-between mb-3">
              <h5 className="mb-0">File complaint on behalf of citizen</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeFileModal}>Close</button>
            </div>
            <div className="mb-3">
              <label className="form-label">Complaint text</label>
              <textarea className="form-control" rows={4} value={formText} onChange={e => setFormText(e.target.value)} />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label">Category (optional)</label>
                <input className="form-control" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="e.g., Streetlights" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Ward number (optional)</label>
                <input className="form-control" value={formWard} onChange={e => setFormWard(e.target.value)} placeholder="e.g., 12" />
              </div>
            </div>
            <div className="d-flex justify-content-end">
              <button className="btn btn-secondary me-2" onClick={closeFileModal} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={submitOnBehalf} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerCareDashboard;

