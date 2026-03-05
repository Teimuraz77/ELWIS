import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Briefcase, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info, Edit3, Search, Link as LinkIcon, AlertTriangle,
  Users, PhoneCall, Video, HelpCircle, MapPin, History, RefreshCcw, Phone, StickyNote, Activity, Database, FolderOpen
} from 'lucide-react';

export default function App() {
  // --- KERN-ZUSTAND & ROUTING ---
  const [activeStep, setActiveStep] = useState('campaign_select'); 
  const [campaignType, setCampaignType] = useState(''); 
  const apiKey = "AIzaSyCNZaqJ2fLAGyfSfEgJG7u7b4x9qC0mWV8"; 

  // --- EINGABE STATE ---
  const [targetCompany, setTargetCompany] = useState('');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  const [input, setInput] = useState(''); 
  
  // Warm Outreach State
  const [warmType, setWarmType] = useState('event'); 
  const [warmContext, setWarmContext] = useState(''); 
  const [followUpAction, setFollowUpAction] = useState('Telefonat');

  // --- ENGINE STATE (Columbo & Research) ---
  const [columboData, setColumboData] = useState({ question: '', options: [] });
  const [columboAnswer, setColumboAnswer] = useState('');
  
  const [companyData, setCompanyData] = useState({ address: '', phone: '', comments: '' });
  const [researchTopics, setResearchTopics] = useState([]);
  const [groundingSources, setGroundingSources] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // --- OUTPUT STATE ---
  const [posts, setPosts] = useState({ 
      pitch_direct: { text: '', chance: '', reason: '' }, 
      pitch_value: { text: '', chance: '', reason: '' }, 
      pitch_story: { text: '', chance: '', reason: '' }, 
      image: null, 
      description: '' 
  });
  
  const [scheduleDate, setScheduleDate] = useState('');
  const [customImagePrompt, setCustomImagePrompt] = useState(''); 
  const [crmFilter, setCrmFilter] = useState('ALL');
  
  // --- UI STATE ---
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState({ pitch_direct: false, pitch_value: false, pitch_story: false, image: false });
  const [error, setError] = useState(null);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [copiedType, setCopiedType] = useState(null);

  const columboImageUrl = "https://m.media-amazon.com/images/M/MV5BMzU4MDI3NTc2OV5BMl5BanBnXkFtZTgwNjMzNDIzMzE@._V1_.jpg";

  // Tailwind Fallback (Sicherheit für Sandboxen)
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // Ladebalken
  useEffect(() => {
    let interval;
    if (loading && progress < 98) {
      interval = setInterval(() => {
        setProgress(prev => (prev < 40 ? prev + 6 : prev < 85 ? prev + 1.5 : prev + 0.2));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  const resetEngine = () => {
    setTargetCompany(''); setInput(''); setWarmContext(''); setColumboAnswer('');
    setResearchTopics([]); setGroundingSources([]);
    setCompanyData({ address: '', phone: '', comments: '' });
    setActiveStep('campaign_select');
  };

  // --- KUGELSICHERER API CALLER ---
  const apiCall = async (payload, useSearch = false) => {
    if (!apiKey) throw new Error("API-Schlüssel fehlt! Bitte in Zeile 22 eintragen.");
    
    // Wir nutzen das stabile Modell mit Grounding
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    if (useSearch) {
        payload.tools = [{ "google_search": {} }];
        if (payload.generationConfig && payload.generationConfig.responseMimeType) {
            delete payload.generationConfig.responseMimeType;
        }
    }

    const retries = 3;
    const delays = [2000, 5000, 10000]; 
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) throw new Error("RATE_LIMIT");
            throw new Error(`Status ${response.status} - ${errText}`);
        }
        return await response.json();
      } catch (err) {
        if (err.message === "RATE_LIMIT") {
            if (i === retries - 1) throw new Error("Google Limit hart erreicht. Bitte 60s warten.");
            setProgressLabel("Google Limit erreicht. Kurze Pause...");
            await new Promise(resolve => setTimeout(resolve, delays[i]));
            continue; 
        }
        if (i === retries - 1) throw new Error(`KI-Diagnose: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delays[0]));
      }
    }
  };

  const parseJSON = (text) => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) { 
      const match = text.match(/\{[\s\S]*\}/);
      try { return JSON.parse(match[0]); } catch(err) { return null; }
    }
  };

  const checkRelevance = async (text) => {
    try {
      const res = await apiCall({
        contents: [{ parts: [{ text: `Analysiere auf B2B Relevanz: "${text}". Antworte AUSSCHLIESSLICH "OK" oder "QUATSCH".` }] }]
      });
      return res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() === "QUATSCH";
    } catch (e) { return false; }
  };

  // --- PHASE 1: COLUMBO QUESTION ---
  const startColumbo = async () => {
    if (!targetCompany.trim()) { setError("Zielunternehmen ist zwingend erforderlich."); return; }
    if (campaignType === 'warm' && !warmContext.trim()) { setError("Bitte den Reaktivierungs-Grund angeben."); return; }
    
    setLoading(true); setProgress(5); setProgressLabel(`Analysiere Angriffsfläche für ${targetCompany}...`); setError(null);

    if (await checkRelevance(targetCompany)) {
        setError("Nonsense erkannt. Bitte seriöses Unternehmen/Industrie eingeben.");
        setLoading(false); setProgress(0); return;
    }

    try {
      let context = campaignType === 'warm' 
        ? `Reaktivierung eines Bestandskontakts. Historie: ${warmContext}.` 
        : `Kaltakquise. Thema: ${input}`;

      const prompt = `Du bist Inspektor Columbo, ein B2B Stratege. Firma: "${targetCompany}". Kontext: "${context}". 
      Stelle EINE extrem kurze, provokante strategische Rückfrage (max 12 Wörter), um herauszufinden, auf welchen Schmerzpunkt wir uns in der Recherche fokussieren sollen. 
      Gib ZWEI mögliche strategische Antwort-Optionen vor.
      JSON-Format zwingend: {"question": "...", "options": ["Option A", "Option B"]}. Sprache: Deutsch.`;
      
      const result = await apiCall({
        contents: [{ parts: [{ text: context }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const parsed = parseJSON(result.candidates[0].content.parts[0].text);
      setColumboData({ 
        question: parsed?.question || "Wo brennt es aktuell am meisten in der Infrastruktur?", 
        options: parsed?.options || ["Fokus: Veraltete Systeme", "Fokus: Wachstums-Schmerzen"] 
      });
      setColumboAnswer('');
      setActiveStep('columbo');
    } catch (err) { setError(err.message || "Columbo konnte nicht geladen werden."); } 
    finally { setLoading(false); setProgress(0); }
  };

  // --- PHASE 2: RESEARCH (Impressum + 3 Hooks) ---
  const startResearch = async (answer) => {
    const finalAnswer = answer || columboAnswer;
    setColumboAnswer(finalAnswer);
    setActiveStep('generating');
    setLoading(true); setProgress(15); setProgressLabel(`Scanne globale News & Impressum für ${targetCompany}...`); setError(null);

    try {
        const prompt = `Du bist ein B2B Lead-Research Analyst. Führe eine Live-Websuche für das Unternehmen "${targetCompany}" durch. Berücksichtige die strategische Richtung: "${finalAnswer}".
        Aufgabe 1: Finde die offizielle Adresse (Headquarter) und die zentrale Telefonnummer aus dem Impressum.
        Aufgabe 2: Entwickle 3 hochaktuelle strategische Aufhänger (Angriffsvorschläge) für einen Pitch an die Persona "${persona}".
        
        REGEL: Antworte AUSSCHLIESSLICH mit rohem, gültigen JSON.
        Format: {
          "companyInfo": {"address": "...", "phone": "..."},
          "topics": [{"title": "Dein Titel", "rationale": "Dein Schmerzpunkt/Relevanz"}],
          "links": [{"title": "Headline der Quelle", "url": "https://..."}]
        }`;

        const result = await apiCall({ contents: [{ parts: [{ text: prompt }] }] }, true);
        const parsed = parseJSON(result.candidates[0].content.parts[0].text);
        
        if (!parsed || !parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
            throw new Error("Konnte keine Firmendaten oder News parsen.");
        }

        setCompanyData({
            address: parsed.companyInfo?.address || "Adresse nicht eindeutig gefunden.",
            phone: parsed.companyInfo?.phone || "Keine Telefonnummer gefunden.",
            comments: ''
        });

        let sources = Array.isArray(parsed.links) ? parsed.links : [];
        const grounding = result.candidates?.[0]?.groundingMetadata?.groundingAttributions;
        if (grounding && Array.isArray(grounding)) {
            const apiSources = grounding.map(a => ({ url: a.web?.uri, title: a.web?.title })).filter(s => s.url); 
            sources = [...sources, ...apiSources];
        }
        sources = sources.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

        setResearchTopics(parsed.topics);
        setGroundingSources(sources);
        setActiveStep('topic_selection');
    } catch (err) { 
      setError(err.message || "Fehler bei der Live-Recherche."); 
      setActiveStep('columbo'); 
    } 
    finally { setLoading(false); setProgress(0); }
  };

  // --- PHASE 3: PITCH ENGINE ---
  const runContentEngine = async (topic) => {
    setSelectedTopic(topic);
    setActiveStep('generating'); setProgress(10); setProgressLabel(`Synthetisiere Pitches für ${persona}...`); 
    setLoadingItems({ pitch_direct: true, pitch_value: true, pitch_story: true, image: true });
    setLoading(true); setError(null);

    const sourcesText = groundingSources.length > 0 ? groundingSources.map((s, i) => `[${i+1}] ${s.url || s.uri}`).join("\n") : "Keine URLs verfügbar.";

    try {
      let contextSetup = "";
      if (campaignType === 'cold') {
          contextSetup = `KALTAKQUISE. Aufhänger für die Nachricht ist AUSSCHLIESSLICH dieses aktuelle News-Thema: "${topic.title} - ${topic.rationale}".`;
      } else {
          let warmText = "";
          if (warmType === 'event') warmText = `Wir haben sie auf dem Event "${warmContext}" getroffen.`;
          if (warmType === 'lost_deal') warmText = `Wir hatten einen Lost Deal wegen: "${warmContext}".`;
          if (warmType === 'old_contact') warmText = `Letzter Kontakt: "${warmContext}".`;
          
          contextSetup = `BESTANDSKONTAKT REAKTIVIEREN. 
          HISTORIE: ${warmText}
          ZIEL: Verbinde diese alte Historie extrem elegant mit dem brandaktuellen News-Thema: "${topic.title} - ${topic.rationale}".`;
      }

      const actionText = campaignType === 'warm' && followUpAction === 'Telefonat' ? "Call-to-Action: Ein kurzes 10-Minuten-Telefonat." :
                         campaignType === 'warm' && followUpAction === 'Video' ? "Call-to-Action: Einen Videocall vorschlagen." :
                         "Call-to-Action: Offene provokante Frage zur IT-Architektur.";

      const textPrompt = `WICHTIG: Du bist ein Top-B2B-Sales-Experte von ELWIS. Dein Ziel ist die Akquise VON "${targetCompany}". DU BIST NICHT DIE FIRMA "${targetCompany}"! Du pitchst AN sie.
      Ziel-Persona: "${persona}". Tonfall: "${tone}". 
      ${actionText}
      ${contextSetup}
      Nutze diese Quellen für Fakten: ${sourcesText}

      Erzeuge 3 unterschiedliche, kurze bis mittellange Outreach-Pitches (Cold Email / LinkedIn Format):
      1. "pitch_direct": Hard-Pitch. Direkt, auf den Punkt, fokussiert auf Schmerz und Lösung.
      2. "pitch_value": Consultative-Pitch. Weicher, fokussiert auf Mehrwert und Sicherheit (IBM DNA).
      3. "pitch_story": Narrative-Pitch. Greift News/Historie extrem stark auf und baut eine Story zu ELWIS.
      
      ZUSATZAUFGABE (PREDICTIVE LOGIC):
      Bewerte für JEDEN Pitch realistisch die Erfolgswahrscheinlichkeit (Chance in %) bei der gewählten Persona ("${persona}"). Gib einen kurzen Satz als Begründung.
      
      5. "visual": Englische Beschreibung für eine abstrakte B2B-Vektorgrafik (KEINE echten Firmennamen/Logos!).
      
      JSON FORMAT: 
      {
        "pitch_direct": {"text": "...", "chance": "85%", "reason": "..."},
        "pitch_value": {"text": "...", "chance": "60%", "reason": "..."},
        "pitch_story": {"text": "...", "chance": "40%", "reason": "..."},
        "visual": "..."
      }
      Sprache: Deutsch.`;
      
      const res = await apiCall({ contents: [{ parts: [{ text: textPrompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = parseJSON(res.candidates[0].content.parts[0].text);
      if(data) {
          setPosts({ 
              pitch_direct: data.pitch_direct || {text: "Fehler", chance: "0%", reason: ""}, 
              pitch_value: data.pitch_value || {text: "Fehler", chance: "0%", reason: ""}, 
              pitch_story: data.pitch_story || {text: "Fehler", chance: "0%", reason: ""}, 
              description: data.visual, 
              image: null 
          });
      }

      generateImage(data ? data.visual : "Corporate business transformation data, abstract shapes");
      setActiveStep('result');
    } catch (err) { setError("Generierung fehlgeschlagen."); setActiveStep('topic_selection'); } 
    finally { setLoading(false); setLoadingItems({ pitch_direct: false, pitch_value: false, pitch_story: false, image: true }); setProgress(0); }
  };

  const generateImage = async (overridePrompt = null) => {
      setLoadingItems(prev => ({...prev, image: true}));
      const promptToUse = overridePrompt || customImagePrompt || posts.description || "Corporate business abstract tech";
      
      try {
        const payload = {
            instances: [{ prompt: `Ultra-premium corporate business infographic, concept: ${promptToUse}, royal blue and dark slate theme, modern minimalist vector art, 8k. NO text, NO words, NO real brand logos, completely abstract.` }],
            parameters: { sampleCount: 1 }
        };
        
        let response;
        for(let i=0; i<3; i++) {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(response.ok) break;
            await new Promise(r => setTimeout(r, 2000)); 
        }
        
        if (!response.ok) throw new Error(`Bild-API blockiert`);
        
        const imgData = await response.json();
        if (imgData.predictions && imgData.predictions[0]) {
            setPosts(prev => ({ ...prev, image: `data:image/png;base64,${imgData.predictions[0].bytesBase64Encoded}` }));
        }
      } catch (err) { console.error("Bildgenerierung fehlgeschlagen"); } 
      finally { setLoadingItems(prev => ({...prev, image: false})); }
  };

  // --- CRM ARCHIVIERUNG ---
  const archiveAsset = async () => {
    setLoading(true);
    try {
      const name = `${targetCompany.replace(/[^a-zA-Z0-9]/g, "")}_Pitch`.substring(0, 20) || "Kampagne";
      const newAsset = { 
          id: Date.now(), 
          name: name, 
          companyName: targetCompany,
          ...posts, 
          topic: selectedTopic?.title || 'Unknown', 
          allTopics: researchTopics, // Speichert ALLE Hooks
          scheduledDate: scheduleDate, 
          persona, 
          tone, 
          sources: groundingSources, 
          companyAddress: companyData.address, 
          companyPhone: companyData.phone, 
          companyComments: companyData.comments,
          type: campaignType,
          date: new Date().toLocaleDateString() 
      };
      setAssetLibrary([newAsset, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { setError("Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
  };

  const updateAsset = (id, newName) => {
    setAssetLibrary(assetLibrary.map(a => a.id === id ? {...a, name: newName} : a));
    setEditingId(null);
  };

  const loadFromArchive = (item) => {
    setPosts(item);
    setTargetCompany(item.companyName);
    setPersona(item.persona);
    setTone(item.tone);
    setCampaignType(item.type);
    setCompanyData({ address: item.companyAddress, phone: item.companyPhone, comments: item.companyComments });
    setResearchTopics(item.allTopics || []);
    setSelectedTopic({ title: item.topic });
    setScheduleDate(item.scheduledDate || '');
    setActiveStep('result');
  };

  // --- UI HELPER ---
  const HorizontalButton = ({ active, onClick, icon: Icon, label }) => (
    <button 
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}`}
    >
        <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
        <span className="font-bold text-[11px] uppercase tracking-widest truncate">{label}</span>
    </button>
  );

  const ContentCard = ({ title, pitchData, type, icon: Icon, color }) => {
    const text = pitchData?.text || "Warte auf Engine...";
    const chance = pitchData?.chance || "N/A";
    const reason = pitchData?.reason || "";
    const numChance = parseInt(chance.replace('%', '')) || 0;
    const chanceColor = numChance > 70 ? 'text-green-400' : numChance > 40 ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="bg-[#0F172A] border border-slate-800 rounded-[2.5rem] p-6 md:p-8 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-500/40 group w-full min-w-0">
        <div className={`absolute top-0 left-0 w-2 h-full ${color} rounded-l-[2.5rem]`}></div>
        <div className="flex justify-between items-center mb-4 pl-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 min-w-0">
              <Icon size={18} className="text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</span>
          </div>
          <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all text-slate-300 flex-shrink-0">
            {copiedType === type ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>
        {chance !== "N/A" && !loadingItems[type] && (
            <div className="mb-4 pl-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Activity size={14} className={chanceColor} />
                    <span className={`text-xs font-black uppercase tracking-widest ${chanceColor}`}>Win-Rate: {chance}</span>
                </div>
                <span className="text-[10px] text-slate-500 italic opacity-80">{reason}</span>
            </div>
        )}
        <div className="bg-black/50 p-6 rounded-3xl border border-slate-800 flex-1 overflow-y-auto relative ml-4 min-h-[150px]">
          {loadingItems[type] && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-10 rounded-3xl"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}
          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap break-words text-sm">{text}</p>
        </div>
      </div>
    );
  };

  const uniqueCompanies = ['ALL', ...Array.from(new Set(assetLibrary.map(a => a.companyName).filter(Boolean)))];
  const displayedAssets = crmFilter === 'ALL' ? assetLibrary : assetLibrary.filter(a => a.companyName === crmFilter);

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 font-sans selection:bg-blue-600/40 overflow-x-hidden">
      
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 animate-in fade-in" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-8 right-8 text-white/50 hover:text-white p-2 bg-white/10 rounded-full transition-all"><X size={32}/></button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-2xl border border-slate-800 shadow-2xl" alt="HD Preview" />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800 p-5 px-6 md:px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-6">
          {activeStep !== 'campaign_select' && <button onClick={resetEngine} className="p-3 bg-slate-800 rounded-full text-blue-400 hover:bg-slate-700 active:scale-95 transition-all"><RotateCcw size={20}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white italic">ELWIS LAB</h1>
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-1">v17.0 | FULL ARSENAL</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 relative hover:bg-slate-700 transition-all flex items-center gap-3">
          <Database size={20} className="text-white" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block text-slate-300">CRM Vault</span>
          {assetLibrary.length > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full text-[10px] flex items-center justify-center font-black border-2 border-[#020617] shadow-lg text-white">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-10 w-full flex flex-col flex-1">
        
        {/* === STEP 0: CAMPAIGN ROUTER === */}
        {activeStep === 'campaign_select' && (
          <div className="max-w-5xl mx-auto w-full space-y-16 animate-in slide-in-from-bottom-10 pt-20 flex-1 pb-40">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 mb-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"><Rocket size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Campaign Initialization</span></div>
                <h2 className="text-5xl md:text-8xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Wähle deinen <br/>Angriffsvektor.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div onClick={() => { setCampaignType('cold'); setActiveStep('input_cold'); }} className="bg-[#0F172A] p-10 md:p-12 rounded-[4rem] border-4 border-slate-800 hover:border-blue-600 shadow-2xl hover:shadow-[0_0_50px_rgba(37,99,235,0.3)] transition-all cursor-pointer group relative overflow-hidden flex flex-col items-center text-center gap-8">
                    <div className="absolute -right-10 -top-10 bg-blue-600/10 w-64 h-64 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all"></div>
                    <div className="p-8 bg-black/50 rounded-full border-2 border-slate-800 group-hover:scale-110 transition-transform"><Search size={64} className="text-blue-500" /></div>
                    <div>
                        <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-4">1) Kaltakquise</h3>
                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed">Identifiziere neue Ziele. Die KI führt eine Live-Recherche durch, zieht Impressumsdaten und generiert News-basierte Eisbrecher.</p>
                    </div>
                </div>

                <div onClick={() => { setCampaignType('warm'); setActiveStep('input_warm'); }} className="bg-[#0F172A] p-10 md:p-12 rounded-[4rem] border-4 border-slate-800 hover:border-purple-600 shadow-2xl hover:shadow-[0_0_50px_rgba(147,51,234,0.3)] transition-all cursor-pointer group relative overflow-hidden flex flex-col items-center text-center gap-8">
                    <div className="absolute -left-10 -bottom-10 bg-purple-600/10 w-64 h-64 rounded-full blur-[80px] group-hover:bg-purple-600/20 transition-all"></div>
                    <div className="p-8 bg-black/50 rounded-full border-2 border-slate-800 group-hover:scale-110 transition-transform"><Users size={64} className="text-purple-500" /></div>
                    <div>
                        <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-4">2) Reaktivierung</h3>
                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed">Aktiviere Bestandskontakte. Verbinde die Historie (Messe, Lost Deal) intelligent mit tagesaktuellen News.</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* === STEP 1A: COLD OUTREACH INPUT === */}
        {activeStep === 'input_cold' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-right-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 mb-2"><Search size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Intelligence Module: Kaltakquise</span></div>
                <h2 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Target Lock.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-6 md:p-12 rounded-[3rem] md:rounded-[4rem] border border-slate-800 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px]"></div>
                
                <div className="space-y-4 relative z-10">
                    <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] pl-4">1) Personenkreis</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                        <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                        <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 block pl-4">2) Unternehmen / Industrie</label>
                    <div className="relative">
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input type="text" className="w-full p-6 md:p-8 pl-16 bg-black border-2 border-slate-800 rounded-[2.5rem] outline-none text-xl md:text-2xl font-black text-white placeholder:text-slate-700 focus:border-blue-600 transition-all shadow-inner uppercase tracking-wide" placeholder="Z.B. Siemens oder Logistik" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-4 relative z-10 pt-4 border-t border-slate-800">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] pl-4 block">Zusätzlicher Kontext (Optional)</label>
                    <textarea 
                        className="w-full p-6 bg-black border-2 border-slate-800 rounded-[2.5rem] outline-none text-lg text-white placeholder:text-slate-700 focus:border-blue-600 transition-all shadow-inner resize-none"
                        placeholder="Gibt es einen speziellen Fokus für die Recherche?"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>

                <button onClick={startColumbo} disabled={loading || !targetCompany.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 md:py-10 rounded-[3.5rem] font-black text-sm md:text-lg uppercase tracking-[0.4em] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Zap size={28} />} LET'S GO !
                </button>
            </div>
          </div>
        )}

        {/* === STEP 1B: WARM OUTREACH INPUT === */}
        {activeStep === 'input_warm' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-left-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-purple-900/30 text-purple-400 px-6 py-2 rounded-full border border-purple-500/30 mb-2"><Users size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Intelligence Module: Reaktivierung</span></div>
                <h2 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Re-Engagement.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-6 md:p-12 rounded-[3rem] md:rounded-[4rem] border border-slate-800 shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px]"></div>
                
                <div className="space-y-4 relative z-10">
                    <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] pl-4">1) Personenkreis</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                        <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                        <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 block pl-4">2) Unternehmen</label>
                    <div className="relative">
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input type="text" className="w-full p-6 md:p-8 pl-16 bg-black border-2 border-slate-800 rounded-[2.5rem] outline-none text-xl md:text-2xl font-black text-white placeholder:text-slate-700 focus:border-purple-600 transition-all shadow-inner uppercase tracking-wide" placeholder="Name des Unternehmens..." value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-800 relative z-10 space-y-8">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.5em] pl-4 flex items-center gap-2"><AlertTriangle size={14}/> Zwingend für die Reaktivierung</p>
                        <div className="flex flex-col md:flex-row gap-4 w-full">
                            <HorizontalButton active={warmType === 'event'} onClick={() => setWarmType('event')} icon={MapPin} label="Messe / Event" />
                            <HorizontalButton active={warmType === 'lost_deal'} onClick={() => setWarmType('lost_deal')} icon={History} label="Lost Opportunity" />
                            <HorizontalButton active={warmType === 'old_contact'} onClick={() => setWarmType('old_contact')} icon={RefreshCcw} label="Alter Kontakt" />
                        </div>
                    </div>
                    <div className="relative">
                        {warmType === 'event' && <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                        {warmType === 'lost_deal' && <History className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                        {warmType === 'old_contact' && <RefreshCcw className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                        <input type="text" className="w-full p-6 pl-14 bg-black border-2 border-slate-800 rounded-3xl outline-none text-lg font-bold text-white placeholder:text-slate-700 focus:border-purple-600 transition-all shadow-inner" 
                            placeholder={
                                warmType === 'event' ? "Welche Messe? Z.B. OMR 2026..." : 
                                warmType === 'lost_deal' ? "Warum verloren? Z.B. Budget..." : 
                                "Kontext? Z.B. Projekt X vor 2 Jahren..."
                            } 
                            value={warmContext} onChange={(e) => setWarmContext(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="space-y-4 relative z-10 pt-4 border-t border-slate-800">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] pl-4">Ziel der Reaktivierung (CTA)</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <HorizontalButton active={followUpAction === 'Telefonat'} onClick={() => setFollowUpAction('Telefonat')} icon={PhoneCall} label="Telefonat" />
                        <HorizontalButton active={followUpAction === 'Video'} onClick={() => setFollowUpAction('Video')} icon={Video} label="Videocall" />
                        <HorizontalButton active={followUpAction === 'Frage'} onClick={() => setFollowUpAction('Frage')} icon={HelpCircle} label="Offene Frage" />
                    </div>
                </div>

                <button onClick={startColumbo} disabled={loading || !targetCompany.trim() || !warmContext.trim()} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-8 md:py-10 rounded-[3.5rem] font-black text-sm md:text-lg uppercase tracking-[0.4em] shadow-[0_20px_50px_-10px_rgba(147,51,234,0.5)] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Zap size={28} />} LET'S GO !
                </button>
            </div>
          </div>
        )}

        {/* === STEP 2: COLUMBO NOIR === */}
        {activeStep === 'columbo' && (
          <div className="max-w-4xl mx-auto w-full animate-in zoom-in duration-700 flex-1 pb-32 pt-10">
            <div className="bg-[#0F172A] rounded-[5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] overflow-hidden relative border border-slate-800">
                <div className="relative h-[25rem] w-full border-b-[8px] border-blue-600">
                    <img src={columboImageUrl} alt="Noir Bar" className="w-full h-full object-cover grayscale contrast-125 brightness-[0.6] scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent opacity-100"></div>
                </div>
                
                <div className="p-10 md:p-16 -mt-24 relative bg-[#0F172A] rounded-t-[5rem] text-center space-y-10">
                    <div className="inline-block bg-slate-800 px-8 py-3 rounded-full shadow-2xl border border-slate-700">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Just one more thing...</h2>
                    </div>
                    <p className="text-3xl md:text-4xl font-bold text-white italic border-l-8 border-blue-600 pl-8 text-left leading-relaxed tracking-tight">"{columboData.question}"</p>
                    
                    <div className="grid grid-cols-1 gap-5 pt-4">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => startResearch(opt)} className="bg-slate-900/50 hover:bg-blue-600 text-white p-6 md:p-8 rounded-[2.5rem] text-sm md:text-lg font-black transition-all border border-slate-800 hover:border-blue-500 flex items-center justify-between group px-10 shadow-lg text-left">
                                {opt} <ChevronRight size={24} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all text-blue-200 flex-shrink-0 ml-4" />
                            </button>
                        ))}
                        <div className="space-y-6 mt-8 pt-8 border-t border-slate-800 text-left">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4 mb-2 block">Eigener strategischer Fokus</label>
                            <textarea className="w-full p-8 bg-black border-2 border-slate-800 rounded-[3rem] font-bold outline-none text-white focus:border-blue-600 h-32 text-lg shadow-inner resize-none" placeholder="Details hinzufügen..." value={columboAnswer} onChange={(e) => setColumboAnswer(e.target.value)} />
                            <button onClick={() => startResearch(columboAnswer)} disabled={loading || !columboAnswer.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[3.5rem] font-black uppercase text-sm flex items-center justify-center gap-4 hover:scale-[1.02] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all tracking-[0.4em] disabled:opacity-30 disabled:scale-100">
                                {loading ? <Loader2 className="animate-spin" size={24}/> : <Search size={24}/>} LIVE-RECHERCHE STARTEN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* === STEP 3: DOSSIER & TOPIC SELECTION (DIE SECRET SAUCE) === */}
        {activeStep === 'topic_selection' && (
          <div className="w-full animate-in zoom-in duration-500 flex-1 pb-32 pt-4 flex flex-col lg:flex-row gap-8">
            {/* LINKS: FIRMEN-DOSSIER */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-[#0F172A] border border-slate-800 rounded-[3rem] p-8 shadow-2xl flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800/50 rounded-full blur-[50px]"></div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest border-b border-slate-800 pb-4 mb-6 flex items-center gap-3">
                        <Building2 size={20} className="text-blue-500"/> Firmen-Dossier
                    </h2>
                    <div className="space-y-6 flex-1 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><MapPin size={12}/> Zentrale (Impressum)</label>
                            <p className="text-sm font-medium text-slate-300 bg-black/50 p-4 rounded-2xl border border-slate-800 leading-relaxed">{companyData.address || 'Keine Adresse gefunden.'}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><Phone size={12}/> Telefon</label>
                            <div className="flex items-center gap-3">
                                <p className="text-lg font-bold text-white bg-black/50 px-4 py-3 rounded-2xl border border-slate-800 flex-1 truncate">{companyData.phone || 'N/A'}</p>
                                {companyData.phone && companyData.phone !== 'N/A' && (
                                    <button onClick={() => navigator.clipboard.writeText(companyData.phone)} className="p-4 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-colors"><Copy size={18}/></button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><StickyNote size={12}/> Analysten-Kommentare</label>
                            <textarea 
                                className="w-full flex-1 min-h-[120px] p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-slate-300 outline-none text-sm focus:border-blue-600 transition-colors resize-none"
                                placeholder="Eigene Notizen hier eintragen... (Werden gespeichert)"
                                value={companyData.comments}
                                onChange={(e) => setCompanyData({...companyData, comments: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* RECHTS: ANGRIFFSVORSCHLÄGE (HOOKS) */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                <div className="mb-4 space-y-2">
                    <h2 className={`text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase border-l-8 pl-6 ${campaignType === 'warm' ? 'border-purple-600' : 'border-blue-600'}`}>
                        Die Secret Sauce: Aktuelle Themen
                    </h2>
                    <p className="text-slate-400 pl-8 text-sm">Wähle eines dieser 3 recherchierten News-Themen, um die Pitch-Matrix zu generieren.</p>
                </div>

                <div className="grid gap-5">
                    {researchTopics.map((topic, i) => (
                        <div key={i} className={`bg-[#0F172A] border border-slate-800 rounded-[2rem] p-6 hover:-translate-y-1 transition-all flex flex-col sm:flex-row gap-6 items-start sm:items-center group shadow-xl ${campaignType === 'warm' ? 'hover:border-purple-500/50' : 'hover:border-blue-500/50'}`}>
                            <div className="flex-1 space-y-2 w-full">
                                <h3 className="text-lg font-black text-white tracking-tight leading-snug">{topic.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{topic.rationale}</p>
                            </div>
                            <button onClick={() => runContentEngine(topic)} className={`w-full sm:w-auto px-8 py-5 border rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] transition-all flex-shrink-0 flex items-center justify-center gap-2 ${campaignType === 'warm' ? 'bg-purple-600/10 text-purple-400 border-purple-600/30 hover:bg-purple-600 hover:text-white' : 'bg-blue-600/10 text-blue-400 border-blue-600/30 hover:bg-blue-600 hover:text-white'}`}>
                                Pitches erstellen <ChevronRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-4 bg-black/50 p-6 rounded-[2rem] border border-slate-800 overflow-hidden">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4 flex items-center gap-3"><LinkIcon size={14}/> Verifizierte Quellen</h4>
                    {groundingSources.length > 0 ? (
                        <ul className="space-y-2">
                            {groundingSources.map((source, i) => (
                                <li key={i} className={`text-xs truncate hover:underline ${campaignType === 'warm' ? 'text-purple-400' : 'text-blue-400'}`}>
                                    <a href={source.url || source.uri} target="_blank" rel="noopener noreferrer">[{i+1}] {source.title || source.url || source.uri}</a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center gap-3 text-amber-500 text-xs bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                            <AlertTriangle size={14} /> Keine direkten URLs verknüpft.
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* === STEP 4: LOADING === */}
        {activeStep === 'generating' && (
          <div className="max-w-2xl mx-auto py-56 space-y-16 text-center animate-in fade-in flex-1">
            <div className="relative inline-flex items-center justify-center scale-[2] mb-16">
                <div className={`w-32 h-32 border-[8px] border-slate-800 rounded-full ${campaignType === 'warm' ? 'border-t-purple-500' : 'border-t-blue-500'} animate-spin`} />
                <Zap size={40} className={`absolute m-auto ${campaignType === 'warm' ? 'text-purple-500 fill-purple-500' : 'text-blue-500 fill-blue-500'} animate-pulse`} />
            </div>
            <div className="space-y-8">
                <h2 className="text-4xl font-black uppercase italic tracking-[0.3em] text-white drop-shadow-lg">{progressLabel || "Synthesizing Asset"}</h2>
                <div className="w-full bg-slate-900 h-8 rounded-full overflow-hidden border-4 border-slate-800 shadow-inner p-1">
                    <div className={`h-full ${campaignType === 'warm' ? 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.8)]' : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)]'} rounded-full transition-all duration-300 relative overflow-hidden flex items-center justify-end pr-4`} style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
                <p className={`text-sm font-black uppercase tracking-[0.6em] ${campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'}`}>{Math.round(progress)}% Integrated</p>
            </div>
          </div>
        )}

        {/* === STEP 5: RESULTS (DIE PITCH MATRIX) === */}
        {activeStep === 'result' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-10 pb-32 w-full pt-8">
            <div className="lg:col-span-7 space-y-10">
              {/* Info Bar */}
              <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#0F172A] border border-slate-800 rounded-[2.5rem] items-center shadow-2xl">
                 <div className="flex flex-col flex-1 px-4 sm:border-r border-slate-700 w-full text-center sm:text-left"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Target</span><span className={`text-sm font-bold truncate ${campaignType === 'warm' ? 'text-purple-400' : 'text-blue-400'}`}>{targetCompany}</span></div>
                 <div className="flex flex-col flex-1 px-4 sm:border-r border-slate-700 w-full text-center sm:text-left"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Persona</span><span className="text-sm text-white font-bold">{persona}</span></div>
                 <div className="flex flex-col flex-1 px-4 w-full text-center sm:text-left"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Context</span><span className="text-sm text-white font-bold truncate">{campaignType === 'warm' ? (warmType === 'event' ? 'Messe' : warmType === 'lost_deal' ? 'Lost Deal' : 'Refresh') : selectedTopic?.title}</span></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ContentCard title="Hard Pitch (Direkt)" pitchData={posts.pitch_direct} type="pitch_direct" icon={Crosshair} color="bg-red-500" />
                 <ContentCard title="Value Pitch (Mehrwert)" pitchData={posts.pitch_value} type="pitch_value" icon={BarChart3} color="bg-blue-500" />
              </div>
              <ContentCard title="Narrative Pitch (Story/News)" pitchData={posts.pitch_story} type="pitch_story" icon={AlignJustify} color="bg-purple-500" />
            </div>
            
            <div className="lg:col-span-5 flex flex-col gap-10">
              <div className="bg-[#0F172A] p-8 md:p-10 rounded-[4rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-slate-800">
                
                {/* DOSSIER RECAP */}
                <div className="mb-8 space-y-4 bg-black/40 p-6 rounded-3xl border border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-800 pb-2">Unternehmensdaten</h3>
                    <div className="flex items-start gap-3">
                        <Phone size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                        <span className="text-sm font-bold text-white">{companyData.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                        <span className="text-xs text-slate-300 leading-tight">{companyData.address || 'N/A'}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-8 px-2">
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Brand Visual</span>
                    <button onClick={() => generateImage()} disabled={loadingItems.image} className="p-4 bg-slate-800 rounded-full hover:bg-blue-600 hover:text-white transition-colors text-slate-300 disabled:opacity-50">
                        <RefreshCw size={20} className={loadingItems.image ? 'animate-spin' : ''}/>
                    </button>
                </div>
                
                <div className="aspect-square bg-black rounded-[3.5rem] border-[12px] border-slate-900 overflow-hidden flex items-center justify-center relative group cursor-zoom-in mb-8 shadow-inner" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-20"><Loader2 className={`animate-spin ${campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'}`} size={64} /></div>}
                    {posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <Loader2 className="animate-spin text-slate-700" size={48} />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900/20 backdrop-blur-sm"><Maximize2 size={48} className="text-white drop-shadow-lg" /></div>
                </div>

                <div className="bg-black/50 p-6 rounded-[2.5rem] border border-slate-800 mb-8 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-3"><CalendarDays size={14}/> Schedule Date</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-5 bg-slate-900 border-2 border-slate-800 rounded-3xl text-white outline-none text-sm font-bold focus:border-blue-600 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={archiveAsset} disabled={loading} className="py-8 bg-green-600 text-white rounded-[3rem] font-black text-[11px] uppercase shadow-[0_15px_30px_-10px_rgba(22,163,74,0.5)] hover:bg-green-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"><Save size={20}/> SAVE</button>
                    <button onClick={() => setActiveStep('library')} className="py-8 bg-slate-800 text-white rounded-[3rem] font-black text-[11px] uppercase shadow-xl hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-3 transition-all"><Library size={20}/> VAULT</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 6: VAULT / CRM === */}
        {activeStep === 'library' && (
          <div className="flex flex-col lg:flex-row gap-8 pb-32 pt-10 h-[calc(100vh-100px)]">
            
            {/* CRM SIDEBAR (Filter) */}
            <div className="w-full lg:w-1/4 bg-[#0F172A] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden h-full shadow-2xl">
                <div className="p-8 border-b border-slate-800 bg-black/30">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">CRM Directory</h2>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">In-Memory Alpha</p>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                    {uniqueCompanies.map((company) => (
                        <button 
                            key={company} 
                            onClick={() => setCrmFilter(company)}
                            className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${crmFilter === company ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <span className="truncate">{company}</span>
                            {company !== 'ALL' && <span className="text-[10px] bg-black/30 px-2 py-1 rounded-lg">{assetLibrary.filter(a => a.companyName === company).length}</span>}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-800 bg-black/30">
                    <button onClick={resetEngine} className="w-full bg-slate-800 text-white py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <RotateCcw size={14}/> Studio Return
                    </button>
                </div>
            </div>

            {/* VAULT CONTENT AREA */}
            <div className="w-full lg:w-3/4 flex-1 overflow-y-auto h-full pr-2">
                {displayedAssets.length === 0 ? (
                    <div className="bg-[#0F172A]/50 h-full rounded-[4rem] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center">
                        <Database size={80} className="text-slate-800 mb-8" />
                        <p className="text-slate-600 text-sm font-black uppercase tracking-[0.6em] italic text-center">CRM ist leer.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {displayedAssets.map((item) => (
                            <div key={item.id} className="bg-[#0F172A] rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
                                {/* Header */}
                                <div className="p-6 bg-black/50 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${item.type === 'warm' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-blue-900/30 text-blue-400 border-blue-500/30'}`}>
                                            {item.type === 'warm' ? <Users size={14}/> : <Search size={14}/>}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.scheduledDate || 'DRAFT'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-1">
                                            {editingId === item.id ? (
                                                <div className="flex items-center gap-2"><input type="text" className="bg-slate-900 px-3 py-1 rounded-lg outline-none font-bold text-sm border border-blue-500" defaultValue={item.name} onBlur={(e) => updateAsset(item.id, e.target.value)} autoFocus /><CheckCircle2 size={20} className="text-green-500 cursor-pointer" /></div>
                                            ) : (
                                                <><span className="text-lg font-black uppercase truncate italic">{item.name}</span><button onClick={() => setEditingId(item.id)} className="opacity-30 hover:opacity-100"><Edit3 size={14}/></button></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">{item.companySize || 'N/A'}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-900/50">{item.persona}</span>
                                        <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-slate-600 hover:text-red-500 p-1.5 hover:bg-black rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                
                                {/* Body */}
                                <div className="p-8 flex flex-col md:flex-row gap-8">
                                    {/* Dossier Data im CRM */}
                                    <div className="w-full md:w-1/3 bg-black/30 p-6 rounded-[2rem] border border-slate-800 space-y-4">
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">Impressum & Notes</h4>
                                        <div className="space-y-3">
                                            <p className="text-xs text-white font-bold flex items-center gap-2"><Phone size={12} className="text-slate-500"/> {item.companyPhone || 'N/A'}</p>
                                            <p className="text-xs text-slate-400 leading-tight flex items-start gap-2"><MapPin size={12} className="text-slate-500 mt-0.5 flex-shrink-0"/> {item.companyAddress || 'N/A'}</p>
                                        </div>
                                        {item.companyComments && (
                                            <div className="mt-4 pt-4 border-t border-slate-800">
                                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Analyst Notes</p>
                                                <p className="text-xs text-slate-300 italic">{item.companyComments}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hooks & Strategy */}
                                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">Recherchierte Hooks</h4>
                                        <div className="space-y-3 overflow-y-auto max-h-48 pr-2">
                                            {item.allTopics && item.allTopics.length > 0 ? item.allTopics.map((t, idx) => (
                                                <div key={idx} className={`p-4 rounded-xl border ${t.title === item.topic ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-900 border-slate-800'}`}>
                                                    <p className="text-sm font-bold text-white mb-1">{t.title}</p>
                                                    <p className="text-xs text-slate-400 line-clamp-2">{t.rationale}</p>
                                                </div>
                                            )) : (
                                                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800"><p className="text-sm font-bold text-white mb-1">{item.topic}</p><p className="text-xs text-slate-500">Keine weiteren Hooks gespeichert.</p></div>
                                            )}
                                        </div>
                                        <div className="pt-4 mt-auto">
                                            <button onClick={() => loadFromArchive(item)} className="w-full py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-blue-500 transition-all rounded-2xl shadow-lg flex items-center justify-center gap-2"><FolderOpen size={16}/> KAMPAGNE ÖFFNEN</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        )}

        {/* --- GLOBAL ERROR ALERT --- */}
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
