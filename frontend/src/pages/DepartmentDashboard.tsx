import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, Activity, Clock, CheckCircle, UserRound, Play, Check } from 'lucide-react';
import axios from 'axios';
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
  parentComplaintId?: number | null;
  dependsOnComplaintId?: number | null;
  workflowRole?: string | null;
  workflowTasks?: Complaint[];
  assignedWorkerId?: number | null;
}

interface WorkerOption {
  id: number;
  username: string;
  wardNumber?: number | null;
  categoryExpertise?: string | null;
  assignedCount?: number;
}

const DepartmentDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitoring, setMonitoring] = useState<any>({});
  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);
  const [assignedWorkerId, setAssignedWorkerId] = useState<string>('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [listRes, statsRes, monitoringRes, workersRes] = await Promise.all([
        api.get('/complaints'),
        api.get('/complaints/dashboard/stats'),
        api.get('/complaints/dashboard/monitoring'),
        api.get('/workers')
      ]);
      setComplaints(listRes.data);
      setStats(statsRes.data);
      setMonitoring(monitoringRes.data);
      setWorkers(workersRes.data);
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

  const openAssignWorker = (task: Complaint) => {
    setSelectedTask(task);
    setAssignedWorkerId(task.assignedWorkerId ? String(task.assignedWorkerId) : '');
    setAssignRemarks('');
  };

  const closeAssignWorker = () => {
    setSelectedTask(null);
    setAssignedWorkerId('');
    setAssignRemarks('');
  };

  const submitAssignWorker = async () => {
    if (!selectedTask || !assignedWorkerId) {
      alert('Select a worker first.');
      return;
    }

    setBusyTaskId(selectedTask.id);
    try {
      await api.put(`/complaints/${selectedTask.id}/assign`, {
        workerId: Number(assignedWorkerId),
        remarks: assignRemarks.trim() || `Assigned by department officer`,
      });
      closeAssignWorker();
      await fetchData();
    } catch (error) {
      console.error('Failed to assign worker', error);
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message || error.response?.data?.error || error.message)
        : 'Failed to assign worker.';
      alert(message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const updateTaskProgress = async (task: Complaint, progressStatus: 'IN_PROGRESS' | 'COMPLETED') => {
    setBusyTaskId(task.id);
    try {
      const remarks = progressStatus === 'COMPLETED' ? 'Completed by department officer' : 'Started by department officer';
      await api.put(`/complaints/${task.id}/progress?progressStatus=${progressStatus}&remarks=${encodeURIComponent(remarks)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to update task progress', error);
      alert('Failed to update task progress.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const renderTaskActions = (task: Complaint) => {
    const isBusy = busyTaskId === task.id;
    const canAssign = task.status !== 'RESOLVED';
    const canStart = task.progressStatus === 'ASSIGNED' || (task.progressStatus === 'NEW' && !!task.assignedWorkerId);
    const canComplete = task.progressStatus === 'IN_PROGRESS' || task.status === 'RESOLVED';

    return (
      <div className="d-flex flex-wrap gap-2 mt-2">
        {canAssign && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
            onClick={() => openAssignWorker(task)}
            disabled={isBusy}
          >
            <UserRound size={14} /> Assign Worker
          </button>
        )}
        {canStart && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
            onClick={() => updateTaskProgress(task, 'IN_PROGRESS')}
            disabled={isBusy}
          >
            <Play size={14} /> Start
          </button>
        )}
        {canComplete && task.status !== 'RESOLVED' && (
          <button
            type="button"
            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
            onClick={() => updateTaskProgress(task, 'COMPLETED')}
            disabled={isBusy}
          >
            <Check size={14} /> Complete
          </button>
        )}
      </div>
    );
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
                  <th>Workflow</th>
                  <th>Department</th>
                  <th>BBMP Zone</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Progress</th>
                  <th>Actions</th>
                  <th>AI Explanation</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No complaints found.</td></tr>
                ) : complaints.map(c => (
                  <tr key={c.id}>
                    <td className="ps-4 fw-medium">#{c.id}</td>
                    <td><span className="badge bg-light text-primary border border-primary-subtle">{c.category || 'N/A'}</span></td>
                    <td>
                      {c.workflowTasks && c.workflowTasks.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                          {c.workflowTasks.map((task, idx) => (
                            <div key={task.id} className="rounded border bg-white p-2">
                              <div className="d-flex align-items-center justify-content-between gap-2">
                                <span className={`badge ${task.progressStatus === 'BLOCKED' ? 'bg-secondary' : task.status === 'RESOLVED' ? 'bg-success' : task.progressStatus === 'IN_PROGRESS' ? 'bg-info text-dark' : 'bg-primary'}`} style={{ whiteSpace: 'normal', lineHeight: 1.2 }}>
                                  {idx + 1}. {task.department} · {task.progressStatus || task.status}
                                </span>
                                <span className="small text-muted">#{task.id}</span>
                              </div>
                              <div className="small text-secondary mt-2">{task.assignedWorkerName || 'Unassigned worker'}</div>
                              {task.dependsOnComplaintId && (
                                <div className="small text-muted">Depends on task #{task.dependsOnComplaintId}</div>
                              )}
                              {renderTaskActions(task)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="small text-muted">Single dept / no tasks</span>
                      )}
                    </td>
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
                      <div className="small text-muted">Use the workflow cards to assign or advance each department task.</div>
                    </td>
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

      {selectedTask && (
        <div className="modal-backdrop d-flex justify-content-center align-items-center" style={{ position: 'fixed', inset: 0, zIndex: 1050 }}>
          <div className="card p-4 shadow-lg" style={{ width: 560, maxWidth: '96%' }}>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h5 className="mb-1">Assign worker</h5>
                <div className="text-muted small">
                  Task #{selectedTask.id} · {selectedTask.department || 'Department'}
                </div>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeAssignWorker}>Close</button>
            </div>
            <div className="mb-3">
              <label className="form-label">Worker</label>
              <select
                className="form-select"
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
              >
                <option value="">Select a worker</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    #{worker.id} {worker.username}
                    {worker.categoryExpertise ? ` · ${worker.categoryExpertise}` : ''}
                    {worker.wardNumber ? ` · Ward ${worker.wardNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Remarks</label>
              <textarea
                className="form-control"
                rows={3}
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                placeholder="Optional assignment notes"
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={closeAssignWorker} disabled={busyTaskId === selectedTask.id}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitAssignWorker} disabled={busyTaskId === selectedTask.id || !assignedWorkerId}>
                {busyTaskId === selectedTask.id ? 'Assigning...' : 'Assign Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;
