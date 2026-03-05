import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Briefcase, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info, Edit3, Search, Link as LinkIcon, AlertTriangle,
  Users, PhoneCall, Video, HelpCircle, MapPin, History, RefreshCcw, Phone, StickyNote, Activity, Database, FolderOpen,
  ArrowLeft, ArrowRight
} from 'lucide-react';

export default function App() {
  // --- KERN-ZUSTAND ---
  const [activeStep, setActiveStep] = useState('input_master'); 
  const [lastStep, setLastStep] = useState('input_master'); 
  
  // --- EINGABE STATE (Single Vector) ---
  const [targetCompany, setTargetCompany] = useState('');
  const [campaignType, setCampaignType] = useState('cold'); 
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  const [input, setInput] = useState(''); 
  
  // Spezifisch für Warm Outreach
  const [warmType, setWarmType] = useState('event'); 
  const [warmContext, setWarmContext] = useState(''); 

  // --- ENGINE STATE (Columbo & Research) ---
  const [columboData, setColumboData] = useState({ question: '', options: [] });
  const [columboAnswer, setColumboAnswer] = useState('');
  
  const [companyData, setCompanyData] = useState({ address: '', phone: '', comments: '' });
  const [researchTopics, setResearchTopics] = useState([]);
  const [groundingSources, setGroundingSources] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // --- GOOGLE API KEY ---
  const apiKey = "AIzaSyCNZaqJ2fLAGyfSfEgJG7u7b4x9qC0mWV8"; 

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
  const [safetyTriggered, setSafetyTriggered] = useState(false); 
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [copiedType, setCopiedType] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const columboImageUrl = "https://m.media-amazon.com/images/M/MV5BMzU4MDI3NTc2OV5BMl5BanBnXkFtZTgwNjMzNDIzMzE@._V1_.jpg";

  // Sync des generierten Prompts in das editierbare Feld
  useEffect(() => {
    if (posts.description) setCustomImagePrompt(posts.description);
  }, [posts.description]);

  // Tailwind Fallback
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // Ladebalken Animation
  useEffect(() => {
    let interval;
    if (loading && progress < 98) {
      interval = setInterval(() => {
        setProgress(prev => (prev < 40 ? prev + 6 : prev < 85 ? prev + 1.5 : prev + 0.2));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  // --- FLUID NAVIGATION LOGIC ---
  const canGoBack = activeStep !== 'input_master' && activeStep !== 'generating';
  
  const canGoForward = () => {
    if (activeStep === 'input_master' && columboData.question) return true;
    if (activeStep === 'columbo') {
      if (campaignType === 'warm' && posts.pitch_direct.text && posts.pitch_direct.text !== "Fehler") return true;
      if (campaignType === 'cold' && researchTopics.length > 0) return true;
    }
    if (activeStep === 'topic_selection' && posts.pitch_direct.text && posts.pitch_direct.text !== "Fehler") return true;
    return false;
  };

  const handleBack = () => {
    if (activeStep === 'library') {
      setActiveStep(lastStep);
      return;
    }
    if (activeStep === 'result') {
      setActiveStep(campaignType === 'warm' ? 'columbo' : 'topic_selection');
    } else if (activeStep === 'topic_selection') {
      setActiveStep('columbo');
    } else if (activeStep === 'columbo') {
      setActiveStep('input_master');
    }
  };

  const handleForward = () => {
    if (activeStep === 'input_master' && columboData.question) {
      setActiveStep('columbo');
    } else if (activeStep === 'columbo') {
      if (campaignType === 'warm' && posts.pitch_direct.text && posts.pitch_direct.text !== "Fehler") {
         setActiveStep('result');
      } else if (campaignType === 'cold' && researchTopics.length > 0) {
         setActiveStep('topic_selection');
      }
    } else if (activeStep === 'topic_selection' && posts.pitch_direct.text && posts.pitch_direct.text !== "Fehler") {
      setActiveStep('result');
    }
  };

  const resetEngine = () => {
    setTargetCompany(''); setInput(''); setWarmContext(''); setColumboAnswer('');
    setResearchTopics([]); setGroundingSources([]); setColumboData({ question: '', options: [] });
    setCompanyData({ address: '', phone: '', comments: '' });
    setSafetyTriggered(false);
    setActiveStep('input_master');
  };

  // --- KUGELSICHERER API CALLER ---
  const apiCall = async (payload, useSearch = false) => {
    if (!apiKey) throw new Error("API-Schlüssel fehlt! Bitte im Code eintragen.");
    
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
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
            if (i === retries - 1) throw new Error("Google Limit erreicht. Bitte 60s warten.");
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
    if (!targetCompany.trim()) { setError("Zielfirma / Industrie ist zwingend erforderlich."); return; }
    if (campaignType === 'warm' && !warmContext.trim()) { setError("Bitte den Reaktivierungs-Kontext (z.B. Messe) angeben."); return; }
    
    setLoading(true); setProgress(5); setProgressLabel(`Einen Augenblick bitte... Analysiere ${targetCompany}...`); setError(null);
    setSafetyTriggered(false);
    setActiveStep('generating');

    // DER TÜRSTEHER SCHLÄGT ZU
    if (await checkRelevance(targetCompany)) {
        setSafetyTriggered(true);
        setLoading(false); setProgress(0); 
        setActiveStep('input_master'); 
        return;
    }

    try {
      let context = campaignType === 'warm' 
        ? `Reaktivierung. Historie: ${warmContext}. Zusatz: ${input}` 
        : `Kaltakquise. Zusatz: ${input}`;

      const prompt = `Du bist Inspektor Columbo, ein B2B Stratege. Firma/Ziel: "${targetCompany}". Kontext: "${context}". 
      Stelle EINE extrem kurze, provokante strategische Rückfrage (max 12 Wörter), um herauszufinden, auf welchen Schmerzpunkt wir uns in der Live-Recherche fokussieren sollen. 
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
    } catch (err) { 
      setError(err.message || "Columbo konnte nicht geladen werden."); 
      setActiveStep('input_master'); 
    } 
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

  // --- PHASE 3: PITCH ENGINE (CONVERSION MAXIMIZED) ---
  const runContentEngine = async (topic) => {
    setSelectedTopic(topic);
    setActiveStep('generating'); setProgress(10); setProgressLabel(`Synthetisiere High-Converting Pitches für ${persona}...`); 
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

      // HIER IST DER NEUE CONVERSION PROMPT:
      const textPrompt = `WICHTIG: Du bist Top-B2B-Sales-Experte für unsere IT-Lösung "ELWIS" (Enterprise Business/IT Transformation, stark geprägt von IBM DNA). 
      Dein Ziel ist die Akquise VON "${targetCompany}". DU BIST NICHT DIE FIRMA "${targetCompany}"! Du pitchst AN sie.
      Ziel-Persona: "${persona}". Tonfall: "${tone}". User-Kontext: "${input}".
      ${contextSetup}
      Nutze diese Quellen für Fakten: ${sourcesText}

      AUFGABE: Erzeuge 3 Outreach-Pitches (Cold Email / LinkedIn Format).
      MANDAT FÜR MAXIMALE CONVERSION: Schärfe alle Texte extrem auf Conversion! Du MUSST in jedem Pitch ganz konkrete Einsatzmöglichkeiten und Use Cases von ELWIS nennen, die EXAKT das Problem aus dem aktuellen News-Aufhänger ("${topic.title}") lösen. Keine hohlen "Lass uns reden"-Phrasen. Zeige sofort messbaren Wert durch die Implementierung von ELWIS.

      1. "pitch_direct": Hard-Pitch. Aggressiv auf Schmerz und Lösung fokussiert. Nenne den ELWIS Use-Case messerscharf und fordere direkte Handlung.
      2. "pitch_value": Consultative-Pitch. Fokus auf strategischen Mehrwert, Skalierung, Sicherheit und unsere IBM DNA als Fundament.
      3. "pitch_story": Narrative-Pitch. Baut eine spannende Story um die News/Historie und führt elegant zur konkreten ELWIS-Implementierung als logische Konsequenz.
      
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
          allTopics: researchTopics,
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
      setLastStep('result');
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
    setLastStep('library');
    setActiveStep('result');
  };

  // --- UI HELPER ---
  const HorizontalButton = ({ active, onClick, icon: Icon, label, color = "blue" }) => {
    const activeClass = color === "purple" 
      ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] scale-105 z-10' 
      : 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10';
      
    return (
      <button 
          type="button"
          onClick={onClick}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-2 sm:px-3 rounded-2xl border-2 transition-all duration-300 min-w-0 ${active ? activeClass : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}`}
      >
          {Icon && <Icon size={16} className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />}
          <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-center truncate w-full">{label}</span>
      </button>
    );
  };

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

      {/* --- FLUID NAVIGATION HEADER --- */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800 p-3 md:p-4 md:px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-3 md:gap-6">
          
          <div className="flex bg-black/40 border border-slate-800 rounded-full p-1 shadow-inner items-center">
            <button onClick={handleBack} disabled={!canGoBack} className={`p-2 rounded-full transition-all ${canGoBack ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-800 cursor-not-allowed'}`} title="Einen Schritt zurück">
              <ArrowLeft size={16} />
            </button>
            <button onClick={handleForward} disabled={!canGoForward()} className={`p-2 rounded-full transition-all ${canGoForward() ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-800 cursor-not-allowed'}`} title="Einen Schritt vor">
              <ArrowRight size={16} />
            </button>
            <div className="w-px h-4 bg-slate-800 mx-1"></div>
            <button onClick={resetEngine} className="p-2 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Neu Starten">
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="hidden sm:flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white italic">ELWIS LAB</h1>
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-1">v22.0 | CONVERSION ENGINE</span>
          </div>
        </div>
        <button onClick={() => { if(activeStep !== 'library') setLastStep(activeStep); setActiveStep('library'); }} className="p-3 md:p-4 bg-slate-800 rounded-2xl border border-slate-700 relative hover:bg-slate-700 transition-all flex items-center gap-3">
          <Database size={18} className="text-white" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block text-slate-300">CRM Vault</span>
          {assetLibrary.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-blue-500 rounded-full text-[9px] md:text-[10px] flex items-center justify-center font-black border-2 border-[#020617] shadow-lg text-white">{assetLibrary.length}</span>}
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-10 w-full flex flex-col flex-1">
        
        {/* === STEP 1: SINGLE VECTOR INPUT === */}
        {activeStep === 'input_master' && (
          <div className="max-w-4xl mx-auto w-full space-y-8 md:space-y-12 animate-in slide-in-from-bottom-10 pt-6 md:pt-10 flex-1 pb-40">
            <div className="text-center space-y-4 md:space-y-5">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-4 md:px-6 py-2 rounded-full border border-blue-500/30 mb-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"><Rocket size={14} /> <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] italic">Campaign Initialization</span></div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Target Lock.</h2>
            </div>
            
            <div className={`bg-[#0F172A] p-5 sm:p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-4 shadow-2xl space-y-8 md:space-y-10 relative overflow-hidden transition-all duration-500 ${safetyTriggered ? 'border-red-600 shadow-[0_0_80px_rgba(220,38,38,0.3)] ring-4 ring-red-900/50' : 'border-slate-800'}`}>
                <div className={`absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 rounded-full blur-[80px] md:blur-[100px] transition-colors duration-500 ${safetyTriggered ? 'bg-red-600/10' : campaignType === 'warm' ? 'bg-purple-600/5' : 'bg-blue-600/5'}`}></div>
                
                {safetyTriggered ? (
                    <div className="p-6 md:p-20 text-center space-y-6 relative z-10 animate-in zoom-in duration-300">
                        <ShieldAlert className="mx-auto text-red-500" size={56} />
                        <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">Access Denied.</h3>
                        <p className="text-red-400 font-bold text-xs md:text-sm leading-relaxed max-w-md mx-auto">Die B2B-Relevanzprüfung ist fehlgeschlagen. Bitte gib ein seriöses Zielunternehmen oder eine Industrie ein.</p>
                        <button onClick={() => {setSafetyTriggered(false); setTargetCompany('');}} className="mt-8 px-8 py-4 md:px-10 md:py-5 bg-white text-slate-900 rounded-full font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Zurück zum Input</button>
                    </div>
                ) : (
                    <>
                        {/* 1) Firmenname */}
                        <div className="space-y-3 md:space-y-4 relative z-10">
                            <div className="flex items-center justify-between pl-2 md:pl-4">
                                <label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 block">1) Ziel-Firma</label>
                                <span className="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} md:size={12}/> Geprüft</span>
                            </div>
                            <div className="relative">
                                <Building2 className={`absolute left-4 md:left-6 top-1/2 -translate-y-1/2 ${campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'} transition-colors`} size={20} />
                                <input type="text" className={`w-full p-4 md:p-8 pl-12 md:pl-16 bg-black border-2 border-slate-800 rounded-2xl md:rounded-[2.5rem] outline-none text-lg md:text-2xl font-black text-white placeholder:text-slate-700 transition-all shadow-inner uppercase tracking-wide focus:border-${campaignType === 'warm' ? 'purple' : 'blue'}-600`} placeholder="Z.B. Siemens..." value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                            </div>
                        </div>

                        {/* 2) Angriffsvektor */}
                        <div className="space-y-3 md:space-y-4 relative z-10 pt-4 md:pt-6 border-t border-slate-800">
                            <p className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] pl-2 md:pl-4">2) Angriffsvektor</p>
                            <div className="flex gap-2 md:gap-4 w-full">
                                <HorizontalButton active={campaignType === 'cold'} onClick={() => setCampaignType('cold')} icon={Search} label="Kalt" color="blue" />
                                <HorizontalButton active={campaignType === 'warm'} onClick={() => setCampaignType('warm')} icon={Users} label="Warm" color="purple" />
                            </div>
                        </div>

                        {/* 2.1) Conditional: Wenn Warm */}
                        {campaignType === 'warm' && (
                            <div className="space-y-4 md:space-y-6 relative z-10 p-4 md:p-6 bg-purple-900/10 rounded-[1.5rem] md:rounded-[2rem] border border-purple-900/30 animate-in zoom-in-95 duration-300">
                                <p className="text-[9px] md:text-[10px] font-black text-purple-400 uppercase tracking-[0.5em] flex items-center gap-2"><AlertTriangle size={12}/> Zwingend für Reaktivierung</p>
                                <div className="flex gap-2 md:gap-4 w-full">
                                    <HorizontalButton active={warmType === 'event'} onClick={() => setWarmType('event')} icon={MapPin} label="Messe" color="purple" />
                                    <HorizontalButton active={warmType === 'lost_deal'} onClick={() => setWarmType('lost_deal')} icon={History} label="Lost Deal" color="purple" />
                                    <HorizontalButton active={warmType === 'old_contact'} onClick={() => setWarmType('old_contact')} icon={RefreshCcw} label="Kontakt" color="purple" />
                                </div>
                                <div className="relative">
                                    <input type="text" className="w-full p-4 md:p-5 pl-4 md:pl-6 bg-black border-2 border-slate-800 rounded-xl md:rounded-3xl outline-none text-sm md:text-lg font-bold text-white placeholder:text-slate-700 focus:border-purple-600 transition-all shadow-inner" 
                                        placeholder={ warmType === 'event' ? "Welche Messe? Z.B. OMR 2026..." : warmType === 'lost_deal' ? "Warum verloren? Z.B. Budget..." : "Kontext? Z.B. Projekt X..." } 
                                        value={warmContext} onChange={(e) => setWarmContext(e.target.value)} 
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3) Persona & Tone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 relative z-10 pt-4 md:pt-6 border-t border-slate-800">
                            <div className="space-y-3 md:space-y-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2 md:pl-4">3) Persona</p>
                                <div className="flex flex-row sm:flex-col gap-2 md:gap-3 w-full overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                                    <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                                    <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="IT Lead" />
                                    <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops" />
                                </div>
                            </div>
                            <div className="space-y-3 md:space-y-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2 md:pl-4">4) Tonfall</p>
                                <div className="flex flex-row sm:flex-col gap-2 md:gap-3 w-full overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                                    <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                                    <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                                    <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Knallhart" />
                                </div>
                            </div>
                        </div>

                        {/* 5) Freifeld Kontext */}
                        <div className="space-y-3 md:space-y-4 relative z-10 pt-4 md:pt-6 border-t border-slate-800">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2 md:pl-4 block">5) Kontext</label>
                            <textarea 
                                className={`w-full p-4 md:p-6 bg-black border-2 border-slate-800 rounded-2xl md:rounded-[2.5rem] outline-none text-sm md:text-lg text-white placeholder:text-slate-700 transition-all shadow-inner resize-none h-24 md:h-32 focus:border-${campaignType === 'warm' ? 'purple' : 'blue'}-600`}
                                placeholder="Optional, je mehr desto besser..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                        </div>

                        {/* LET'S GO BUTTON */}
                        <button onClick={startColumbo} disabled={loading || !targetCompany.trim()} className={`w-full text-white py-6 md:py-10 rounded-2xl md:rounded-[3.5rem] font-black text-xs md:text-sm uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center justify-center gap-3 md:gap-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-4 md:mt-8 ${campaignType === 'warm' ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_10px_30px_-10px_rgba(147,51,234,0.5)] md:shadow-[0_20px_50px_-10px_rgba(147,51,234,0.5)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)] md:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)]'}`}>
                          {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />} ENGINE STARTEN
                        </button>
                    </>
                )}
            </div>
          </div>
        )}

        {/* === STEP 2: COLUMBO NOIR === */}
        {activeStep === 'columbo' && (
          <div className="max-w-4xl mx-auto w-full animate-in zoom-in duration-700 flex-1 pb-32 pt-6 md:pt-10">
            <div className={`bg-[#0F172A] rounded-[3rem] md:rounded-[5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] overflow-hidden relative border border-slate-800`}>
                <div className={`relative h-[15rem] md:h-[25rem] w-full border-b-[4px] md:border-b-[8px] ${campaignType === 'warm' ? 'border-purple-600' : 'border-blue-600'}`}>
                    <img src={columboImageUrl} alt="Noir Bar" className="w-full h-full object-cover grayscale contrast-125 brightness-[0.6] scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent opacity-100"></div>
                </div>
                
                <div className="p-6 md:p-16 -mt-16 md:-mt-24 relative bg-[#0F172A] rounded-t-[3rem] md:rounded-t-[5rem] text-center space-y-8 md:space-y-10">
                    <div className="inline-block bg-slate-800 px-6 py-2 md:px-8 md:py-3 rounded-full shadow-2xl border border-slate-700">
                        <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-300">Just one more thing...</h2>
                    </div>
                    <p className={`text-xl sm:text-2xl md:text-4xl font-bold text-white italic border-l-4 md:border-l-8 pl-4 md:pl-8 text-left leading-relaxed tracking-tight ${campaignType === 'warm' ? 'border-purple-600' : 'border-blue-600'}`}>"{columboData.question}"</p>
                    
                    <div className="grid grid-cols-1 gap-4 md:gap-5 pt-2 md:pt-4">
                        {columboData.options && columboData.options.map((opt, i) => (
                            <button key={i} onClick={() => startResearch(opt)} className={`bg-slate-900/50 text-white p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] text-xs sm:text-sm md:text-lg font-black transition-all border border-slate-800 flex items-center justify-between group px-6 md:px-10 shadow-lg text-left ${campaignType === 'warm' ? 'hover:bg-purple-600 hover:border-purple-500' : 'hover:bg-blue-600 hover:border-blue-500'}`}>
                                <span className="line-clamp-2">{opt}</span> <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all text-slate-200 flex-shrink-0 ml-2 md:ml-4" />
                            </button>
                        ))}
                        <div className="space-y-4 md:space-y-6 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-800 text-left">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2 md:ml-4 mb-1 md:mb-2 block">Eigener strategischer Fokus</label>
                            <textarea className={`w-full p-5 md:p-8 bg-black border-2 border-slate-800 rounded-2xl md:rounded-[3rem] font-bold outline-none text-white text-sm md:text-lg shadow-inner resize-none focus:border-${campaignType === 'warm' ? 'purple' : 'blue'}-600 min-h-[100px] md:min-h-[120px]`} placeholder="Details hinzufügen..." value={columboAnswer} onChange={(e) => setColumboAnswer(e.target.value)} />
                            <button onClick={() => startResearch(columboAnswer)} disabled={loading || !columboAnswer.trim()} className={`w-full text-white py-5 md:py-8 rounded-2xl md:rounded-[3.5rem] font-black uppercase text-xs md:text-sm flex items-center justify-center gap-3 md:gap-4 hover:scale-[1.02] transition-all tracking-[0.2em] md:tracking-[0.4em] disabled:opacity-30 disabled:scale-100 ${campaignType === 'warm' ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_15px_30px_-10px_rgba(147,51,234,0.4)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)]'}`}>
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>} LIVE-RECHERCHE STARTEN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* === STEP 3: DOSSIER & TOPIC SELECTION (DIE SECRET SAUCE) === */}
        {activeStep === 'topic_selection' && (
          <div className="w-full animate-in zoom-in duration-500 flex-1 pb-32 pt-4 flex flex-col lg:flex-row gap-6 md:gap-8">
            {/* LINKS: FIRMEN-DOSSIER */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4 md:gap-6">
                <div className="bg-[#0F172A] border border-slate-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-2xl flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-slate-800/50 rounded-full blur-[40px] md:blur-[50px]"></div>
                    <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3 md:pb-4 mb-4 md:mb-6 flex items-center gap-3">
                        <Building2 size={18} className={campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'}/> Firmen-Dossier
                    </h2>
                    <div className="space-y-4 md:space-y-6 flex-1 relative z-10">
                        <div className="space-y-1 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><MapPin size={10}/> Zentrale</label>
                            <p className="text-xs md:text-sm font-medium text-slate-300 bg-black/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-800 leading-relaxed">{companyData.address || 'Keine Adresse gefunden.'}</p>
                        </div>
                        <div className="space-y-1 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><Phone size={10}/> Telefon</label>
                            <div className="flex items-center gap-2 md:gap-3">
                                <p className="text-sm md:text-lg font-bold text-white bg-black/50 px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl border border-slate-800 flex-1 truncate">{companyData.phone || 'N/A'}</p>
                                {companyData.phone && companyData.phone !== 'N/A' && (
                                    <button onClick={() => navigator.clipboard.writeText(companyData.phone)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-colors ${campaignType === 'warm' ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'}`}><Copy size={16}/></button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1 md:space-y-2 flex-1 flex flex-col">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><StickyNote size={10}/> Notizen</label>
                            <textarea 
                                className={`w-full flex-1 min-h-[80px] md:min-h-[120px] p-3 md:p-4 bg-slate-900 border-2 border-slate-800 rounded-xl md:rounded-2xl text-slate-300 outline-none text-xs md:text-sm transition-colors resize-none focus:border-${campaignType === 'warm' ? 'purple' : 'blue'}-600`}
                                placeholder="Eigene Notizen hier eintragen..."
                                value={companyData.comments}
                                onChange={(e) => setCompanyData({...companyData, comments: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* RECHTS: ANGRIFFSVORSCHLÄGE (HOOKS) */}
            <div className="w-full lg:w-2/3 flex flex-col gap-4 md:gap-6">
                <div className="mb-2 md:mb-4 space-y-1 md:space-y-2">
                    <h2 className={`text-xl sm:text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase border-l-4 md:border-l-8 pl-4 md:pl-6 ${campaignType === 'warm' ? 'border-purple-600' : 'border-blue-600'}`}>
                        Aktuelle Themen
                    </h2>
                    <p className="text-slate-400 pl-5 md:pl-8 text-xs md:text-sm">Wähle einen recherchierten Aufhänger, um die Pitch-Matrix zu generieren.</p>
                </div>

                <div className="grid gap-3 md:gap-5">
                    {researchTopics.map((topic, i) => (
                        <div key={i} className={`bg-[#0F172A] border border-slate-800 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 hover:-translate-y-1 transition-all flex flex-col sm:flex-row gap-4 md:gap-6 items-start sm:items-center group shadow-xl ${campaignType === 'warm' ? 'hover:border-purple-500/50' : 'hover:border-blue-500/50'}`}>
                            <div className="flex-1 space-y-1 md:space-y-2 w-full">
                                <h3 className="text-sm md:text-lg font-black text-white tracking-tight leading-snug">{topic.title}</h3>
                                <p className="text-slate-400 text-xs md:text-sm leading-relaxed line-clamp-3 sm:line-clamp-none">{topic.rationale}</p>
                            </div>
                            <button onClick={() => runContentEngine(topic)} className={`w-full sm:w-auto px-6 py-4 md:px-8 md:py-5 border rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] transition-all flex-shrink-0 flex items-center justify-center gap-2 ${campaignType === 'warm' ? 'bg-purple-600/10 text-purple-400 border-purple-600/30 hover:bg-purple-600 hover:text-white' : 'bg-blue-600/10 text-blue-400 border-blue-600/30 hover:bg-blue-600 hover:text-white'}`}>
                                Pitches erstellen <ChevronRight size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-2 md:mt-4 bg-black/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 overflow-hidden">
                    <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-3 md:mb-4 flex items-center gap-2"><LinkIcon size={12}/> Verifizierte Quellen</h4>
                    {groundingSources.length > 0 ? (
                        <ul className="space-y-2">
                            {groundingSources.map((source, i) => (
                                <li key={i} className={`text-[10px] md:text-xs truncate hover:underline ${campaignType === 'warm' ? 'text-purple-400' : 'text-blue-400'}`}>
                                    <a href={source.url || source.uri} target="_blank" rel="noopener noreferrer">[{i+1}] {source.title || source.url || source.uri}</a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center gap-2 md:gap-3 text-amber-500 text-[10px] md:text-xs bg-amber-500/10 p-3 md:p-4 rounded-xl border border-amber-500/20">
                            <AlertTriangle size={12} /> Keine direkten URLs verknüpft.
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* === STEP 4: LOADING === */}
        {activeStep === 'generating' && (
          <div className="max-w-md md:max-w-2xl mx-auto py-32 md:py-56 space-y-10 md:space-y-16 text-center animate-in fade-in flex-1 px-4">
            <div className="relative inline-flex items-center justify-center scale-110 md:scale-[2] mb-8 md:mb-16">
                <div className={`w-24 h-24 md:w-32 md:h-32 border-[6px] md:border-[8px] border-slate-800 rounded-full ${campaignType === 'warm' ? 'border-t-purple-500' : 'border-t-blue-500'} animate-spin`} />
                <Zap size={28} md:size={40} className={`absolute m-auto ${campaignType === 'warm' ? 'text-purple-500 fill-purple-500' : 'text-blue-500 fill-blue-500'} animate-pulse`} />
            </div>
            <div className="space-y-6 md:space-y-8">
                <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-[0.2em] md:tracking-[0.3em] text-white drop-shadow-lg leading-tight">{progressLabel || "Synthesizing..."}</h2>
                <div className="w-full bg-slate-900 h-6 md:h-8 rounded-full overflow-hidden border-2 md:border-4 border-slate-800 shadow-inner p-1">
                    <div className={`h-full ${campaignType === 'warm' ? 'bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.8)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]'} rounded-full transition-all duration-300 relative overflow-hidden flex items-center justify-end pr-4`} style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
                <p className={`text-[10px] md:text-sm font-black uppercase tracking-[0.4em] md:tracking-[0.6em] ${campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'}`}>{Math.round(progress)}% Integrated</p>
            </div>
          </div>
        )}

        {/* === STEP 5: RESULTS (DIE PITCH MATRIX & STICKY SAVE BAR) === */}
        {activeStep === 'result' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-10 pb-48 w-full pt-4 md:pt-8 relative">
            
            {/* DIE HAUPT-MATRIX */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
                <div className="lg:col-span-7 space-y-6 md:space-y-10">
                  {/* Info Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 p-4 md:p-6 bg-[#0F172A] border border-slate-800 rounded-2xl md:rounded-[2.5rem] items-center shadow-xl md:shadow-2xl">
                     <div className="flex flex-col flex-1 px-2 md:px-4 sm:border-r border-slate-700 w-full text-center sm:text-left"><span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Target</span><span className={`text-xs md:text-sm font-bold truncate ${campaignType === 'warm' ? 'text-purple-400' : 'text-blue-400'}`}>{targetCompany}</span></div>
                     <div className="flex flex-col flex-1 px-2 md:px-4 sm:border-r border-slate-700 w-full text-center sm:text-left"><span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Persona</span><span className="text-xs md:text-sm text-white font-bold">{persona}</span></div>
                     <div className="flex flex-col flex-1 px-2 md:px-4 w-full text-center sm:text-left"><span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Context</span><span className="text-xs md:text-sm text-white font-bold truncate">{campaignType === 'warm' ? (warmType === 'event' ? 'Messe' : warmType === 'lost_deal' ? 'Lost Deal' : 'Refresh') : selectedTopic?.title}</span></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                     <ContentCard title="Hard Pitch (Direkt)" pitchData={posts.pitch_direct} type="pitch_direct" icon={Crosshair} color="bg-red-500" />
                     <ContentCard title="Value Pitch (Mehrwert)" pitchData={posts.pitch_value} type="pitch_value" icon={BarChart3} color="bg-blue-500" />
                  </div>
                  <ContentCard title="Narrative Pitch (Story/News)" pitchData={posts.pitch_story} type="pitch_story" icon={AlignJustify} color="bg-purple-500" />
                </div>
                
                {/* DAS DOSSIER & VISUAL (Rechte Spalte) */}
                <div className="lg:col-span-5 flex flex-col gap-6 md:gap-10">
                  <div className="bg-[#0F172A] p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] shadow-xl md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-slate-800">
                    
                    {/* DOSSIER RECAP */}
                    <div className="mb-6 md:mb-8 space-y-3 md:space-y-4 bg-black/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800">
                        <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 md:mb-2 border-b border-slate-800 pb-2">Unternehmensdaten</h3>
                        <div className="flex items-start gap-2 md:gap-3">
                            <Phone size={12} className="text-slate-400 mt-1 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-bold text-white">{companyData.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-2 md:gap-3">
                            <MapPin size={12} className="text-slate-400 mt-1 flex-shrink-0" />
                            <span className="text-[10px] md:text-xs text-slate-300 leading-tight">{companyData.address || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4 md:mb-8 px-1 md:px-2">
                        <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Brand Visual</span>
                    </div>
                    
                    <div className="aspect-square bg-black rounded-[2rem] md:rounded-[3.5rem] border-[6px] md:border-[12px] border-slate-900 overflow-hidden flex items-center justify-center relative group cursor-zoom-in mb-6 md:mb-8 shadow-inner" onClick={() => posts.image && setZoomedImage(posts.image)}>
                        {loadingItems.image && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-20"><Loader2 className={`animate-spin ${campaignType === 'warm' ? 'text-purple-500' : 'text-blue-500'}`} size={48} /></div>}
                        {posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <Loader2 className="animate-spin text-slate-700" size={32} />}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900/20 backdrop-blur-sm"><Maximize2 size={32} className="text-white drop-shadow-lg" /></div>
                    </div>

                    {/* IMAGE PROMPT EDIT & REGENERATE */}
                    <div className="bg-black/50 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-slate-800 mb-2 md:mb-4 space-y-3 relative z-10">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 md:px-2 flex items-center gap-2"><Edit3 size={12}/> AI Image Prompt</label>
                        <textarea 
                            value={customImagePrompt} 
                            onChange={(e) => setCustomImagePrompt(e.target.value)}
                            className={`w-full p-3 md:p-4 bg-slate-900 border-2 border-slate-800 rounded-xl md:rounded-2xl text-slate-300 outline-none text-[10px] md:text-xs transition-colors h-20 md:h-24 resize-none pointer-events-auto focus:border-${campaignType === 'warm' ? 'purple' : 'blue'}-600`}
                            placeholder="Beschreibe das Bild auf Englisch..."
                        />
                        <button onClick={() => generateImage(customImagePrompt)} disabled={loadingItems.image} className={`w-full py-2.5 md:py-3 rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2 transition-all ${campaignType === 'warm' ? 'bg-purple-900/40 text-purple-400 hover:bg-purple-600 hover:text-white' : 'bg-blue-900/40 text-blue-400 hover:bg-blue-600 hover:text-white'}`}>
                           <RefreshCw size={12} md:size={14} className={loadingItems.image ? 'animate-spin' : ''}/> {loadingItems.image ? 'Rendering...' : 'Bild generieren'}
                        </button>
                    </div>

                  </div>
                </div>
            </div>

            {/* DIE NEUE, FETTE STICKY ACTION BAR FÜRS SPEICHERN */}
            <div className="fixed bottom-0 left-0 w-full bg-[#020617]/95 backdrop-blur-3xl border-t border-slate-800 p-3 md:p-6 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
                    
                    <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                        <div className="bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl hidden md:block">
                            <CalendarDays size={18} md:size={20} className="text-slate-400" />
                        </div>
                        <div className="flex-1 flex items-center md:items-start md:flex-col gap-2 md:gap-1">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 block pl-1 md:pl-2 whitespace-nowrap">Schedule Date</label>
                            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={`flex-1 w-full px-3 py-2 md:px-5 md:py-3 bg-black border-2 border-slate-800 rounded-lg md:rounded-2xl text-white outline-none text-xs md:text-sm font-bold transition-colors focus:border-${campaignType === 'warm' ? 'purple' : 'blue'}-600`} />
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto gap-2 md:gap-4">
                        <button onClick={() => { if(activeStep !== 'library') setLastStep(activeStep); setActiveStep('library'); }} className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-5 bg-slate-800 text-white rounded-xl md:rounded-3xl font-black text-[9px] md:text-[11px] uppercase hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-2 md:gap-3 transition-all">
                            <Library size={14} className="md:w-[18px] md:h-[18px]" /> VAULT
                        </button>
                        <button onClick={archiveAsset} disabled={loading} className="flex-1 md:flex-none px-6 py-3 md:px-12 md:py-5 bg-green-600 text-white rounded-xl md:rounded-3xl font-black text-[9px] md:text-[11px] uppercase shadow-[0_0_20px_rgba(22,163,74,0.4)] md:shadow-[0_0_30px_rgba(22,163,74,0.4)] hover:bg-green-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3">
                            <Save size={16} className="md:w-[20px] md:h-[20px]" /> SPEICHERN
                        </button>
                    </div>
                </div>
            </div>

          </div>
        )}

        {/* === STEP 6: VAULT / CRM === */}
        {activeStep === 'library' && (
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 pb-32 pt-6 md:pt-10 h-auto lg:h-[calc(100vh-100px)]">
            
            {/* CRM SIDEBAR (Filter) */}
            <div className="w-full lg:w-1/4 bg-[#0F172A] rounded-[2rem] md:rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden lg:h-full shadow-2xl flex-shrink-0">
                <div className="p-6 md:p-8 border-b border-slate-800 bg-black/30">
                    <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white">CRM Directory</h2>
                    <p className="text-[9px] md:text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1 md:mt-2">In-Memory Alpha</p>
                </div>
                <div className="p-3 md:p-4 flex-1 overflow-y-auto space-y-1 md:space-y-2 max-h-[30vh] lg:max-h-none">
                    {uniqueCompanies.map((company) => (
                        <button 
                            key={company} 
                            onClick={() => setCrmFilter(company)}
                            className={`w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center justify-between ${crmFilter === company ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <span className="truncate">{company}</span>
                            {company !== 'ALL' && <span className="text-[9px] md:text-[10px] bg-black/30 px-2 py-1 rounded-lg">{assetLibrary.filter(a => a.companyName === company).length}</span>}
                        </button>
                    ))}
                </div>
                <div className="p-3 md:p-4 border-t border-slate-800 bg-black/30">
                    <button onClick={handleBack} className="w-full bg-slate-800 text-white py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <ArrowLeft size={12} md:size={14}/> Studio Return
                    </button>
                </div>
            </div>

            {/* VAULT CONTENT AREA */}
            <div className="w-full lg:w-3/4 flex-1 overflow-y-auto h-full pr-1 md:pr-2">
                {displayedAssets.length === 0 ? (
                    <div className="bg-[#0F172A]/50 h-full min-h-[50vh] rounded-[2rem] md:rounded-[4rem] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center">
                        <Database size={48} md:size={80} className="text-slate-800 mb-4 md:mb-8" />
                        <p className="text-slate-600 text-xs md:text-sm font-black uppercase tracking-[0.4em] md:tracking-[0.6em] italic text-center">CRM ist leer.</p>
                    </div>
                ) : (
                    <div className="space-y-6 md:space-y-8">
                        {displayedAssets.map((item) => (
                            <div key={item.id} className="bg-[#0F172A] rounded-[2rem] md:rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
                                {/* Header */}
                                <div className="p-4 md:p-6 bg-black/50 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 border-b border-slate-800">
                                    <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                                        <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border flex items-center gap-2 ${item.type === 'warm' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-blue-900/30 text-blue-400 border-blue-500/30'}`}>
                                            {item.type === 'warm' ? <Users size={12} md:size={14}/> : <Search size={12} md:size={14}/>}
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{item.scheduledDate || 'DRAFT'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                                            {editingId === item.id ? (
                                                <div className="flex items-center gap-2 w-full"><input type="text" className="bg-slate-900 px-2 py-1 md:px-3 md:py-1 rounded-md md:rounded-lg w-full outline-none font-bold text-xs md:text-sm border border-blue-500" defaultValue={item.name} onBlur={(e) => updateAsset(item.id, e.target.value)} autoFocus /><CheckCircle2 size={16} md:size={20} className="text-green-500 cursor-pointer flex-shrink-0" /></div>
                                            ) : (
                                                <><span className="text-sm md:text-lg font-black uppercase truncate italic">{item.name}</span><button onClick={() => setEditingId(item.id)} className="opacity-30 hover:opacity-100"><Edit3 size={12} md:size={14}/></button></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-800">{item.companySize || 'N/A'}</span>
                                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-900/20 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-blue-900/50">{item.persona}</span>
                                        <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-slate-600 hover:text-red-500 p-1 md:p-1.5 hover:bg-black rounded-md md:rounded-lg"><Trash2 size={14} md:size={16} /></button>
                                    </div>
                                </div>
                                
                                {/* Body */}
                                <div className="p-5 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
                                    {/* Dossier Data im CRM */}
                                    <div className="w-full md:w-1/3 bg-black/30 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 space-y-3 md:space-y-4">
                                        <h4 className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-2 md:mb-4">Impressum & Notes</h4>
                                        <div className="space-y-2 md:space-y-3">
                                            <p className="text-[10px] md:text-xs text-white font-bold flex items-center gap-2"><Phone size={10} md:size={12} className="text-slate-500"/> {item.companyPhone || 'N/A'}</p>
                                            <p className="text-[10px] md:text-xs text-slate-400 leading-tight flex items-start gap-2"><MapPin size={10} md:size={12} className="text-slate-500 mt-0.5 flex-shrink-0"/> {item.companyAddress || 'N/A'}</p>
                                        </div>
                                        {item.companyComments && (
                                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-800">
                                                <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-1">Analyst Notes</p>
                                                <p className="text-[10px] md:text-xs text-slate-300 italic">{item.companyComments}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hooks & Strategy */}
                                    <div className="w-full md:w-2/3 flex flex-col gap-3 md:gap-4">
                                        <h4 className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 md:mb-2 border-b border-slate-800 pb-2">Recherchierte Hooks</h4>
                                        <div className="space-y-2 md:space-y-3 overflow-y-auto max-h-40 md:max-h-48 pr-2">
                                            {item.allTopics && item.allTopics.length > 0 ? item.allTopics.map((t, idx) => (
                                                <div key={idx} className={`p-3 md:p-4 rounded-xl border ${t.title === item.topic ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-900 border-slate-800'}`}>
                                                    <p className="text-xs md:text-sm font-bold text-white mb-1">{t.title}</p>
                                                    <p className="text-[10px] md:text-xs text-slate-400 line-clamp-2">{t.rationale}</p>
                                                </div>
                                            )) : (
                                                <div className="p-3 md:p-4 bg-slate-900 rounded-xl border border-slate-800"><p className="text-xs md:text-sm font-bold text-white mb-1">{item.topic}</p><p className="text-[10px] md:text-xs text-slate-500">Keine weiteren Hooks gespeichert.</p></div>
                                            )}
                                        </div>
                                        <div className="pt-3 md:pt-4 mt-auto">
                                            <button onClick={() => loadFromArchive(item)} className="w-full py-3 md:py-4 bg-blue-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] hover:bg-blue-500 transition-all rounded-xl md:rounded-2xl shadow-lg flex items-center justify-center gap-2"><FolderOpen size={14} md:size={16}/> KAMPAGNE ÖFFNEN</button>
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
          <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-red-950 text-red-200 px-6 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.5)] border-2 border-red-900 flex items-center gap-4 md:gap-6 z-[200] w-[90vw] max-w-lg md:max-w-[90vw] animate-in slide-in-from-bottom-6">
            <ShieldAlert size={24} md:size={32} className="text-red-500 flex-shrink-0" />
            <span className="text-xs md:text-sm font-bold italic flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-1.5 md:p-2 text-red-500 hover:text-white hover:bg-red-900 rounded-full transition-colors flex-shrink-0"><X size={16} md:size={20}/></button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .cursor-zoom-in { cursor: zoom-in; }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
}
