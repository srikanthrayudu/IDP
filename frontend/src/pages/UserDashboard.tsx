import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, PlusCircle, ShieldAlert, History, MapPin, Upload, Globe, Sparkles, Headphones, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ShapTokens from '../components/ShapTokens';
import api from '../services/api';
import axios from 'axios';

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
    parentComplaintId?: number;
    dependsOnComplaintId?: number;
    workflowRole?: string;
    workflowTasks?: Complaint[];
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

const ISSUE_TYPES = [
    { label: 'Pothole / Road damage', department: 'Roads', hint: 'Road damage, potholes, broken footpaths, medians, or traffic obstructions.' },
    { label: 'Garbage / Waste', department: 'Sanitation', hint: 'Overflowing bins, missed collection, or dumping in public spaces.' },
    { label: 'Water leak / Supply issue', department: 'Water Supply', hint: 'Leakage, low pressure, broken pipe, or no water supply.' },
    { label: 'Streetlight problem', department: 'Electricity', hint: 'Non-working streetlight, flickering light, or dark street corner.' },
    { label: 'Drainage / Sewage', department: 'Drainage', hint: 'Blocked drain, sewage overflow, flooding, or smell.' },
    { label: 'Electrical hazard', department: 'Electricity', hint: 'Loose wire, sparks, transformer noise, or power hazard.' },
    { label: 'Traffic issue', department: 'Traffic', hint: 'Signal failure, congestion, sign issues, or unsafe crossings.' },
    { label: 'Tree / Green cover', department: 'Forest', hint: 'Fallen branch, tree pruning, or green cover related issue.' },
    { label: 'Other / Not sure', department: '', hint: 'If you are not sure, describe the issue and the system will classify it.' }
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
    const [issueType, setIssueType] = useState('');
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
    const [aiPreview, setAiPreview] = useState<{ category: string; confidence: number; priority: string; priority_confidence: number; ranked_categories: { category: string; score: number }[]; shap_values: Record<string, number> } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('ALL');

    // Contact Customer Care modal for citizens
    const [showContactCC, setShowContactCC] = useState(false);
    const [ccText, setCcText] = useState('');
    const [ccCategory, setCcCategory] = useState('');
    const [ccWard, setCcWard] = useState('');
    const [ccSubmitting, setCcSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const complaintCounts = useMemo(() => {
        return complaints.reduce(
            (acc, complaint) => {
                acc.total += 1;
                if (complaint.status === 'RESOLVED') acc.resolved += 1;
                else if (complaint.status === 'IN_PROGRESS') acc.inProgress += 1;
                else if (complaint.status === 'REJECTED') acc.rejected += 1;
                else acc.pending += 1;
                return acc;
            },
            { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0 }
        );
    }, [complaints]);

    const visibleComplaints = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return complaints.filter(complaint => {
            const matchesStatus = statusFilter === 'ALL' || complaint.status === statusFilter;
            if (!matchesStatus) return false;

            if (!query) return true;

            const searchable = [
                complaint.text,
                complaint.category,
                complaint.department,
                complaint.location,
                complaint.status,
                complaint.priority,
                complaint.wardNumber,
                complaint.bbmpZone
            ].filter(Boolean).join(' ').toLowerCase();

            return searchable.includes(query);
        });
    }, [complaints, searchTerm, statusFilter]);

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

    // Live AI preview as user types
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim() || text.trim().length < 8) { setAiPreview(null); return; }
        debounceRef.current = setTimeout(async () => {
            setAiLoading(true);
            try {
                const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:5000';
                const res = await axios.post(`${ML_URL}/predict`, { text });
                setAiPreview(res.data);
            } catch { setAiPreview(null); }
            finally { setAiLoading(false); }
        }, 700);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [text]);

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
            const complaintPayload = {
                text,
                location,
                latitude: latitude === '' ? null : latitude,
                longitude: longitude === '' ? null : longitude,
                imageUrl: imageUrl || null,
                imageContentType: imageContentType || null,
                imageSizeBytes: imageSizeBytes || null,
                imageOriginalName: imageOriginalName || null,
                bbmpZone,
                wardNumber,
                department: department || null,
                deviceId
            };

            if (imageFile) {
                const formData = new FormData();
                formData.append('complaint', new Blob([JSON.stringify(complaintPayload)], { type: 'application/json' }));
                formData.append('file', imageFile);
                await api.post('/complaints', formData);
            } else {
                await api.post('/complaints', complaintPayload);
            }
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
            setIssueType('');
            setAiPreview(null);
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

    const resetFilters = () => {
        setStatusFilter('ALL');
        setSearchTerm('');
    };

    const renderWorkflowSummary = (complaint: Complaint) => {
        const tasks = complaint.workflowTasks || [];
        if (tasks.length === 0) {
            return <span className="text-muted small">Single department</span>;
        }

        return (
            <div className="d-flex flex-column gap-1">
                {tasks.map((task, index) => (
                    <span
                        key={task.id}
                        className={`badge text-start ${task.progressStatus === 'BLOCKED' ? 'bg-secondary' : task.status === 'RESOLVED' ? 'bg-success' : 'bg-primary'}`}
                        style={{ whiteSpace: 'normal', lineHeight: 1.35 }}
                    >
                        {index + 1}. {task.department} · {task.progressStatus || task.status}
                        {task.dependsOnComplaintId ? ' · waits on prior task' : ''}
                    </span>
                ))}
            </div>
        );
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'kn' : 'en');
    };

    const handleIssueTypeChange = (value: string) => {
        setIssueType(value);
        const selected = ISSUE_TYPES.find(item => item.label === value);
        if (selected) {
            if (selected.department) {
                setDepartment(selected.department);
            }
            if (!text.trim()) {
                setText(selected.hint);
            }
        }
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
            const response = await api.post('/complaints/upload', formData);
            const url = response.data?.url;
            if (url) {
                setImageUrl(url);
                setImageContentType(response.data?.contentType || imageFile.type || '');
                setImageSizeBytes(Number(response.data?.sizeBytes || imageFile.size || 0));
                setImageOriginalName(response.data?.originalName || imageFile.name || '');
                setImageFile(null);
            }
        } catch (error) {
            console.error('Image upload failed', error);
            alert('Image upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const submitToCustomerCare = async () => {
        if (!ccText || ccText.trim().length < 5) { alert('Please enter a descriptive message (min 5 chars).'); return; }
        setCcSubmitting(true);
        try {
            const payload: any = { text: ccText.trim(), department: 'Customer Care' };
            if (ccCategory) payload.category = ccCategory.trim();
            if (ccWard) payload.wardNumber = ccWard.trim();
            await api.post('/complaints', payload);
            alert('Your message has been sent to Customer Care.');
            setShowContactCC(false);
            fetchComplaints();
        } catch (err) {
            console.error('Failed to contact customer care', err);
            alert('Failed to send.');
        } finally { setCcSubmitting(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top left, #eff6ff 0%, #f8fafc 36%, #eef2ff 100%)',
            padding: '24px 0 48px'
        }}>
            <div className="container">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 p-4 rounded-4 shadow-sm"
                     style={{
                         background: 'linear-gradient(135deg, rgba(17,24,39,0.94), rgba(30,41,59,0.92))',
                         color: '#fff',
                         border: '1px solid rgba(255,255,255,0.08)'
                     }}>
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2" style={{ opacity: 0.9, fontSize: 13 }}>
                            <Sparkles size={16} />
                            <span>Citizen Service Portal</span>
                        </div>
                        <h2 className="mb-1 fw-bold" style={{ letterSpacing: '-0.03em' }}>{t('Citizen Dashboard')}</h2>
                        <div style={{ maxWidth: 760, opacity: 0.72, fontSize: 14 }}>
                            File a complaint in a guided flow, track status, and use AI preview to understand how the request will be classified.
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-light d-inline-flex align-items-center" onClick={() => { setShowContactCC(true); setCcText(''); setCcCategory(''); setCcWard(''); }}>
                            <Headphones size={18} className="me-2" /> Contact Customer Care
                        </button>
                        <button className="btn btn-light d-inline-flex align-items-center" onClick={toggleLanguage}>
                            <Globe size={18} className="me-2" /> {i18n.language === 'en' ? 'ಕನ್ನಡ' : 'English'}
                        </button>
                        <button className="btn btn-outline-light d-inline-flex align-items-center" onClick={handleLogout}>
                            <LogOut size={18} className="me-2" /> {t('Logout')}
                        </button>
                    </div>
                </div>

                <div className="row g-4 align-items-start">
                    <div className="col-lg-5">
                        <div className="card border-0 shadow-lg rounded-4 overflow-hidden position-sticky" style={{ top: 24 }}>
                            <div className="card-header border-0 text-white p-4" style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                                <div className="d-flex align-items-center gap-2">
                                    <PlusCircle size={20} />
                                    <div>
                                        <div className="fw-bold">{t('Submit New Complaint')}</div>
                                        <div style={{ fontSize: 12, opacity: 0.85 }}>Shortest path to file a grievance</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary d-flex align-items-center gap-2">
                                            <CheckCircle2 size={16} className="text-success" />
                                            Complaint Type
                                        </label>
                                        <select
                                            className="form-select bg-light"
                                            value={issueType}
                                            onChange={e => handleIssueTypeChange(e.target.value)}
                                        >
                                            <option value="">Select the issue type</option>
                                            {ISSUE_TYPES.map(item => (
                                                <option key={item.label} value={item.label}>{item.label}</option>
                                            ))}
                                        </select>
                                        <div className="form-text">This helps prefill the department and makes filing faster.</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary">{t('Department')}</label>
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
                                        <div className="form-text">
                                            If unsure, keep this blank and the system will infer the department from your complaint text.
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary">{t('Description')}</label>
                                        <textarea
                                            className="form-control bg-light"
                                            rows={4}
                                            value={text}
                                            onChange={e => setText(e.target.value)}
                                            required
                                            placeholder={issueType ? ISSUE_TYPES.find(item => item.label === issueType)?.hint || t('Describe the issue...') : t('Describe the issue...')}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary d-flex align-items-center">
                                            <MapPin size={16} className="me-1" /> {t('Location')}
                                        </label>
                                        <div className="input-group">
                                            <input type="text" className="form-control bg-light" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('e.g. MG Road, Indiranagar')} />
                                            <button type="button" className="btn btn-outline-secondary" onClick={fillCurrentLocation} disabled={isLocating}>
                                                {isLocating ? 'Locating...' : 'Use current'}
                                            </button>
                                        </div>
                                        <div className="form-text">Optional: use GPS or click the map to auto-fill coordinates.</div>
                                    </div>

                                    <div className="row mb-3 gx-2">
                                        <div className="col">
                                            <label className="form-label fw-medium text-secondary" style={{fontSize: '0.85rem'}}>{t('Latitude (opt)')}</label>
                                            <input type="number" step="any" className="form-control bg-light shadow-sm" value={latitude} onChange={e => setLatitude(e.target.value ? parseFloat(e.target.value) : '')} placeholder="12.9716" />
                                        </div>
                                        <div className="col">
                                            <label className="form-label fw-medium text-secondary" style={{fontSize: '0.85rem'}}>{t('Longitude (opt)')}</label>
                                            <input type="number" step="any" className="form-control bg-light shadow-sm" value={longitude} onChange={e => setLongitude(e.target.value ? parseFloat(e.target.value) : '')} placeholder="77.5946" />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary d-flex align-items-center gap-2">
                                            <MapPin size={16} className="text-primary" /> {t('Pin Location on Map')}
                                        </label>
                                        <div style={{ height: '220px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #dee2e6' }} className="shadow-sm">
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
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary d-flex align-items-center">
                                            <Upload size={16} className="me-1" /> {t('Image URL (optional)')}
                                        </label>
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
                                                {isUploading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        </div>
                                        <div className="form-text">You can paste an image URL or pick a file. If a file is selected, it will be posted with the complaint.</div>
                                        {imageFile && (
                                            <div className="small text-secondary mt-2">
                                                Selected file: <span className="fw-semibold text-dark">{imageFile.name}</span>
                                            </div>
                                        )}
                                        {imageOriginalName && imageUrl && (
                                            <div className="small text-success mt-2">
                                                Attached image: <span className="fw-semibold">{imageOriginalName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="row mb-3 gx-2">
                                        <div className="col">
                                            <label className="form-label fw-medium text-secondary">{t('BBMP Zone')}</label>
                                            <select className="form-select bg-light" value={bbmpZone} onChange={e => setBbmpZone(e.target.value)}>
                                                <option value="">{t('Select Zone')}</option>
                                                {['North', 'South', 'East', 'West', 'Central'].map(zone => (
                                                    <option key={zone} value={zone}>{zone}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col">
                                            <label className="form-label fw-medium text-secondary">{t('Ward No.')}</label>
                                            <input type="text" className="form-control bg-light" value={wardNumber} onChange={e => setWardNumber(e.target.value)} placeholder={t('e.g. 150')} />
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-4 mb-3" style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', border: '1px solid #dbeafe' }}>
                                        <div className="d-flex align-items-center mb-1">
                                            <ShieldAlert size={16} className="text-info me-2" />
                                            <strong>Device ID:</strong> <span className="ms-1 text-dark text-monospace">{deviceId}</span>
                                        </div>
                                        <div className="text-secondary" style={{ fontSize: 12 }}>{t('Identity attached for Sanchar Saathi Protocol')}</div>
                                    </div>

                                    <div className="d-flex align-items-start gap-2 p-3 rounded-4 mb-4" style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.12)' }}>
                                        <ChevronRight size={18} className="text-primary mt-1 flex-shrink-0" />
                                        <div style={{ fontSize: 13, color: '#334155' }}>
                                            The ML model will classify the complaint category and priority automatically after submission.
                                        </div>
                                    </div>

                                    {(aiPreview || aiLoading) && (
                                        <div className="mb-3 p-3 rounded-4" style={{ background: 'linear-gradient(135deg, #ede9fe, #e0f2fe)', border: '1px solid #c4b5fd' }}>
                                            <div className="d-flex align-items-center mb-2" style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>
                                                <span style={{ marginRight: 6 }}>&#x1F916;</span> AI Preview {aiLoading && <span className="ms-2 spinner-border spinner-border-sm text-primary" role="status" />}
                                            </div>
                                            {aiPreview && !aiLoading && (
                                                <>
                                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                                        <span className="badge" style={{ background: '#4f46e5', color: '#fff', fontSize: 12, padding: '5px 10px' }}>Category: {aiPreview.category}</span>
                                                        <span className="badge" style={{ background: aiPreview.priority === 'HIGH' ? '#ef4444' : aiPreview.priority === 'MEDIUM' ? '#f59e0b' : '#64748b', color: '#fff', fontSize: 12, padding: '5px 10px' }}>Priority: {aiPreview.priority}</span>
                                                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 12, padding: '5px 10px' }}>Confidence: {(aiPreview.confidence * 100).toFixed(1)}%</span>
                                                    </div>
                                                    {aiPreview.ranked_categories.length > 1 && (
                                                        <div style={{ fontSize: 11, color: '#475569' }}>
                                                            <span className="fw-medium">Also could be: </span>
                                                            {aiPreview.ranked_categories.slice(1, 3).map(rc => (
                                                                <span key={rc.category} className="me-2">{rc.category} ({(rc.score * 100).toFixed(0)}%)</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {Object.keys(aiPreview.shap_values).length > 0 && (
                                                        <div className="mt-2" style={{ fontSize: 11, color: '#475569' }}>
                                                            <span className="fw-medium">Key words: </span>
                                                            {Object.entries(aiPreview.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5).map(([w, s]) => (
                                                                <span key={w} className="badge me-1" style={{ background: s > 0 ? '#dcfce7' : '#fee2e2', color: s > 0 ? '#166534' : '#991b1b', fontSize: 10 }}>{w}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                <button type="submit" className="btn btn-primary w-100 fw-bold py-3 rounded-3 shadow-sm">{t('Submit Complaint')}</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="col-lg-7">
                    <div className="row g-3 mb-4">
                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <div className="text-muted small text-uppercase fw-semibold">Total</div>
                                    <div className="fs-3 fw-bold">{complaintCounts.total}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <div className="text-muted small text-uppercase fw-semibold">Pending</div>
                                    <div className="fs-3 fw-bold text-warning">{complaintCounts.pending}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <div className="text-muted small text-uppercase fw-semibold">In Progress</div>
                                    <div className="fs-3 fw-bold text-primary">{complaintCounts.inProgress}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <div className="text-muted small text-uppercase fw-semibold">Resolved</div>
                                    <div className="fs-3 fw-bold text-success">{complaintCounts.resolved}</div>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                {visibleComplaints.filter(c => c.latitude && c.longitude).map(c => (
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
                        <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2 fw-bold text-dark">
                            <div className="d-flex align-items-center">
                                <History size={20} className="me-2 text-primary" /> {t('My Complaints List')}
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                <input
                                    type="search"
                                    className="form-control form-control-sm"
                                    style={{ minWidth: 180 }}
                                    placeholder="Search complaints"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                <select
                                    className="form-select form-select-sm"
                                    style={{ minWidth: 160 }}
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                                >
                                    <option value="ALL">All statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In progress</option>
                                    <option value="RESOLVED">Resolved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>
                                    Reset
                                </button>
                            </div>
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
                                            <th>Workflow</th>
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
                                        {visibleComplaints.length === 0 ? (
                                            <tr><td colSpan={12} className="text-center py-4 text-muted">No complaints found.</td></tr>
                                        ) : visibleComplaints.map(c => (
                                            <tr key={c.id}>
                                                   <td className="ps-4 fw-medium">#{c.id}</td>
                                                   <td className="text-truncate" style={{maxWidth: "200px"}} title={c.text}>{c.text}</td>
                                                   <td>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>{c.category || 'Pending NLP'}</div>
                                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>&#x1F916; ML Classified</div>
                                                    </td>
                                                   <td><span className="badge bg-light text-dark border">{c.department || 'Unassigned'}</span></td>
                                                   <td style={{ minWidth: 180 }}>
                                                       {renderWorkflowSummary(c)}
                                                   </td>
                                                   <td>
                                                       <span className={`badge ${c.priority === 'HIGH' ? 'bg-danger' : c.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                           {c.priority || 'MEDIUM'}
                                                       </span>
                                                       <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>&#x26A1; ML Priority</div>
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
                                                           <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle">&#x2713; Verified</span>
                                                       )}
                                                   </td>
                                                   <td className="text-secondary" style={{fontSize: "0.9rem"}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                                                   <td>
                                                       <div style={{ maxWidth: '230px' }}>
                                                           {c.shapInterpretations ? (
                                                               <>
                                                                   <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>XAI — Why this category?</div>
                                                                   <div className="bg-light p-2 rounded">
                                                                       <ShapTokens raw={c.shapInterpretations} maxTokens={6} emptyText="No XAI data" />
                                                                   </div>
                                                               </>
                                                           ) : (
                                                               <span className="text-muted" style={{ fontSize: 11 }}>No XAI data — re-submit to generate</span>
                                                           )}
                                                       </div>
                                                   </td>
                                                   <td className="pe-4">
                                                       <button type="button" className="btn btn-sm btn-light text-primary fw-medium border shadow-sm d-flex align-items-center" onClick={() => fetchHistory(c.id)}>
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
                                                               <button type="button" className="btn btn-sm btn-outline-success" onClick={() => submitFeedback(c.id)}>Submit Feedback</button>
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

            {/* Contact Customer Care Modal */}
            {showContactCC && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card w-75 max-h-75 overflow-auto border-0 shadow-lg p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Contact Customer Care</h5>
                            <button className="btn-close" onClick={() => setShowContactCC(false)}></button>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Message</label>
                            <textarea className="form-control" rows={4} value={ccText} onChange={e => setCcText(e.target.value)} placeholder="Describe your issue or query" />
                        </div>
                        <div className="row g-2 mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Category (optional)</label>
                                <input className="form-control" value={ccCategory} onChange={e => setCcCategory(e.target.value)} placeholder="e.g., Streetlights" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Ward number (optional)</label>
                                <input className="form-control" value={ccWard} onChange={e => setCcWard(e.target.value)} placeholder="e.g., 12" />
                            </div>
                        </div>
                        <div className="d-flex justify-content-end">
                            <button className="btn btn-secondary me-2" onClick={() => setShowContactCC(false)} disabled={ccSubmitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={submitToCustomerCare} disabled={ccSubmitting}>{ccSubmitting ? 'Sending...' : 'Send to Customer Care'}</button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default UserDashboard;
