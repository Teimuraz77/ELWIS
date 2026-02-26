import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Users, Briefcase, Key, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info
} from 'lucide-react';

export default function App() {
  // --- CORE STATE ---
  const [activeStep, setActiveStep] = useState('input'); 
  const [language, setLanguage] = useState('DE');
  
  // Konfiguration (Horizontal & Konsistent)
  const [companySize, setCompanySize] = useState('Mittelstand');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  const [input, setInput] = useState(''); 
  
  // --- API KEY (HART EINKODIERT) ---
  const apiKey = "AIzaSyBqfwA5lTbTMssaZmbVneKanhskuVC0TpY"; 

  // --- CONTENT STATE ---
  const [columboData, setColumboData] = useState({ question: '', options: [] });
  const [customAnswer, setCustomAnswer] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [posts, setPosts] = useState({ micro: '', short: '', medium: '', long: '', image: null, description: '' });
  const [scheduleDate, setScheduleDate] = useState('');
  
  // --- UI STATE ---
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState({ micro: false, short: false, medium: false, long: false, image: false });
  const [error, setError] = useState(null);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);

  const columboImageUrl = "https://m.media-amazon.com/images/M/MV5BMzU4MDI3NTc2OV5BMl5BanBnXkFtZTgwNjMzNDIzMzE@._V1_.jpg";
  // Screenshot 2 (Pixel Art Bar)
  const pixelBarUrl = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"; 

  // --- TAILWIND FIX ---
  useEffect(() => {
    if (!document.getElementById('tailwind-fix')) {
      const link = document.createElement('link');
      link.id = 'tailwind-fix';
      link.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  // --- API SERVICE ---
  const apiCall = async (url, payload, retries = 3) => {
    if (!apiKey) throw new Error("API-Schlüssel fehlt!");
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        lastError = err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw lastError;
  };

  const parseJSON = (text) => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.options) parsed.options = parsed.options.filter(o => o && o.length > 1 && o !== "A" && o !== "B");
      return parsed;
    } catch (e) { return { question: "Können Sie den strategischen Winkel präzisieren?", options: [] }; }
  };

  const checkRelevance = async (text) => {
    try {
      const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Analysiere auf Business-Relevanz: "${text}". Antworte NUR "OK" oder "QUATSCH".` }] }]
      });
      return res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() === "QUATSCH";
    } catch (e) { return false; }
  };

  const startInvestigation = async () => {
    if (!input) return;
    setLoading(true);
    setError(null);
    if (await checkRelevance(input)) {
        setError("Der Türsteher sagt: Das ist kein Business-Thema. Bitte bleib professionell.");
        setLoading(false);
        return;
    }
    try {
      const prompt = `Du bist Inspektor Columbo. Thema: "${input}". Persona: ${persona}. Strategischer Kontext: ${companySize}, Tonalität: ${tone}. Stelle EINE kurze Rückfrage. JSON: {"question": "...", "options": ["Option 1", "Option 2"]}. Sprache: Deutsch.`;
      const result = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { responseMimeType: "application/json" }
      });
      setColumboData(parseJSON(result.candidates[0].content.parts[0].text));
      setActiveStep('columbo');
    } catch (err) { setError("KI-District meldet Funkstille."); }
    finally { setLoading(false); }
  };

  const runContentEngine = async (type, answer) => {
    const finalAnswer = answer || customAnswer;
    if (type === 'all') { setActiveStep('generating'); setProgress(20); }
    setLoadingItems(prev => ({ ...prev, [type]: true, ...(type === 'all' && { micro: true, short: true, medium: true, long: true, image: true }) }));
    setLoading(true);
    try {
      if (type === 'all' || ['micro', 'short', 'medium', 'long'].includes(type)) {
        const textPrompt = `Experte. Ziel: ${companySize}. Persona: "${persona}". Ton: "${tone}". Thema: "${input}", Fokus: "${finalAnswer}". Erzeuge 4 Längen: MICRO (<200 Zeichen), KURZ (Snack), MITTEL (LinkedIn), LANG (Strategy). JSON: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Sprache: Deutsch.`;
        const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          contents: [{ parts: [{ text: finalAnswer }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        const data = parseJSON(res.candidates[0].content.parts[0].text);
        setPosts(prev => ({ ...prev, ...data, description: data.visual }));
      }
      if (type === 'all' || type === 'image') {
        const imgRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          instances: [{ prompt: `Premium business infographic, ${posts.description || 'data structure'}, royal blue theme, vector minimalist, 8k.` }]
        });
        if (imgRes.predictions?.[0]) setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgRes.predictions[0].bytesBase64Encoded}` }));
      }
      setActiveStep('result');
    } catch (err) { setError("Engine stalled."); }
    finally { setLoading(false); setLoadingItems({ micro: false, short: false, medium: false, long: false, image: false }); }
  };

  const HorizontalButton = ({ active, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-800/60 border-white/5 text-slate-500 hover:border-white/20'}`}
    >
        <Icon size={14} className={active ? 'text-white' : 'text-slate-600'} />
        <span className="font-black text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );

  const ContentCard = ({ title, text, type, icon: Icon, color, charCount }) => (
    <div className="bg-gray-900 border border-white/5 rounded-3xl p-6 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-600/30">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2"><Icon size={14} className="text-slate-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</span></div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-2 hover:bg-white/5 rounded-full">
          {copiedType === type ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-500" />}
        </button>
      </div>
      <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex-1 overflow-hidden">
        {loadingItems[type] && <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500" /></div>}
        <p className="text-slate-200 leading-relaxed text-sm whitespace-pre-wrap">{text || "Synthese läuft..."}</p>
        {charCount && <div className={`mt-3 text-[8px] font-bold text-right uppercase ${text.length > 200 ? 'text-red-500' : 'text-slate-600'}`}>{text.length} / 200</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-3xl border border-white/10 shadow-3xl" alt="Preview" /></div>}
      
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/10 p-4 px-6 md:px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-4">
          {activeStep !== 'input' && <button onClick={() => setActiveStep('input')} className="p-2 bg-white/5 rounded-full text-blue-400 active:scale-90 transition-all"><RotateCcw size={18}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white italic leading-tight">ELWIS LAB</h1>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">v22.1 | PRECISION MASTER</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-2.5 bg-white/5 rounded-xl border border-white/5 relative hover:bg-white/10 transition-all">
          <CalendarDays size={18} />
          {assetLibrary.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full text-[8px] flex items-center justify-center font-bold">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10 w-full flex flex-col flex-1">
        {activeStep === 'input' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-bottom-10 pt-10 flex-1 pb-32">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 mb-2"><ShieldCheck size={12} /> <span className="text-[9px] font-black uppercase tracking-widest italic">Marketing Architecture</span></div>
                <h2 className="text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Studio.</h2>
            </div>
            
            <div className="bg-gray-900/40 backdrop-blur-md p-10 rounded-[4rem] border border-white/10 shadow-3xl space-y-10">
                <div className="space-y-8">
                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-center">Segment</h3>
                        <div className="flex gap-4">
                            <HorizontalButton active={companySize === 'Mittelstand'} onClick={() => setCompanySize('Mittelstand')} icon={Building2} label="Mittelstand" />
                            <HorizontalButton active={companySize === 'Konzern'} onClick={() => setCompanySize('Konzern')} icon={Globe2} label="Konzern" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-center">Persona</h3>
                        <div className="flex gap-4">
                            <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                            <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                            <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-center">Tonfall</h3>
                        <div className="flex gap-4">
                            <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                            <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                            <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Direkt" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-10 border-t border-white/10 relative">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Core Angle</h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-4 py-1.5 rounded-full"><Info size={12}/> Mehr Text = Mehr Qualität.</div>
                    </div>
                    <textarea 
                        className="w-full h-44 p-10 bg-black border border-white/10 rounded-[3rem] outline-none text-xl font-bold text-white placeholder:text-slate-800 focus:border-blue-500 transition-all shadow-inner" 
                        placeholder="Strategische Details hier eingeben..." 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                    />
                </div>

                <button onClick={startInvestigation} disabled={loading || !input} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-10 rounded-[3rem] font-black text-xs uppercase tracking-[0.5em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98]">
                  {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />} INITIATE ENGINE
                </button>
            </div>
          </div>
        )}

        {activeStep === 'columbo' && (
          <div className="max-w-4xl mx-auto w-full animate-in zoom-in duration-500 flex-1 pb-32">
            <div className="bg-slate-900 rounded-[4rem] shadow-3xl overflow-hidden relative border border-white/10">
                <div className="relative h-[28rem] w-full border-b-8 border-blue-600">
                    <img src={pixelBarUrl} alt="Pixel Bar" className="w-full h-full object-cover grayscale contrast-125" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent opacity-95"></div>
                    <div className="absolute bottom-12 left-12 p-10 bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 max-w-sm shadow-2xl">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Strategisches Briefing</span>
                        <p className="text-2xl font-black italic text-white leading-tight mt-2">"One more thing... Sneak peak on the Zero Audit Trilogy"</p>
                    </div>
                </div>
                <div className="p-16 -mt-24 relative bg-[#020617]/98 backdrop-blur-2xl rounded-t-[4rem] text-center space-y-12">
                    <div className="inline-block bg-white px-10 py-5 rounded-2xl shadow-2xl text-slate-900 font-black italic tracking-tight">Just one more thing...</div>
                    <p className="text-3xl font-bold text-white italic border-l-8 border-blue-600 pl-10 text-left leading-relaxed">"{columboData.question}"</p>
                    <div className="grid grid-cols-1 gap-5">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => {setSelectedAnswer(opt); runContentEngine('all', opt);}} className="bg-white/5 hover:bg-blue-600 text-white p-8 rounded-[2.5rem] text-sm font-black transition-all border border-white/5 flex items-center justify-between group px-12">
                                {opt} <ChevronRight size={24} className="opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                        ))}
                        <div className="space-y-6 mt-12 pt-12 border-t border-white/10">
                            <textarea className="w-full p-8 bg-white/5 border border-white/10 rounded-[2.5rem] font-bold outline-none text-white focus:border-blue-600 h-32 text-lg shadow-inner" placeholder="Eigene Details hinzufügen..." value={customAnswer} onChange={(e) => setCustomAnswer(e.target.value)} />
                            <button onClick={() => runContentEngine('all', customAnswer)} disabled={loading || !customAnswer.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-10 rounded-[3rem] font-black uppercase text-xs flex items-center justify-center gap-5 hover:scale-[1.02] shadow-2xl transition-all">
                                {loading ? <Loader2 className="animate-spin" /> : <Send size={24}/>} BEWEIS ABSENDEN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* LOADING VIEW */}
        {activeStep === 'generating' && (
          <div className="max-w-md mx-auto w-full py-40 space-y-16 text-center flex-1">
            <div className="relative inline-flex items-center justify-center scale-150 mb-8"><div className="w-20 h-20 border-[4px] border-blue-500/10 rounded-full border-t-blue-600 animate-spin" /><Zap size={24} className="absolute m-auto text-blue-500 fill-blue-500 animate-pulse" /></div>
            <h2 className="text-2xl font-black uppercase italic tracking-[0.2em] text-white">Synthesizing Track</h2>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden border border-white/5 shadow-inner"><div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {/* RESULT VIEW */}
        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in zoom-in pb-24 w-full pt-6">
            <div className="lg:col-span-7 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ContentCard title="Micro Bulletin" text={posts.micro} type="micro" icon={MessageCircle} color="bg-blue-400" charCount={true} />
                 <ContentCard title="Snack Post" text={posts.short} type="short" icon={AlignLeft} color="bg-blue-600" />
              </div>
              <ContentCard title="Standard Post" text={posts.medium} type="medium" icon={AlignCenter} color="bg-slate-600" />
              <ContentCard title="Deep-Dive" text={posts.long} type="long" icon={AlignJustify} color="bg-white/20" />
            </div>
            <div className="lg:col-span-5 flex flex-col gap-10">
              <div className="bg-slate-900 p-8 rounded-[4rem] shadow-3xl border border-white/10">
                <div className="flex justify-between items-center mb-6 px-2 text-[10px] font-black uppercase text-gray-500"><span>Brand Visual</span><button onClick={() => runContentEngine('image', selectedAnswer)} className="p-2 bg-white/5 rounded-full hover:bg-blue-600 transition-all"><RefreshCw size={14}/></button></div>
                <div className="aspect-square bg-black/40 rounded-[3rem] overflow-hidden flex items-center justify-center border-4 border-gray-800 shadow-2xl relative group cursor-zoom-in mb-8" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image && <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}
                    {posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Loader2 className="animate-spin text-blue-400" />}
                </div>
                <div className="grid grid-cols-2 gap-5 pt-4">
                    <button onClick={archiveAsset} disabled={loading} className="py-8 bg-green-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:bg-green-500 transition-all flex items-center justify-center gap-2"><Save size={20}/> SAVE</button>
                    <button onClick={() => setActiveStep('library')} className="py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:bg-blue-500 active:scale-95 flex items-center justify-center gap-2"><Library size={20}/> VAULT</button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#0F172A] to-black p-12 rounded-[4rem] border border-white/10 shadow-3xl text-center space-y-4">
                 <div className="inline-flex items-center gap-2 text-blue-500 mb-2 uppercase font-black tracking-tighter italic"><Rocket size={16} /> Q2 Horizon</div>
                 <h4 className="text-xl font-black text-white italic tracking-tighter uppercase">King of Leads</h4>
                 <p className="text-[10px] text-gray-500 opacity-60 italic">Autonomous Outreach Pipeline.</p>
              </div>
            </div>
          </div>
        )}

        {/* VAULT VIEW */}
        {activeStep === 'library' && (
          <div className="space-y-12 animate-in slide-in-from-right-16 pb-32 px-4 w-full flex-1 flex flex-col pt-6">
            <div className="flex justify-between items-end px-4">
                <div><h2 className="text-6xl font-black uppercase italic tracking-tighter text-white">The Vault.</h2><p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.5em] mt-3 opacity-60">Strategic Asset Management</p></div>
                <button onClick={() => setActiveStep('input')} className="bg-white text-black px-10 py-4 rounded-full text-[10px] font-black uppercase shadow-3xl hover:scale-105 active:scale-95 transition-all">Studio</button>
            </div>
            {assetLibrary.length === 0 ? <div className="bg-gray-900/50 p-40 rounded-[6rem] text-center border-4 border-dashed border-white/5 flex flex-col items-center flex-1 justify-center"><Library size={60} className="text-gray-800 mb-8" /><p className="text-gray-600 text-xs italic uppercase">Vault ist leer.</p></div> : 
                <div className="space-y-10 border-l-2 border-blue-900/50 pl-8 ml-2 mt-10">
                    {assetLibrary.map((item) => (
                        <div key={item.id} className="relative group">
                            <div className="absolute -left-[2.25rem] top-10 w-5 h-5 bg-blue-600 rounded-full border-4 border-black shadow-lg"></div>
                            <div className="bg-slate-900 rounded-[3.5rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl hover:-translate-y-2 transition-all">
                                <div className="p-6 bg-black/40 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 flex items-center gap-2"><Clock size={12}/> <span className="text-[9px] font-black uppercase tracking-widest">{item.scheduledDate || 'DRAFT'}</span></div>
                                        <span className="text-[12px] font-black uppercase truncate tracking-widest italic">{item.name}</span>
                                    </div>
                                    <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-white/10 hover:text-red-500 transition-all p-2 ml-2"><Trash2 size={18} /></button>
                                </div>
                                <div className="p-10 flex flex-col md:flex-row gap-10 bg-gray-900/30">
                                    {item.image && <div className="md:w-1/4 aspect-square rounded-[2rem] overflow-hidden shadow-2xl flex-shrink-0 cursor-zoom-in" onClick={() => setZoomedImage(item.image)}><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>}
                                    <div className="flex-1 flex flex-col justify-center space-y-4">
                                        <p className="text-[10px] font-black text-blue-500 uppercase italic opacity-60 tracking-[0.2em]">Micro Hook Asset</p>
                                        <p className="text-xl font-bold text-white line-clamp-3 italic tracking-tight leading-relaxed">"{item.micro}"</p>
                                        <div className="pt-6 mt-auto border-t border-white/5 flex gap-4"><button onClick={() => { setPosts(item); setInput(item.topic); setActiveStep('result'); }} className="px-8 py-4 bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all rounded-2xl shadow-lg">Laden</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            }
          </div>
        )}

        {error && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-10 py-6 rounded-3xl shadow-[0_0_80px_rgba(220,38,38,0.5)] flex items-center gap-6 animate-bounce z-[100] border-4 border-red-500">
            <ShieldAlert size={24} />
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-widest italic">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={20}/></button>
          </div>
        )}
      </main>
    </div>
  );
}
