import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Users, Briefcase, Key, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair
} from 'lucide-react';

export default function App() {
  // --- CORE STATE (Deutsch als Standard) ---
  const [activeStep, setActiveStep] = useState('input'); 
  const [language, setLanguage] = useState('DE');
  
  // Guided Prompt Status
  const [companySize, setCompanySize] = useState('Mittelstand');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  const [input, setInput] = useState(''); 
  
  // --- API KEY (HART EINKODIERT FÜR VERCEL) ---
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
  const [editingId, setEditingId] = useState(null);
  const [copiedType, setCopiedType] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const columboImageUrl = "https://m.media-amazon.com/images/M/MV5BMzU4MDI3NTc2OV5BMl5BanBnXkFtZTgwNjMzNDIzMzE@._V1_.jpg";

  // --- API SERVICE ---
  const apiCall = async (url, payload, retries = 5) => {
    let delay = 1000;
    if (!apiKey) throw new Error("API-Schlüssel fehlt!");

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        if (!response.ok) throw new Error(`Netzwerkfehler: ${response.status}`);
        return await response.json();
      } catch (err) {
        if (i === retries - 1) throw new Error("Verbindung zur KI unterbrochen. Bitte erneut versuchen.");
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const parseJSON = (text) => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.options) {
        parsed.options = parsed.options.filter(o => o && o.length > 1 && o !== "A" && o !== "B");
      }
      return parsed;
    } catch (e) { 
      return { question: "Können Sie das strategische Ziel kurz erläutern?", options: [] }; 
    }
  };

  const startInvestigation = async () => {
    if (!input) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = `Du bist Inspektor Columbo. Kontext: B2B Marketing für Unternehmen der Größe ${companySize}. Persona: ${persona}. Tonalität: ${tone}. Thema: "${input}". Stelle EINE extrem kurze strategische Rückfrage (max. 10 Wörter). Antworte NUR in validem JSON: {"question": "...", "options": ["Strategie A", "Strategie B"]}. Sprache: Deutsch.`;
      const result = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { responseMimeType: "application/json" }
      });
      setColumboData(parseJSON(result.candidates[0].content.parts[0].text));
      setActiveStep('columbo');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const runContentEngine = async (type, answer) => {
    const finalAnswer = answer || customAnswer;
    if (type === 'all') { setActiveStep('generating'); setProgress(20); setProgressLabel(`Analysiere für ${persona}...`); }
    setLoadingItems(prev => ({ ...prev, [type]: true, ...(type === 'all' && { micro: true, short: true, medium: true, long: true, image: true }) }));
    setLoading(true);
    try {
      if (type === 'all' || ['micro', 'short', 'medium', 'long'].includes(type)) {
        const textPrompt = `B2B Enterprise Experte. Zielgruppe: ${companySize} Firmen. Persona: "${persona}". Tonfall: "${tone}". Thema: "${input}", Fokus: "${finalAnswer}". Erzeuge 4 Varianten: MICRO (<200 Zeichen Hook), KURZ (LinkedIn Snack), MITTEL (LinkedIn Post), LANG (Strategie Paper). JSON: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Sprache: Deutsch.`;
        const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          contents: [{ parts: [{ text: finalAnswer }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        const data = parseJSON(res.candidates[0].content.parts[0].text);
        setPosts(prev => ({ ...prev, ...data, description: data.visual }));
      }
      if (type === 'all' || type === 'image') {
        const imgRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          instances: [{ prompt: `Premium corporate infographic for ${persona} in ${companySize}, ${posts.description || 'data structure'}, royal blue theme, vector minimalist, 8k.` }]
        });
        if (imgRes.predictions?.[0]) setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgRes.predictions[0].bytesBase64Encoded}` }));
      }
      setActiveStep('result');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setLoadingItems({ micro: false, short: false, medium: false, long: false, image: false }); }
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const nameRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Erzeuge einen 2-Wort Namen für: "${input}".` }] }]
      });
      const name = nameRes.candidates[0].content.parts[0].text.trim().replace(/ /g, "_");
      setAssetLibrary([{ id: Date.now(), name, ...posts, topic: input, scheduledDate: scheduleDate, persona, companySize, tone, lang: language }, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { setError("Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
  };

  const loadFromArchive = (item) => {
    setPosts(item);
    setInput(item.topic);
    setLanguage(item.lang);
    setPersona(item.persona);
    setCompanySize(item.companySize);
    setTone(item.tone);
    setActiveStep('result');
  };

  // --- UI KOMPONENTEN ---
  const SelectionButton = ({ active, onClick, icon: Icon, label, desc }) => (
    <button onClick={onClick} className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left ${active ? 'bg-blue-600/20 border-blue-500 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
        <div className={`p-2 rounded-lg mb-3 ${active ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}><Icon size={16} /></div>
        <span className={`font-black text-[10px] uppercase tracking-widest mb-1 ${active ? 'text-white' : 'text-slate-300'}`}>{label}</span>
        <span className="text-[9px] text-slate-500 leading-tight">{desc}</span>
    </button>
  );

  const ContentCard = ({ title, text, type, icon: Icon, color, charCount }) => (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-600/30">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2"><Icon size={14} className="text-slate-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</span></div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-2 hover:bg-white/5 rounded-full transition-all">
          {copiedType === type ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-500" />}
        </button>
      </div>
      <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex-1 relative overflow-hidden">
        {loadingItems[type] && <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500" /></div>}
        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm">{text || "Bereite Asset vor..."}</p>
        {charCount && <div className={`mt-3 text-[8px] font-bold text-right uppercase ${text.length > 200 ? 'text-red-500' : 'text-slate-600'}`}>{text.length} / 200</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-3xl border border-white/10 shadow-3xl" alt="Preview" /></div>}
      
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 p-4 px-6 md:px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-4">
          {activeStep !== 'input' && <button onClick={() => setActiveStep('input')} className="p-2 bg-white/5 rounded-full text-blue-400 hover:bg-blue-600/20 active:scale-90 transition-all"><RotateCcw size={18}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white italic leading-tight">ELWIS LAB</h1>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">v19.1 | GERMAN FINAL</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-2.5 bg-white/5 rounded-xl border border-white/5 relative hover:bg-white/10 transition-all">
          <CalendarDays size={18} />
          {assetLibrary.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full text-[8px] flex items-center justify-center font-bold border border-[#020617]">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 w-full flex flex-col flex-1">
        {activeStep === 'input' && (
          <div className="max-w-4xl mx-auto w-full space-y-10 animate-in slide-in-from-bottom-10 pt-8 flex-1">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 mb-2"><ShieldCheck size={12} /> <span className="text-[9px] font-black uppercase tracking-widest italic">Marketing Architecture</span></div>
                <h2 className="text-5xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Studio.</h2>
            </div>
            
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><span className="bg-blue-600/20 text-blue-400 w-5 h-5 flex items-center justify-center rounded-full text-[8px]">1</span> Segment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectionButton active={companySize === 'Startup'} onClick={() => setCompanySize('Startup')} icon={Rocket} label="Startup" desc="Hohe Agilität & Speed." />
                        <SelectionButton active={companySize === 'Mittelstand'} onClick={() => setCompanySize('Mittelstand')} icon={Building2} label="Mittelstand" desc="Skalierung & Prozesse." />
                        <SelectionButton active={companySize === 'Konzern'} onClick={() => setCompanySize('Konzern')} icon={Globe2} label="Konzern" desc="Compliance & Sicherheit." />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><span className="bg-blue-600/20 text-blue-400 w-5 h-5 flex items-center justify-center rounded-full text-[8px]">2</span> Persona</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectionButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" desc="ROI & Risikomanagement." />
                        <SelectionButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" desc="Architektur & APIs." />
                        <SelectionButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" desc="Effizienz & Workflows." />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><span className="bg-blue-600/20 text-blue-400 w-5 h-5 flex items-center justify-center rounded-full text-[8px]">3</span> Tonfall</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectionButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" desc="Datengetrieben." />
                        <SelectionButton active={tone === 'Visionär'} onClick={() => setTone('Visionary')} icon={Lightbulb} label="Visionär" desc="Zukunftsorientiert." />
                        <SelectionButton active={tone === 'Direkt'} onClick={() => setTone('Direct')} icon={Crosshair} label="Ehrlich" desc="Direkt & Provokant." />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><span className="bg-blue-600/20 text-blue-400 w-5 h-5 flex items-center justify-center rounded-full text-[8px]">4</span> Thema</h3>
                    <textarea className="w-full h-32 p-6 bg-black/40 border border-white/10 rounded-3xl outline-none text-lg font-bold text-white focus:border-blue-500 transition-all shadow-inner" placeholder="Thema eingeben..." value={input} onChange={(e) => setInput(e.target.value)} />
                </div>

                <button onClick={startInvestigation} disabled={loading || !input} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-30">
                  {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />} LAB STARTEN
                </button>
            </div>
          </div>
        )}

        {activeStep === 'columbo' && (
          <div className="max-w-2xl mx-auto w-full animate-in zoom-in flex-1">
            <div className="bg-slate-900 rounded-[4rem] shadow-3xl overflow-hidden relative border border-white/5">
                <div className="relative h-[22rem] w-full border-b-4 border-blue-600">
                    <img src={columboImageUrl} alt="Columbo" className="w-full h-full object-cover grayscale contrast-125" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent"></div>
                </div>
                <div className="p-10 -mt-20 relative bg-[#020617]/95 backdrop-blur-2xl rounded-t-[4rem] text-center space-y-10">
                    <div className="inline-block bg-white px-8 py-4 rounded-2xl shadow-2xl text-slate-900 font-black italic">Just one more thing...</div>
                    <p className="text-2xl font-bold text-white italic border-l-4 border-blue-600 pl-8 text-left leading-relaxed">"{columboData.question}"</p>
                    <div className="grid grid-cols-1 gap-4">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => {setSelectedAnswer(opt); runContentEngine('all', opt);}} className="bg-white/5 hover:bg-blue-600 text-white p-6 rounded-[2rem] text-xs font-black transition-all border border-white/5 flex items-center justify-between group px-12">{opt} <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-all" /></button>
                        ))}
                        <div className="space-y-4 mt-8 pt-8 border-t border-white/10">
                            <textarea className="w-full p-8 bg-white/5 border border-white/10 rounded-[2rem] font-bold outline-none text-white focus:border-blue-600 h-32" placeholder="Zusätzlicher Kontext..." value={customAnswer} onChange={(e) => setCustomAnswer(e.target.value)} />
                            <button onClick={() => runContentEngine('all', customAnswer)} disabled={loading || !customAnswer.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[2.5rem] font-black uppercase text-xs flex items-center justify-center gap-5 hover:scale-[1.02] shadow-2xl transition-all">{loading ? <Loader2 className="animate-spin" /> : <Send size={20}/>} BEWEIS ABSENDEN</button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeStep === 'generating' && (
          <div className="max-w-md mx-auto w-full py-40 space-y-16 text-center flex-1">
            <div className="relative inline-flex items-center justify-center scale-150 mb-8"><div className="w-20 h-20 border-[4px] border-blue-500/10 rounded-full border-t-blue-600 animate-spin" /><Zap size={24} className="absolute m-auto text-blue-500 fill-blue-500 animate-pulse" /></div>
            <h2 className="text-2xl font-black uppercase italic tracking-[0.2em] text-white">{progressLabel}</h2>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden border border-white/5 shadow-inner"><div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in zoom-in pb-24 w-full">
            <div className="lg:col-span-7 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ContentCard title="Micro Bulletin" text={posts.micro} type="micro" icon={MessageCircle} color="bg-blue-400" charCount={true} />
                 <ContentCard title="Snack Post" text={posts.short} type="short" icon={AlignLeft} color="bg-blue-600" />
              </div>
              <ContentCard title="LinkedIn Feed Post" text={posts.medium} type="medium" icon={AlignCenter} color="bg-slate-600" />
              <ContentCard title="Strategic Deep-Dive" text={posts.long} type="long" icon={AlignJustify} color="bg-white/20" />
            </div>
            <div className="lg:col-span-5 flex flex-col gap-10">
              <div className="bg-slate-900 p-8 rounded-[4rem] shadow-3xl border border-white/5">
                <div className="aspect-square bg-black/40 rounded-[3rem] overflow-hidden flex items-center justify-center border-4 border-slate-800 shadow-2xl relative group cursor-zoom-in mb-8" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image && <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}
                    {posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Loader2 className="animate-spin text-blue-400" />}
                </div>
                <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 mb-6 space-y-4">
                    <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2"><CalendarDays size={12}/> Datum setzen</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={archiveAsset} disabled={loading} className="py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:bg-green-500 transition-all flex items-center justify-center gap-2"><Save size={18}/> SPEICHERN</button>
                    <button onClick={() => setActiveStep('library')} className="py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:bg-blue-500 active:scale-95 flex items-center justify-center gap-2"><Library size={18}/> VAULT</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 'library' && (
          <div className="space-y-12 animate-in slide-in-from-right-16 pb-32 px-4 w-full flex-1 flex flex-col">
            <div className="flex justify-between items-end">
                <div><h2 className="text-6xl font-black uppercase italic text-white leading-none">The Vault.</h2><p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.5em] mt-3">Strategic Repository</p></div>
                <button onClick={() => setActiveStep('input')} className="bg-white text-black px-10 py-4 rounded-full text-[10px] font-black uppercase shadow-3xl hover:scale-105 active:scale-95 transition-all">Studio</button>
            </div>
            {assetLibrary.length === 0 ? <div className="bg-gray-900/50 p-40 rounded-[6rem] text-center border-4 border-dashed border-white/5 flex flex-col items-center flex-1 justify-center"><Library size={60} className="text-gray-800 mb-8" /><p className="text-gray-600 text-xs italic uppercase">Vault ist leer.</p></div> : 
                <div className="space-y-10 border-l-2 border-blue-900/50 pl-8 ml-2 mt-10">
                    {assetLibrary.map((item) => (
                        <div key={item.id} className="bg-slate-900 rounded-[3.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl group">
                            <div className="p-6 bg-black/40 text-white flex justify-between items-center">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 flex items-center gap-2"><Clock size={12}/> <span className="text-[9px] font-black uppercase">{item.scheduledDate || 'ENTWURF'}</span></div>
                                    <span className="text-[12px] font-black uppercase truncate italic">{item.name}</span>
                                </div>
                                <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-white/10 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                            </div>
                            <div className="p-10 flex flex-col md:flex-row gap-10 bg-gray-900/30">
                                {item.image && <div className="md:w-1/4 aspect-square rounded-[2rem] overflow-hidden shadow-2xl flex-shrink-0 cursor-zoom-in" onClick={() => setZoomedImage(item.image)}><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>}
                                <div className="flex-1 flex flex-col justify-center space-y-4">
                                    <p className="text-[10px] font-black text-blue-500 uppercase italic opacity-60">Micro Hook Asset</p>
                                    <p className="text-xl font-bold text-white line-clamp-3 italic">"{item.micro}"</p>
                                    <button onClick={() => loadFromArchive(item)} className="px-8 py-4 bg-white/5 text-gray-400 text-[10px] font-black uppercase rounded-2xl hover:bg-blue-600 hover:text-white transition-all">Laden</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            }
          </div>
        )}

        {error && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-10 py-6 rounded-3xl shadow-2xl animate-bounce z-[100] border-4 border-red-500 flex items-center gap-4"><ShieldAlert size={24} /><span className="text-sm font-black uppercase italic">{error}</span></div>}
      </main>
    </div>
  );
}
