// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Loader2, Send, RefreshCw, BarChart3, Sparkles, Copy, Check, Zap, 
  RotateCcw, Image as ImageIcon, X, CheckCircle2, Maximize2, 
  AlignCenter, AlignJustify, AlignLeft, ShieldCheck, Rocket, CalendarDays, 
  Clock, MessageCircle, Target, Briefcase, ShieldAlert, Library, Save, Trash2, ChevronRight,
  Building2, Globe2, Network, Lightbulb, Crosshair, Info, Edit3, Search, Link as LinkIcon, AlertTriangle,
  Users, PhoneCall, Video, HelpCircle, MapPin, History, RefreshCcw, Phone, StickyNote
} from 'lucide-react';

export default function App() {
  const [activeStep, setActiveStep] = useState('campaign_select'); 
  const [campaignType, setCampaignType] = useState(''); 
  
  // --- GOOGLE API KEY: HIER DEINEN KEY EINTRAGEN ---
  const apiKey = "AIzaSyCNZaqJ2fLAGyfSfEgJG7u7b4x9qC0mWV8"; 

  // --- EINGABE STATE ---
  const [targetCompany, setTargetCompany] = useState('');
  const [persona, setPersona] = useState('Geschäftsführung');
  const [tone, setTone] = useState('Analytisch');
  
  const [warmType, setWarmType] = useState('event'); 
  const [warmContext, setWarmContext] = useState(''); 
  const [followUpAction, setFollowUpAction] = useState('Telefonat');

  // --- DOSSIER & ERGEBNIS STATE ---
  const [companyData, setCompanyData] = useState({ address: '', phone: '', comments: '' });
  const [researchTopics, setResearchTopics] = useState([]);
  const [groundingSources, setGroundingSources] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const [posts, setPosts] = useState({ pitch_direct: '', pitch_value: '', pitch_story: '', image: null, description: '' });
  const [scheduleDate, setScheduleDate] = useState('');
  const [customImagePrompt, setCustomImagePrompt] = useState(''); 
  
  // --- UI STATE ---
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState({ pitch_direct: false, pitch_value: false, pitch_story: false, image: false });
  const [error, setError] = useState(null);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [copiedType, setCopiedType] = useState(null);

  useEffect(() => {
    if (posts.description) setCustomImagePrompt(posts.description);
  }, [posts.description]);

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
    setCompanyData({ address: '', phone: '', comments: '' });
    setActiveStep('campaign_select');
  };

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
    const standardDelay = 2000;
    const rateLimitDelay = 15000; 
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) throw new Error("RATE_LIMIT");
            throw new Error(`Status ${response.status} - ${errText}`);
        }
        return await response.json();
      } catch (err) {
        if (err.message === "RATE_LIMIT") {
            if (i === retries - 1) throw new Error("Google Limit hart erreicht. Bitte kurz warten.");
            setProgressLabel("Google Limit. Kurze Pause (15s)...");
            await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
            continue; 
        }
        if (i === retries - 1) throw new Error(`KI-Diagnose: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, standardDelay));
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

  const startResearch = async () => {
    if (!targetCompany.trim()) { setError("Bitte Unternehmen oder Industrie hinzufügen."); return; }
    if (campaignType === 'warm' && !warmContext.trim()) { setError("Bitte den Grund der Reaktivierung (Kontext) angeben."); return; }
    
    setActiveStep('generating');
    setLoading(true); setProgress(5); setProgressLabel(`Scanne globale News & Impressum für ${targetCompany}...`); setError(null);

    try {
        const isQuatsch = await checkRelevance(targetCompany);
        if (isQuatsch) {
            setError("Nonsense erkannt. Bitte seriöses Unternehmen/Industrie eingeben.");
            setLoading(false); setProgress(0); 
            setActiveStep(campaignType === 'warm' ? 'input_warm' : 'input_cold'); 
            return;
        }

        const prompt = `Du bist ein B2B Lead-Research Analyst. Führe eine Websuche für das Unternehmen oder die Industrie "${targetCompany}" durch.
        Aufgabe 1: Finde die offizielle Adresse (Headquarter) und die zentrale Telefonnummer aus dem Impressum. (Bei Industrien gib "N/A" aus).
        Aufgabe 2: Entwickle 3 hochaktuelle strategische Aufhänger (Angriffsvorschläge) für einen Pitch an ${persona}.
        
        REGEL: Antworte AUSSCHLIESSLICH mit rohem, gültigen JSON. Kein Markdown!
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
      setActiveStep(campaignType === 'warm' ? 'input_warm' : 'input_cold'); 
    } 
    finally { setLoading(false); setProgress(0); }
  };

  const runContentEngine = async (topic) => {
    setSelectedTopic(topic);
    setActiveStep('generating'); setProgress(10); setProgressLabel(`Synthetisiere Pitches für ${persona}...`); 
    setLoadingItems({ pitch_direct: true, pitch_value: true, pitch_story: true, image: true });
    setLoading(true); setError(null);

    const sourcesText = groundingSources.length > 0 ? groundingSources.map((s, i) => `[${i+1}] ${s.url || s.uri}`).join("\n") : "Keine URLs verfügbar.";

    try {
      let contextSetup = "";
      if (campaignType === 'cold') {
          contextSetup = `DU MACHST KALTAKQUISE. Aufhänger für deine Nachricht ist AUSSCHLIESSLICH dieses News-Thema: "${topic.title} - ${topic.rationale}".`;
      } else {
          let warmText = "";
          if (warmType === 'event') warmText = `Wir haben sie auf dem Event "${warmContext}" getroffen.`;
          if (warmType === 'lost_deal') warmText = `Wir hatten einen Lost Deal wegen: "${warmContext}".`;
          if (warmType === 'old_contact') warmText = `Letzter Kontakt: "${warmContext}".`;
          
          contextSetup = `DU REAKTIVIERST EINEN KONTAKT. 
          HISTORIE: ${warmText}
          ZIEL: Verbinde diese alte Historie extrem elegant mit dem brandaktuellen News-Thema: "${topic.title} - ${topic.rationale}".`;
      }

      const actionText = 
        followUpAction === 'Telefonat' ? "Call-to-Action: Ein kurzes 10-Minuten-Telefonat zum Abgleich anbieten." :
        followUpAction === 'Video' ? "Call-to-Action: Einen Videocall für einen Deep-Dive vorschlagen." :
        "Call-to-Action: Eine provokante, offene Frage zur aktuellen IT-Architektur stellen.";

      const textPrompt = `WICHTIG: Du bist ein Top-B2B-Sales-Experte von ELWIS. Dein Ziel ist die Akquise VON "${targetCompany}". DU BIST NICHT DIE FIRMA "${targetCompany}"! Du pitchst AN sie.
      Ziel-Persona: "${persona}". Tonfall: "${tone}". 
      ${actionText}
      ${contextSetup}
      Nutze diese Quellen für Fakten: ${sourcesText}

      Erzeuge 3 unterschiedliche, kurze bis mittellange Outreach-Pitches (LinkedIn/Cold Email Format):
      1. "pitch_direct": Hard-Pitch. Direkt, auf den Punkt, fokussiert auf den Schmerz und die Lösung.
      2. "pitch_value": Consultative-Pitch. Etwas weicher, fokussiert auf den geschäftlichen Mehrwert und die Sicherheit (IBM DNA).
      3. "pitch_story": Narrative-Pitch. Greift die News/Historie stark auf und baut eine Brücke zu ELWIS.
      4. "visual": Englische Beschreibung für eine abstrakte B2B-Vektorgrafik (KEINE echten Firmennamen/Logos!).
      
      JSON: {"pitch_direct": "...", "pitch_value": "...", "pitch_story": "...", "visual": "..."}. Deutsch.`;
      
      const res = await apiCall({ contents: [{ parts: [{ text: textPrompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = parseJSON(res.candidates[0].content.parts[0].text);
      if(data) {
          setPosts({ pitch_direct: data.pitch_direct, pitch_value: data.pitch_value, pitch_story: data.pitch_story, description: data.visual, image: null });
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
      } catch (err) { console.error("Bildgenerierung fehlgeschlagen:", err); } 
      finally { setLoadingItems(prev => ({...prev, image: false})); }
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const name = `${targetCompany.replace(/[^a-zA-Z0-9]/g, "")}_${campaignType === 'warm' ? 'Warm' : 'Cold'}`.substring(0, 20) || "Kampagne";
      const newAsset = { 
          id: Date.now(), name: name, ...posts, topic: selectedTopic?.title || 'Unknown', scheduledDate: scheduleDate, 
          persona, companySize: targetCompany, tone, sources: groundingSources, type: campaignType, 
          companyAddress: companyData.address, companyPhone: companyData.phone, companyComments: companyData.comments,
          date: new Date().toLocaleDateString() 
      };
      setAssetLibrary([newAsset, ...assetLibrary]);
      setActiveStep('library');
    } catch (err) { setError("Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
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
    <div className="bg-[#0F172A] border border-slate-800 rounded-[2.5rem] p-6 md:p-8 relative flex flex-col h-full shadow-2xl transition-all hover:border-blue-500/40 group w-full min-w-0">
      <div className={`absolute top-0 left-0 w-2 h-full ${color} rounded-l-[2.5rem]`}></div>
      <div className="flex justify-between items-center mb-6 pl-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={18} className="text-slate-400 flex-shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</span>
        </div>
        <button onClick={() => {navigator.clipboard.writeText(text); setCopiedType(type); setTimeout(()=>setCopiedType(null), 2000)}} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all text-slate-300 flex-shrink-0">
          {copiedType === type ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
        </button>
      </div>
      <div className="bg-black/50 p-6 rounded-3xl border border-slate-800 flex-1 overflow-y-auto relative ml-4 min-h-[150px]">
        {loadingItems[type] && <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center z-10 rounded-3xl"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}
        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap break-words text-sm">{text || "Warte auf Engine..."}</p>
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

      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800 p-5 px-6 md:px-10 flex justify-between items-center w-full shadow-2xl">
        <div className="flex items-center gap-6">
          {activeStep !== 'campaign_select' && <button onClick={resetEngine} className="p-3 bg-slate-800 rounded-full text-blue-400 hover:bg-slate-700 active:scale-95 transition-all"><RotateCcw size={20}/></button>}
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white italic">ELWIS LAB</h1>
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-1">v43.0 | STREAMLINED FLOW</span>
          </div>
        </div>
        <button onClick={() => setActiveStep('library')} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 relative hover:bg-slate-700 transition-all">
          <CalendarDays size={20} className="text-white" />
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

        {/* === STEP 1A: COLD OUTREACH INPUT (Neuer Flow) === */}
        {activeStep === 'input_cold' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-right-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-blue-900/30 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 mb-2"><Search size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Intelligence Module: Kaltakquise</span></div>
                <h2 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Target Lock.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-6 md:p-12 rounded-[3rem] md:rounded-[4rem] border border-slate-800 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px]"></div>
                
                {/* 1. Personenkreis */}
                <div className="space-y-4 relative z-10">
                    <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] pl-4">1) Personenkreis</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                        <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                        <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                    </div>
                </div>

                {/* 2. Unternehmen / Industrie */}
                <div className="space-y-4 relative z-10">
                    <label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 block pl-4">2) Unternehmen / Industrie</label>
                    <div className="relative">
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input type="text" className="w-full p-6 md:p-8 pl-16 bg-black border-2 border-slate-800 rounded-[2.5rem] outline-none text-xl md:text-2xl font-black text-white placeholder:text-slate-700 focus:border-blue-600 transition-all shadow-inner uppercase tracking-wide" placeholder="Bitte Unternehmen oder Industrie hinzufügen..." value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                    </div>
                </div>

                {/* 3. Tonfall (Optional, aber wichtig für Quali) */}
                <div className="space-y-4 relative z-10 pt-4 border-t border-slate-800">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] pl-4">Tonfall Einstellung (Optional)</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <HorizontalButton active={tone === 'Analytisch'} onClick={() => setTone('Analytisch')} icon={BarChart3} label="Analytisch" />
                        <HorizontalButton active={tone === 'Visionär'} onClick={() => setTone('Visionär')} icon={Lightbulb} label="Visionär" />
                        <HorizontalButton active={tone === 'Direkt'} onClick={() => setTone('Direkt')} icon={Crosshair} label="Knallhart" />
                    </div>
                </div>

                <button onClick={startResearch} disabled={loading || !targetCompany.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 md:py-10 rounded-[3.5rem] font-black text-sm md:text-lg uppercase tracking-[0.4em] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Zap size={28} />} LET'S GO !
                </button>
            </div>
          </div>
        )}

        {/* === STEP 1B: WARM OUTREACH INPUT (Neuer Flow) === */}
        {activeStep === 'input_warm' && (
          <div className="max-w-4xl mx-auto w-full space-y-12 animate-in slide-in-from-left-10 pt-10 flex-1 pb-40">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-3 bg-purple-900/30 text-purple-400 px-6 py-2 rounded-full border border-purple-500/30 mb-2"><Users size={16} /> <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Intelligence Module: Reaktivierung</span></div>
                <h2 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic text-center">Re-Engagement.</h2>
            </div>
            
            <div className="bg-[#0F172A] p-6 md:p-12 rounded-[3rem] md:rounded-[4rem] border border-slate-800 shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px]"></div>
                
                {/* 1. Personenkreis */}
                <div className="space-y-4 relative z-10">
                    <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] pl-4">1) Personenkreis</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <HorizontalButton active={persona === 'Geschäftsführung'} onClick={() => setPersona('Geschäftsführung')} icon={Briefcase} label="C-Level" />
                        <HorizontalButton active={persona === 'Tech Lead'} onClick={() => setPersona('Tech Lead')} icon={Network} label="Tech Lead" />
                        <HorizontalButton active={persona === 'Betriebsleiter'} onClick={() => setPersona('Betriebsleiter')} icon={Target} label="Ops Manager" />
                    </div>
                </div>

                {/* 2. Unternehmen / Industrie */}
                <div className="space-y-4 relative z-10">
                    <label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 block pl-4">2) Unternehmen / Industrie</label>
                    <div className="relative">
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input type="text" className="w-full p-6 md:p-8 pl-16 bg-black border-2 border-slate-800 rounded-[2.5rem] outline-none text-xl md:text-2xl font-black text-white placeholder:text-slate-700 focus:border-purple-600 transition-all shadow-inner uppercase tracking-wide" placeholder="Bitte Unternehmen oder Industrie hinzufügen..." value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                    </div>
                </div>

                {/* 3. SECRET SAUCE DATA (UNVERZICHTBAR FÜR WARM OUTREACH!) */}
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

                <button onClick={startResearch} disabled={loading || !targetCompany.trim() || !warmContext.trim()} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-8 md:py-10 rounded-[3.5rem] font-black text-sm md:text-lg uppercase tracking-[0.4em] shadow-[0_20px_50px_-10px_rgba(147,51,234,0.5)] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:shadow-none relative z-20 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={28} /> : <Zap size={28} />} LET'S GO !
                </button>
            </div>
          </div>
        )}

        {/* === STEP 2: DOSSIER & TOPIC SELECTION (DIE 3 THEMEN) === */}
        {activeStep === 'topic_selection' && (
          <div className="w-full animate-in zoom-in duration-500 flex-1 pb-32 pt-4 flex flex-col lg:flex-row gap-8">
            
            {/* SPALTE LINKS: FIRMEN-DOSSIER */}
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

            {/* SPALTE RECHTS: ANGRIFFSVORSCHLÄGE (DIE 3 THEMEN) */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                <div className="mb-4 space-y-2">
                    <h2 className={`text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase border-l-8 pl-6 ${campaignType === 'warm' ? 'border-purple-600' : 'border-blue-600'}`}>
                        Aktuelle Themen für den Angriff
                    </h2>
                    <p className="text-slate-400 pl-8 text-sm">Wähle eines dieser 3 aktuellen News-Themen aus der Recherche, um die Pitch-Matrix zu generieren.</p>
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
                            <AlertTriangle size={14} /> Keine direkten News-URLs verknüpft.
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* === STEP 3: LOADING === */}
        {activeStep === 'generating' && (
          <div className="max-w-2xl mx-auto py-32 md:py-56 space-y-12 md:space-y-16 text-center animate-in fade-in flex-1">
            <div className="relative inline-flex items-center justify-center scale-125 md:scale-[2] mb-10 md:mb-16">
                <div className={`w-24 h-24 md:w-32 md:h-32 border-[6px] md:border-[8px] border-slate-800 rounded-full ${campaignType === 'warm' ? 'border-t-purple-500' : 'border-t-blue-500'} animate-spin`} />
                <Zap size={32} className={`absolute m-auto ${campaignType === 'warm' ? 'text-purple-500 fill-purple-500' : 'text-blue-500 fill-blue-500'} animate-pulse`} />
            </div>
            <div className="space-y-6 md:space-y-8 px-4">
                <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-[0.2em] md:tracking-[0.3em] text-white drop-shadow-lg">{progressLabel}</h2>
                <div className="w-full bg-slate-900 h-6 md:h-8 rounded-full overflow-hidden border-2 md:border-4 border-slate-800 shadow-inner p-1">
                    <div className={`h-full ${campaignType === 'warm' ? 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.8)]' : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)]'} rounded-full transition-all duration-300 relative overflow-hidden flex items-center justify-end pr-4`} style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* === STEP 4: RESULTS (DIE PITCH MATRIX) === */}
        {activeStep === 'result' && (
          <div className="flex flex-col xl:flex-row gap-8 md:gap-10 animate-in fade-in slide-in-from-bottom-10 pb-32 w-full pt-4 md:pt-8">
            
            {/* LINKE SPALTE: PITCH CONTENT */}
            <div className="w-full xl:w-2/3 space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 p-5 bg-[#0F172A] border border-slate-800 rounded-[2rem] items-center shadow-xl">
                 <div className="flex flex-col flex-1 px-4 sm:border-r border-slate-700 w-full text-center sm:text-left"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Target</span><span className={`text-sm font-bold truncate ${campaignType === 'warm' ? 'text-purple-400' : 'text-blue-400'}`}>{targetCompany}</span></div>
                 <div className="flex flex-col flex-1 px-4 sm:border-r border-slate-700 w-full text-center sm:text-left"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Persona</span><span className="text-sm text-white font-bold">{persona}</span></div>
                 <div className="flex flex-col flex-1 px-4 w-full text-center sm:text-left"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Context</span><span className="text-sm text-white font-bold truncate">{campaignType === 'warm' ? (warmType === 'event' ? 'Messe' : warmType === 'lost_deal' ? 'Lost Deal' : 'Refresh') : selectedTopic?.title}</span></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                 <ContentCard title="Hard Pitch (Direkt)" text={posts.pitch_direct} type="pitch_direct" icon={Crosshair} color="bg-red-500" />
                 <ContentCard title="Value Pitch (Mehrwert)" text={posts.pitch_value} type="pitch_value" icon={BarChart3} color="bg-blue-500" />
              </div>
              <ContentCard title="Narrative Pitch (Story/News)" text={posts.pitch_story} type="pitch_story" icon={AlignJustify} color="bg-purple-500" />
            </div>
            
            {/* RECHTE SPALTE: DOSSIER RECAP & SPEICHERN */}
            <div className="w-full xl:w-1/3 flex flex-col gap-8">
              <div className="bg-[#0F172A] p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-800 w-full">
                
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

                {/* DAS BILD (Optional/Generisch) */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Brand Visual</span>
                </div>
                
                <div className="aspect-video bg-black rounded-[2rem] border-8 border-slate-900 overflow-hidden flex items-center justify-center relative group cursor-zoom-in mb-6" onClick={() => posts.image && setZoomedImage(posts.image)}>
                    {loadingItems.image ? <Loader2 className="animate-spin text-slate-700" size={32} /> : posts.image ? <img src={posts.image} alt="Visual" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <ImageIcon className="text-slate-800" size={32} />}
                </div>

                <div className="bg-black/50 p-4 rounded-[2rem] border border-slate-800 mb-6 space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 flex items-center gap-2"><Edit3 size={12}/> AI Image Prompt</label>
                    <textarea 
                        value={customImagePrompt} 
                        onChange={(e) => setCustomImagePrompt(e.target.value)}
                        className="w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-slate-300 outline-none text-xs focus:border-blue-600 transition-colors h-20 resize-none"
                        placeholder="Beschreibe das Bild auf Englisch..."
                    />
                    <button onClick={() => generateImage()} disabled={loadingItems.image} className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all bg-blue-900/40 text-blue-400 hover:bg-blue-600 hover:text-white">
                       <RefreshCw size={14} className={loadingItems.image ? 'animate-spin' : ''}/> {loadingItems.image ? 'Rendering...' : 'Bild generieren'}
                    </button>
                </div>

                {/* SPEICHERN */}
                <div className="bg-black/50 p-5 rounded-[2rem] border border-slate-800 mb-6 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 flex items-center gap-2"><CalendarDays size={12}/> Schedule Date</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-white outline-none text-sm font-bold focus:border-blue-600 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={archiveAsset} disabled={loading} className={`py-5 bg-green-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-[0_15px_30px_-10px_rgba(22,163,74,0.5)] hover:bg-green-500 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50`}><Save size={16}/> SAVE</button>
                    <button onClick={() => setActiveStep('library')} className="py-5 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-2 transition-all"><Library size={16}/> VAULT</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 5: VAULT === */}
        {activeStep === 'library' && (
          <div className="space-y-16 animate-in slide-in-from-right-16 pb-32 px-2 md:px-4 w-full flex-1 flex flex-col pt-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2 md:px-8 border-b border-slate-800 pb-10">
                <div><h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">The Vault.</h2><p className="text-blue-500 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.6em] mt-4 md:mt-8">Strategic Asset & Dossier Management</p></div>
                <button onClick={resetEngine} className="bg-white text-slate-900 px-10 md:px-12 py-4 md:py-5 rounded-full text-[10px] md:text-[11px] font-black uppercase hover:scale-105 active:scale-95 transition-all tracking-[0.3em]">Zum Router</button>
            </div>
            
            {assetLibrary.length === 0 ? (
                <div className="bg-[#0F172A]/50 p-20 md:p-60 rounded-[4rem] md:rounded-[6rem] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center">
                    <Library size={60} md:size={80} className="text-slate-800 mb-8 md:mb-10" />
                    <p className="text-slate-600 text-xs md:text-sm font-black uppercase tracking-[0.6em] italic text-center">Vault is empty.</p>
                </div>
            ) : (
                <div className="space-y-10 md:space-y-16 mt-10">
                    {assetLibrary.map((item) => (
                        <div key={item.id} className="bg-[#0F172A] rounded-[3rem] md:rounded-[4rem] border border-slate-800 overflow-hidden flex flex-col shadow-2xl hover:-translate-y-2 transition-all duration-500">
                            <div className="p-6 md:p-10 bg-black/50 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800">
                                <div className="flex items-center gap-4 md:gap-6 flex-1 w-full">
                                    <div className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl border flex items-center gap-2 flex-shrink-0 ${item.type === 'warm' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-blue-900/30 text-blue-400 border-blue-500/30'}`}>
                                        {item.type === 'warm' ? <Users size={14}/> : <Search size={14}/>}
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{item.scheduledDate || 'DRAFT'}</span>
                                    </div>
                                    <span className="text-lg md:text-2xl font-black uppercase truncate italic tracking-tighter opacity-90">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-3 md:gap-4">
                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-3 md:px-4 py-2 rounded-xl border border-slate-800 hidden sm:block">{item.companySize}</span>
                                    <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl border ${item.type === 'warm' ? 'text-purple-400 bg-purple-900/20 border-purple-900/50' : 'text-blue-400 bg-blue-900/20 border-blue-900/50'}`}>{item.persona}</span>
                                    <button onClick={() => setAssetLibrary(assetLibrary.filter(a => a.id !== item.id))} className="text-slate-600 hover:text-red-500 p-2 md:p-3 bg-black/40 rounded-full"><Trash2 size={16} md:size={18} /></button>
                                </div>
                            </div>
                            <div className="p-6 md:p-12 flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                                {/* Dossier Info im Vault */}
                                <div className="w-full md:w-1/3 bg-black/40 p-6 rounded-[2rem] border border-slate-800 space-y-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Firmendaten</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {item.companyPhone || 'N/A'}</p>
                                    {item.companyComments && (
                                        <div className="mt-4 pt-4 border-t border-slate-800">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Notizen</p>
                                            <p className="text-xs text-slate-400 italic line-clamp-3">{item.companyComments}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-center space-y-4 md:space-y-6 w-full">
                                    <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] italic ${item.type === 'warm' ? 'text-purple-500' : 'text-blue-500'}`}>{item.type === 'warm' ? 'Warm Angle' : 'Cold Angle'}</p>
                                    <p className="text-lg md:text-xl font-bold text-white line-clamp-4 italic tracking-tight leading-relaxed">"{item.topic}"</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {error && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-950 text-red-200 px-6 md:px-8 py-4 md:py-6 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.5)] border-2 border-red-900 flex items-center gap-4 md:gap-6 z-[200] w-[90vw] md:max-w-2xl animate-in slide-in-from-bottom-6">
            <ShieldAlert size={28} md:size={32} className="text-red-500 flex-shrink-0" />
            <span className="text-xs md:text-sm font-bold italic flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-2 text-red-500 hover:text-white hover:bg-red-900 rounded-full transition-colors flex-shrink-0"><X size={20}/></button>
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
