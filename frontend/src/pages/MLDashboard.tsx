import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend, LineChart, Line } from 'recharts';
import { Brain, CheckCircle, Activity, ArrowLeft, Cpu, Target, Zap, Shield, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:5000';

interface MetricsData {
  accuracy?: number;
  f1_macro?: number;
  f1_weighted?: number;
  roc_auc?: number;
  train_rows?: number;
  test_rows?: number;
  model_type?: string;
  class_weight?: string;
  tfidf?: { ngram_max: number; min_df: number; max_features: number | null };
  hyperparams?: { C: number; max_iter: number };
  labels?: string[];
  classification_report?: Record<string, { precision: number; recall: number; 'f1-score': number; support: number }>;
  priority_report?: Record<string, { precision: number; recall: number; 'f1-score': number; support: number }>;
  roc_curve?: {
    macro_auc?: number | null;
    micro?: { fpr: number[]; tpr: number[]; auc: number };
    per_class?: Record<string, { fpr: number[]; tpr: number[]; auc: number }>;
  };
  bert?: { enabled: boolean; model_name: string; accuracy?: number };
}

interface HealthData {
  status: string;
  model_loaded: boolean;
  bert_loaded: boolean;
}

interface PredictResult {
  category: string;
  confidence: number;
  priority: string;
  priority_confidence: number;
  ranked_categories: { category: string; score: number }[];
  shap_values: Record<string, number>;
  model_used: string;
}

interface CustomTestRow {
  id: number;
  text: string;
  expectedCategory?: string;
  expectedPriority?: string;
  prediction?: PredictResult;
  status: 'pending' | 'matched' | 'partial' | 'mismatch' | 'invalid';
  error?: string;
}

interface CustomTestInputRow {
  id: number;
  text: string;
  expectedCategory?: string;
  expectedPriority?: string;
}

interface CustomTestSummary {
  total: number;
  evaluated: number;
  categoryEvaluated: number;
  priorityEvaluated: number;
  categoryMatches: number;
  priorityMatches: number;
  exactMatches: number;
}

const MLDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricsData>({});
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('There is a large pothole on MG Road near the signal, causing accidents.');
  const [prediction, setPrediction] = useState<PredictResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');
  const [customTestText, setCustomTestText] = useState(
    [
      'There is a large pothole on MG Road near the signal, causing accidents. || Roads & Traffic || HIGH',
      'Garbage has not been collected in our street for three days. || Waste Management || MEDIUM',
      'Street lights are off near the park and the area is dark at night. || Streetlights || HIGH'
    ].join('\n')
  );
  const [customTestRows, setCustomTestRows] = useState<CustomTestRow[]>([]);
  const [customSummary, setCustomSummary] = useState<CustomTestSummary | null>(null);
  const [customTesting, setCustomTesting] = useState(false);
  const [customError, setCustomError] = useState('');
  const autoValidated = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, hRes] = await Promise.allSettled([
          axios.get(`${ML_URL}/metrics`),
          axios.get(`${ML_URL}/health`),
        ]);
        if (mRes.status === 'fulfilled') setMetrics(mRes.value.data.metrics || {});
        if (hRes.status === 'fulfilled') setHealth(hRes.value.data);
      } catch {
        setError('Could not reach ML service.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (loading || predicting || prediction || autoValidated.current) {
      return;
    }
    if (health?.status === 'healthy' && metrics.accuracy != null) {
      autoValidated.current = true;
      void runPrediction();
    }
  }, [loading, predicting, prediction, health?.status, metrics.accuracy]);

  const runPrediction = async () => {
    if (!testText.trim()) return;
    setPredicting(true);
    setPrediction(null);
    try {
      const res = await axios.post(`${ML_URL}/predict`, { text: testText });
      setPrediction(res.data);
    } catch {
      setError('Prediction failed. Is the ML service running?');
    } finally {
      setPredicting(false);
    }
  };

  const parseCustomTestRows = (raw: string): CustomTestInputRow[] => {
    return raw
      .split(/\r?\n/)
      .map((line, index): CustomTestInputRow | null => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          return null;
        }

        const parts = trimmed.split('||').map((part) => part.trim()).filter(Boolean);
        if (parts.length === 0) {
          return null;
        }

        return {
          id: index + 1,
          text: parts[0],
          expectedCategory: parts[1] || undefined,
          expectedPriority: parts[2] || undefined,
        };
      })
      .filter((row): row is CustomTestInputRow => row !== null && row.text.length > 0);
  };

  const runCustomEvaluation = async () => {
    const rows = parseCustomTestRows(customTestText);
    if (!rows.length) {
      setCustomError('Add at least one sample in the format: text || expected category || expected priority');
      setCustomTestRows([]);
      setCustomSummary(null);
      return;
    }

    setCustomTesting(true);
    setCustomError('');
    setCustomSummary(null);
    setCustomTestRows(
      rows.map((row) => ({
        ...row,
        status: 'pending',
      }))
    );

    let categoryMatches = 0;
    let priorityMatches = 0;
    let exactMatches = 0;
    let evaluated = 0;
    let categoryEvaluated = 0;
    let priorityEvaluated = 0;

    const results: CustomTestRow[] = [];
    for (const row of rows) {
      try {
        const res = await axios.post(`${ML_URL}/predict`, { text: row.text });
        const predictionResult = res.data as PredictResult;
        const categoryOk = row.expectedCategory
          ? predictionResult.category?.trim().toLowerCase() === row.expectedCategory.trim().toLowerCase()
          : true;
        const priorityOk = row.expectedPriority
          ? predictionResult.priority?.trim().toLowerCase() === row.expectedPriority.trim().toLowerCase()
          : true;
        const exactOk = categoryOk && priorityOk;

        if (row.expectedCategory) {
          categoryEvaluated += 1;
          categoryMatches += categoryOk ? 1 : 0;
        }
        if (row.expectedPriority) {
          priorityEvaluated += 1;
          priorityMatches += priorityOk ? 1 : 0;
        }
        if ((row.expectedCategory || row.expectedPriority) && exactOk) {
          exactMatches += 1;
        }
        if (row.expectedCategory || row.expectedPriority) {
          evaluated += 1;
        }

        results.push({
          ...row,
          prediction: predictionResult,
          status: row.expectedCategory || row.expectedPriority
            ? exactOk
              ? 'matched'
              : categoryOk || priorityOk
                ? 'partial'
                : 'mismatch'
            : 'matched',
        });
      } catch (err) {
        results.push({
          ...row,
          status: 'invalid',
          error: 'Prediction failed',
        });
      }
      setCustomTestRows([...results]);
    }

    setCustomSummary({
      total: rows.length,
      evaluated,
      categoryEvaluated,
      priorityEvaluated,
      categoryMatches,
      priorityMatches,
      exactMatches,
    });
    setCustomTesting(false);
  };

  const acc = metrics.accuracy != null ? (metrics.accuracy * 100).toFixed(2) : null;
  const priAcc =
    (metrics.priority_report as unknown as { accuracy?: number } | undefined)?.accuracy != null
      ? (((metrics.priority_report as unknown as { accuracy: number }).accuracy) * 100).toFixed(2)
      : null;
  const f1 = metrics.f1_macro != null ? (metrics.f1_macro * 100).toFixed(2) : null;

  // Per-class bar data
  const classReport = metrics.classification_report || {};
  const perClassData = Object.entries(classReport)
    .filter(([k]) => !['accuracy', 'macro avg', 'weighted avg'].includes(k))
    .map(([label, v]) => ({
      name: label.length > 18 ? label.slice(0, 16) + '…' : label,
      fullName: label,
      precision: Math.round((v.precision || 0) * 100),
      recall: Math.round((v.recall || 0) * 100),
      f1: Math.round(((v['f1-score'] || 0)) * 100),
    }));

  const radialData = [
    { name: 'Category Accuracy', value: acc ? parseFloat(acc) : 0, fill: '#4f46e5' },
    { name: 'Priority Accuracy', value: priAcc ? parseFloat(priAcc) : 0, fill: '#06b6d4' },
    { name: 'F1 Macro', value: f1 ? parseFloat(f1) : 0, fill: '#10b981' },
  ];

  const rocMicro = metrics.roc_curve?.micro;
  const rocChartData = rocMicro?.fpr && rocMicro?.tpr
    ? rocMicro.fpr.map((fpr, index) => ({ fpr, tpr: rocMicro.tpr[index] ?? 0, baseline: fpr }))
    : [];

  const shapEntries = prediction?.shap_values
    ? Object.entries(prediction.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10)
    : [];
  const modelLabel = health?.bert_loaded ? 'MiniLM + LR' : 'TF-IDF + LR';

  const validationChecks = [
    { label: 'ML service health endpoint', value: health?.status === 'healthy', detail: health?.status === 'healthy' ? 'Online' : 'Offline' },
    { label: 'Model artifact loaded', value: Boolean(health?.model_loaded), detail: health?.model_loaded ? 'TF-IDF classifier active' : 'Fallback mode' },
    { label: 'Hold-out evaluation metrics', value: Boolean(metrics.accuracy != null), detail: metrics.test_rows != null ? `${metrics.test_rows.toLocaleString()} test rows` : 'No metrics loaded' },
    { label: 'Real-time prediction sandbox', value: Boolean(prediction), detail: prediction ? 'Prediction executed' : 'Run a sample complaint' },
    { label: 'Own-data batch evaluation', value: Boolean(customSummary), detail: customSummary ? `${customSummary.total} custom samples tested` : 'Paste your own data and run it' },
    {
      label: health?.bert_loaded ? 'BERT inference active' : 'Explainability output',
      value: health?.bert_loaded ? true : Boolean(shapEntries.length > 0),
      detail: health?.bert_loaded ? 'MiniLM embeddings loaded' : (shapEntries.length > 0 ? 'SHAP tokens rendered' : 'No SHAP values yet'),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <Brain size={28} color="#818cf8" />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>ML Validation & Verification</h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>TF-IDF + Logistic Regression · Grievance Classification</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: health?.status === 'healthy' ? '#10b981' : '#ef4444', boxShadow: health?.status === 'healthy' ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
          <span style={{ fontSize: 13, opacity: 0.8 }}>{health?.status === 'healthy' ? 'ML Service Online' : 'Service Offline'}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="#f87171" /> <span style={{ color: '#f87171' }}>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.6 }}>
            <Activity size={40} style={{ marginBottom: 12 }} />
            <p>Loading ML metrics…</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
              {[
                { label: 'Category Accuracy', value: acc ? `${acc}%` : 'N/A', icon: <Target size={24} />, color: '#818cf8', sub: `${metrics.test_rows?.toLocaleString() || 0} test samples` },
                { label: 'Priority Accuracy', value: priAcc ? `${priAcc}%` : 'N/A', icon: <Zap size={24} />, color: '#34d399', sub: 'HIGH / MEDIUM / LOW' },
                { label: 'F1 Score (Macro)', value: f1 ? `${f1}%` : 'N/A', icon: <CheckCircle size={24} />, color: '#60a5fa', sub: 'Across all categories' },
                { label: 'Training Dataset', value: metrics.train_rows?.toLocaleString() || 'N/A', icon: <Cpu size={24} />, color: '#f472b6', sub: 'Civic grievance records' },
                { label: 'Model Type', value: modelLabel, icon: <Brain size={24} />, color: '#fb923c', sub: metrics.model_type || 'logistic' },
                { label: 'Model Status', value: health?.bert_loaded ? 'BERT Active' : health?.model_loaded ? 'TF-IDF Active' : 'Fallback', icon: <Shield size={24} />, color: health?.model_loaded ? '#34d399' : '#f87171', sub: health?.bert_loaded ? 'MiniLM embeddings are active' : 'TF-IDF is the active model' },
              ].map((kpi, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s' }}>
                  <div style={{ color: kpi.color, marginBottom: 8 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 2 }}>{kpi.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{kpi.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Radial + Per-class charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>📊 Score Overview</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <RadialBarChart innerRadius="30%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={4} label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }} />
                    <Legend iconSize={10} layout="vertical" verticalAlign="bottom" />
                    <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(2)}%`} contentStyle={{ background: '#1e1e3f', border: 'none', borderRadius: 8, color: '#fff' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>📈 Per-Class Precision / Recall / F1</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={perClassData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[80, 100]} />
                    <Tooltip contentStyle={{ background: '#1e1e3f', border: 'none', borderRadius: 8, color: '#fff' }} formatter={(v) => `${Number(v ?? 0)}%`} />
                    <Bar dataKey="precision" name="Precision %" fill="#818cf8" radius={[3,3,0,0]} />
                    <Bar dataKey="recall" name="Recall %" fill="#34d399" radius={[3,3,0,0]} />
                    <Bar dataKey="f1" name="F1 %" fill="#60a5fa" radius={[3,3,0,0]} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-class table */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>📋 Detailed Classification Report</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {['Category', 'Precision', 'Recall', 'F1-Score', 'Support'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', opacity: 0.5, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(classReport)
                      .filter(([k]) => !['accuracy', 'macro avg', 'weighted avg'].includes(k))
                      .map(([label, v]) => (
                        <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{label}</td>
                          {(['precision', 'recall', 'f1-score'] as const).map(m => (
                            <td key={m} style={{ padding: '10px 12px' }}>
                              <span style={{ color: (v[m] || 0) >= 0.99 ? '#34d399' : (v[m] || 0) >= 0.95 ? '#60a5fa' : '#f87171', fontWeight: 700 }}>
                                {((v[m] || 0) * 100).toFixed(2)}%
                              </span>
                            </td>
                          ))}
                          <td style={{ padding: '10px 12px', opacity: 0.6 }}>{v.support?.toLocaleString()}</td>
                        </tr>
                      ))}
                    {['macro avg', 'weighted avg'].map(avg => classReport[avg] && (
                      <tr key={avg} style={{ borderTop: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, opacity: 0.7 }}>{avg}</td>
                        {(['precision', 'recall', 'f1-score'] as const).map(m => (
                          <td key={m} style={{ padding: '10px 12px', fontWeight: 700, opacity: 0.8 }}>
                            {((classReport[avg][m] || 0) * 100).toFixed(2)}%
                          </td>
                        ))}
                        <td style={{ padding: '10px 12px', opacity: 0.6 }}>{classReport[avg].support?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model config */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>⚙️ Model Configuration</h3>
                {[
                  ['Classifier', modelLabel],
                  ['Class Weight', metrics.class_weight || 'balanced'],
                  ['N-gram Range', `1–${metrics.tfidf?.ngram_max ?? 2}`],
                  ['Min Doc Freq', String(metrics.tfidf?.min_df ?? 2)],
                  ['Max Features', metrics.tfidf?.max_features ? String(metrics.tfidf.max_features) : 'Unlimited'],
                  ['Regularization C', String(metrics.hyperparams?.C ?? 1.0)],
                  ['Max Iterations', String(metrics.hyperparams?.max_iter ?? 2000)],
                  ['BERT Enabled', metrics.bert?.enabled ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                    <span style={{ opacity: 0.6 }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>🎯 Priority Classification Report</h3>
                {metrics.priority_report && Object.entries(metrics.priority_report)
                  .filter(([k]) => ['HIGH', 'MEDIUM', 'LOW'].includes(k))
                  .map(([label, v]) => (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: label === 'HIGH' ? '#f87171' : label === 'MEDIUM' ? '#fbbf24' : '#60a5fa' }}>{label}</span>
                        <span style={{ fontSize: 13, opacity: 0.7 }}>F1: {((v['f1-score'] || 0) * 100).toFixed(2)}%</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${(v['f1-score'] || 0) * 100}%`, height: '100%', background: label === 'HIGH' ? '#f87171' : label === 'MEDIUM' ? '#fbbf24' : '#60a5fa', borderRadius: 6 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, opacity: 0.6 }}>
                        <span>P: {((v.precision || 0) * 100).toFixed(2)}%</span>
                        <span>R: {((v.recall || 0) * 100).toFixed(2)}%</span>
                        <span>Support: {v.support?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Verification summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 24, marginBottom: 32 }}>
              <div style={{ background: 'rgba(16,185,129,0.12)', borderRadius: 16, padding: 24, border: '1px solid rgba(16,185,129,0.35)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>✅ Verification Checklist</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.7 }}>
                  This page exposes the evidence used to verify the ML subsystem before the complaint workflow is accepted as working.
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {validationChecks.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{item.detail}</div>
                      </div>
                      <div style={{ minWidth: 72, textAlign: 'right', fontWeight: 800, color: item.value ? '#34d399' : '#f87171' }}>
                        {item.value ? 'PASS' : 'FAIL'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(59,130,246,0.12)', borderRadius: 16, padding: 24, border: '1px solid rgba(59,130,246,0.35)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📎 Validation Artifacts</h3>
                <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                  {[
                    ['Category accuracy', acc ? `${acc}%` : 'N/A'],
                    ['Priority accuracy', priAcc ? `${priAcc}%` : 'N/A'],
                    ['Macro F1', f1 ? `${f1}%` : 'N/A'],
                    ['Training rows', metrics.train_rows?.toLocaleString() || 'N/A'],
                    ['Test rows', metrics.test_rows?.toLocaleString() || 'N/A'],
                    ['Report file', 'artifacts/per_class_report.csv'],
                    ['Confusion matrix', 'artifacts/confusion_matrix.png'],
                    ['SHAP background', 'artifacts/shap_background.json'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ opacity: 0.68 }}>{label}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ROC Curve */}
            <div style={{ background: 'rgba(244,114,182,0.12)', borderRadius: 16, padding: 24, border: '1px solid rgba(244,114,182,0.35)', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📉 ROC Curve</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.7 }}>
                    One-vs-rest validation for the category classifier.
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>ROC AUC: {metrics.roc_curve?.macro_auc != null ? metrics.roc_curve.macro_auc.toFixed(4) : metrics.roc_auc != null ? metrics.roc_auc.toFixed(4) : 'N/A'}</div>
                  <div style={{ opacity: 0.65 }}>Micro average curve</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rocChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={(v) => Number(v).toFixed(1)} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis dataKey="tpr" type="number" domain={[0, 1]} tickFormatter={(v) => Number(v).toFixed(1)} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e1e3f', border: 'none', borderRadius: 8, color: '#fff' }} formatter={(v) => `${(Number(v ?? 0) * 100).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="tpr" stroke="#f472b6" dot={false} strokeWidth={3} name="ROC Curve" />
                  <Line type="monotone" dataKey="baseline" stroke="rgba(255,255,255,0.35)" dot={false} strokeDasharray="5 5" name="Random Baseline" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Live Prediction Sandbox */}
            <div style={{ background: 'rgba(79,70,229,0.15)', borderRadius: 16, padding: 28, border: '1px solid rgba(79,70,229,0.4)', marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>🧪 Live Prediction Sandbox — Validation</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.6 }}>Type any civic complaint and validate the ML model's real-time classification and explanation output.</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <textarea
                  value={testText}
                  onChange={e => setTestText(e.target.value)}
                  rows={3}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, resize: 'vertical', outline: 'none' }}
                  placeholder="Describe a civic issue…"
                />
                <button
                  onClick={runPrediction}
                  disabled={predicting}
                  style={{ background: '#4f46e5', border: 'none', color: '#fff', borderRadius: 10, padding: '0 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14, minWidth: 120, opacity: predicting ? 0.6 : 1 }}
                >
                  {predicting ? 'Running…' : '▶ Predict'}
                </button>
              </div>

              {prediction && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Predicted Category</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#818cf8' }}>{prediction.category}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Confidence: {(prediction.confidence * 100).toFixed(1)}%</div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${prediction.confidence * 100}%`, height: '100%', background: '#818cf8', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>Model: {prediction.model_used}</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Priority</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: prediction.priority === 'HIGH' ? '#f87171' : prediction.priority === 'MEDIUM' ? '#fbbf24' : '#60a5fa' }}>
                      {prediction.priority}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Confidence: {(prediction.priority_confidence * 100).toFixed(1)}%</div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>Top Ranked:</div>
                      {prediction.ranked_categories.slice(0, 3).map(rc => (
                        <div key={rc.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span style={{ opacity: 0.7 }}>{rc.category.slice(0, 22)}</span>
                          <span style={{ color: '#34d399' }}>{(rc.score * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>SHAP Word Influence</div>
                    {shapEntries.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.4 }}>SHAP not available (BERT mode)</div>
                    ) : shapEntries.map(([word, score]) => (
                      <div key={word} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 12, minWidth: 80, color: score > 0 ? '#34d399' : '#f87171' }}>{word}</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(Math.abs(score) * 500, 100)}%`, height: '100%', background: score > 0 ? '#34d399' : '#f87171', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, opacity: 0.5, minWidth: 36, textAlign: 'right' }}>{score.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Own Data Batch Evaluation */}
            <div style={{ background: 'rgba(16,185,129,0.14)', borderRadius: 16, padding: 28, border: '1px solid rgba(16,185,129,0.35)', marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>🧪 Own Data Batch Test</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.6 }}>
                Paste your own complaint samples to validate the model beyond the built-in test split. Format each line as:
                <br />
                <code>text || expected category || expected priority</code>
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
                <textarea
                  value={customTestText}
                  onChange={(e) => setCustomTestText(e.target.value)}
                  rows={6}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, resize: 'vertical', outline: 'none' }}
                  placeholder="Street light not working near the park || Streetlights || HIGH"
                />
                <button
                  onClick={runCustomEvaluation}
                  disabled={customTesting}
                  style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: 10, padding: '0 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14, minWidth: 140, opacity: customTesting ? 0.6 : 1 }}
                >
                  {customTesting ? 'Testing…' : '▶ Test Own Data'}
                </button>
              </div>

              {customError && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                  {customError}
                </div>
              )}

              {customSummary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
                  {[
                    ['Total samples', customSummary.total],
                    ['Evaluated samples', customSummary.evaluated],
                    ['Category matches', customSummary.categoryMatches],
                    ['Priority matches', customSummary.priorityMatches],
                    ['Exact matches', customSummary.exactMatches],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              )}

              {customSummary && (
                <div style={{ marginBottom: 16, fontSize: 13, opacity: 0.8 }}>
                  Category accuracy: {customSummary.categoryEvaluated > 0 ? `${((customSummary.categoryMatches / customSummary.categoryEvaluated) * 100).toFixed(1)}%` : 'N/A'}
                  {'  '}| Priority accuracy: {customSummary.priorityEvaluated > 0 ? `${((customSummary.priorityMatches / customSummary.priorityEvaluated) * 100).toFixed(1)}%` : 'N/A'}
                  {'  '}| Exact match rate: {customSummary.evaluated > 0 ? `${((customSummary.exactMatches / customSummary.evaluated) * 100).toFixed(1)}%` : 'N/A'}
                </div>
              )}

              {customTestRows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                        {['Sample', 'Expected', 'Predicted', 'Priority', 'Result'].map((heading) => (
                          <th key={heading} style={{ textAlign: 'left', padding: '8px 12px', opacity: 0.55, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customTestRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 12px', maxWidth: 420 }}>
                            <div style={{ whiteSpace: 'normal', lineHeight: 1.4, opacity: 0.95 }}>{row.text}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div>{row.expectedCategory || 'N/A'}</div>
                            <div style={{ fontSize: 11, opacity: 0.55 }}>{row.expectedPriority || 'Any priority'}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#93c5fd' }}>{row.prediction?.category || 'Pending'}</div>
                            <div style={{ fontSize: 11, opacity: 0.55 }}>
                              {(row.prediction?.confidence != null ? (row.prediction.confidence * 100).toFixed(1) : '0.0')}%
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: row.prediction?.priority === 'HIGH' ? '#f87171' : row.prediction?.priority === 'MEDIUM' ? '#fbbf24' : '#60a5fa' }}>
                              {row.prediction?.priority || 'Pending'}
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.55 }}>
                              {(row.prediction?.priority_confidence != null ? (row.prediction.priority_confidence * 100).toFixed(1) : '0.0')}%
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontWeight: 800,
                                fontSize: 11,
                                background:
                                  row.status === 'matched'
                                    ? 'rgba(16,185,129,0.22)'
                                    : row.status === 'partial'
                                      ? 'rgba(250,204,21,0.22)'
                                      : row.status === 'invalid'
                                        ? 'rgba(239,68,68,0.22)'
                                        : 'rgba(255,255,255,0.12)',
                                color:
                                  row.status === 'matched'
                                    ? '#34d399'
                                    : row.status === 'partial'
                                      ? '#fbbf24'
                                      : row.status === 'invalid'
                                        ? '#f87171'
                                        : '#e2e8f0',
                              }}
                            >
                              {row.status.toUpperCase()}
                            </span>
                            {row.error && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>{row.error}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MLDashboard;
