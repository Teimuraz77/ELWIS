import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Briefcase, Key, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info
} from 'lucide-react';

// --- TYPES ---
interface PostData {
  micro: string;
  short: string;
  medium: string;
  long: string;
  image: string | null;
  description: string;
}

interface ColumboData {
  question: string;
  options: string[];
}

interface Asset extends PostData {
  id: number;
  name: string;
  topic: string;
  scheduledDate: string;
  persona: string;
  companySize: string;
  tone: string;
  lang: string;
  date: string;
}

export default function App() {
  // --- CORE STATE ---
  const [activeStep, setActiveStep] = useState<string>('input'); 
  const [language, setLanguage] = useState<string>('DE');
  
  // Konfiguration
  const [companySize, setCompanySize] = useState<string>('Mittelstand');
  const [persona, setPersona] = useState<string>('Geschäftsführung');
  const [tone, setTone] = useState<string>('Analytisch');
  const [input, setInput] = useState<string>(''); 
  
  // --- API KEY (HART EINKODIERT) ---
  const apiKey = "AIzaSyBqfwA5lTbTMssaZmbVneKanhskuVC0TpY"; 

  // --- CONTENT STATE ---
  const [columboData, setColumboData] = useState<ColumboData>({ question: '', options: [] });
  const [customAnswer, setCustomAnswer] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [posts, setPosts] = useState<PostData>({ micro: '', short: '', medium: '', long: '', image: null, description: '' });
  const [scheduleDate, setScheduleDate] = useState<string>('');
  
  // --- UI STATE ---
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState({ micro: false, short: false, medium: false, long: false, image: false });
  const [error, setError] = useState<string | null>(null);
  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const pixelBarUrl = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"; 

  // --- TAILWIND FIX (THE REAL ONE) ---
  // Wir laden das offizielle Tailwind Script, das moderne Klammer-Klassen [ ] versteht!
  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const script = document.createElement('script');
      script.id = 'tailwind-script';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // --- PROGRESS ANIMATION (Sichtbarer Ladebalken) ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loading && progress < 98) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 40) return prev + 5;
          if (prev < 85) return prev + 1;
          return prev + 0.2;
        });
      }, 300);
    }
    return () => clearInterval(interval!);
  }, [loading, progress]);

  // --- API SERVICE ---
  const apiCall = async (url: string, payload: any, retries = 3): Promise<any> => {
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
        if (i === retries - 1) throw new Error("KI-Distrikt meldet Funkstille. Bitte erneut versuchen.");
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const parseJSON = (text: string): ColumboData | any => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.options) {
        parsed.options = parsed.options.filter((o: string) => o && o.length > 1 && o !== "A" && o !== "B");
      }
      return parsed;
    } catch (e) { 
      return { question: "Können Sie den Fokus genauer beschreiben?", options: [] }; 
    }
  };

  const checkRelevance = async (text: string): Promise<boolean> => {
    try {
      const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Analyze for B2B/IT business relevance: "${text}". ONLY reply "OK" or "QUATSCH".` }] }]
      });
      return res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() === "QUATSCH";
    } catch (e) { return false; }
  };

  const startInvestigation = async () => {
    if (!input) return;
    setLoading(true);
    setProgress(5);
    setProgressLabel("Analysiere Zielvorgabe...");
    setError(null);
    
    if (await checkRelevance(input)) {
        setError("Der Türsteher sagt: Das ist kein seriöses B2B Thema. Bitte definiere eine echte Strategie.");
        setLoading(false);
        setProgress(0);
        return;
    }

    try {
      const prompt = `Du bist Inspektor Columbo. Kontext: B2B Marketing für ${companySize}. Persona: ${persona}. Tone: ${tone}. Thema: "${input}". Ask ONE short strategic follow-up question (max 10 words). JSON: {"question": "...", "options": ["Strategie A", "Strategie B"]}. Sprache: Deutsch.`;
      const result = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { responseMimeType: "application/json" }
      });
      setColumboData(parseJSON(result.candidates[0].content.parts[0].text));
      setActiveStep('columbo');
    } catch (err: any) { 
      setError(err.message || "Fehler bei der Initialisierung."); 
    } finally { 
      setLoading(false); 
      setProgress(0); 
    }
  };

  const runContentEngine = async (type: string, answer: string = '') => {
    const finalAnswer = answer || customAnswer;
    if (type === 'all') { 
      setActiveStep('generating'); 
      setProgress(10); 
      setProgressLabel("Synthetisiere Enterprise Content..."); 
    }
    setLoadingItems(prev => ({ ...prev, [type]: true, ...(type === 'all' && { micro: true, short: true, medium: true, long: true, image: true }) }));
    setLoading(true);

    try {
      if (type === 'all' || ['micro', 'short', 'medium', 'long'].includes(type)) {
        const textPrompt = `Experte. Segment: ${companySize}. Persona: "${persona}". Ton: "${tone}". Thema: "${input}", Fokus: "${finalAnswer}". Erzeuge 4 Varianten: MICRO (<200 Zeichen Hook), KURZ (Snack), MITTEL (LinkedIn Feed), LANG (Deep-Dive). JSON: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Sprache: Deutsch. KEIN ELVIS IM TEXT.`;
        const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          contents: [{ parts: [{ text: finalAnswer }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        const data = parseJSON(res.candidates[0].content.parts[0].text);
        setPosts(prev => ({ ...prev, ...data, description: data.visual }));
      }
      if (type === 'all' || type === 'image') {
        setProgressLabel("Rendere Brand Visual...");
        const imgRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          instances: [{ prompt: `Ultra-premium corporate business infographic for ${persona} in ${companySize}, ${posts.description || 'data structure'}, royal blue theme, clean minimalist vector art, 8k.` }]
        });
        if (imgRes.predictions?.[0]) {
          setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgRes.predictions[0].bytesBase64Encoded}` }));
        }
      }
      setActiveStep('result');
    } catch (err: any) { 
      setError("Engine Fehler: " + err.message); 
    } finally { 
      setLoading(false); 
      setLoadingItems({ micro: false, short: false, medium: false, long: false, image: false }); 
      setProgress(0); 
    }
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const nameRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Gib mir 2-Wort Business Namen für: "${input}". NUR Text.` }] }]
      });
      const name = nameRes.candidates[0].content.parts[0].text.trim().replace(/ /g, "_");
      const newAsset: Asset = { id: Date.now(), name, ...posts, topic: input, scheduledDate: scheduleDate, persona, companySize, tone, lang: language, date: new Date().toLocaleDateString() };
      setAssetLibrary([newAsset, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { setError("Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
  };

  const updateAsset = (id: number, newName: string) => {
    setAssetLibrary(assetLibrary.map(a => a.id === id ? {...a, name: newName} : a));
    setEditingId(null);
  };

  // --- UI COMPONENTS ---
  const HorizontalButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20 hover:bg-slate-800/80'}`}
    >
        <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
        <span className="font-bold text-[11px] uppercase tracking-widest truncate">{label}</span>
    </button>
  );

  const ContentCard = ({ title, text, type, icon: Icon, color, charCount }: any) => (
    <div className="bg-[#0F172A] border border-white/10 rounded-[2.5rem] p-8 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-500/40 group">
      <div className={`absolute top-0 left-0 w-2 h-full ${color} rounded-l-[2.5rem]`}></div>
      <div className="flex justify-between items-center mb-6 pl-4">
        <div className="flex items-center gap-3"><Icon size={18} className="text-slate-400" /><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</span></div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-3 bg-white/5 rounded-full hover:bg-slate-800 transition-all text-slate-300">
          {copiedType === type ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
        </button>
      </div>
      <div className="bg-[#020617]/50 p-8 rounded-3xl border border-white/5 flex-1 overflow-hidden relative ml-4">
        {loadingItems[type as keyof typeof loadingItems] && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500" /></div>}
        <p className={`text-slate-200 leading-relaxed whitespace-pre-wrap ${type === 'micro' ? 'font-bold text-xl italic text-blue-100' : 'text-sm font-medium'}`}>{text || "Warte auf Engine..."}</p>
        {charCount && <div className={`mt-6 text-[10px] font-black text-right uppercase tracking-widest ${text.length > 200 ? 'text-red-500' : 'text-slate-600'}`}>{text.length} / 200 CHR</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/40 overflow-x-hidden">
      
      {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-3xl border border-white/10 shadow-3xl" alt="Preview" /></div>}

      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/10 p-5 px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-6">
          {activeStep !== 'input' && <button onClick={() => setActiveStep('input')} className="p-3 bg-white/5 rounded-full text-blue-400 hover:bg-white/10 transition-all active:scale-90"><RotateCcw size={20}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white italic">ELWIS LAB</h1>
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-1">v26.0 | BULLETPROOF EDITION</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative hover:bg-blue-600 transition-all">
          <CalendarDays size={20} className="text-white" />
          {assetLibrary.length > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full text-[10px] flex items-center justify-center font-black border-2 border-[#020617] shadow-lg text-white">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10 w-full flex flex-col flex-1">
        
        {/* INPUT VIEW (TESLA STYLE) */}
        {activeStep === 'input' && (
          <div className="max-w-5xl mx-auto w-full space-y-12 animate-in slide-in-from-bottom-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 mb-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"><ShieldCheck size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Strategic Architecture</span></div>
                <h2 className="text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Engine Config.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-12 rounded-[4rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] space-y-12">
                
                <div className="grid grid-cols-1 gap-12">
                    {/* Segment (OHNE STARTUP!) */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] text-center border-b border-white/5 pb-3">I. Business Segment</p>
                        <div className="flex gap-6 max-w-xl mx-auto w-full">
                            <HorizontalButton active={companySize === 'Mittelstand'} onClick={() => setCompanySize('Mittelstand')} icon={Building2} label="Mittelstand" />
                            <HorizontalButton active={companySize === 'Konzern'} onClick={() => setCompanySize('Konzern')} icon={Globe2} label="Konzern" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] text-center border-b border-white/5 pb-3">II. Target Persona</p>
                        <div className="flex gap-6 w-full">
                            <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level / Exec" />
                            <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech / IT Lead" />
                            <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] text-center border-b border-white/5 pb-3">III. Tone of Voice</p>
                        <div className="flex gap-6 w-full">
                            <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                            <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                            <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Knallhart (Direkt)" />
                        </div>
                    </div>
                </div>

                {/* TEXT INPUT (Dunkle Black Box, weiße Schrift) */}
                <div className="space-y-5 pt-12 border-t border-white/5 relative">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Strategic Input</h3>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-blue-300 bg-blue-900/30 px-5 py-2 rounded-full border border-blue-500/20"><Info size={14}/> Profi-Tipp: Längerer Text = Präzisere KI-Analyse.</div>
                    </div>
                    <textarea 
                        className="w-full h-56 p-12 bg-black border-2 border-slate-800 rounded-[3rem] outline-none text-2xl font-bold text-white placeholder:text-slate-700 focus:border-blue-600 transition-all shadow-inner focus:shadow-[0_0_50px_rgba(37,99,235,0.15)] leading-relaxed" 
                        placeholder="Z.B. Warum traditionelle CRMs im Mittelstand bei 100+ Mitarbeitern versagen..." 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                    />
                </div>

                <button onClick={startInvestigation} disabled={loading || !input} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-12 rounded-[4rem] font-black text-sm uppercase tracking-[0.6em] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-6 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Sparkles size={28} />} INITIATE ENGINE
                </button>
            </div>
          </div>
        )}

        {/* COLUMBO NOIR (BAR VIEW) */}
        {activeStep === 'columbo' && (
          <div className="max-w-4xl mx-auto w-full animate-in zoom-in duration-700 flex-1 pb-32 pt-10">
            <div className="bg-[#0F172A] rounded-[5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] overflow-hidden relative border border-white/10">
                <div className="relative h-[32rem] w-full border-b-[10px] border-blue-600">
                    <img src={pixelBarUrl} alt="Pixel Bar" className="w-full h-full object-cover grayscale contrast-125 brightness-[0.6] scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent opacity-100"></div>
                    <div className="absolute bottom-16 left-16 p-10 bg-black/80 backdrop-blur-md rounded-[3rem] border border-white/10 max-w-md shadow-2xl">
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500">Strategic Triage</span>
                        <p className="text-3xl font-black italic text-white leading-tight mt-4 tracking-tighter">"One more thing... let's talk real strategy."</p>
                    </div>
                </div>
                
                <div className="p-20 -mt-24 relative bg-[#0F172A] rounded-t-[5rem] text-center space-y-16">
                    <div className="inline-block bg-white px-12 py-6 rounded-[2.5rem] shadow-2xl text-slate-900 font-black italic tracking-tighter text-2xl">Just one more thing...</div>
                    <p className="text-4xl font-bold text-white italic border-l-8 border-blue-600 pl-12 text-left leading-relaxed tracking-tight">"{columboData.question}"</p>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => {setSelectedAnswer(opt); runContentEngine('all', opt);}} className="bg-slate-800/50 hover:bg-blue-600 text-white p-10 rounded-[3rem] text-lg font-black transition-all border border-white/5 flex items-center justify-between group px-16 shadow-lg">
                                {opt} <ChevronRight size={32} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-4 transition-all text-blue-200" />
                            </button>
                        ))}
                        <div className="space-y-8 mt-16 pt-16 border-t border-slate-800 text-left">
                            <textarea className="w-full p-12 bg-black border-2 border-slate-800 rounded-[3.5rem] font-bold outline-none text-white focus:border-blue-600 h-44 text-xl shadow-inner focus:shadow-[0_0_30px_rgba(37,99,235,0.1)]" placeholder="Eigene Details hinzufügen..." value={customAnswer} onChange={(e) => setCustomAnswer(e.target.value)} />
                            <button onClick={() => runContentEngine('all', customAnswer)} disabled={loading || !customAnswer.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-12 rounded-[4rem] font-black uppercase text-sm flex items-center justify-center gap-6 hover:scale-[1.02] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all tracking-[0.4em] disabled:opacity-30 disabled:scale-100">
                                {loading ? <Loader2 className="animate-spin" size={28}/> : <Send size={28}/>} BEWEIS ABSENDEN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* LOADING (DER NEUE GROSSE LADEBALKEN) */}
        {activeStep === 'generating' && (
          <div className="max-w-xl mx-auto py-56 space-y-16 text-center animate-in fade-in flex-1">
            <div className="relative inline-flex items-center justify-center scale-[2] mb-16">
                <div className="w-32 h-32 border-[6px] border-blue-900/30 rounded-full border-t-blue-500 animate-spin" />
                <Zap size={40} className="absolute m-auto text-blue-500 fill-blue-500 animate-pulse" />
            </div>
            <div className="space-y-6">
                <h2 className="text-4xl font-black uppercase italic tracking-[0.3em] text-white drop-shadow-lg">{progressLabel || "Synthesizing Asset"}</h2>
                <div className="w-full bg-slate-900 h-6 rounded-full overflow-hidden border-2 border-slate-800 shadow-inner p-1">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.8)] relative overflow-hidden" style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
                <p className="text-xs font-black text-blue-500 uppercase tracking-[0.6em]">{Math.round(progress)}% Integrated</p>
            </div>
          </div>
        )}

        {/* RESULT VIEW */}
        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-10 pb-32 w-full pt-10">
            <div className="lg:col-span-7 space-y-12">
              <div className="flex gap-6 p-8 bg-[#0F172A] border border-white/10 rounded-[3rem] items-center shadow-2xl">
                 <div className="flex flex-col flex-1 px-4 border-r border-slate-700"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Segment</span><span className="text-sm text-white font-bold">{companySize}</span></div>
                 <div className="flex flex-col flex-1 px-4 border-r border-slate-700"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Persona</span><span className="text-sm text-white font-bold">{persona}</span></div>
                 <div className="flex flex-col flex-1 px-4"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Tone</span><span className="text-sm text-white font-bold">{tone}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <ContentCard title="Micro Hook" text={posts.micro} type="micro" icon={MessageCircle} color="bg-blue-500" charCount={true} />
                 <ContentCard title="Snack Post" text={posts.short} type="short" icon={AlignLeft} color="bg-blue-600" />
              </div>
              <ContentCard title="Standard LinkedIn Post" text={posts.medium} type="medium" icon={AlignCenter} color="bg-slate-500" />
              <ContentCard title="Strategic Deep-Dive" text={posts.long} type="long" icon={AlignJustify} color="bg-slate-700" />
            </div>
            
            <div className="lg:col-span-5 flex flex-col gap-12">
              <div className="bg-[#0F172A] p-10 rounded-[5rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10">
                <div className="flex justify-between items-center mb-8 px-4">
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Brand Visual</span>
                    <button onClick={() => runContentEngine('image')} className="p-4 bg-slate-800 rounded-full hover:bg-blue-600 hover:text-white transition-all text-slate-300">
                        <RefreshCw size={20} className={loadingItems.image ? 'animate-spin' : ''}/>
                    </button>
                </div>
                <div className="aspect-square bg-black rounded-[4rem] border-[12px] border-slate-900 overflow-hidden flex items-center justify-center relative group cursor-zoom-in mb-10 shadow-inner" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" size={64} /></div>}
                    {posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <Loader2 className="animate-spin text-slate-700" size={48} />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900/20 backdrop-blur-sm"><Maximize2 size={48} className="text-white drop-shadow-lg" /></div>
                </div>
                <div className="bg-black/50 p-6 rounded-[2.5rem] border border-slate-800 mb-8 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-3"><CalendarDays size={14}/> Schedule Date</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-5 bg-slate-900 border-2 border-slate-800 rounded-3xl text-white outline-none text-sm font-bold focus:border-blue-600 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <button onClick={archiveAsset} disabled={loading} className="py-10 bg-green-600 text-white rounded-[3.5rem] font-black text-xs uppercase shadow-[0_15px_30px_-10px_rgba(22,163,74,0.5)] hover:bg-green-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"><Save size={24}/> SAVE</button>
                    <button onClick={() => setActiveStep('library')} className="py-10 bg-slate-800 text-white rounded-[3.5rem] font-black text-xs uppercase shadow-xl hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-3 transition-all"><Library size={24}/> VAULT</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VAULT VIEW */}
        {activeStep === 'library' && (
          <div className="space-y-16 animate-in slide-in-from-right-16 pb-32 px-4 w-full flex-1 flex flex-col pt-10">
            <div className="flex justify-between items-end px-6 border-b border-slate-800 pb-10">
                <div><h2 className="text-8xl font-black uppercase italic tracking-tighter text-white leading-none">The Vault.</h2><p className="text-blue-500 text-[12px] font-bold uppercase tracking-[0.6em] mt-8">Strategic Asset Management</p></div>
                <button onClick={() => setActiveStep('input')} className="bg-white text-slate-900 px-16 py-6 rounded-full text-[12px] font-black uppercase shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all tracking-[0.3em]">Studio Return</button>
            </div>
            {assetLibrary.length === 0 ? (
                <div className="bg-[#0F172A]/50 p-60 rounded-[8rem] text-center border-4 border-dashed border-slate-800 flex flex-col items-center justify-center shadow-inner">
                    <Library size={100} className="text-slate-800 mb-12" />
                    <p className="text-slate-600 text-sm font-black uppercase tracking-[0.6em] italic">Vault is empty.</p>
                </div>
            ) : (
                <div className="space-y-16 border-l-4 border-blue-900/40 pl-16 ml-10 mt-16">
                    {assetLibrary.map((item) => (
                        <div key={item.id} className="relative group">
                            <div className="absolute -left-[4.6rem] top-12 w-10 h-10 bg-blue-600 rounded-full border-4 border-[#020617] shadow-[0_0_20px_rgba(37,99,235,0.6)] group-hover:scale-125 transition-transform duration-500"></div>
                            <div className="bg-[#0F172A] rounded-[5rem] border border-white/5 overflow-hidden flex flex-col shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] hover:-translate-y-4 transition-all duration-500">
                                <div className="p-12 bg-black/50 text-white flex justify-between items-center border-b border-white/5">
                                    <div className="flex items-center gap-10 flex-1">
                                        <div className="bg-blue-900/30 text-blue-400 px-6 py-3 rounded-2xl border border-blue-500/30 flex items-center gap-4"><Clock size={20}/> <span className="text-sm font-black uppercase tracking-widest">{item.scheduledDate || 'DRAFT'}</span></div>
                                        
                                        {editingId === item.id ? (
                                            <div className="flex items-center gap-4 flex-1 max-w-md">
                                                <input type="text" className="bg-slate-900 text-white px-6 py-3 rounded-2xl w-full outline-none font-bold text-lg border-2 border-blue-500" defaultValue={item.name} onBlur={(e) => updateAsset(item.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updateAsset(item.id, e.currentTarget.value)} autoFocus />
                                                <CheckCircle2 size={32} className="text-green-500 cursor-pointer" onClick={(e) => { const input = e.currentTarget.previousSibling as HTMLInputElement; updateAsset(item.id, input.value); }} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-6 flex-1 overflow-hidden">
                                                <span className="text-3xl font-black uppercase truncate italic tracking-tighter opacity-90">{item.name}</span>
                                                <button onClick={() => setEditingId(item.id)} className="p-3 rounded-full bg-white/5 opacity-50 hover:opacity-100 transition-opacity"><Edit3 size={20}/></button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-8 ml-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">{item.companySize}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-900/50">{item.persona}</span>
                                        <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-slate-600 hover:text-red-500 transition-all p-4 bg-black/40 rounded-full hover:bg-red-500/10"><Trash2 size={24} /></button>
                                    </div>
                                </div>
                                <div className="p-20 flex flex-col md:flex-row gap-20 items-center relative">
                                    {item.image && <div className="md:w-1/3 aspect-square rounded-[4rem] overflow-hidden shadow-2xl flex-shrink-0 cursor-zoom-in border-[8px] border-slate-900" onClick={() => setZoomedImage(item.image)}><img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /></div>}
                                    <div className="flex-1 flex flex-col justify-center space-y-10 z-10">
                                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.5em] italic">Micro Hook / Core Angle</p>
                                        <p className="text-4xl font-bold text-white line-clamp-3 italic tracking-tight leading-snug">"{item.micro}"</p>
                                        <div className="pt-12 mt-auto flex gap-6">
                                          <button onClick={() => {setPosts(item); setInput(item.topic); setActiveStep('result');}} className="px-16 py-8 bg-blue-600 text-white text-sm font-black uppercase tracking-[0.4em] hover:bg-blue-500 transition-all rounded-[3rem] shadow-[0_15px_30px_-10px_rgba(37,99,235,0.5)]">ASSET LADEN</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* ERROR OVERLAY */}
        {error && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-12 py-8 rounded-[3rem] shadow-[0_0_100px_rgba(220,38,38,0.5)] flex items-center gap-8 animate-bounce z-[100] border-4 border-red-500">
            <ShieldAlert size={40} />
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase italic leading-none tracking-tighter">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition-opacity p-2"><X size={32}/></button>
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .cursor-zoom-in { cursor: zoom-in; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #020617; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </div>
  );
}
