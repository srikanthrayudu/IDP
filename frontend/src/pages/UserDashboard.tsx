import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, PlusCircle, ShieldAlert, History, MapPin, Upload, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ShapTokens from '../components/ShapTokens';
import api from '../services/api';

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

function LocationMarker({ 
    position, 
    setPosition 
}: { 
    position: [number, number] | null; 
    setPosition: (pos: [number, number]) => void;
}) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position === null ? null : (
        <Marker position={position}>
            <Popup>Selected Location</Popup>
        </Marker>
    );
}

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center[0] && center[1]) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}



interface Complaint {
    id: number;
    text: string;
    category: string;
    department?: string;
    priority?: string;
    status: string;
    progressStatus?: string;
    assignedWorkerName?: string;
    location: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    bbmpZone: string;
    wardNumber: string;
    createdAt: string;
    isFraud?: boolean;
    feedbackRating?: number;
    feedbackComment?: string;
    shapInterpretations?: string;
}

interface ComplaintHistory {
    id: number;
    oldStatus: string;
    newStatus: string;
    remarks: string;
    changedAt: string;
}

const DEPARTMENTS = [
    'Roads',
    'Water Supply',
    'Sanitation',
    'Electricity',
    'Drainage',
    'Public Health',
    'Traffic',
    'Forest',
    'Animal Welfare',
    'Pollution Control',
    'Town Planning',
    'Parks & Horticulture'
];

const UserDashboard = () => {
    const { t, i18n } = useTranslation();
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [text, setText] = useState('');
    const [location, setLocation] = useState('');
    const [latitude, setLatitude] = useState<number | ''>('');
    const [longitude, setLongitude] = useState<number | ''>('');
    const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
    const mapCenter: [number, number] = [12.9716, 77.5946];
    const bengaluruBounds: [[number, number], [number, number]] = [
        [12.7343, 77.3790],
        [13.1740, 77.8310]
    ];
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [imageContentType, setImageContentType] = useState('');
    const [imageSizeBytes, setImageSizeBytes] = useState<number | null>(null);
    const [imageOriginalName, setImageOriginalName] = useState('');
    const [bbmpZone, setBbmpZone] = useState('');
    const [wardNumber, setWardNumber] = useState('');
    const [department, setDepartment] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [deviceId] = useState(() => {
        const storedDeviceId = localStorage.getItem('deviceId');
        if (storedDeviceId) return storedDeviceId;
        const newId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('deviceId', newId);
        return newId;
    });

    const navigate = useNavigate();
    const [selectedHistory, setSelectedHistory] = useState<ComplaintHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [feedbackRatings, setFeedbackRatings] = useState<Record<number, number>>({});
    const [feedbackComments, setFeedbackComments] = useState<Record<number, string>>({});

    const fetchComplaints = async () => {
        try {
            const res = await api.get('/complaints/my');
            setComplaints(res.data);
        } catch (error) {
            console.error('Failed to fetch complaints', error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchComplaints();
    }, []);

    useEffect(() => {
        if (markerPosition) {
            const currentLat = Number(markerPosition[0].toFixed(6));
            const currentLng = Number(markerPosition[1].toFixed(6));
            if (latitude !== currentLat) setLatitude(currentLat);
            if (longitude !== currentLng) setLongitude(currentLng);
        }
    }, [markerPosition]);

    useEffect(() => {
        if (latitude !== '' && longitude !== '') {
            const latNum = Number(latitude);
            const lngNum = Number(longitude);
            if (!markerPosition || markerPosition[0] !== latNum || markerPosition[1] !== lngNum) {
                setMarkerPosition([latNum, lngNum]);
            }
        } else {
            if (markerPosition !== null) setMarkerPosition(null);
        }
    }, [latitude, longitude]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/complaints', { 
                text, 
                location, 
                latitude: latitude === '' ? null : latitude, 
                longitude: longitude === '' ? null : longitude, 
                imageUrl, 
                imageContentType: imageContentType || null,
                imageSizeBytes: imageSizeBytes || null,
                imageOriginalName: imageOriginalName || null,
                bbmpZone,
                wardNumber,
                department: department || null,
                deviceId
            });
            alert('Complaint submitted successfully!');
            setText('');
            setLocation('');
            setLatitude('');
            setLongitude('');
            setImageUrl('');
            setImageFile(null);
            setImageContentType('');
            setImageSizeBytes(null);
            setImageOriginalName('');
            setBbmpZone('');
            setWardNumber('');
            setDepartment('');
            fetchComplaints();
        } catch (error: unknown) {
            console.error('Submission failed', error);
            const e = error as { response?: { data?: { message?: string } }; message?: string };
            if (e.response && e.response.data && e.response.data.message) {
                alert(`Submission failed: ${e.response.data.message}`);
            } else if (e.message) {
                alert(`Submission failed: ${e.message}`);
            } else {
                alert('Submission failed. Please check your connection and try again.');
            }
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const fetchHistory = async (complaintId: number) => {
        try {
            const res = await api.get(`/complaints/${complaintId}/history`);
            setSelectedHistory(res.data);
            setShowHistory(true);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    const submitFeedback = async (complaintId: number) => {
        const rating = feedbackRatings[complaintId];
        if (!rating) {
            alert('Please select a rating.');
            return;
        }
        const comment = feedbackComments[complaintId] || '';
        try {
            await api.post(`/complaints/${complaintId}/feedback?rating=${rating}&comment=${encodeURIComponent(comment)}`);
            fetchComplaints();
        } catch (error) {
            console.error('Failed to submit feedback', error);
            alert('Failed to submit feedback.');
        }
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'kn' : 'en');
    };

    const fillCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                setLatitude(Number(position.coords.latitude.toFixed(6)));
                setLongitude(Number(position.coords.longitude.toFixed(6)));
                if (!location) {
                    setLocation('Current location');
                }
                setIsLocating(false);
            },
            error => {
                console.error('Failed to fetch location', error);
                alert('Unable to get current location. Please allow location access.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const uploadImageFile = async () => {
        if (!imageFile) {
            alert('Choose an image file first.');
            return;
        }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            const response = await api.post('/complaints/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = response.data?.url;
            if (url) {
                setImageUrl(url);
                setImageContentType(response.data?.contentType || imageFile.type || '');
                setImageSizeBytes(Number(response.data?.sizeBytes || imageFile.size || 0));
                setImageOriginalName(response.data?.originalName || imageFile.name || '');
            }
        } catch (error) {
            console.error('Image upload failed', error);
            alert('Image upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="container mt-4 mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
                <h2 className="mb-0 text-primary fw-bold">{t('Citizen Dashboard')}</h2>
                <div>
                    <button className="btn btn-outline-secondary d-inline-flex align-items-center me-3" onClick={toggleLanguage}>
                        <Globe size={18} className="me-2" /> {i18n.language === 'en' ? 'ಕನ್ನಡ' : 'English'}
                    </button>
                    <button className="btn btn-outline-danger d-inline-flex align-items-center" onClick={handleLogout}>
                        <LogOut size={18} className="me-2" /> {t('Logout')}
                    </button>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-primary text-white d-flex align-items-center">
                            <PlusCircle size={20} className="me-2" /> {t('Submit New Complaint')}
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label fw-medium text-secondary">{t('Description')}</label>
                                    <textarea className="form-control bg-light" rows={3} value={text} onChange={e => setText(e.target.value)} required placeholder={t('Describe the issue...')}></textarea>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-medium text-secondary d-flex align-items-center"><MapPin size={16} className="me-1"/> {t('Location')}</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control bg-light" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('e.g. MG Road, Indiranagar')} />
                                        <button type="button" className="btn btn-outline-secondary" onClick={fillCurrentLocation} disabled={isLocating}>
                                            {isLocating ? 'Locating...' : 'Use current'}
                                        </button>
                                    </div>
                                    <div className="form-text">Optional: use GPS to fill latitude/longitude.</div>
                                </div>
                                <div className="row mb-3 gx-2">
                                    <div className="col">
                                        <label className="form-label fw-medium text-secondary" style={{fontSize: "0.85rem"}}>{t('Latitude (opt)')}</label>
                                        <input type="number" step="any" className="form-control bg-light shadow-sm" value={latitude} onChange={e => setLatitude(e.target.value ? parseFloat(e.target.value) : '')} placeholder="12.9716" />
                                    </div>
                                    <div className="col">
                                        <label className="form-label fw-medium text-secondary" style={{fontSize: "0.85rem"}}>{t('Longitude (opt)')}</label>
                                        <input type="number" step="any" className="form-control bg-light shadow-sm" value={longitude} onChange={e => setLongitude(e.target.value ? parseFloat(e.target.value) : '')} placeholder="77.5946" />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-medium text-secondary d-flex align-items-center"><MapPin size={16} className="text-primary me-1"/> {t('Pin Location on Map')}</label>
                                    <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }} className="shadow-sm">
                                        <MapContainer
                                            center={latitude !== '' && longitude !== '' ? [Number(latitude), Number(longitude)] : mapCenter}
                                            zoom={12}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <ChangeView center={latitude !== '' && longitude !== '' ? [Number(latitude), Number(longitude)] : mapCenter} />
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                                            />
                                            <LocationMarker position={markerPosition} setPosition={setMarkerPosition} />
                                        </MapContainer>
                                    </div>
                                    <div className="form-text mt-1 text-muted">Click the map above to select coordinates, or use Geolocation.</div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-medium text-secondary d-flex align-items-center"><Upload size={16} className="me-1"/> {t('Image URL (optional)')}</label>
                                    <input type="text" className="form-control bg-light" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                                    <div className="input-group mt-2">
                                        <input
                                            type="file"
                                            className="form-control"
                                            accept="image/*"
                                            onChange={e => {
                                                const file = e.target.files?.[0] || null;
                                                if (!file) {
                                                    setImageFile(null);
                                                    return;
                                                }
                                                if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                                                    alert('Unsupported image type. Please upload JPG, PNG, or WebP.');
                                                    e.currentTarget.value = '';
                                                    return;
                                                }
                                                if (file.size > MAX_IMAGE_BYTES) {
                                                    alert('Image too large. Max size is 5MB.');
                                                    e.currentTarget.value = '';
                                                    return;
                                                }
                                                setImageFile(file);
                                            }}
                                        />
                                        <button type="button" className="btn btn-outline-secondary" onClick={uploadImageFile} disabled={isUploading}>
                                            {isUploading ? 'Uploading...' : 'Upload image'}
                                        </button>
                                    </div>
                                    <div className="form-text">You can paste an image URL or upload a file (JPG/PNG/WebP, max 5MB).</div>
                                </div>
                                <div className="row mb-3 gx-2">
                                    <div className="col">
                                        <label className="form-label fw-medium text-secondary">{t('BBMP Zone')}</label>
                                        <input type="text" className="form-control bg-light" value={bbmpZone} onChange={e => setBbmpZone(e.target.value)} placeholder={t('e.g. East')} />
                                    </div>
                                    <div className="col">
                                        <label className="form-label fw-medium text-secondary">{t('Ward No.')}</label>
                                        <input type="text" className="form-control bg-light" value={wardNumber} onChange={e => setWardNumber(e.target.value)} placeholder={t('e.g. 150')} />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-medium text-secondary">{t('Department')}</label>
                                    <select
                                        className="form-select bg-light"
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                    >
                                        <option value="">{t('Select Department')}</option>
                                        {DEPARTMENTS.map(dep => (
                                            <option key={dep} value={dep}>{dep}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="p-3 bg-light rounded text-muted mb-4" style={{ fontSize: '0.85em' }}>
                                    <div className="d-flex align-items-center mb-1">
                                        <ShieldAlert size={16} className="text-info me-2" />
                                        <strong>Device ID:</strong> <span className="ms-1 text-dark text-monospace">{deviceId}</span>
                                    </div>
                                    <em className="d-block text-secondary mt-1">{t('Identity attached for Sanchar Saathi Protocol')}</em>
                                </div>
                                <button type="submit" className="btn btn-primary w-100 fw-bold py-2">{t('Submit Complaint')}</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="col-lg-8">
                    <div className="card mb-4 border-0 shadow-sm border-start border-4 border-info">
                        <div className="card-body">
                            <h6 className="text-info fw-bold d-flex align-items-center mb-3">
                                <ShieldAlert size={20} className="me-2" /> {t('Trusted Directory & Security Information')}
                            </h6>
                            <ul className="mb-0 text-secondary" style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                                <li><strong className="text-dark">{t('Asset Verification')}:</strong> Use the Device ID ({deviceId}) to track your physical hardware complaints.</li>
                                <li><strong className="text-dark">{t('Kill-Switch Protection')}:</strong> Fraudulent activity blacklists the device from our network.</li>
                                <li><strong className="text-dark">{t('Report Scams')}:</strong> Disregard unknown SMS posing as officials. Dial toll-free numbers.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <MapPin size={20} className="me-2 text-primary" /> {t('My Complaint Locations Map')}
                        </div>
                        <div className="card-body p-0" style={{ height: '300px' }}>
                            <MapContainer
                                center={mapCenter}
                                zoom={11}
                                maxBounds={bengaluruBounds}
                                maxBoundsViscosity={1.0}
                                minZoom={10}
                                style={{ height: '100%', width: '100%', zIndex: 0 }}
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
                                            <span>{c.text.substring(0, 55)}...</span>
                                            <br />
                                            <span className={`badge ${c.status === 'RESOLVED' ? 'bg-success' : 'bg-warning text-dark'} mt-1`}>{c.status}</span>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center fw-bold text-dark">
                            <History size={20} className="me-2 text-primary" /> {t('My Complaints List')}
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-4">{t('ID')}</th>
                                            <th>{t('Description')}</th>
                                            <th>{t('Category')}</th>
                                            <th>{t('Department')}</th>
                                            <th>Priority</th>
                                            <th>{t('Status')}</th>
                                            <th>Assigned</th>
                                            <th>{t('Security')}</th>
                                            <th>{t('Date')}</th>
                                            <th>AI Explanation</th>
                                            <th className="pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {complaints.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-4 text-muted">No complaints found.</td></tr>
                                        ) : complaints.map(c => (
                                            <tr key={c.id}>
                                                <td className="ps-4 fw-medium">#{c.id}</td>
                                                <td className="text-truncate" style={{maxWidth: "200px"}} title={c.text}>{c.text}</td>
                                                <td><span className="badge bg-light text-primary border border-primary-subtle">{c.category || 'Pending NLP'}</span></td>
                                                <td><span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span></td>
                                                <td>
                                                    <span className={`badge ${c.priority === 'HIGH' ? 'bg-danger' : c.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                        {c.priority || 'MEDIUM'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${c.status === 'PENDING' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                        {c.status}
                                                    </span>
                                                    <div className="text-muted small mt-1">{c.progressStatus || 'NEW'}</div>
                                                </td>
                                                <td>
                                                    <div className="text-secondary small">{c.assignedWorkerName || 'Unassigned'}</div>
                                                </td>
                                                <td>
                                                    {c.isFraud ? (
                                                        <span className="badge bg-danger">Spam / Fraud</span>
                                                    ) : (
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle">Verified</span>
                                                    )}
                                                </td>
                                                <td className="text-secondary" style={{fontSize: "0.9rem"}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="bg-light p-2 rounded" style={{ maxWidth: '240px' }}>
                                                        <ShapTokens raw={c.shapInterpretations} maxTokens={6} emptyText="No XAI data" />
                                                    </div>
                                                </td>
                                                <td className="pe-4">
                                                    <button className="btn btn-sm btn-light text-primary fw-medium border shadow-sm d-flex align-items-center" onClick={() => fetchHistory(c.id)}>
                                                        <History size={14} className="me-1" /> {t('View History')}
                                                    </button>
                                                    {c.status === 'RESOLVED' && (
                                                        <div className="mt-2">
                                                            <div className="input-group input-group-sm mb-2">
                                                                <select
                                                                    className="form-select"
                                                                    value={feedbackRatings[c.id] || c.feedbackRating || ''}
                                                                    onChange={e => setFeedbackRatings(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                                                                >
                                                                    <option value="">Rate</option>
                                                                    {[1,2,3,4,5].map(score => (
                                                                        <option key={score} value={score}>{score}</option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder="Feedback"
                                                                    value={feedbackComments[c.id] || c.feedbackComment || ''}
                                                                    onChange={e => setFeedbackComments(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                                />
                                                            </div>
                                                            <button className="btn btn-sm btn-outline-success" onClick={() => submitFeedback(c.id)}>Submit Feedback</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Modal */}
            {showHistory && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card w-50 max-h-75 overflow-auto border-0 shadow-lg">
                        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold d-flex align-items-center"><History size={20} className="me-2 text-primary"/> Complaint Timeline</h5>
                            <button className="btn-close" onClick={() => setShowHistory(false)}></button>
                        </div>
                        <div className="card-body p-4">
                            {selectedHistory.length === 0 ? (
                                <p className="text-center text-muted my-4">No history available for this complaint.</p>
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

export default UserDashboard;

