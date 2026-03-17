import { useState, useEffect } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import './App.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeModule, setActiveModule] = useState('welcome');
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/projects');
      setProjects(res.data);
    } catch (error) {
      console.error("Error fetching projects", error);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF first!");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('http://localhost:8000/api/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(response.data.data);
      setActiveProjectId(response.data.project_id);
      setActiveModule('dashboard');
      fetchProjects();
      setFile(null);
      // Fetch document_text so chat has context immediately after upload
      const projectRes = await axios.get(`http://localhost:8000/api/projects/${response.data.project_id}`);
      setDocumentText(projectRes.data.document_text || "");
    } catch (error) {
      alert("Analysis failed. Check Python logs.");
    } finally {
      setLoading(false);
    }
  };

  const loadPastProject = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:8000/api/projects/${id}`);
      setResults(res.data.data);
      setDocumentText(res.data.document_text || "");
      setActiveProjectId(id);
      setActiveModule('dashboard');
    } catch (error) {
      console.error("Error loading project", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await axios.delete(`http://localhost:8000/api/projects/${id}`);
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setResults(null);
        setActiveModule('welcome');
      }
      fetchProjects();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const exportToPDF = () => {
    const input = document.getElementById('dashboard-report');
    if (!input) return;
    html2canvas(input, { scale: 2, backgroundColor: "#0c0c0e" }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Risk_Report_${activeProjectId}.pdf`);
    });
  };

  const [isBotTyping, setIsBotTyping] = useState(false);

  // --- CHAT LOGIC ---
  useEffect(() => {
    if (activeModule === 'chat' && activeProjectId) {
      loadChatHistory(activeProjectId);
    }
  }, [activeModule, activeProjectId]);

  const loadChatHistory = async (id) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/projects/${id}/chat`);
      setChatHistory(res.data);
    } catch (error) { console.error(error); }
  };

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory, isBotTyping]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setIsBotTyping(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/projects/${activeProjectId}/chat`, {
        question: currentInput,
        document_text: documentText,
        analysis_json: results ? JSON.stringify(results) : ""
      });
      setChatHistory(prev => [...prev, res.data]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Error connecting to the server.' }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  // --- UI RENDERERS ---
  const renderSidebar = () => (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Edge Risk</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="badge-pro">Enterprise</div>
          <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="sidebar-content">
        <button className="btn-new" onClick={() => { setActiveProjectId(null); setResults(null); setActiveModule('welcome'); }}>
          + New Analysis
        </button>
        <span className="section-label">Archive</span>
        {projects.map(proj => (
          <div key={proj.id} className={`project-item ${activeProjectId === proj.id ? 'active' : ''}`} onClick={() => loadPastProject(proj.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <span>📄</span>
              <span className="truncate">{proj.name}</span>
            </div>
            <button onClick={(e) => deleteProject(e, proj.id)} style={{ background: 'transparent', border: 'none', color: '#636770', cursor: 'pointer' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWelcomeScreen = () => (
    <div className="welcome-container animate-fade-in" style={{ height: 'auto', padding: '60px 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: '99px', color: '#14b8a6', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '24px' }}>
          ENTERPRISE RISK MANAGEMENT
        </div>
        <h1 className="welcome-title" style={{ fontSize: '56px', marginBottom: '24px' }}>Project Intelligence</h1>
        <p className="welcome-subtitle" style={{ fontSize: '20px', maxWidth: '600px', margin: '0 auto 48px auto' }}>
          Empower your PMO with Qwen 2.5. Upload status reports to instantly extract, quantify, and mitigate complex project threats.
        </p>
        <div className="upload-zone" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <label className="custom-file-upload">
            <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} hidden />
            <div className="upload-icon-circle">📂</div>
            <span style={{ fontWeight: '600', fontSize: '16px' }}>{file ? file.name : "Select PDF Project Report"}</span>
            {!file && <span style={{ fontSize: '13px', color: '#94a3b8' }}>Supports .pdf documents</span>}
          </label>
          <button className="btn-primary" onClick={handleUpload} disabled={loading || !file}>
            {loading ? "ANALYZING REPORT..." : "START AI ANALYSIS"}
          </button>
        </div>
      </div>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h4>Automated Extraction</h4>
          <p>Instantly identifies 3-5 distinct project risks from standard status reports.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h4>Threat Matrix</h4>
          <p>Visualizes extracted risks on an interactive Probability vs. Impact dashboard.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h4>Document RAG</h4>
          <p>Chat directly with your project documents using conversational AI context.</p>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (!results) return null;
    const risks = results.IdentifiedRisks || [];
    return (
      <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div className="tab-container" style={{ marginBottom: 0 }}>
            <button className={`tab-btn ${activeModule === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveModule('dashboard')}>Analytics</button>
            <button className={`tab-btn ${activeModule === 'chat' ? 'active' : ''}`} onClick={() => setActiveModule('chat')}>Chat RAG</button>
          </div>
          <button onClick={exportToPDF} className="btn-new" style={{ margin: 0, width: 'auto', padding: '10px 20px', background: 'var(--accent-glow)' }}>
            📥 Export PDF Report
          </button>
        </div>
        <div id="dashboard-report" style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '16px' }}>
          <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
            <div className="glass-card span-2">
              <h3>Executive Summary</h3>
              <p className="summary-text" style={{ fontSize: '16px', lineHeight: '1.6' }}>{results.ExecutiveSummary}</p>
            </div>
            <div className="glass-card flex-center">
              <span className="section-label">Risk Vector</span>
              <div className={`stat-value ${results.OverallRiskScore > 70 ? 'text-danger' : results.OverallRiskScore > 40 ? 'text-warning' : 'text-success'}`}>
                {results.OverallRiskScore}
              </div>
            </div>
          </div>
          <div 
className="glass-card" style={{ marginBottom: '32px' }}>
            <h3>Threat Matrix (Impact vs. Probability)</h3>
            <div style={{ height: '400px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#cbd5e1' : '#334155'} vertical={false} />
                  <XAxis type="number" dataKey="Impact" name="Impact" domain={[0, 10]} stroke={theme === 'light' ? '#64748b' : '#94a3b8'} />
                  <YAxis type="number" dataKey="Probability" name="Probability" domain={[0, 10]} stroke={theme === 'light' ? '#64748b' : '#94a3b8'} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Risks" data={risks}>
                    {risks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Impact * entry.Probability > 50 ? '#ef4444' : '#10b981'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {risks.map((risk, idx) => (
              <div key={idx} className="glass-card" style={{ borderLeft: `4px solid ${risk.Impact * risk.Probability > 50 ? '#ef4444' : '#10b981'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>{risk.RiskName}</h4>
                  <span className="badge-pro">{risk.Category}</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>{risk.Description}</p>
                <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(20, 184, 166, 0.07)', borderRadius: '8px', border: '1px dashed rgba(20, 184, 166, 0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🛡️</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Mitigation</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0', lineHeight: '1.5' }}>{risk.RecommendedAction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Lightweight markdown formatter — no extra dependency needed
  const formatMessage = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Numbered list item
      if (/^\d+\.\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\.\s/, ''));
          i++;
        }
        elements.push(
          <ol key={i} style={{ paddingLeft: '20px', margin: '8px 0' }}>
            {items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Bullet list item
      if (/^[-*]\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*]\s/, ''));
          i++;
        }
        elements.push(
          <ul key={i} style={{ paddingLeft: '20px', margin: '8px 0', listStyle: 'none' }}>
            {items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#2dd4bf', flexShrink: 0 }}>›</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Empty line = spacer
      if (line.trim() === '') {
        elements.push(<div key={i} style={{ height: '6px' }} />);
        i++;
        continue;
      }

      // Normal paragraph
      elements.push(<p key={i} style={{ margin: '4px 0', lineHeight: '1.6' }}>{renderInline(line)}</p>);
      i++;
    }

    return elements;
  };

  const renderInline = (text) => {
    // Handle **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return <strong key={idx} style={{ color: '#f1f5f9', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderChat = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
      {/* Tab bar */}
      <div className="tab-container" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <button className={`tab-btn ${activeModule === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveModule('dashboard')}>Analytics</button>
        <button className={`tab-btn ${activeModule === 'chat' ? 'active' : ''}`} onClick={() => setActiveModule('chat')}>Chat RAG</button>
      </div>

      {/* Chat window */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '20px', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--chat-header-bg)', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🛡️</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Risk Analyst AI</div>
            <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Context loaded · Ask anything about this project
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          id="chat-messages"
          style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {chatHistory.length === 0 && (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#475569' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#64748b' }}>Ask about risks, mitigations, or the threat matrix</p>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>The AI has full context of your document and analysis</p>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '10px' }}>
              {/* Avatar */}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #0ea5e9, #14b8a6)' }}>
                {msg.role === 'user' ? '👤' : '🛡️'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '72%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                  : 'var(--chat-ai-bg)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
                fontSize: '14px',
                lineHeight: '1.6',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                boxShadow: msg.role === 'user' ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
              }}>
                {msg.role === 'ai' ? formatMessage(msg.text) : msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isBotTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🛡️</div>
              <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(14,165,233,0.15)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(14,165,233,0.1)', background: 'var(--chat-header-bg)', flexShrink: 0 }}>
          <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              style={{ flexGrow: 1, background: 'var(--input-bg)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about risks, mitigations, threat matrix..."
              onFocus={e => e.target.style.borderColor = 'rgba(20,184,166,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(14,165,233,0.2)'}
              disabled={isBotTyping}
            />
            <button
              type="submit"
              disabled={isBotTyping || !chatInput.trim()}
              style={{ padding: '12px 20px', background: isBotTyping || !chatInput.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #0ea5e9, #14b8a6)', border: 'none', borderRadius: '12px', color: isBotTyping || !chatInput.trim() ? '#475569' : 'white', fontWeight: '700', fontSize: '14px', cursor: isBotTyping || !chatInput.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              {isBotTyping ? '...' : 'Send ›'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      {renderSidebar()}
      <div className="main-content">
        <div className="content-wrapper">
          {activeModule === 'welcome' && renderWelcomeScreen()}
          {activeModule === 'dashboard' && renderDashboard()}
          {activeModule === 'chat' && renderChat()}
        </div>
      </div>
    </div>
  );
}

export default App;
