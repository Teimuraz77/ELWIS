import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Users, Briefcase, Key, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info, Monitor
} from 'lucide-react';

export default function App() {
  // --- CORE STATE ---
  const [activeStep, setActiveStep] = useState('input'); 
  const [language, setLanguage] = useState('DE');
  
  // Konfiguration (Horizontal & Tesla-Style)
  const [companySize, setCompanySize] = useState('Mittelstand');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  const [input, setInput] = useState(''); 
  
  // --- API SCHLÜSSEL ---
  const apiKey = "AIzaSyBqfwA5lTbTMssaZmbVneKanhskuVC0TpY"; 

  // --- CONTENT ZUSTAND ---
  const [columboData, setColumboData] = useState({ question: '', options: [] });
  const [customAnswer, setCustomAnswer] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [posts, setPosts] = useState({ micro: '', short: '', medium: '', long: '', image: null, description: '' });
  const [scheduleDate, setScheduleDate] = useState('');
  
  // --- UI ZUSTAND ---
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState({ micro: false, short: false, medium: false, long: false, image: false });
  const [error, setError] = useState(null);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);

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

  // --- PROGRESS ANIMATION ---
  useEffect(() => {
    let interval;
    if (loading && progress < 98) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 40) return prev + 8;
          if (prev < 85) return prev + 2;
          return prev + 0.2;
        });
      }, 350);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  // --- API SERVICE ---
  const apiCall = async (url, payload, retries = 5) => {
    if (!apiKey) throw new Error("API-Schlüssel fehlt!");
    let delay = 1000;
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
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  const parseJSON = (text) => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.options) parsed.options = parsed.options.filter(o => o && o.length > 1 && o !== "A" && o !== "B");
      return parsed;
    } catch (e) { return { question: "Können Sie den Fokus präzisieren?", options: [] }; }
  };

  // TÜRSTEHER LOGIK
  const checkRelevance = async (text) => {
    try {
      const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Analyze for business/IT relevance: "${text}". ONLY reply "OK" or "QUATSCH".` }] }]
      });
      return res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() === "QUATSCH";
    } catch (e) { return false; }
  };

  const startInvestigation = async () => {
    if (!input) return;
    setLoading(true);
    setProgress(5);
    setError(null);
    if (await checkRelevance(input)) {
        setError("Der Türsteher sagt: Nonsense erkannt. Bitte gib ein echtes Business-Thema ein.");
        setLoading(false);
        return;
    }
    try {
      const prompt = `Act as Inspector Columbo. Context: ${companySize}, Persona: ${persona}, Tone: ${tone}. Topic: "${input}". Ask ONE short strategic follow-up question. JSON: {"question": "...", "options": ["Strategie A", "Strategie B"]}. Sprache: Deutsch.`;
      const result = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { responseMimeType: "application/json" }
      });
      setColumboData(parseJSON(result.candidates[0].content.parts[0].text));
      setActiveStep('columbo');
    } catch (err) { setError("KI-District meldet Funkstille. Check den API-Key."); }
    finally { setLoading(false); setProgress(0); }
  };

  const runContentEngine = async (type, answer) => {
    const finalAnswer = answer || customAnswer;
    if (type === 'all') { setActiveStep('generating'); setProgress(15); setProgressLabel("Integriere Strategie-Layer..."); }
    setLoadingItems(prev => ({ ...prev, [type]: true, ...(type === 'all' && { micro: true, short: true, medium: true, long: true, image: true }) }));
    setLoading(true);
    try {
      if (type === 'all' || ['micro', 'short', 'medium', 'long'].includes(type)) {
        const textPrompt = `Experte. Segment: ${companySize}. Persona: "${persona}". Ton: "${tone}". Thema: "${input}", Fokus: "${finalAnswer}". Erzeuge 4 Varianten: MICRO (<200 Zeichen), KURZ, MITTEL, LANG. JSON: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Sprache: Deutsch.`;
        const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          contents: [{ parts: [{ text: finalAnswer }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        const data = parseJSON(res.candidates[0].content.parts[0].text);
        setPosts(prev => ({ ...prev, ...data, description: data.visual }));
      }
      if (type === 'all' || type === 'image') {
        const imgRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          instances: [{ prompt: `Premium corporate infographic for ${persona}, ${posts.description || 'data structure'}, blue tech theme, vector minimalist, 8k professional.` }]
        });
        if (imgRes.predictions?.[0]) setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgRes.predictions[0].bytesBase64Encoded}` }));
      }
      setActiveStep('result');
    } catch (err) { setError("Engine stalled. Bitte versuche es erneut."); }
    finally { setLoading(false); setLoadingItems({ micro: false, short: false, medium: false, long: false, image: false }); setProgress(0); }
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const nameRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Gib mir 2-Wort Namen für: "${input}". NUR Text.` }] }]
      });
      const name = nameRes.candidates[0].content.parts[0].text.trim().replace(/ /g, "_");
      setAssetLibrary([{ id: Date.now(), name, ...posts, topic: input, persona, companySize, tone, date: new Date().toLocaleDateString() }, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { setError("Save failed."); }
    finally { setLoading(false); }
  };

  // --- UI KOMPONENTEN ---
  const HorizontalButton = ({ active, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-xl border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] scale-[1.02]' : 'bg-gray-900 border-white/10 text-slate-500 hover:border-white/30 hover:bg-gray-800'}`}
    >
        <Icon size={14} className={active ? 'text-white' : 'text-slate-600'} />
        <span className="font-bold text-[10px] uppercase tracking-widest truncate">{label}</span>
    </button>
  );

  const ContentCard = ({ title, text, type, icon: Icon, color, charCount }) => (
    <div className="bg-[#0F172A] border border-white/10 rounded-[2.5rem] p-8 relative flex flex-col h-full shadow-3xl hover:border-blue-600/30 transition-all">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${color}`}></div>
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3"><Icon size={18} className="text-slate-500" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span></div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-3 bg-white/5 rounded-full hover:bg-slate-700 transition-all text-slate-400">
          {copiedType === type ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
        </button>
      </div>
      <div className="bg-black/40 p-8 rounded-3xl border border-white/10 flex-1 overflow-hidden relative">
        {loadingItems[type] && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500" /></div>}
        <p className={`text-slate-200 leading-relaxed whitespace-pre-wrap ${type === 'micro' ? 'font-bold text-xl italic' : 'text-sm font-medium'}`}>{text || "Building Asset..."}</p>
        {charCount && <div className={`mt-4 text-[9px] font-black text-right uppercase ${text.length > 200 ? 'text-red-500' : 'text-slate-700'}`}>{text.length} / 200</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/40 overflow-x-hidden">
      
      {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-3xl border border-white/10 shadow-3xl" alt="Preview" /></div>}

      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/10 p-4 px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-6">
          {activeStep !== 'input' && <button onClick={() => setActiveStep('input')} className="p-3 bg-white/5 rounded-full text-blue-400 hover:bg-white/10 transition-all"><RotateCcw size={20}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white italic leading-tight">ELWIS LAB</h1>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">v25.0 | PIKO BELLO FINAL</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-3 bg-white/5 rounded-xl border border-white/5 relative hover:bg-blue-600 transition-all">
          <CalendarDays size={20} />
          {assetLibrary.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 rounded-full text-[10px] flex items-center justify-center font-bold border border-[#020617]">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10 w-full flex flex-col flex-1">
        
        {/* INPUT VIEW (HORIZONTAL TESLA STYLE) */}
        {activeStep === 'input' && (
          <div className="max-w-5xl mx-auto w-full space-y-12 animate-in slide-in-from-bottom-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 bg-blue-500/10 text-blue-400 px-5 py-2 rounded-full border border-blue-500/20 mb-4 animate-pulse"><ShieldCheck size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Strategic Architecture Engine</span></div>
                <h2 className="text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Engine Config.</h2>
            </div>
            
            <div className="bg-slate-900/40 backdrop-blur-2xl p-10 rounded-[4rem] border border-white/10 shadow-3xl space-y-12">
                
                <div className="grid grid-cols-1 gap-10">
                    {/* Horizontaler Row Flow */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] text-center border-b border-white/5 pb-2">I. Business Segment</p>
                        <div className="flex gap-4 max-w-xl mx-auto w-full">
                            <HorizontalButton active={companySize === 'Mittelstand'} onClick={() => setCompanySize('Mittelstand')} icon={Building2} label="Mittelstand" />
                            <HorizontalButton active={companySize === 'Konzern'} onClick={() => setCompanySize('Konzern')} icon={Globe2} label="Konzern" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] text-center border-b border-white/5 pb-2">II. Target Persona</p>
                        <div className="flex gap-4 w-full">
                            <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                            <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                            <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] text-center border-b border-white/5 pb-2">III. Tone of Voice</p>
                        <div className="flex gap-4 w-full">
                            <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                            <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                            <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Direkt" />
                        </div>
                    </div>
                </div>

                {/* TEXT INPUT (VISIBLE BLACK BOX) */}
                <div className="space-y-4 pt-10 border-t border-white/5 relative">
                    <div className="flex justify-between items-center mb-1 px-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Strategic Input</h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-4 py-1.5 rounded-full border border-blue-400/20"><Info size={12}/> Mehr Text = Mehr Qualität.</div>
                    </div>
                    <textarea 
                        className="w-full h-56 p-12 bg-black border border-white/10 rounded-[3.5rem] outline-none text-2xl font-bold text-white placeholder:text-slate-800 focus:border-blue-600 transition-all shadow-inner" 
                        placeholder="Z.B. Die Gefahr von Schatten-IT in wachsenden Teams..." 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                    />
                </div>

                <button onClick={startInvestigation} disabled={loading || !input} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-12 rounded-[4rem] font-black text-sm uppercase tracking-[0.6em] shadow-3xl flex items-center justify-center gap-6 transition-all active:scale-[0.98]">
                  {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={28} />} INITIATE ENGINE
                </button>
            </div>
          </div>
        )}

        {/* COLUMBO NOIR (BAR VIEW) */}
        {activeStep === 'columbo' && (
          <div className="max-w-4xl mx-auto w-full animate-in zoom-in duration-700 flex-1 pb-32">
            <div className="bg-[#0F172A] rounded-[5rem] shadow-3xl overflow-hidden relative border border-white/10">
                <div className="relative h-[30rem] w-full border-b-8 border-blue-600">
                    <img src={pixelBarUrl} alt="Pixel Bar" className="w-full h-full object-cover grayscale contrast-125 brightness-75 scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent opacity-95"></div>
                    <div className="absolute bottom-16 left-16 p-10 bg-black/80 backdrop-blur-md rounded-[3rem] border border-white/10 max-w-sm shadow-3xl">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400">Strategic Triage</span>
                        <p className="text-3xl font-black italic text-white leading-tight mt-4 tracking-tighter">"One more thing... Sneak peak on the Zero Audit Trilogy"</p>
                    </div>
                </div>
                
                <div className="p-20 -mt-24 relative bg-[#020617]/98 backdrop-blur-3xl rounded-t-[5rem] text-center space-y-16">
                    <div className="inline-block bg-white px-12 py-6 rounded-[2.5rem] shadow-3xl text-slate-900 font-black italic tracking-tighter text-2xl">Just one more thing...</div>
                    <p className="text-4xl font-bold text-white italic border-l-8 border-blue-600 pl-12 text-left leading-relaxed tracking-tighter">"{columboData.question}"</p>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => {setSelectedAnswer(opt); runContentEngine('all', opt);}} className="bg-white/5 hover:bg-blue-600 text-white p-10 rounded-[2.5rem] text-lg font-black transition-all border border-white/5 flex items-center justify-between group px-16 shadow-2xl">
                                {opt} <ChevronRight size={32} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-4 transition-all" />
                            </button>
                        ))}
                        <div className="space-y-8 mt-16 pt-16 border-t border-white/10 text-left">
                            <textarea className="w-full p-12 bg-white/5 border border-white/10 rounded-[3.5rem] font-bold outline-none text-white focus:border-blue-600 h-44 text-xl shadow-inner" placeholder="Eigene Details hinzufügen..." value={customAnswer} onChange={(e) => setCustomAnswer(e.target.value)} />
                            <button onClick={() => runContentEngine('all', customAnswer)} disabled={loading || !customAnswer.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-12 rounded-[4rem] font-black uppercase text-sm flex items-center justify-center gap-6 hover:scale-[1.02] shadow-3xl transition-all">
                                {loading ? <Loader2 className="animate-spin" /> : <Send size={28}/>} SEND EVIDENCE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* LOADING (MIT OPTIMIERTEM LADEBALKEN) */}
        {activeStep === 'generating' && (
          <div className="max-w-md mx-auto py-48 space-y-16 text-center animate-in fade-in flex-1">
            <div className="relative inline-flex items-center justify-center scale-150 mb-8"><div className="w-24 h-24 border-[4px] border-blue-500/10 rounded-full border-t-blue-600 animate-spin" /><Zap size={24} className="absolute m-auto text-blue-500 fill-blue-500 animate-pulse" /></div>
            <h2 className="text-3xl font-black uppercase italic tracking-[0.2em] text-white">{progressLabel || "Synthesizing Asset..."}</h2>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner"><div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} /></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{Math.round(progress)}% Integrated</p>
          </div>
        )}

        {/* RESULT VIEW */}
        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in zoom-in pb-32 w-full pt-10">
            <div className="lg:col-span-7 space-y-12">
              <div className="flex gap-6 p-6 bg-slate-900/60 border border-white/10 rounded-[3rem] items-center shadow-3xl backdrop-blur-xl">
                 <div className="flex flex-col flex-1 px-4 border-r border-white/10"><span className="text-[10px] text-slate-500 uppercase font-black">Segment</span><span className="text-xs text-white font-bold">{companySize}</span></div>
                 <div className="flex flex-col flex-1 px-4 border-r border-white/10"><span className="text-[10px] text-slate-500 uppercase font-black">Persona</span><span className="text-xs text-white font-bold">{persona}</span></div>
                 <div className="flex flex-col flex-1 px-4"><span className="text-[10px] text-slate-500 uppercase font-black">Tone</span><span className="text-xs text-white font-bold">{tone}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <ContentCard title="Micro Bulletin" text={posts.micro} type="micro" icon={MessageCircle} color="bg-blue-400" charCount={true} />
                 <ContentCard title="Snack Post" text={posts.short} type="short" icon={AlignLeft} color="bg-blue-600" />
              </div>
              <ContentCard title="Standard LinkedIn Post" text={posts.medium} type="medium" icon={AlignCenter} color="bg-slate-600" />
              <ContentCard title="Strategic Deep-Dive" text={posts.long} type="long" icon={AlignJustify} color="bg-white/20" />
            </div>
            <div className="lg:col-span-5 flex flex-col gap-12">
              <div className="bg-slate-900 p-10 rounded-[5rem] shadow-3xl border border-white/10">
                <div className="aspect-square bg-black/60 rounded-[4rem] border-[10px] border-slate-800 overflow-hidden flex items-center justify-center relative group cursor-zoom-in mb-10" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image && <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" size={64} /></div>}
                    {posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Loader2 className="animate-spin text-blue-400" />}
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <button onClick={archiveAsset} disabled={loading} className="py-10 bg-green-600 text-white rounded-[3.5rem] font-black text-xs uppercase shadow-3xl flex items-center justify-center gap-3"><Save size={24}/> SAVE</button>
                    <button onClick={() => setActiveStep('library')} className="py-10 bg-blue-600 text-white rounded-[3.5rem] font-black text-xs uppercase shadow-3xl active:scale-95 flex items-center justify-center gap-3"><Library size={24}/> VAULT</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VAULT VIEW */}
        {activeStep === 'library' && (
          <div className="space-y-16 animate-in slide-in-from-right-16 pb-32 px-4 w-full flex-1 flex flex-col pt-10">
            <div className="flex justify-between items-end px-6">
                <div><h2 className="text-8xl font-black uppercase italic tracking-tighter text-white leading-none">The Vault.</h2><p className="text-slate-500 text-[12px] font-bold uppercase tracking-[0.6em] mt-8 opacity-60">Strategic Asset Management</p></div>
                <button onClick={() => setActiveStep('input')} className="bg-white text-slate-900 px-16 py-6 rounded-full text-[12px] font-black uppercase shadow-3xl hover:scale-105 active:scale-95 transition-all tracking-[0.3em]">Studio Return</button>
            </div>
            {assetLibrary.length === 0 ? <div className="bg-gray-900/50 p-60 rounded-[8rem] text-center border-4 border-dashed border-white/5 flex flex-col items-center flex-1 justify-center shadow-inner"><Library size={100} className="text-gray-800 mb-12 opacity-30" /><p className="text-gray-600 text-sm font-black uppercase tracking-[0.6em] italic">Vault is empty.</p></div> : 
                <div className="space-y-16 border-l-4 border-blue-900/40 pl-16 ml-10 mt-16">
                    {assetLibrary.map((item) => (
                        <div key={item.id} className="relative group">
                            <div className="absolute -left-[4.6rem] top-12 w-10 h-10 bg-blue-600 rounded-full border-4 border-[#020617] shadow-3xl"></div>
                            <div className="bg-slate-900 rounded-[5rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl hover:-translate-y-4 transition-all">
                                <div className="p-12 bg-black/60 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-10 flex-1">
                                        <div className="bg-blue-600/20 text-blue-400 px-6 py-3 rounded-2xl border border-blue-500/20 flex items-center gap-4"><Clock size={20}/> <span className="text-sm font-black uppercase">{item.date}</span></div>
                                        <span className="text-3xl font-black uppercase truncate italic">{item.name}</span>
                                    </div>
                                    <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-white/10 hover:text-red-500 p-4"><Trash2 size={32} /></button>
                                </div>
                                <div className="p-20 flex flex-col md:flex-row gap-10 bg-slate-900/30">
                                    {item.image && <div className="md:w-1/4 aspect-square rounded-[2rem] overflow-hidden shadow-2xl flex-shrink-0 cursor-zoom-in" onClick={() => setZoomedImage(item.image)}><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>}
                                    <div className="flex-1 flex flex-col justify-center space-y-4">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Micro Hook Asset</p>
                                        <p className="text-xl font-bold text-white line-clamp-3 italic">"{item.micro}"</p>
                                        <button onClick={() => {setPosts(item); setInput(item.topic); setActiveStep('result');}} className="px-12 py-6 bg-white/5 text-slate-400 text-sm font-black uppercase rounded-[2rem] hover:bg-blue-600 hover:text-white transition-all shadow-3xl">Laden</button>
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
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-12 py-8 rounded-[3rem] shadow-[0_0_100px_rgba(220,38,38,0.4)] flex items-center gap-8 animate-bounce z-[100] border-4 border-red-500">
            <ShieldAlert size={40} />
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase italic leading-none">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={32}/></button>
          </div>
        )}
      </main>
      
      <style>{`
        .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 1); }
        .cursor-zoom-in { cursor: zoom-in; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #020617; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #2563eb; }
      `}</style>
    </div>
  );
}
