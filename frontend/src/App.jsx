import { useState } from 'react';
import axios from 'axios';
import './App.css';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // --- CHAT STATES ---
  const [documentText, setDocumentText] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF first!");
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(response.data.data);
      
      // Save the text and initialize the chat
      setDocumentText(response.data.document_text);
      setChatHistory([{ role: 'ai', text: "Analysis complete! Ask me any specific questions about this document." }]);
    } catch (error) {
      console.error("Error analyzing document", error);
      alert("Something went wrong. Is your Python FastAPI running?");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !documentText) return;

    const userMessage = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput("");
    setIsChatting(true);

    try {
      const response = await axios.post('http://localhost:8000/api/chat', {
        document_text: documentText,
        question: userMessage
      });
      setChatHistory(prev => [...prev, { role: 'ai', text: response.data.answer }]);
    } catch (error) {
      console.error("Chat error", error);
      setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error connecting to the local AI." }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="container">
      <div className="header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>🛡️ Edge-AI Risk Analyzer</h1>
        <p>Enterprise-grade project intelligence. Powered by Qwen 2.5.</p>
      </div>
      
      <div className="upload-card" style={{ textAlign: 'center', marginBottom: '2rem', padding: '2rem', background: '#1e293b', borderRadius: '12px' }}>
        <input className="file-input" type="file" accept=".pdf" onChange={handleFileChange} style={{ marginBottom: '1rem', color: '#fff' }} />
        <br />
        <button 
          className="btn-primary" 
          onClick={handleUpload} 
          disabled={loading}
          style={{ padding: '10px 20px', fontSize: '16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {loading ? "⏳ Extracting Deep Data via Qwen..." : "🚀 Run Deep Risk Analysis"}
        </button>
      </div>

      {/* --- ENTERPRISE DASHBOARD --- */}
      {results && results.IdentifiedRisks && (
        <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
          
          {/* Top Row: Executive Summary & Risk Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ color: '#fff', marginTop: 0 }}>Executive Summary</h3>
              <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>{results.ExecutiveSummary}</p>
            </div>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px 0' }}>Overall Risk Score</h3>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                color: results.OverallRiskScore > 70 ? '#ef4444' : results.OverallRiskScore > 40 ? '#f59e0b' : '#10b981' 
              }}>
                {results.OverallRiskScore}/100
              </div>
            </div>
          </div>

          {/* Middle Row: The Risk Matrix Chart */}
          <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px' }}>Probability vs. Impact Matrix</h3>
            <div style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" dataKey="Impact" name="Impact" domain={[0, 10]} stroke="#94a3b8" label={{ value: 'Impact Score (1-10)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }} />
                  <YAxis type="number" dataKey="Probability" name="Probability" domain={[0, 10]} stroke="#94a3b8" label={{ value: 'Probability (1-10)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                  <Scatter name="Risks" data={results.IdentifiedRisks} fill="#8884d8">
                    {results.IdentifiedRisks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Impact * entry.Probability > 50 ? '#ef4444' : entry.Impact * entry.Probability > 25 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row: Detailed Risk Drill-Down */}
          <div>
            <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Risk Drill-Down</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {results.IdentifiedRisks.map((risk, index) => (
                <div key={index} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h4 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>{risk.RiskName}</h4>
                    <span style={{ background: '#334155', color: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{risk.Category}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block' }}>Probability</span>
                      <strong style={{ color: '#fff' }}>{risk.Probability}/10</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block' }}>Impact</span>
                      <strong style={{ color: '#fff' }}>{risk.Impact}/10</strong>
                    </div>
                  </div>

                  <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px', flexGrow: 1 }}>{risk.Description}</p>
                  
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '15px' }}>
                    <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>MITIGATION STRATEGY</span>
                    <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0 }}>{risk.RecommendedAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* --- RAG CHAT UI --- */}
      {results && (
        <div className="chat-section" style={{ background: '#0f172a', padding: '2rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <div className="chat-header" style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem' }}>💬 Chat with Document (Local RAG)</div>
          <div className="chat-history" style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '300px', overflowY: 'auto', marginBottom: '1.5rem', padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
            {chatHistory.map((msg, index) => (
              <div key={index} style={{ 
                padding: '10px 15px', 
                borderRadius: '8px', 
                maxWidth: '80%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#3b82f6' : '#334155',
                color: '#fff'
              }}>
                {msg.text}
              </div>
            ))}
            {isChatting && <div style={{ alignSelf: 'flex-start', color: '#94a3b8' }}>Thinking...</div>}
          </div>
          <form className="chat-form" onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="E.g., Which department requested the new dashboards?" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatting}
              style={{ flexGrow: 1, padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
            />
            <button type="submit" disabled={isChatting || !chatInput.trim()} style={{ padding: '0 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;