import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Briefcase, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info, Edit3, Search, Link as LinkIcon, AlertTriangle,
  Users, PhoneCall, Video, MessageSquareHelp, MapPin, History, RefreshCcw
} from 'lucide-react';

export default function App() {
  const [activeStep, setActiveStep] = useState('campaign_select'); 
  const [campaignType, setCampaignType] = useState(''); 
  
  // --- KEYS: HIER EINTRAGEN ---
  // Achtung: Um die Kreditkarte 100% zu schützen, muss das nach dem Pitch ins Backend verlagert werden!
  const googleApiKey = "AIzaSyBqfwA5lTbTMssaZmbVneKanhskuVC0TpY"; 
  const heliconeApiKey = ""; 

  const [targetCompany, setTargetCompany] = useState('');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  
  const [warmType, setWarmType] = useState('event'); 
  const [warmContext, setWarmContext] = useState(''); 
  const [followUpAction, setFollowUpAction] = useState('Telefonat');

  const [columboData, setColumboData] = useState({ question: '', options: [] });
  const [customAnswer, setCustomAnswer] = useState('');
  const [researchTopics, setResearchTopics] = useState([]);
  const [groundingSources, setGroundingSources] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [posts, setPosts] = useState({ micro: '', short: '', medium: '', long: '', image: null, description: '' });
  const [scheduleDate, setScheduleDate] = useState('');
  
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState({ micro: false, short: false, medium: false, long: false, image: false });
  const [error, setError] = useState(null);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [copiedType, setCopiedType] = useState(null);

  const pixelBarUrl = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"; 

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn-pitch')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn-pitch';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (loading && progress < 98) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 40) return prev + 6;
          if (prev < 85) return prev + 1.5;
          return prev + 0.2;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  const resetEngine = () => {
    setTargetCompany('');
    setWarmContext('');
    setResearchTopics([]);
    setGroundingSources([]);
    setCustomAnswer('');
    setActiveStep('campaign_select');
  };

  // --- HELICONE GATEWAY API CALLER ---
  const apiCall = async (payload, useSearch = false) => {
    if (!googleApiKey || !heliconeApiKey) throw new Error("API-Schlüssel fehlen! Bitte Google und Helicone Key eintragen.");
    
    // Routing über Helicone Gateway statt direkt zu Google
    let url = `https://gateway.helicone.ai/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${googleApiKey}`;
    
    if (useSearch) {
        payload.tools = [{ "google_search": {} }];
    }

    const retries = 3;
    const delays = [1000, 3000, 6000];
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Helicone-Auth': `Bearer ${heliconeApiKey}`,
            'Helicone-Target-Url': 'https://generativelanguage.googleapis.com'
          }, 
          body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Helicone/Google Error ${response.status}: ${errText}`);
        }
        return await response.json();
      } catch (err) {
        if (i === retries - 1) throw new Error("Helicone Gateway meldet Funkstille: " + err.message);
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  };

  const parseJSON = (text) => {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : text;
      return JSON.parse(jsonStr);
    } catch (e) { return null; }
  };

  const checkRelevance = async (text) => {
    try {
      const res = await apiCall({
        contents: [{ parts: [{ text: `Analysiere auf B2B Relevanz: "${text}". Antworte AUSSCHLIESSLICH "OK" (seriös) oder "QUATSCH".` }] }]
      });
      return res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() === "QUATSCH";
    } catch (e) { return false; }
  };

  const startColdResearch = async () => {
    if (!targetCompany.trim()) { setError("Bitte Firmennamen eingeben."); return; }
    
    setLoading(true); setProgress(5); setProgressLabel(`Durchsuche Web nach ${targetCompany}...`); setError(null);

    if (await checkRelevance(targetCompany)) {
        setError("Nonsense erkannt. Bitte seriösen Firmennamen eingeben.");
        setLoading(false); setProgress(0); return;
    }

    try {
      const prompt = `Du bist ein B2B Analyst. Recherchiere aktuellste News zu "${targetCompany}".
      Entwickle 3 hochaktuelle strategische Aufhänger für einen Pitch an ${persona}.
      REGEL: Beziehe dich strikt auf echte Ereignisse aus der Google Suche.
      Antworte in JSON: {"topics": [{"title": "Titel", "rationale": "Schmerzpunkt/Relevanz"}]}`;

      const result = await apiCall({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }, true);
      const parsed = parseJSON(result.candidates[0].content.parts[0].text);
      
      let sources = [];
      const grounding = result.candidates?.[0]?.groundingMetadata?.groundingAttributions;
      if (grounding && Array.isArray(grounding)) {
          sources = grounding.map(a => ({ uri: a.web?.uri, title: a.web?.title })).filter(s => s.uri); 
      }

      if (!parsed || !parsed.topics || parsed.topics.length === 0) throw new Error("Keine validen Aufhänger gefunden.");

      setResearchTopics(parsed.topics);
      setGroundingSources(sources);
      setActiveStep('topic_selection');
    } catch (err) { setError(err.message || "Fehler bei der Live-Recherche."); } 
    finally { setLoading(false); setProgress(0); }
  };

  const startWarmEngine = async () => {
    if (!targetCompany.trim() || !warmContext.trim()) {
        setError("Bitte alle Felder ausfüllen."); return;
    }
    
    setActiveStep('generating'); setProgress(15); setProgressLabel(`Generiere Warm-Outreach für ${targetCompany}...`);
    setLoadingItems({ micro: true, short: true, medium: true, long: true, image: true });
    setLoading(true); setError(null);

    try {
      let contextSetup = "";
      if (warmType === 'event') {
          contextSetup = `Wir haben Vertreter der Firma "${targetCompany}" auf dem Event "${warmContext}" getroffen oder gesehen. Wir beziehen uns auf dieses Event.`;
      } else if (warmType === 'lost_deal') {
          contextSetup = `Wir hatten in der Vergangenheit eine Verkaufschance bei "${targetCompany}", die nicht zustande kam. Grund damals: "${warmContext}". Wir wollen das Thema professionell neu aufrollen.`;
      } else if (warmType === 'old_contact') {
          contextSetup = `Wir hatten in der Vergangenheit bereits Kontakt mit "${targetCompany}". Letzter Kontakt: "${warmContext}". Zeit für einen Ping.`;
      }

      const actionText = 
        followUpAction === 'Telefonat' ? "Das Ziel ist ein kurzes, 10-minütiges Telefonat zum Abgleich." :
        followUpAction === 'Video' ? "Das Ziel ist ein tiefergehender Videocall." :
        "Das Ziel ist es, eine provokante, offene Frage zur aktuellen Architektur zu stellen.";

      const textPrompt = `Du bist ein B2B Enterprise Marketing Experte. 
      ${contextSetup}
      Ziel-Persona: "${persona}". Tonfall: "${tone}".
      Call-to-Action: ${actionText}
      
      Erzeuge 4 Textvarianten:
      1. "micro": Kurze LinkedIn-Vernetzungsnachricht (max 190 Zeichen, charmanter Aufhänger).
      2. "short": Kurze, knackige Follow-Up Mail (2-3 Sätze).
      3. "medium": Ein LinkedIn Post über unsere Learnings aus diesem Kontext.
      4. "long": Eine detaillierte Strategie-Mail.
      5. "visual": Englische Prompt-Beschreibung für eine Vektorgrafik passend zum Kontext.
      
      JSON-Format: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Sprache: Deutsch.`;
      
      const res = await apiCall({ contents: [{ parts: [{ text: textPrompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = parseJSON(res.candidates[0].content.parts[0].text);
      
      if(data) {
          setPosts({ 
              micro: data.micro || "Fehler.", short: data.short || "Fehler.", medium: data.medium || "Fehler.", long: data.long || "Fehler.", description: data.visual || "Business re-engagement abstract art", image: null
          });
          setGroundingSources([]); 
          
          let topicTitle = "Follow-Up";
          if(warmType === 'event') topicTitle = `Event: ${warmContext}`;
          if(warmType === 'lost_deal') topicTitle = `Lost Deal Re-Engagement`;
          if(warmType === 'old_contact') topicTitle = `Old Contact Refresh`;
          
          setSelectedTopic({ title: topicTitle, rationale: actionText });
      }

      generateImage(data ? data.visual : "Corporate business relationship abstract tech");
      setActiveStep('result');
    } catch (err) { setError("Engine Fehler: " + err.message); setActiveStep('input_warm'); } 
    finally { setLoading(false); setLoadingItems({ micro: false, short: false, medium: false, long: false, image: true }); setProgress(0); }
  };

  const runContentEngine = async (topic) => {
    setSelectedTopic(topic);
    setActiveStep('generating'); setProgress(10); setProgressLabel(`Synthetisiere Content für ${persona}...`); 
    setLoadingItems({ micro: true, short: true, medium: true, long: true, image: true });
    setLoading(true); setError(null);

    const sourcesText = groundingSources.length > 0 ? groundingSources.map((s, i) => `[${i+1}] ${s.uri}`).join("\n") : "Keine URLs.";

    try {
      const textPrompt = `Zielunternehmen: ${targetCompany}. Persona: "${persona}". Tonfall: "${tone}". 
      Aufhänger: "${topic.title} - ${topic.rationale}".
      Nutze diese Quellen: ${sourcesText}

      Erzeuge 4 Varianten:
      1. "micro": Provokanter Hook (unter 190 Zeichen).
      2. "short": Knackiger Snack-Post (2-3 Sätze).
      3. "medium": LinkedIn Post inkl. Quellen.
      4. "long": Tiefgehender Pitch-Beitrag.
      5. "visual": Englische Prompt-Beschreibung für B2B Vektorgrafik.
      
      JSON: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Deutsch.`;
      
      const res = await apiCall({ contents: [{ parts: [{ text: textPrompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = parseJSON(res.candidates[0].content.parts[0].text);
      if(data) {
          setPosts({ micro: data.micro, short: data.short, medium: data.medium, long: data.long, description: data.visual, image: null });
      }

      generateImage(data ? data.visual : "Corporate business transformation data");
      setActiveStep('result');
    } catch (err) { setError("Engine Fehler."); setActiveStep('topic_selection'); } 
    finally { setLoading(false); setLoadingItems({ micro: false, short: false, medium: false, long: false, image: true }); setProgress(0); }
  };

  const generateImage = async (promptText) => {
      try {
        const response = await fetch(`https://gateway.helicone.ai/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`, {
            method: 'POST', 
            headers: { 
              'Content-Type': 'application/json',
              'Helicone-Auth': `Bearer ${heliconeApiKey}`,
              'Helicone-Target-Url': 'https://generativelanguage.googleapis.com'
            },
            body: JSON.stringify({ instances: [{ prompt: `Ultra-premium corporate business infographic, concept: ${promptText}, royal blue and dark slate theme, modern minimalist vector art, 8k.` }] })
        });
        const imgData = await response.json();
        if (imgData.predictions && imgData.predictions[0]) {
            setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgData.predictions[0].bytesBase64Encoded}` }));
        }
      } catch (err) { console.error("Bildgenerierung fehlgeschlagen"); } 
      finally { setLoadingItems(prev => ({...prev, image: false})); }
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const name = `${targetCompany.replace(/[^a-zA-Z0-9]/g, "")}_${campaignType === 'warm' ? 'Warm' : 'Cold'}`.substring(0, 20);
      const newAsset = { 
          id: Date.now(), name: name, ...posts, topic: selectedTopic?.title || 'Unknown', scheduledDate: scheduleDate, 
          persona, companySize: targetCompany, tone, sources: groundingSources, type: campaignType, date: new Date().toLocaleDateString() 
      };
      setAssetLibrary([newAsset, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { setError("Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
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

  const HorizontalButton = ({ active, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}`}
    >
        <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
        <span className="font-bold text-[11px] uppercase tracking-widest truncate">{label}</span>
    </button>
  );

  const ContentCard = ({ title, text, type, icon: Icon, color }) => (
    <div className="bg-[#0F172A] border border-slate-800 rounded-[2.5rem] p-8 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-500/40 group">
      <div className={`absolute top-0 left-0 w-2 h-full ${color} rounded-l-[2.5rem]`}></div>
      <div className="flex justify-between items-center mb-6 pl-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3"><Icon size={18} className="text-slate-400" /><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</span></div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all text-slate-300">
          {copiedType === type ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
        </button>
      </div>
      <div className="bg-black/50 p-6 rounded-3xl border border-slate-800 flex-1 overflow-y-auto relative ml-4">
        {loadingItems[type] && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}
        <p className={`text-slate-200 leading-relaxed whitespace-pre-wrap ${type === 'micro' ? 'font-bold text-xl italic text-blue-100' : 'text-sm'}`}>{text || "Warte auf Engine..."}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/40 overflow-x-hidden">
      
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 animate-in fade-in" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-8 right-8 text-white/50 hover:text-white p-2 bg-white/10 rounded-full transition-all"><X size={32}/></button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-2xl border border-slate-800 shadow-2xl" alt="Preview" />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800 p-5 px-6 md:px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-6">
          {activeStep !== 'campaign_select' && <button onClick={resetEngine} className="p-3 bg-slate-800 rounded-full text-blue-400 hover:bg-slate-700 active:scale-95 transition-all"><RotateCcw size={20}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white italic">ELWIS LAB</h1>
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-1">v37.0 | HELICONE SECURED</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 relative hover:bg-slate-700 transition-all">
          <CalendarDays size={20} className="text-white" />
          {assetLibrary.length > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full text-[10px] flex items-center justify-center font-black border-2 border-[#020617] shadow-lg text-white">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10 w-full flex flex-col flex-1">
        
        {activeStep === 'campaign_select' && (
          <div className="max-w-5xl mx-auto w-full space-y-16 animate-in slide-in-from-bottom-10 pt-20 flex-1 pb-40">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 mb-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"><Rocket size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Campaign Initialization</span></div>
                <h2 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Wähle deinen <br/>Angriffsvektor.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div onClick={() => { setCampaignType('cold'); setActiveStep('input_cold'); }} className="bg-[#0F172A] p-12 rounded-[4rem] border-4 border-slate-800 hover:border-blue-600 shadow-2xl hover:shadow-[0_0_50px_rgba(37,99,235,0.3)] transition-all cursor-pointer group relative overflow-hidden flex flex-col items-center text-center gap-8">
                    <div className="absolute -right-10 -top-10 bg-blue-600/10 w-64 h-64 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all"></div>
                    <div className="p-8 bg-black/50 rounded-full border-2 border-slate-800 group-hover:scale-110 transition-transform"><Search size={64} className="text-blue-500" /></div>
                    <div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Kaltakquise</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Die KI führt eine Live-Recherche (Google Grounding) zum Unternehmen durch und generiert hochrelevante Eisbrecher basierend auf aktuellen News.</p>
                    </div>
                </div>

                <div onClick={() => { setCampaignType('warm'); setActiveStep('input_warm'); }} className="bg-[#0F172A] p-12 rounded-[4rem] border-4 border-slate-800 hover:border-purple-600 shadow-2xl hover:shadow-[0_0_50px_rgba(147,51,234,0.3)] transition-all cursor-pointer group relative overflow-hidden flex flex-col items-center text-center gap-8">
                    <div className="absolute -left-10 -bottom-10 bg-purple-600/10 w-64 h-64 rounded-full blur-[80px] group-hover:bg-purple-600/20 transition-all"></div>
                    <div className="p-8 bg-black/50 rounded-full border-2 border-slate-800 group-hover:scale-110 transition-transform"><Users size={64} className="text-purple-500" /></div>
                    <div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Bestandskontakte</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Aktiviere alte Leads neu. Generiere intelligente Follow-Ups für Messe-Kontakte, verlorene Deals oder alte Kunden.</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeStep === 'input_cold' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-right-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 mb-2"><Search size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Cold Outreach Module</span></div>
                <h2 className="text-6xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Target Lock.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-8 md:p-12 rounded-[4rem] border border-slate-800 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px]"></div>
                
                <div className="space-y-5 relative z-10">
                    <label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic block pl-4">I. Zielunternehmen</label>
                    <div className="relative">
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input type="text" className="w-full p-8 pl-16 bg-black border-2 border-slate-800 rounded-[2.5rem] outline-none text-3xl font-black text-white placeholder:text-slate-800 focus:border-blue-600 transition-all shadow-inner uppercase tracking-wide" placeholder="Z.B. SIEMENS, SAP..." value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10 relative z-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] pl-4">II. Ansprechpartner (Persona)</p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level / Exec" />
                            <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech / IT Lead" />
                            <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] pl-4">III. Tonfall</p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                            <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                            <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Knallhart" />
                        </div>
                    </div>
                </div>

                <button onClick={startColdResearch} disabled={loading || !targetCompany.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-10 rounded-[3.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-6 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Search size={28} />} LIVE-RECHERCHE STARTEN
                </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-slate-600 text-xs font-bold uppercase tracking-widest"><CheckCircle2 size={14}/> Helicone Security & Google Grounding Aktiviert</div>
          </div>
        )}

        {activeStep === 'input_warm' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-left-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-purple-900/30 text-purple-400 px-6 py-2 rounded-full border border-purple-500/30 mb-2"><Users size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Warm Outreach Module</span></div>
                <h2 className="text-6xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Re-Engagement.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-8 md:p-12 rounded-[4rem] border border-slate-800 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px]"></div>
                
                <div className="space-y-4 relative z-10 border-b border-slate-800 pb-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] pl-4 mb-4">I. Typ des Bestandskontakts</p>
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <HorizontalButton active={warmType === 'event'} onClick={() => setWarmType('event')} icon={MapPin} label="Messe / Event" />
                        <HorizontalButton active={warmType === 'lost_deal'} onClick={() => setWarmType('lost_deal')} icon={History} label="Lost Opportunity" />
                        <HorizontalButton active={warmType === 'old_contact'} onClick={() => setWarmType('old_contact')} icon={RefreshCcw} label="Alter Kontakt" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic block pl-4">Firmenname</label>
                        <div className="relative">
                            <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input type="text" className="w-full p-6 pl-14 bg-black border-2 border-slate-800 rounded-3xl outline-none text-xl font-bold text-white placeholder:text-slate-800 focus:border-purple-600 transition-all shadow-inner" placeholder="Z.B. SIEMENS" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic block pl-4">
                            {warmType === 'event' && "Welches Event / Messe?"}
                            {warmType === 'lost_deal' && "Warum ging der Deal verloren?"}
                            {warmType === 'old_contact' && "Kontext / Letzter Kontakt?"}
                        </label>
                        <div className="relative">
                            {warmType === 'event' && <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                            {warmType === 'lost_deal' && <History className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                            {warmType === 'old_contact' && <RefreshCcw className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                            
                            <input type="text" className="w-full p-6 pl-14 bg-black border-2 border-slate-800 rounded-3xl outline-none text-xl font-bold text-white placeholder:text-slate-800 focus:border-purple-600 transition-all shadow-inner" 
                                placeholder={
                                    warmType === 'event' ? "Z.B. OMR 2026, DMEXCO..." : 
                                    warmType === 'lost_deal' ? "Z.B. War damals zu teuer..." : 
                                    "Z.B. Vor 2 Jahren bei Projekt X..."
                                } 
                                value={warmContext} onChange={(e) => setWarmContext(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10 relative z-10 border-t border-slate-800 pt-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] pl-4">Call-To-Action (Nächster Schritt)</p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <HorizontalButton active={followUpAction === 'Telefonat'} onClick={() => setFollowUpAction('Telefonat')} icon={PhoneCall} label="Kurzes Telefonat" />
                            <HorizontalButton active={followUpAction === 'Video'} onClick={() => setFollowUpAction('Video')} icon={Video} label="Videokonferenz" />
                            <HorizontalButton active={followUpAction === 'Frage'} onClick={() => setFollowUpAction('Frage')} icon={MessageSquareHelp} label="Offene Frage" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] pl-4">Ziel-Persona</p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                            <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                            <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Operator" />
                        </div>
                    </div>
                </div>

                <button onClick={startWarmEngine} disabled={loading || !targetCompany.trim() || !warmContext.trim()} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-10 rounded-[3.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-[0_20px_50px_-10px_rgba(147,51,234,0.5)] flex items-center justify-center gap-6 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Zap size={28} />} OUTREACH GENERIEREN
                </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-slate-600 text-xs font-bold uppercase tracking-widest"><CheckCircle2 size={14}/> Helicone Security & Google Grounding Aktiviert</div>
          </div>
        )}

        {activeStep === 'topic_selection' && (
          <div className="max-w-5xl mx-auto w-full animate-in zoom-in duration-500 flex-1 pb-32 pt-4">
            <div className="mb-10 space-y-4">
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase border-l-8 border-blue-600 pl-6">Strategie-Vorschläge für {targetCompany}</h2>
                <p className="text-slate-400 pl-8 max-w-2xl">Wähle den besten aktuellen Aufhänger für deinen Kaltakquise-Pitch.</p>
            </div>

            <div className="grid gap-6">
                {researchTopics.map((topic, i) => (
                    <div key={i} className="bg-[#0F172A] border border-slate-800 rounded-[3rem] p-8 md:p-10 hover:border-blue-500/50 transition-all flex flex-col md:flex-row gap-8 items-center group shadow-2xl">
                        <div className="flex-1 space-y-4">
                            <h3 className="text-2xl font-black text-white tracking-tight">{topic.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{topic.rationale}</p>
                        </div>
                        <button onClick={() => runContentEngine(topic)} className="w-full md:w-auto px-10 py-6 bg-blue-600/10 text-blue-400 border border-blue-600/30 rounded-full font-black uppercase text-[10px] tracking-[0.4em] group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 flex items-center justify-center gap-3">
                            Auswählen <ChevronRight size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-16 bg-black/50 p-8 rounded-[3rem] border border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 flex items-center gap-3"><LinkIcon size={14}/> Verifizierte Quellen</h4>
                {groundingSources.length > 0 ? (
                    <ul className="space-y-3">
                        {groundingSources.map((source, i) => (
                            <li key={i} className="text-sm truncate text-blue-400 hover:underline">
                                <a href={source.uri} target="_blank" rel="noopener noreferrer">[{i+1}] {source.title || source.uri}</a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center gap-3 text-amber-500 text-sm bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                        <AlertTriangle size={16} /> Keine spezifischen News gefunden.
                    </div>
                )}
            </div>
          </div>
        )}

        {activeStep === 'generating' && (
          <div className="max-w-2xl mx-auto py-56 space-y-16 text-center animate-in fade-in flex-1">
            <div className="relative inline-flex items-center justify-center scale-[2] mb-16">
                <div className={`w-32 h-32 border-[8px] border-slate-800 rounded-full ${campaignType === 'warm' ? 'border-t-purple-500' : 'border-t-blue-500'} animate-spin`} />
                <Zap size={40} className={`absolute m-auto ${campaignType === 'warm' ? 'text-purple-500 fill-purple-500' : 'text-blue-500 fill-blue-500'} animate-pulse`} />
            </div>
            <div className="space-y-8">
                <h2 className="text-4xl font-black uppercase italic tracking-[0.3em] text-white drop-shadow-lg">{progressLabel}</h2>
                <div className="w-full bg-slate-900 h-8 rounded-full overflow-hidden border-4 border-slate-800 shadow-inner p-1">
                    <div className={`h-full ${campaignType === 'warm' ? 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.8)]' : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)]'} rounded-full transition-all duration-300 relative overflow-hidden flex items-center justify-end pr-4`} style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-10 pb-32 w-full pt-8">
            <div className="lg:col-span-7 space-y-10">
              <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#0F172A] border border-slate-800 rounded-[2.5rem] items-center shadow-2xl">
                 <div className="flex flex-col flex-1 px-4 sm:border-r border-slate-700 w-full"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Target</span><span className={`text-sm font-bold truncate ${campaignType === 'warm' ? 'text-purple-400' : 'text-blue-400'}`}>{targetCompany}</span></div>
                 <div className="flex flex-col flex-1 px-4 sm:border-r border-slate-700 w-full"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Persona</span><span className="text-sm text-white font-bold">{persona}</span></div>
                 <div className="flex flex-col flex-1 px-4 w-full"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">{campaignType === 'warm' ? 'Context' : 'Tone'}</span><span className="text-sm text-white font-bold truncate">{campaignType === 'warm' ? (warmType === 'event' ? 'Messe' : warmType === 'lost_deal' ? 'Lost Deal' : 'Refresh') : tone}</span></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ContentCard title="Micro Hook" text={posts.micro} type="micro" icon={MessageCircle} color={campaignType === 'warm' ? 'bg-purple-500' : 'bg-blue-500'} />
                 <ContentCard title="Snack Post" text={posts.short} type="short" icon={AlignLeft} color={campaignType === 'warm' ? 'bg-purple-600' : 'bg-blue-600'} />
              </div>
              <ContentCard title="Standard LinkedIn Post" text={posts.medium} type="medium" icon={AlignCenter} color="bg-slate-500" />
              <ContentCard title="Strategic Deep-Dive / Mail" text={posts.long} type="long" icon={AlignJustify} color="bg-slate-700" />
            </div>
            
            <div className="lg:col-span-5 flex flex-col gap-10">
              <div className="bg-[#0F172A] p-8 md:p-10 rounded-[4rem] shadow-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-8 px-2">
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Brand Visual</span>
                    {loadingItems.image && <Loader2 className={`animate-spin ${campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'}`} size={20} />}
                </div>
                
                <div className="aspect-square bg-black rounded-[3.5rem] border-[12px] border-slate-900 overflow-hidden flex items-center justify-center relative group cursor-zoom-in mb-8" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image ? <Loader2 className="animate-spin text-slate-700" size={48} /> : posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <ImageIcon className="text-slate-800" size={48} />}
                </div>

                <div className="bg-black/50 p-6 rounded-[2.5rem] border border-slate-800 mb-8 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-3"><CalendarDays size={14}/> Schedule Date</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-5 bg-slate-900 border-2 border-slate-800 rounded-3xl text-white outline-none text-sm font-bold focus:border-blue-600 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={archiveAsset} disabled={loading} className={`py-8 bg-green-600 text-white rounded-[3rem] font-black text-[11px] uppercase shadow-[0_15px_30px_-10px_rgba(22,163,74,0.5)] hover:bg-green-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50`}><Save size={20}/> SAVE</button>
                    <button onClick={() => setActiveStep('library')} className="py-8 bg-slate-800 text-white rounded-[3rem] font-black text-[11px] uppercase hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-3 transition-all"><Library size={20}/> VAULT</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 'library' && (
          <div className="space-y-16 animate-in slide-in-from-right-16 pb-32 px-4 w-full flex-1 flex flex-col pt-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4 md:px-8 border-b border-slate-800 pb-10">
                <div><h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">The Vault.</h2><p className="text-blue-500 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.6em] mt-6 md:mt-8">Strategic Asset Management</p></div>
                <button onClick={resetEngine} className="bg-white text-slate-900 px-12 py-5 rounded-full text-[11px] font-black uppercase hover:scale-105 active:scale-95 transition-all tracking-[0.3em]">Zum Router</button>
            </div>
            
            {assetLibrary.length === 0 ? (
                <div className="bg-[#0F172A]/50 p-32 md:p-60 rounded-[6rem] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center">
                    <Library size={80} className="text-slate-800 mb-10" />
                    <p className="text-slate-600 text-xs md:text-sm font-black uppercase tracking-[0.6em] italic">Vault is empty.</p>
                </div>
            ) : (
                <div className="space-y-12 md:space-y-16 mt-10">
                    {assetLibrary.map((item) => (
                        <div key={item.id} className="bg-[#0F172A] rounded-[4rem] border border-slate-800 overflow-hidden flex flex-col shadow-2xl hover:-translate-y-2 transition-all duration-500">
                            <div className="p-8 md:p-10 bg-black/50 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-2 ${item.type === 'warm' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-blue-900/30 text-blue-400 border-blue-500/30'}`}>
                                        {item.type === 'warm' ? <Users size={14}/> : <Search size={14}/>}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{item.scheduledDate || 'DRAFT'}</span>
                                    </div>
                                    <span className="text-2xl font-black uppercase truncate italic tracking-tighter opacity-90">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">{item.companySize}</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${item.type === 'warm' ? 'text-purple-400 bg-purple-900/20 border-purple-900/50' : 'text-blue-400 bg-blue-900/20 border-blue-900/50'}`}>{item.persona}</span>
                                    <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-slate-600 hover:text-red-500 p-3 bg-black/40 rounded-full"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center">
                                {item.image && <div className="w-full md:w-1/4 aspect-square rounded-[3rem] overflow-hidden shadow-2xl flex-shrink-0 cursor-zoom-in border-[8px] border-slate-900" onClick={() => setZoomedImage(item.image)}><img src={item.image} className="w-full h-full object-cover" /></div>}
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.5em] italic ${item.type === 'warm' ? 'text-purple-500' : 'text-blue-500'}`}>{item.type === 'warm' ? 'Warm Angle' : 'Cold Angle'}</p>
                                    <p className="text-xl font-bold text-white line-clamp-3 italic tracking-tight leading-relaxed">"{item.topic}"</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {error && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-950 text-red-200 px-8 py-6 rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.5)] border-2 border-red-900 flex items-center gap-6 z-[200] max-w-[90vw] animate-in slide-in-from-bottom-6">
            <ShieldAlert size={32} className="text-red-500 flex-shrink-0" />
            <span className="text-sm md:text-base font-bold italic">{error}</span>
            <button onClick={() => setError(null)} className="p-2 text-red-500 hover:text-white hover:bg-red-900 rounded-full transition-colors"><X size={20}/></button>
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
