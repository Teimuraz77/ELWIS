import React, { useState } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Briefcase, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info
} from 'lucide-react';

export default function App() {
  // --- CORE STATE ---
  const [activeStep, setActiveStep] = useState('input'); 
  
  // Konfiguration (Horizontal, Ohne Startup)
  const [companySize, setCompanySize] = useState('Mittelstand');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  const [input, setInput] = useState(''); 
  
  // --- API KEY (WARNUNG: CLIENT-SIDE EXPOSED) ---
  const apiKey = "AIzaSyBqfwA5lTbTMssaZmbVneKanhskuVC0TpY"; 

  // --- APP STATE ---
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
  const [copiedType, setCopiedType] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const pixelBarUrl = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"; 

  // --- ROBUST API SERVICE ---
  const apiCall = async (url, payload, retries = 3) => {
    if (!apiKey) throw new Error("Kein API-Schlüssel gefunden.");
    let delay = 1000;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        return await response.json();
      } catch (err) {
        if (i === retries - 1) throw new Error("Die KI ist aktuell nicht erreichbar. Bitte später versuchen.");
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponentielles Backoff
      }
    }
  };

  // --- PANZER-PARSER FÜR JSON ---
  const parseColumboJSON = (text) => {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : text;
      const parsed = JSON.parse(jsonStr);
      
      // Filtern von Halluzinationen
      let safeOptions = [];
      if (Array.isArray(parsed.options)) {
          safeOptions = parsed.options.filter(o => typeof o === 'string' && o.length > 3 && !['A', 'B', 'Option A', 'Option B'].includes(o));
      }
      
      return { 
          question: parsed.question || "Können Sie die strategische Ausrichtung präzisieren?", 
          options: safeOptions 
      };
    } catch (e) { 
        console.error("Columbo Parse Error:", e);
        return { question: "Das Thema ist komplex. Was ist der genaue Fokus?", options: [] }; 
    }
  };

  const parseContentJSON = (text) => {
      try {
          const match = text.match(/\{[\s\S]*\}/);
          const jsonStr = match ? match[0] : text;
          const parsed = JSON.parse(jsonStr);
          return {
              micro: parsed.micro || "Generierung fehlgeschlagen.",
              short: parsed.short || "Generierung fehlgeschlagen.",
              medium: parsed.medium || "Generierung fehlgeschlagen.",
              long: parsed.long || "Generierung fehlgeschlagen.",
              description: parsed.visual || "Enterprise architecture visualization"
          };
      } catch (e) {
          console.error("Content Parse Error:", e);
          throw new Error("Die KI hat ein ungültiges Format geliefert.");
      }
  };

  // --- DER TÜRSTEHER ---
  const checkRelevance = async (text) => {
    try {
      const prompt = `Analysiere den folgenden Text auf Business-, Marketing- oder IT-Relevanz im B2B-Umfeld. Antworte AUSSCHLIESSLICH mit dem Wort "OK", wenn es relevant ist, oder mit dem Wort "QUATSCH", wenn es Unsinn, Beleidigungen oder komplett irrelevanter Text ist. Text: "${text}"`;
      const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      const answer = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase();
      return answer === "QUATSCH";
    } catch (e) { 
        return false; // Im Zweifelsfall durchwinken, damit das Tool nicht blockiert
    }
  };

  // --- LOGIK ---
  const startInvestigation = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    const isNonsense = await checkRelevance(input);
    if (isNonsense) {
        setError("Der Türsteher blockiert: Das Thema hat keine Business-Relevanz. Bitte formulieren Sie eine ernsthafte Strategie.");
        setLoading(false);
        return;
    }

    try {
      const prompt = `Du bist Inspektor Columbo, ein brillanter B2B-Stratege. 
      Kontext: Zielgruppe ist der ${companySize}. Angesprochen wird die Persona: ${persona}. Der gewünschte Tonfall ist ${tone}. 
      Das übergeordnete Thema des Users ist: "${input}". 
      Stelle EINE extrem kurze, scharfsinnige strategische Rückfrage (maximal 12 Wörter). 
      Gib ZWEI konkrete strategische Antwortmöglichkeiten vor, die der User wählen könnte. 
      Antworte AUSSCHLIESSLICH in diesem JSON-Format: {"question": "...", "options": ["Strategie 1", "Strategie 2"]}. 
      Wenn das Thema zu vage für Optionen ist, lass das Array leer []. Sprache: Deutsch.`;

      const result = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const parsedData = parseColumboJSON(result.candidates[0].content.parts[0].text);
      setColumboData(parsedData);
      setCustomAnswer(''); // Reset custom answer field
      setActiveStep('columbo');
    } catch (err) { 
        setError(err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const executeGeneration = async (type, answer) => {
    const finalAnswer = answer || customAnswer;
    if (type === 'all') { 
        setActiveStep('generating'); 
        setProgressLabel(`Synthetisiere Architektur für ${persona}...`); 
        animateProgress();
    }
    setLoadingItems(prev => ({ ...prev, [type]: true, ...(type === 'all' && { micro: true, short: true, medium: true, long: true, image: true }) }));
    setLoading(true);
    setError(null);

    try {
      if (type === 'all' || ['micro', 'short', 'medium', 'long'].includes(type)) {
        const textPrompt = `Du bist ein absoluter Top-Tier B2B Enterprise Marketing Experte.
        Parameter:
        - Ziel-Segment: ${companySize}
        - Ziel-Persona: ${persona}
        - Tonfall: ${tone}
        - Kernthema: "${input}"
        - Spezifischer Strategie-Fokus: "${finalAnswer}"
        
        Erzeuge 4 Textvarianten für eine Multi-Channel-Kampagne.
        1. "micro": Ein extrem kurzer, provokanter Hook (MUSS unter 190 Zeichen sein).
        2. "short": Ein knackiger Snack-Post (2-3 Sätze).
        3. "medium": Ein strukturierter LinkedIn Standard Post.
        4. "long": Ein tiefgehender Strategie-Beitrag oder Newsletter-Artikel.
        5. "visual": Eine englische Bildbeschreibung (Prompt) für eine hochprofessionelle, abstrakte B2B Vektorgrafik passend zum Thema.

        Antworte AUSSCHLIESSLICH im JSON-Format: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. 
        Nutze niemals das Wort "Elvis". Sprache der Texte: Deutsch.`;

        const res = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          contents: [{ parts: [{ text: finalAnswer }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        
        const data = parseContentJSON(res.candidates[0].content.parts[0].text);
        setPosts(prev => ({ ...prev, ...data }));
      }

      if (type === 'all' || type === 'image') {
        const imgRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          instances: [{ prompt: `Ultra-premium minimalist corporate business infographic for ${persona} in ${companySize}, concept: ${posts.description || 'data flow architecture'}, royal blue and dark slate theme, modern vector art, 8k resolution, clean background.` }]
        });
        if (imgRes.predictions?.[0]) {
            setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgRes.predictions[0].bytesBase64Encoded}` }));
        }
      }
      setActiveStep('result');
    } catch (err) { 
        setError(err.message); 
        if(type === 'all') setActiveStep('columbo'); // Fallback on total failure
    } finally { 
        setLoading(false); 
        setLoadingItems({ micro: false, short: false, medium: false, long: false, image: false }); 
    }
  };

  const handleCustomColumboSubmit = () => {
    if (!customAnswer.trim()) return;
    executeGeneration('all', customAnswer);
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const nameRes = await apiCall(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        contents: [{ parts: [{ text: `Generiere einen extrem kurzen, professionellen Namen aus genau 2 Worten für das Thema: "${input}". Gib NUR diesen Namen aus.` }] }]
      });
      const name = nameRes.candidates[0].content.parts[0].text.trim().replace(/[^a-zA-Z0-9\säöüßÄÖÜ]/g, "").replace(/\s+/g, "_");
      
      const newAsset = { 
        id: Date.now(), 
        name: name || "Kampagne_Alpha", 
        ...posts, 
        topic: input, 
        scheduledDate: scheduleDate, 
        persona, 
        companySize, 
        tone 
      };
      
      setAssetLibrary([newAsset, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { 
        setError("Archivierung fehlgeschlagen."); 
    } finally { 
        setLoading(false); 
    }
  };

  const loadFromArchive = (item) => {
    setPosts(item);
    setInput(item.topic);
    setPersona(item.persona);
    setCompanySize(item.companySize);
    setTone(item.tone);
    setScheduleDate(item.scheduledDate || '');
    setActiveStep('result');
  };

  // Fake Progress Animation
  const animateProgress = () => {
      setProgress(0);
      let p = 0;
      const interval = setInterval(() => {
          p += (Math.random() * 10);
          if (p >= 95) {
              clearInterval(interval);
          } else {
              setProgress(p);
          }
      }, 400);
  };

  // --- UI KOMPONENTEN ---
  const HorizontalButton = ({ active, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'}`}
    >
        <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
        <span className="font-black text-[11px] uppercase tracking-widest">{label}</span>
    </button>
  );

  const ContentCard = ({ title, text, type, icon: Icon, color, charCount }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-900/50">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${color} rounded-l-[2rem]`}></div>
      <div className="flex justify-between items-center mb-4 pl-2">
        <div className="flex items-center gap-3"><Icon size={16} className="text-slate-400" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span></div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          {copiedType === type ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-500 hover:text-slate-300" />}
        </button>
      </div>
      <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50 flex-1 relative overflow-hidden">
        {loadingItems[type] && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500" size={32}/></div>}
        <p className={`text-slate-200 leading-relaxed whitespace-pre-wrap ${type === 'micro' ? 'font-bold text-lg italic text-blue-100' : 'text-sm'}`}>{text || "Warte auf Synthese..."}</p>
        {charCount && <div className={`mt-4 text-[9px] font-bold text-right uppercase ${text.length > 200 ? 'text-red-500' : 'text-slate-600'}`}>{text.length} / 200</div>}
      </div>
      <button onClick={() => executeGeneration(type, selectedAnswer)} disabled={loadingItems[type]} className="mt-4 w-full py-3 bg-slate-800/50 hover:bg-blue-900/30 text-slate-400 hover:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-blue-800/50 disabled:opacity-50">
          Regenerieren
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/40 overflow-x-hidden flex flex-col">
      
      {/* Lightbox / Zoom */}
      {zoomedImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in" onClick={() => setZoomedImage(null)}>
              <button className="absolute top-8 right-8 text-white/50 hover:text-white p-2 bg-white/10 rounded-full transition-all"><X size={32}/></button>
              <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-2xl border border-slate-800 shadow-2xl" alt="Preview" />
          </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-slate-800 p-4 px-6 md:px-10 flex justify-between items-center shadow-2xl flex-shrink-0">
        <div className="flex items-center gap-6">
          {activeStep !== 'input' && <button onClick={() => setActiveStep('input')} className="p-2.5 bg-slate-800 rounded-full text-blue-400 hover:bg-blue-900/50 active:scale-95 transition-all"><RotateCcw size={18}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Marketing Architektur</h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">v24.0 | EXECUTIVE MONOLITH</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-3 bg-slate-800 rounded-xl border border-slate-700 relative hover:bg-slate-700 transition-colors">
          <CalendarDays size={18} className="text-slate-300" />
          {assetLibrary.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-[#020617]">{assetLibrary.length}</span>}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 w-full flex flex-col flex-1 relative">
        
        {/* === STEP 1: ENGINE CONFIGURATION === */}
        {activeStep === 'input' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-bottom-8 pt-8 pb-20">
            
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-900/30 text-blue-400 px-5 py-1.5 rounded-full border border-blue-800/50 mb-2">
                    <ShieldCheck size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Target Architecture Setup</span>
                </div>
                <h2 className="text-6xl font-black text-white leading-none tracking-tighter uppercase">Engine Config.</h2>
            </div>
            
            <div className="bg-slate-900/40 p-8 md:p-12 rounded-[3rem] border border-slate-800 shadow-2xl space-y-12">
                
                <div className="space-y-8">
                    {/* Segment */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Segment</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <HorizontalButton active={companySize === 'Mittelstand'} onClick={() => setCompanySize('Mittelstand')} icon={Building2} label="Mittelstand" />
                            <HorizontalButton active={companySize === 'Konzern'} onClick={() => setCompanySize('Konzern')} icon={Globe2} label="Konzern" />
                        </div>
                    </div>

                    {/* Persona */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Ziel-Persona</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                            <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                            <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                        </div>
                    </div>

                    {/* Tonfall */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Tonfall</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                            <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                            <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Direkt" />
                        </div>
                    </div>
                </div>

                {/* TEXT INPUT */}
                <div className="space-y-4 pt-8 border-t border-slate-800">
                    <div className="flex justify-between items-end mb-2 ml-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Thema / Strategischer Winkel</h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full"><Info size={12}/> Mehr Text = Präzisere Analyse.</div>
                    </div>
                    {/* HIER IST DIE SCHWARZE BOX MIT WEISSER SCHRIFT */}
                    <textarea 
                        className="w-full h-48 p-8 bg-black text-white text-xl font-bold placeholder:text-slate-700 outline-none rounded-[2rem] border border-slate-800 focus:border-blue-600 transition-colors shadow-inner resize-none" 
                        placeholder="Beschreibe das Problem, die Lösung oder den Aufhänger..." 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                    />
                </div>

                <button onClick={startInvestigation} disabled={loading || !input.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24} />} ENGINE STARTEN
                </button>
            </div>
          </div>
        )}

        {/* === STEP 2: COLUMBO PIXEL NOIR === */}
        {activeStep === 'columbo' && (
          <div className="max-w-4xl mx-auto w-full animate-in zoom-in duration-500 pb-20">
            <div className="bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800">
                {/* Header Image */}
                <div className="relative h-[24rem] w-full border-b-[6px] border-blue-600 bg-black">
                    <img src={pixelBarUrl} alt="Noir Bar" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    <div className="absolute bottom-10 left-10 p-6 bg-black/70 backdrop-blur-md rounded-2xl border border-slate-700 max-w-sm">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Strategisches Briefing</span>
                        <p className="text-xl font-bold text-white leading-tight mt-2">"Sneak peak on the Zero Audit Trilogy..."</p>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-10 md:p-16 text-center space-y-10">
                    <div className="inline-block bg-slate-800 px-8 py-3 rounded-full border border-slate-700 shadow-inner">
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-300">Just one more thing...</h2>
                    </div>
                    
                    <p className="text-3xl font-bold text-white italic border-l-4 border-blue-500 pl-8 text-left leading-relaxed">"{columboData.question}"</p>
                    
                    <div className="grid grid-cols-1 gap-4 pt-6">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => {setSelectedAnswer(opt); runContentEngine('all', opt);}} className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white p-6 rounded-2xl text-left font-bold transition-colors border border-slate-700 hover:border-blue-500 flex items-center justify-between group">
                                {opt} <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                            </button>
                        ))}
                        
                        <div className="space-y-4 mt-8 pt-8 border-t border-slate-800 text-left">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Eigener strategischer Kontext</label>
                            <textarea 
                                className="w-full p-6 bg-black text-white text-lg rounded-2xl border border-slate-700 outline-none focus:border-blue-500 h-32 resize-none" 
                                placeholder="Eigene Details eingeben..." 
                                value={customAnswer} 
                                onChange={(e) => setCustomAnswer(e.target.value)} 
                            />
                            <button onClick={() => runContentEngine('all', customAnswer)} disabled={loading || !customAnswer.trim()} className="w-full bg-slate-100 hover:bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>} ANTWORT BESTÄTIGEN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* === STEP 3: LOADING === */}
        {activeStep === 'generating' && (
          <div className="max-w-md mx-auto w-full py-32 text-center animate-in fade-in flex flex-col items-center justify-center flex-1">
            <div className="relative mb-10">
                <div className="w-24 h-24 border-[4px] border-slate-800 rounded-full border-t-blue-500 animate-spin" />
                <Zap size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white mb-6">{progressLabel}</h2>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{Math.round(progress)}% Synthetisiert</p>
          </div>
        )}

        {/* === STEP 4: RESULTS === */}
        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 pb-20 pt-4">
            
            <div className="lg:col-span-7 space-y-8">
              {/* Context Bar */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                 <div className="flex flex-col flex-1 p-4 border-r border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Segment</span>
                    <span className="text-xs text-white font-bold">{companySize}</span>
                 </div>
                 <div className="flex flex-col flex-1 p-4 border-r border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Persona</span>
                    <span className="text-xs text-white font-bold">{persona}</span>
                 </div>
                 <div className="flex flex-col flex-1 p-4">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Tonfall</span>
                    <span className="text-xs text-white font-bold">{tone}</span>
                 </div>
              </div>

              {/* Text Outputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <ContentCard title="Micro Hook" text={posts.micro} type="micro" icon={MessageCircle} color="bg-blue-400" charCount={true} />
                 <ContentCard title="Snack Post" text={posts.short} type="short" icon={AlignLeft} color="bg-blue-600" />
              </div>
              <ContentCard title="LinkedIn Standard" text={posts.medium} type="medium" icon={AlignCenter} color="bg-slate-600" />
              <ContentCard title="Strategic Deep-Dive" text={posts.long} type="long" icon={AlignJustify} color="bg-slate-800" />
            </div>
            
            <div className="lg:col-span-5 flex flex-col gap-8">
              {/* Visual Asset */}
              <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Brand Visual</span>
                    <button onClick={() => runContentEngine('image', selectedAnswer)} disabled={loadingItems.image} className="p-2 bg-slate-800 rounded-full hover:bg-blue-600 transition-colors text-slate-400 hover:text-white disabled:opacity-50">
                        <RefreshCw size={16} className={loadingItems.image ? 'animate-spin' : ''}/>
                    </button>
                </div>
                
                <div className="aspect-square bg-black rounded-[2rem] overflow-hidden flex items-center justify-center border-4 border-slate-950 shadow-inner relative group cursor-zoom-in mb-6" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}
                    {posts.image ? <img src={posts.image} alt="Generiertes Visual" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> : (!loadingItems.image && <ImageIcon className="text-slate-700" size={48}/>)}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900/20"><Maximize2 size={32} className="text-white drop-shadow-md" /></div>
                </div>
                
                {/* Save Logic */}
                <div className="space-y-4 border-t border-slate-800 pt-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1"><CalendarDays size={14}/> Geplanter Termin</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-4 bg-black border border-slate-700 rounded-xl text-white outline-none text-sm focus:border-blue-500 font-medium" />
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button onClick={archiveAsset} disabled={loading} className="py-4 bg-green-600/90 hover:bg-green-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            <Save size={16}/> Speichern
                        </button>
                        <button onClick={() => setActiveStep('library')} className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                            <Library size={16}/> Archiv
                        </button>
                    </div>
                </div>
              </div>
              
              {/* Q2 Teaser */}
              <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-[2.5rem] border border-slate-800 text-center relative overflow-hidden">
                 <Rocket size={120} className="absolute -right-4 -bottom-4 text-slate-800 opacity-20 rotate-12" />
                 <div className="relative z-10 flex flex-col items-center">
                     <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-full mb-3 border border-blue-800/50">Q2 Roadmap</span>
                     <h4 className="text-xl font-black text-white uppercase tracking-tight">King of Leads</h4>
                     <p className="text-xs text-slate-500 mt-2">Autonome Pipeline in Vorbereitung.</p>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 5: VAULT / LIBRARY === */}
        {activeStep === 'library' && (
          <div className="space-y-10 animate-in slide-in-from-right-8 pb-20 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-800 pb-8">
                <div>
                    <h2 className="text-5xl font-black uppercase tracking-tighter text-white">The Vault.</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Kampagnen-Repository</p>
                </div>
                <button onClick={() => setActiveStep('input')} className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-black uppercase shadow-lg hover:bg-slate-200 transition-colors">
                    Neuer Track
                </button>
            </div>
            
            {assetLibrary.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-900/30 rounded-[3rem] border border-slate-800 border-dashed">
                    <Library size={48} className="text-slate-700 mb-6" />
                    <p className="text-slate-500 text-sm font-medium">Das Archiv ist noch leer.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {assetLibrary.sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map((item) => (
                        <div key={item.id} className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden flex flex-col md:flex-row transition-all hover:border-slate-600 group">
                            
                            {/* Visual Thumbnail (if any) */}
                            {item.image ? (
                                <div className="w-full md:w-48 h-48 md:h-auto bg-black relative flex-shrink-0 cursor-zoom-in" onClick={() => setZoomedImage(item.image)}>
                                    <img src={item.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Thumb"/>
                                    <div className="absolute inset-0 border-r border-slate-800"></div>
                                </div>
                            ) : (
                                <div className="w-full md:w-48 h-48 md:h-auto bg-slate-950 flex items-center justify-center border-r border-slate-800 flex-shrink-0">
                                    <ImageIcon size={32} className="text-slate-800" />
                                </div>
                            )}

                            {/* Content Info */}
                            <div className="p-6 md:p-8 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[9px] font-black uppercase bg-slate-800 text-slate-300 px-2 py-1 rounded">{item.companySize}</span>
                                            <span className="text-[9px] font-black uppercase bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-800/30">{item.persona}</span>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white">{item.name}</h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        {item.scheduledDate && <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold"><CalendarDays size={12}/> {item.scheduledDate}</div>}
                                        <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-slate-600 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                
                                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed flex-1 italic">"{item.micro}"</p>
                                
                                <div className="mt-6 pt-4 border-t border-slate-800">
                                    <button onClick={() => loadFromArchive(item)} className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-2">
                                        Im Studio öffnen <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* --- GLOBAL ERROR ALERT --- */}
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-950 text-red-200 px-6 py-4 rounded-2xl shadow-2xl border border-red-900 flex items-center gap-4 z-[200] max-w-[90vw] animate-in slide-in-from-bottom-4">
            <ShieldAlert size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 p-1 text-red-500 hover:text-red-300 rounded"><X size={16}/></button>
          </div>
        )}
      </main>
    </div>
  );
}
