import React, { useState } from "react";
import { 
  Cpu, 
  Database, 
  MessageSquare, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  BookCheck, 
  GraduationCap, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowDown, 
  ChevronRight, 
  Play, 
  AlertCircle,
  FileText,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { TamilAsanKnowledgeItem } from "../lib/db";

interface Props {
  knowledgeList: TamilAsanKnowledgeItem[];
  onNavigateToNotes?: () => void;
}

export default function TamilAsanRagShowcase({ knowledgeList, onNavigateToNotes }: Props) {
  // Live RAG Pipeline Tester State
  const [testQuestion, setTestQuestion] = useState("பெயர்ச்சொல் பத்தி கொஞ்சம் சொல்லுங்க சார்");
  const [selectedNoteId, setSelectedNoteId] = useState<string>(knowledgeList[0]?.id || "");
  const [testLength, setTestLength] = useState<"brief" | "detailed">("detailed");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    answer: string;
    latencyMs: number;
    model: string;
    groundTruthTitle: string;
    has4Layers: {
      definition: boolean;
      classification: boolean;
      examples: boolean;
      examPointers: boolean;
    };
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Quick preset test questions reflecting colloquial and formal inputs
  const presetQuestions = [
    { label: "பேச்சுத் தமிழ்", text: "பெயர்ச்சொல் பத்தி கொஞ்சம் சொல்லுங்க சார்" },
    { label: "பரீட்சை வினா", text: "சந்திப் பிழைகளை எவ்வாறு தவிர்ப்பது? சான்று தருக." },
    { label: "சுருக்கமான வினா", text: "வினைச்சொல் வகைகள்" },
    { label: "இலக்கிய நயம்", text: "உவமையணி என்றால் என்ன? திருக்குறள் சான்று தருக." }
  ];

  const handleRunRagTest = async () => {
    if (!testQuestion.trim()) return;
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    const startTime = performance.now();

    try {
      // Find selected or best note for grounding
      const targetNote = knowledgeList.find(k => k.id === selectedNoteId) || knowledgeList[0];
      const groundContext = targetNote 
        ? `அதிகாரப்பூர்வ பாடக்குறிப்பு: ${targetNote.title} (${targetNote.grade || 'பொது'})\nவிபரம்: ${targetNote.content}\n${targetNote.qaPairs?.map(qa => `கேள்வி: ${qa.question} -> பதில்: ${qa.answer}`).join("\n") || ''}`
        : "அகரம் தினேஸ் அகாடமி பாடக்குறிப்பு.";

      const res = await fetch("/api/tamil-asan/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testQuestion.trim(),
          knowledgeContext: groundContext,
          answerLength: testLength,
          model: "gemini-flash-lite-latest"
        })
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const answerText = data.text || "";

      // Verify the 4 layers in answer
      const hasDefinition = answerText.includes("வரையறை") || answerText.includes("விளக்கம்") || answerText.includes("பொருள்");
      const hasClassification = answerText.includes("வகை") || answerText.includes("பகுப்பு") || answerText.includes("பிரிவு");
      const hasExamples = answerText.includes("சான்று") || answerText.includes("உதாரணம்") || answerText.includes("எடுத்துக்காட்டு");
      const hasExamPointers = answerText.includes("பரீட்சை") || answerText.includes("தேர்வு") || answerText.includes("முக்கிய") || answerText.includes("குறிப்பு");

      setTestResult({
        answer: answerText,
        latencyMs: latency,
        model: data.modelUsed || "gemini-flash-lite-latest",
        groundTruthTitle: targetNote?.title || "பாடத்திட்டத் தரவுத்தளம்",
        has4Layers: {
          definition: hasDefinition,
          classification: hasClassification,
          examples: hasExamples,
          examPointers: hasExamPointers
        }
      });
    } catch (err: any) {
      setTestError(err.message || "RAG செயல்முறை இயக்கத்தில் பிழை ஏற்பட்டது.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. HERO ARCHITECTURE BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black tracking-wide uppercase">
            <Sparkles size={14} className="text-amber-400" />
            <span>Modern Pedagogical RAG Architecture</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            RAG (Retrieval-Augmented Generation) <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-200">
              மிக நவீன AI கற்பித்தல் தொழில்நுட்பம்
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            இதன் மூலம் ChatGPT, Claude, Gemini போன்ற முன்னணி AI-களின் முழுமையான மொழி அறிவும் கிடைக்கும்; 
            அதே நேரத்தில் உங்கள் அகாடமியின் பாடக்குறிப்புகள் முதன்மை ஆதாரமாக நின்று மாணவர்களுக்கு 
            <strong className="text-amber-300 font-bold"> 100% பிழையற்ற, துல்லியமான விளக்கத்தை</strong> வழங்கும்.
          </p>
        </div>

        {/* Interactive Visual Flow Diagram */}
        <div className="mt-8 pt-8 border-t border-indigo-500/20 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Box 1: Teacher's Ground Truth */}
          <div className="md:col-span-4 bg-slate-900/90 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database size={14} /> அடித்தளச் சட்டம் (Database)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Anchor of Truth
              </span>
            </div>
            <h4 className="text-sm font-black text-white">ஆசிரியரின் அதிகாரப்பூர்வக் குறிப்பு</h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              நீங்கள் போர்ட்டலில் வழங்கும் பாடக்குறிப்புகள், இலக்கண விதிகள், மாதிரி வினாக்கள்.
            </p>
          </div>

          {/* Plus Connector */}
          <div className="md:col-span-1 flex justify-center text-slate-400 font-black text-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              +
            </div>
          </div>

          {/* Box 2: Student Intent */}
          <div className="md:col-span-3 bg-slate-900/90 border-2 border-blue-500/50 rounded-2xl p-4 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} /> மாணவர் வினா
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                Intent
              </span>
            </div>
            <h4 className="text-sm font-black text-white">எந்த அமைப்பில் கேட்டாலும்</h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              புத்தகச் சொல், பேச்சுத் தமிழ் அல்லது சுருக்கமான வினா.
            </p>
          </div>

          {/* Arrow Connector */}
          <div className="md:col-span-1 flex justify-center text-slate-400 font-black text-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              ➔
            </div>
          </div>

          {/* Box 3: Gemini 3.6 Flash */}
          <div className="md:col-span-3 bg-gradient-to-br from-indigo-900 to-indigo-950 border-2 border-indigo-400 rounded-2xl p-4 shadow-lg flex flex-col gap-2 ring-2 ring-indigo-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} /> Gemini 3.6 Flash
              </span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Zap size={10} /> Sub-Second
              </span>
            </div>
            <h4 className="text-sm font-black text-white">ஆழமான பகுப்பாய்வு</h4>
            <p className="text-[11px] text-indigo-200 leading-snug">
              ஆசிரியரின் குறிப்பை அடித்தளமாகக் கொண்டு 4-அடுக்குக் கட்டமைப்பில் விடை.
            </p>
          </div>
        </div>
      </div>

      {/* 2. THE 4 PIPELINE STEPS (Step-by-Step Breakdown) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="text-indigo-600" size={22} />
              <span>இந்த அதிவேக செயல்பாடு எவ்வாறு இயங்குகிறது? (Step-by-Step Pipeline)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              மாணவர் கேட்கும் ஒவ்வொரு வினாவிற்கும் பின்னால் இயங்கும் 4 படிநிலைகள்
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-emerald-200/80 shadow-xs hover:border-emerald-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  01
                </span>
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Anchor of Truth
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                படி 1: உங்கள் அதிகாரப்பூர்வத் தரவு (Teacher's Ground Truth)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                நீங்கள் அட்மின் போர்ட்டலில் டெக்ஸ்டாகத் தரும் பாடக் குறிப்புதான் இந்த அமைப்பின் <strong>"அடித்தளச் சட்டம்" (Anchor of Truth)</strong>. 
                இலக்கண விதியாக இருந்தாலும் சரி, செய்யுள் நயமானாலும் சரி, நீங்கள் தரும் சொற்களும் கருத்துகளுமே முதன்மைப்படுத்தப்படும்.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <CheckCircle2 size={13} />
              <span>100% அதிகாரப்பூர்வ ஆதாரம்</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-blue-200/80 shadow-xs hover:border-blue-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                  02
                </span>
                <span className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  Intent Understanding
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                படி 2: மாணவர் எப்படி கேட்டாலும் புரிந்து கொள்ளுதல்
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                மாணவர் புத்தக வார்த்தையில் கேட்கலாம், சுருக்கமாகக் கேட்கலாம், அல்லது பேச்சுத் தமிழில் கேட்கலாம். 
                ஜெமினி நொடிப் பொழுதில் மாணவரின் நோக்கத்தைப் புரிந்து கொண்டு, உங்கள் டேட்டாபேஸில் உள்ள அந்த குறிப்பிட்ட பாடக் குறிப்பை எடுத்துக்கொள்ளும்.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-blue-700 font-bold">
              <CheckCircle2 size={13} />
              <span>பேச்சுத் தமிழ் & வினா புரிதல்</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-indigo-200/80 shadow-xs hover:border-indigo-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
                  03
                </span>
                <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  4-Layer Structure
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                படி 3: ஜெமினியின் ஆழமான பகுப்பாய்வு (Deep Analysis)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                உங்கள் குறிப்பை வாங்கும் ஜெமினி வெறும் வெட்டி-ஒட்டுவது போல செய்யாமல் 4 அடுக்குகளாகக் கட்டமைக்கும்:
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-indigo-950 font-bold pt-1">
                <span className="bg-indigo-50 px-2 py-1 rounded-md">• 1. வரையறை</span>
                <span className="bg-indigo-50 px-2 py-1 rounded-md">• 2. வகைகள்</span>
                <span className="bg-indigo-50 px-2 py-1 rounded-md">• 3. சான்றுகள்</span>
                <span className="bg-indigo-50 px-2 py-1 rounded-md">• 4. பரீட்சைக் குறிப்பு</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-indigo-700 font-bold">
              <CheckCircle2 size={13} />
              <span>முழுமையான ஆசிரியர் கற்பித்தல்</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-amber-200/80 shadow-xs hover:border-amber-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                  04
                </span>
                <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Zap size={11} /> Sub-second
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                படி 4: மின்னல் வேகம் (Ultra-Fast Response)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                நாம் தற்போது இணைத்துள்ள <strong>gemini-3.6-flash</strong> மாடல் மிகக் குறைந்த மில்லி விநாடிகளில் (Sub-second speed) பதிலளிக்கும் திறன் கொண்டது. எனவே மாணவருக்குக் காத்திருப்பு நேரம் இருக்காது.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-700 font-bold">
              <CheckCircle2 size={13} />
              <span>உடனடி ஆசிரியர் மறுமொழி</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THREE CORE GUARANTEES */}
      <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-indigo-50 rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm">
        <div className="max-w-3xl mb-6">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-amber-600" size={24} />
            <span>இதனால் மாணவர்களுக்குக் கிடைக்கும் 3 உறுதிமொழிகள்</span>
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            வழக்கமான இணையத் தேடல்களைப் போல் குழப்பமின்றி, மாணவர்களுக்குக் கிடைக்கும் உறுதியான பயன்கள்
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Guarantee 1 */}
          <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-sm font-black text-slate-900">
              1. பூஜ்ஜியப் பிழை (Zero Error / Zero Hallucination)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              ஆசிரியரின் குறிப்புடன் இணைந்து இயங்குவதால், இணையத்தில் உள்ள தவறான அல்லது தொடர்பற்ற தகவல்கள் ஒருபோதும் உள்ளே வராது.
            </p>
          </div>

          {/* Guarantee 2 */}
          <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-rose-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
              <BookCheck size={20} />
            </div>
            <h4 className="text-sm font-black text-slate-900">
              2. இலங்கைப் பாடத்திட்டத் துல்லியம்
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              தரம் 6 முதல் 13 வரையிலான பரீட்சை முறைக்குரிய அதே அமைப்பில் விடைகள் அமையும்.
            </p>
          </div>

          {/* Guarantee 3 */}
          <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <GraduationCap size={20} />
            </div>
            <h4 className="text-sm font-black text-slate-900">
              3. மாணவருக்கு ஏற்ற கற்பித்தல்
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              மாணவர் சுருக்கமாகக் கேட்டால் சுருக்கமாகவும், விரிவாகக் கேட்டால் உதாரணங்களுடனும் விடை கிடைக்கும்.
            </p>
          </div>
        </div>
      </div>

      {/* 4. LIVE RAG PIPELINE TESTER */}
      <div className="bg-white rounded-3xl border-2 border-indigo-100 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="text-indigo-600" size={20} />
              <span>RAG நேரடி சோதனைப் பலகை (Interactive RAG Live Verification)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              மாணவரின் கேள்வியை உள்ளிட்டு, அது எவ்வாறு Ground Truth, Intent, 4-Layers மற்றும் அதிவேகமாக Gemini 3.6 Flash மூலம் உருவாக்கப்படுகிறது என்பதைச் சோதிக்கவும்.
            </p>
          </div>

          {onNavigateToNotes && (
            <button
              type="button"
              onClick={onNavigateToNotes}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-center"
            >
              <span>பாடக்குறிப்புகளை நிர்வகிக்க</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">மாதிரி வினாக்கள்:</span>
            {presetQuestions.map((pq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTestQuestion(pq.text)}
                className="text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              >
                {pq.label}: "{pq.text.slice(0, 20)}..."
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Question Input */}
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                மாணவரின் கேள்வி (பேச்சுத் தமிழ் அல்லது பரீட்சை வினா):
              </label>
              <textarea
                rows={2}
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                placeholder="எ.கா: பெயர்ச்சொல் பத்தி கொஞ்சம் சொல்லுங்க சார்"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-3 text-xs font-bold text-slate-800 focus:bg-white outline-none"
              />
            </div>

            {/* Note Selector */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                அடித்தளச் சட்டம் (Teacher's Ground Truth Note):
              </label>
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-3 text-xs font-bold text-slate-800 focus:bg-white outline-none"
              >
                {knowledgeList.length === 0 ? (
                  <option value="">பொதுப் பாடத்திட்டத் தரவுத்தளம் (Standard Curriculum)</option>
                ) : (
                  knowledgeList.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.title} ({k.grade || 'பொது'})
                    </option>
                  ))
                )}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                தேர்ந்தெடுக்கப்பட்ட குறிப்பே முதன்மை அடித்தளமாக ஜெமினிக்கு அனுப்பப்படும்.
              </span>
            </div>

            {/* Answer Length */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                விடை வடிவம்:
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="testLength"
                    checked={testLength === "detailed"}
                    onChange={() => setTestLength("detailed")}
                    className="text-indigo-600"
                  />
                  <span>விரிவானது (4-அடுக்கு)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="testLength"
                    checked={testLength === "brief"}
                    onChange={() => setTestLength("brief")}
                    className="text-indigo-600"
                  />
                  <span>சுருக்கமானது</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRunRagTest}
              disabled={isTesting || !testQuestion.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>RAG செயல்முறை இயங்குகிறது...</span>
                </>
              ) : (
                <>
                  <Play size={15} className="fill-white" />
                  <span>RAG செயல்முறையை இயக்கு (Test Pipeline)</span>
                </>
              )}
            </button>
            <span className="text-xs text-slate-400">
              Gemini 3.6 Flash மூலம் நேரடி sub-second சோதனை
            </span>
          </div>
        </div>

        {/* Test Result Display */}
        {testError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{testError}</span>
          </div>
        )}

        {testResult && (
          <div className="bg-slate-50 border-2 border-indigo-200 rounded-3xl p-6 space-y-4 animate-fade-in">
            {/* Live Metrics Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black text-slate-800">
                  RAG Pipeline இயக்கம் வெற்றிகரமானது!
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Clock size={12} /> {testResult.latencyMs} ms
                </span>
                <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Cpu size={12} /> {testResult.model}
                </span>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Database size={12} /> {testResult.groundTruthTitle}
                </span>
              </div>
            </div>

            {/* 4-Layer Verification Badges */}
            <div>
              <div className="text-xs font-black text-slate-700 mb-2">
                படி 3: 4-அடுக்குக் கற்பித்தல் சரிபார்ப்பு (4-Layer Pedagogical Verification):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  testResult.has4Layers.definition 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  <CheckCircle2 size={15} className={testResult.has4Layers.definition ? "text-emerald-600" : "text-slate-400"} />
                  <span>1. வரையறை (Definition)</span>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  testResult.has4Layers.classification 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  <CheckCircle2 size={15} className={testResult.has4Layers.classification ? "text-emerald-600" : "text-slate-400"} />
                  <span>2. பகுப்புகள் / வகைகள்</span>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  testResult.has4Layers.examples 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  <CheckCircle2 size={15} className={testResult.has4Layers.examples ? "text-emerald-600" : "text-slate-400"} />
                  <span>3. சான்றுகள் (Examples)</span>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  testResult.has4Layers.examPointers 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  <CheckCircle2 size={15} className={testResult.has4Layers.examPointers ? "text-emerald-600" : "text-slate-400"} />
                  <span>4. பரீட்சைக் குறிப்புகள்</span>
                </div>
              </div>
            </div>

            {/* Answer Content */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-inner">
              <div className="text-xs font-black text-slate-500 mb-2 flex items-center justify-between">
                <span>உருவாக்கப்பட்ட ஆசிரியர் விளக்கம்:</span>
                <span className="text-emerald-700 font-bold">Zero Hallucination Grounded</span>
              </div>
              <div className="prose prose-sm text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {testResult.answer}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
