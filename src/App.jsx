import React, { useState, useEffect } from "react";
import {
  Loader2,
  Send,
  RefreshCw,
  BarChart3,
  FileText,
  Sparkles,
  Download,
  AlertCircle,
  Globe,
  Copy,
  Check,
  MessageSquarePlus,
  Zap,
  ArrowLeft,
  Library,
  Save,
  Trash2,
  Lock,
  ChevronRight,
  ShieldAlert,
  AlignLeft,
  RotateCcw,
  Image as ImageIcon,
  Edit3,
  X,
  CheckCircle2,
  Maximize2,
  AlignCenter,
  AlignJustify,
  ShieldCheck,
  Rocket,
  CalendarDays,
  Clock,
  MessageCircle,
  Target,
  Users,
  Briefcase,
} from "lucide-react";

export default function App() {
  // --- KERN-ZUSTAND ---
  const [activeStep, setActiveStep] = useState("input");
  const [language, setLanguage] = useState("EN");
  const [input, setInput] = useState("");
  const [persona, setPersona] = useState("Executive");

  // --- COLUMBO ZUSTAND ---
  const [columboData, setColumboData] = useState({ question: "", options: [] });
  const [customAnswer, setCustomAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [columboSafetyTriggered, setColumboSafetyTriggered] = useState(false);

  // --- CONTENT ZUSTAND ---
  const [posts, setPosts] = useState({
    micro: "",
    short: "",
    medium: "",
    long: "",
    image: null,
    description: "",
  });
  const [scheduleDate, setScheduleDate] = useState("");

  // --- UI ZUSTAND ---
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState({
    micro: false,
    short: false,
    medium: false,
    long: false,
    image: false,
  });

  const [error, setError] = useState(null);
  const [safetyTriggered, setSafetyTriggered] = useState(false);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [copiedType, setCopiedType] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const apiKey = "";
  const columboImageUrl =
    "https://m.media-amazon.com/images/M/MV5BMzU4MDI3NTc2OV5BMl5BanBnXkFtZTgwNjMzNDIzMzE@._V1_.jpg";

  // --- TAILWIND INJEKTION (Sicherheitsnetz für Sandbox) ---
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // --- API LOGIK ---
  useEffect(() => {
    let interval;
    if (loading && progress < 98) {
      interval = setInterval(() => {
        setProgress((prev) => (prev < 45 ? prev + 7 : prev + 0.6));
      }, 350);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  const apiCall = async (url, payload, retries = 5) => {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) return await response.json();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  const parseJSONRobust = (text) => {
    try {
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.options && Array.isArray(parsed.options)) {
        parsed.options = parsed.options.filter(
          (o) => o && o.length > 1 && o !== "A" && o !== "B"
        );
      } else {
        parsed.options = [];
      }
      return parsed;
    } catch (e) {
      return {
        question: "Could you specify the core business objective?",
        options: [],
      };
    }
  };

  const checkRelevance = async (text) => {
    try {
      const res = await apiCall(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Analyze for business/IT relevance: "${text}". Reply ONLY "OK" or "QUATSCH".`,
                },
              ],
            },
          ],
        }
      );
      return (
        res.candidates?.[0]?.content?.parts?.[0]?.text
          ?.trim()
          ?.toUpperCase() === "QUATSCH"
      );
    } catch (e) {
      return false;
    }
  };

  const startInvestigation = async () => {
    if (!input) return;
    setLoading(true);
    setSafetyTriggered(false);
    setError(null);

    if (await checkRelevance(input)) {
      setSafetyTriggered(true);
      setLoading(false);
      return;
    }

    try {
      const prompt = `Act as Inspector Columbo. Topic: "${input}". Persona: "${persona}".
      Ask ONE short strategic question. JSON: {"question": "...", "options": ["Concrete Strategy 1", "Concrete Strategy 2"]}.
      If input is vague, options must be empty []. Language: ${
        language === "DE" ? "German" : "English"
      }.`;

      const result = await apiCall(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: input }] }],
          systemInstruction: { parts: [{ text: prompt }] },
          generationConfig: { responseMimeType: "application/json" },
        }
      );
      setColumboData(
        parseJSONRobust(result.candidates[0].content.parts[0].text)
      );
      setActiveStep("columbo");
    } catch (err) {
      setError("Check failed. Connection issues.");
    } finally {
      setLoading(false);
    }
  };

  const runContentEngine = async (type, answer) => {
    const finalAnswer = answer || customAnswer || selectedAnswer;
    if (type === "all") {
      setActiveStep("generating");
      setProgress(10);
      setProgressLabel(`Tailoring for ${persona}...`);
    }
    setLoadingItems((prev) => ({
      ...prev,
      [type]: true,
      ...(type === "all" && {
        micro: true,
        short: true,
        medium: true,
        long: true,
        image: true,
      }),
    }));
    setLoading(true);

    try {
      if (
        type === "all" ||
        ["micro", "short", "medium", "long"].includes(type)
      ) {
        const textPrompt = `B2B Expert for Persona: "${persona}". Topic: "${input}", Focus: "${finalAnswer}". 
        Create 4 lengths: MICRO (<200 chars), SHORT (Hook), MEDIUM (Post), LONG (Deep-Dive). 
        JSON: {"micro": "...", "short": "...", "medium": "...", "long": "...", "visual": "..."}. Language: ${language}.`;

        const res = await apiCall(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            contents: [{ parts: [{ text: finalAnswer }] }],
            systemInstruction: { parts: [{ text: textPrompt }] },
            generationConfig: { responseMimeType: "application/json" },
          }
        );
        const data = parseJSONRobust(res.candidates[0].content.parts[0].text);
        setPosts((prev) => ({
          ...prev,
          micro: data.micro || prev.micro,
          short: data.short || prev.short,
          medium: data.medium || prev.medium,
          long: data.long || prev.long,
          description: data.visual || prev.description,
        }));
      }

      if (type === "all" || type === "image") {
        const imgRes = await apiCall(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
          {
            instances: [
              {
                prompt: `Premium corporate visual for ${persona}, ${
                  posts.description || "Enterprise architecture"
                }, royal blue, vector style, white background.`,
              },
            ],
          }
        );
        if (imgRes.predictions?.[0])
          setPosts((prev) => ({
            ...prev,
            image: `data:image/png;base64,${imgRes.predictions[0].bytesBase64Encoded}`,
          }));
      }
      setActiveStep("result");
    } catch (err) {
      setError("Generation failed.");
    } finally {
      setLoading(false);
      setLoadingItems({
        micro: false,
        short: false,
        medium: false,
        long: false,
        image: false,
      });
      setProgress(0);
    }
  };

  const handleCustomColumboSubmit = () => {
    if (!customAnswer.trim()) return;
    runContentEngine("all", customAnswer);
  };

  const archiveAsset = async () => {
    setLoading(true);
    try {
      const nameRes = await apiCall(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: `2-word name for: "${input}".` }] }],
        }
      );
      const name = nameRes.candidates[0].content.parts[0].text
        .trim()
        .replace(/ /g, "_");
      setAssetLibrary([
        {
          id: Date.now(),
          name,
          ...posts,
          topic: input,
          date: new Date().toLocaleDateString(),
          scheduledDate: scheduleDate,
          persona,
          lang: language,
        },
        ...assetLibrary,
      ]);
      setActiveStep("library");
    } catch (err) {
      setError("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const ContentCard = ({ title, text, type, icon: Icon, color, charCount }) => (
    <div className="bg-gray-900 border border-white/5 rounded-3xl p-6 relative flex flex-col h-full shadow-2xl">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${color}`}></div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {title}
          </span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopiedType(type);
            setTimeout(() => setCopiedType(null), 2000);
          }}
          className="p-2 hover:bg-white/5 rounded-full transition-all"
        >
          {copiedType === type ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} className="text-gray-500" />
          )}
        </button>
      </div>
      <div className="bg-black/30 p-5 rounded-2xl border border-white/5 flex-1 relative overflow-hidden">
        {loadingItems[type] && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        )}
        <p
          className={`text-gray-200 leading-relaxed ${
            type === "micro" ? "font-bold text-lg italic" : "text-sm"
          }`}
        >
          {text || "..."}
        </p>
        {charCount && (
          <div className="mt-2 text-[8px] font-bold text-gray-600 text-right uppercase">
            {text.length} / 200
          </div>
        )}
      </div>
      <button
        onClick={() => runContentEngine(type, selectedAnswer)}
        className="mt-4 w-full py-3 bg-white/5 hover:bg-blue-600/20 text-gray-400 rounded-xl text-[8px] font-black uppercase transition-all"
      >
        Regenerate
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            className="max-w-full max-h-full object-contain rounded-3xl border border-white/10"
            alt="Preview"
          />
        </div>
      )}

      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 md:px-10 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-5">
          {activeStep !== "input" && (
            <button
              onClick={() => setActiveStep("input")}
              className="p-2 bg-white/5 rounded-full text-blue-400 active:scale-90"
            >
              <RotateCcw size={18} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30">
              <Zap size={20} className="fill-white text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                ELWIS LAB
              </h1>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                v16.2 | ALPHA ROLLOUT
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            {["DE", "EN"].map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all ${
                  language === l
                    ? "bg-blue-600 text-white shadow-xl"
                    : "opacity-30"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setActiveStep("library")}
            className="p-2.5 bg-white/5 rounded-xl border border-white/5 relative"
          >
            <CalendarDays size={18} />
            {assetLibrary.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full text-[8px] flex items-center justify-center font-bold border border-black">
                {assetLibrary.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10">
        {/* INPUT */}
        {activeStep === "input" && (
          <div className="max-w-2xl mx-auto space-y-12 animate-in slide-in-from-bottom-10 pt-10">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-5 py-1.5 rounded-full border border-blue-500/20 mb-4 animate-pulse">
                <ShieldCheck size={12} />{" "}
                <span className="text-[9px] font-black uppercase tracking-widest italic">
                  Marketing Architecture
                </span>
              </div>
              <h2 className="text-7xl font-black text-white leading-none tracking-tighter uppercase italic">
                The Studio.
              </h2>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-[4rem] border border-white/5 space-y-8 shadow-3xl">
              <div className="grid grid-cols-3 gap-3 p-1.5 bg-black/30 rounded-2xl">
                {[
                  { id: "Executive", l: "C-Level" },
                  { id: "Expert", l: "Experts" },
                  { id: "User", l: "Users" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`py-4 rounded-xl font-black text-[9px] uppercase transition-all ${
                      persona === p.id
                        ? "bg-blue-600 text-white shadow-xl"
                        : "text-gray-500 hover:bg-white/5"
                    }`}
                  >
                    {p.l}
                  </button>
                ))}
              </div>

              {safetyTriggered ? (
                <div className="p-16 text-center space-y-6">
                  <ShieldAlert size={60} className="text-red-500 mx-auto" />
                  <p className="text-red-400 font-bold italic text-lg leading-tight">
                    I don't follow your briefing. Please define a business
                    topic.
                  </p>
                  <button
                    onClick={() => setSafetyTriggered(false)}
                    className="px-10 py-4 bg-white text-black rounded-full font-black text-xs uppercase"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    className="w-full h-56 p-8 bg-transparent outline-none text-xl text-center font-bold text-white placeholder:text-gray-800 resize-none"
                    placeholder="Enter topic or URL..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button
                    onClick={startInvestigation}
                    disabled={loading || !input}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-12 rounded-[3rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles size={20} />
                    )}{" "}
                    INITIATE LAB
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* COLUMBO */}
        {activeStep === "columbo" && (
          <div className="max-w-2xl mx-auto animate-in zoom-in duration-500">
            <div className="bg-gray-900 rounded-[4rem] shadow-3xl overflow-hidden relative border border-white/5">
              <div className="relative h-[22rem] w-full overflow-hidden border-b-4 border-blue-600">
                <img
                  src={columboImageUrl}
                  alt="Columbo"
                  className="w-full h-full object-cover grayscale brightness-75 contrast-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent opacity-95"></div>
              </div>
              <div className="p-10 -mt-20 relative bg-black/95 backdrop-blur-2xl rounded-t-[4rem] text-center space-y-10">
                <div className="inline-block bg-white px-8 py-4 rounded-2xl shadow-2xl text-black font-black italic">
                  Just one more thing...
                </div>
                <p className="text-2xl font-bold text-white italic border-l-4 border-blue-600 pl-8 text-left leading-relaxed">
                  "{columboData.question}"
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {columboData.options &&
                    columboData.options.length > 0 &&
                    columboData.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedAnswer(opt);
                          runContentEngine("all", opt);
                        }}
                        className="bg-white/5 hover:bg-blue-600 text-white p-6 rounded-[2rem] text-xs font-black transition-all border border-white/5 flex items-center justify-between group px-12"
                      >
                        {opt}{" "}
                        <ChevronRight
                          size={20}
                          className="opacity-0 group-hover:opacity-100 transition-all"
                        />
                      </button>
                    ))}
                  <div className="space-y-4 mt-8 pt-8 border-t border-white/10">
                    <textarea
                      className="w-full p-8 bg-white/5 border border-white/10 rounded-[2rem] font-bold outline-none text-white focus:border-blue-600 transition-all h-32"
                      placeholder="Custom context..."
                      value={customAnswer}
                      onChange={(e) => setCustomAnswer(e.target.value)}
                    />
                    <button
                      onClick={handleCustomColumboSubmit}
                      disabled={loading || !customAnswer}
                      className="w-full bg-white text-black py-8 rounded-[2.5rem] font-black uppercase text-xs flex items-center justify-center gap-5 hover:scale-[1.02] shadow-2xl active:scale-95 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}{" "}
                      SEND EVIDENCE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOADING */}
        {activeStep === "generating" && (
          <div className="max-w-md mx-auto py-40 space-y-12 text-center animate-in fade-in">
            <div className="relative inline-flex items-center justify-center scale-150 mb-8">
              <div className="w-20 h-20 border-[4px] border-blue-500/10 rounded-full border-t-blue-600 animate-spin" />
              <Zap
                size={24}
                className="absolute m-auto text-blue-500 fill-blue-500 animate-pulse"
              />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-[0.2em]">
              {progressLabel}
            </h2>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">
              {Math.round(progress)}% Complete
            </p>
          </div>
        )}

        {/* RESULT */}
        {activeStep === "result" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in pb-24">
            <div className="lg:col-span-7 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ContentCard
                  title="Micro Bullet"
                  text={posts.micro}
                  type="micro"
                  icon={MessageCircle}
                  color="bg-blue-400"
                  charCount={true}
                />
                <ContentCard
                  title="KISS Post"
                  text={posts.short}
                  type="short"
                  icon={AlignLeft}
                  color="bg-blue-600"
                />
              </div>
              <ContentCard
                title="Standard Post"
                text={posts.medium}
                type="medium"
                icon={AlignCenter}
                color="bg-gray-400"
              />
              <ContentCard
                title="Strategic Deep-Dive"
                text={posts.long}
                type="long"
                icon={AlignJustify}
                color="bg-white/20"
              />
            </div>

            <div className="lg:col-span-5 flex flex-col gap-8">
              <div className="bg-gray-900 p-8 rounded-[4rem] shadow-3xl border border-white/5">
                <div className="flex justify-between items-center mb-6 px-2 text-[10px] font-black uppercase text-gray-500">
                  <span>Brand Visual</span>
                  <button
                    onClick={() => runContentEngine("image", selectedAnswer)}
                    className="p-2 bg-white/5 rounded-full hover:bg-blue-600 transition-all"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div
                  className="aspect-square bg-black/40 rounded-[3rem] overflow-hidden flex items-center justify-center border-4 border-gray-800 shadow-2xl relative group cursor-zoom-in mb-8"
                  onClick={() => posts.image && setZoomedImage(posts.image)}
                >
                  {loadingItems.image && (
                    <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-20">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={40}
                      />
                    </div>
                  )}
                  {posts.image ? (
                    <img
                      src={posts.image}
                      alt="Visual"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <Loader2 className="animate-spin text-blue-400" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/10">
                    <Maximize2 size={32} className="text-white" />
                  </div>
                </div>
                <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 mb-6 space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-1 flex items-center gap-2">
                    <CalendarDays size={12} /> Publish Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={archiveAsset}
                    disabled={loading}
                    className="py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:bg-green-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> SAVE
                  </button>
                  <button
                    onClick={() => setActiveStep("library")}
                    className="py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:bg-blue-500 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Library size={18} /> VAULT
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-black p-10 rounded-[3.5rem] border border-white/5 shadow-3xl text-center space-y-4 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:scale-110 transition-transform rotate-12">
                  <Rocket size={200} />
                </div>
                <h4 className="text-lg font-black text-white italic tracking-tighter uppercase">
                  King of Leads
                </h4>
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium italic opacity-60">
                  Deployment phase starts Q2 2026. Global scale roadmap
                  initiated.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VAULT */}
        {activeStep === "library" && (
          <div className="space-y-12 animate-in slide-in-from-right-16 pb-32">
            <div className="flex justify-between items-end px-4">
              <div>
                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white leading-none">
                  The Vault.
                </h2>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.5em] mt-3">
                  Repository (In-Memory Alpha)
                </p>
              </div>
              <button
                onClick={() => setActiveStep("input")}
                className="bg-white text-black px-10 py-4 rounded-full text-[10px] font-black uppercase shadow-3xl hover:scale-105 active:scale-95 transition-all"
              >
                Studio Return
              </button>
            </div>
            {assetLibrary.length === 0 ? (
              <div className="bg-gray-900 p-40 rounded-[6rem] text-center border-4 border-dashed border-white/5 flex flex-col items-center shadow-inner">
                <Library size={60} className="text-gray-800 mb-8" />
                <p className="text-gray-600 font-black uppercase tracking-[0.5em] text-xs">
                  The vault is empty.
                </p>
              </div>
            ) : (
              <div className="space-y-10 border-l-2 border-blue-900/50 pl-8 ml-2">
                {assetLibrary
                  .sort(
                    (a, b) =>
                      new Date(a.scheduledDate) - new Date(b.scheduledDate)
                  )
                  .map((item) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-[2.25rem] top-10 w-5 h-5 bg-blue-600 rounded-full border-4 border-black shadow-lg shadow-blue-500/30"></div>
                      <div className="bg-gray-900 rounded-[3.5rem] border border-white/5 overflow-hidden flex flex-col hover:-translate-y-2 transition-all duration-500 shadow-2xl">
                        <div className="p-6 bg-black/40 text-white flex justify-between items-center">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 flex items-center gap-2">
                              <Clock size={12} />{" "}
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                {item.scheduledDate || "DRAFT"}
                              </span>
                            </div>
                            <span className="text-[12px] font-black uppercase tracking-[0.1em] truncate opacity-90">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-black uppercase">
                              {item.persona}
                            </span>
                            <button
                              onClick={() =>
                                setAssetLibrary(
                                  assetLibrary.filter((a) => a.id !== item.id)
                                )
                              }
                              className="text-white/10 hover:text-red-500 transition-all hover:scale-110"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="p-10 flex flex-col md:flex-row gap-10 bg-gray-900/30">
                          {item.image && (
                            <div
                              className="md:w-1/4 aspect-square rounded-[2rem] overflow-hidden shadow-2xl flex-shrink-0 cursor-zoom-in"
                              onClick={() => setZoomedImage(item.image)}
                            >
                              <img
                                src={item.image}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          )}
                          <div className="flex-1 flex flex-col justify-center space-y-4">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic opacity-60">
                              Micro Bullet
                            </p>
                            <p className="text-xl font-bold text-white line-clamp-3 italic leading-snug">
                              "{item.micro}"
                            </p>
                            <div className="pt-6 mt-auto border-t border-white/5 flex gap-4">
                              <button
                                onClick={() => {
                                  setPosts(item);
                                  setInput(item.topic);
                                  setLanguage(item.lang);
                                  setActiveStep("result");
                                }}
                                className="px-8 py-4 bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-blue-600 hover:text-white transition-all rounded-2xl"
                              >
                                OPEN STUDIO
                              </button>
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

        {error && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-5 rounded-3xl shadow-2xl animate-bounce z-[100] border-2 border-red-500 flex items-center gap-4">
            <AlertCircle size={22} />
            <span className="text-xs font-black uppercase tracking-widest italic">
              {error}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
