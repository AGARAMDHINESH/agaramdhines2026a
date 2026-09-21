import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Layers, 
  Sliders, 
  Upload, 
  FileText,
  ShieldCheck,
  Eye,
  Copy
} from 'lucide-react';
import { applyWatermarkToImage, downloadDataUrl, WatermarkOptions } from '../lib/watermarkImage';
import { TamilAsanKnowledgeItem } from '../lib/db';

interface TamilAsanVisualsStudioProps {
  knowledgeNotes?: TamilAsanKnowledgeItem[];
  selectedNote?: TamilAsanKnowledgeItem | null;
  onAttachImageToNote?: (imageUrl: string, noteId?: string) => void;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TamilAsanVisualsStudio: React.FC<TamilAsanVisualsStudioProps> = ({
  knowledgeNotes = [],
  selectedNote = null,
  onAttachImageToNote,
  showNotification
}) => {
  const [prompt, setPrompt] = useState<string>("");
  const [selectedNoteId, setSelectedNoteId] = useState<string>(selectedNote?.id || "");
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '4:3'>('16:9');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [watermarkedImageUrl, setWatermarkedImageUrl] = useState<string | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(true);
  const [includeWatermarkText, setIncludeWatermarkText] = useState<boolean>(false);
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'center'>('bottom-right');
  const [teacherSubText, setTeacherSubText] = useState<string>("தலைமை ஆசிரியர்: திரு. D. தினேஷ்குமார்");
  const [academyMainText, setAcademyMainText] = useState<string>("அகரம் தினேஸ் ஆன்லைன் அகாடமி");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPaidKeyNotice, setShowPaidKeyNotice] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected note changes
  useEffect(() => {
    if (selectedNote) {
      setSelectedNoteId(selectedNote.id);
      if (!prompt) {
        setPrompt(`${selectedNote.title} - பாடக்கருத்து விளக்கம்`);
      }
    }
  }, [selectedNote]);

  // Handle note selection from dropdown
  const handleNoteChange = (noteId: string) => {
    setSelectedNoteId(noteId);
    const found = knowledgeNotes.find(n => n.id === noteId);
    if (found) {
      setPrompt(`${found.title} - பாடக்கருத்து காட்சி விளக்கம்`);
    }
  };

  // Re-apply watermark whenever options or raw image changes
  useEffect(() => {
    if (!rawImageUrl) {
      setWatermarkedImageUrl(null);
      return;
    }

    if (!watermarkEnabled) {
      setWatermarkedImageUrl(rawImageUrl);
      return;
    }

    const runWatermark = async () => {
      try {
        const options: WatermarkOptions = {
          watermarkText: academyMainText,
          subText: teacherSubText,
          logoUrl: "/logo.png",
          position: watermarkPosition,
          opacity: 0.92,
          showLogo: true,
          includeText: includeWatermarkText
        };
        const res = await applyWatermarkToImage(rawImageUrl, options);
        setWatermarkedImageUrl(res);
      } catch (e) {
        console.warn("Watermarking error:", e);
        setWatermarkedImageUrl(rawImageUrl);
      }
    };

    runWatermark();
  }, [rawImageUrl, watermarkEnabled, watermarkPosition, academyMainText, teacherSubText, includeWatermarkText]);

  // Generate Image via Server API
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("படத்திற்கான விளக்கம் அல்லது பாடக் கருத்தை உள்ளிடவும்!");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setShowPaidKeyNotice(false);

    try {
      const activeNote = knowledgeNotes.find(n => n.id === selectedNoteId);
      const res = await fetch("/api/tamil-asan/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          lessonContext: activeNote?.title || "",
          aspectRatio: aspectRatio
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresPaidKey || res.status === 429) {
          setShowPaidKeyNotice(true);
        }
        throw new Error(data.error || "படம் உருவாக்குவதில் பிழை ஏற்பட்டது.");
      }

      if (data.imageBase64) {
        const fullDataUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;
        setRawImageUrl(fullDataUrl);
        if (showNotification) {
          showNotification("AI விளக்கப்படம் வெற்றிகரமாக உருவாக்கப்பட்டு வாட்டர்மார்க் செய்யப்பட்டது! ✓", "success");
        }
      }
    } catch (err: any) {
      console.error("Generate image error:", err);
      setErrorMessage(err?.message || "படம் உருவாக்குவதில் சிக்கல் ஏற்பட்டது.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload custom image to watermark directly
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setRawImageUrl(result);
        setErrorMessage(null);
        if (showNotification) {
          showNotification("படம் பதிவேற்றப்பட்டது! வாட்டர்மார்க் சேர்க்கப்படுகிறது... ✓", "success");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Download watermarked image
  const handleDownload = () => {
    const targetUrl = watermarkedImageUrl || rawImageUrl;
    if (!targetUrl) return;
    const safeTitle = prompt.slice(0, 30).replace(/[^a-zA-Z0-9_\u0B80-\u0BFF]/g, '_') || "lesson-visual";
    downloadDataUrl(targetUrl, `agaram-dhines-${safeTitle}.png`);
    if (showNotification) {
      showNotification("படம் உங்கள் கணினியில் பதிவிறக்கப்பட்டது! ✓", "info");
    }
  };

  // Copy Data URL
  const handleCopyUrl = async () => {
    const targetUrl = watermarkedImageUrl || rawImageUrl;
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      if (showNotification) {
        showNotification("படத் தரவு நகலெடுக்கப்பட்டது! ✓", "info");
      }
    } catch (_) {}
  };

  // Quick prompt suggestions
  const promptSuggestions = [
    { label: "📜 செய்யுள் காட்சி விளக்கம்", text: "திருக்குறள் மற்றும் சங்க இலக்கியப் பாடல் பின்னணி ஓவியம், தூய அழகிய வரலாற்றுச் சூழல்" },
    { label: "📖 இலக்கண வரைபடம்", text: "தமிழ் இலக்கணப் பகுப்பு, பெயர்ச்சொல் வினைச்சொல் வரைபடக் கற்பித்தல் அட்டை" },
    { label: "🏛️ பண்டைத் தமிழர் நாகரிகம்", text: "பண்டைய தமிழ் மன்னர்கள், தமிழ் எழுத்துகள், பனையோலைச் சுவடிகள் மற்றும் தொன்மை கலாசாரம்" },
    { label: "🌿 இயற்கை & உவமை", text: "இயற்கைக் காட்சி, குறிஞ்சி முல்லை மருதம் நெய்தல் பாலை ஐந்திணை நில அமைப்பு ஓவியம்" }
  ];

  return (
    <div id="tamil-asan-visuals-studio" className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-slate-700 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-amber-500 to-rose-500 text-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              AI பாட விளக்கப் படங்கள் & லோகோ வாட்டர்மார்க் ஸ்டுடியோ
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            பாடக் குறிப்புகளுக்கான தெளிவான AI விளக்கப்படங்களை உருவாக்கி, அகரம் தினேஸ் அகாடமியின் அதிகாரப்பூர்வ லோகோ வாட்டர்மார்க்குடன் பெறலாம்.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
            title="கணினியில் உள்ள படத்தைப் பதிவேற்றி வாட்டர்மார்க் செய்ய"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>படத்தைப் பதிவேற்றி வாட்டர்மார்க் செய்க</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt and Customization Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Note Context Selector */}
          {knowledgeNotes.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                தொடர்புடைய பாடக்குறிப்பு (Lesson Context)
              </label>
              <select
                value={selectedNoteId}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- பொதுவான பாட விளக்கம் (General / No Specific Note) --</option>
                {knowledgeNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    [{note.grade || 'பொது'}] {note.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                பாட விளக்கப் படக் கருத்து (Image Prompt in Tamil or English)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">துல்லியமான காட்சியை விவரிக்கவும்</span>
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="எ.கா: திருக்குறள் அன்பின் சிறப்பு - மாணவர்க்கு விளக்கும் அழகிய போதனைக் காட்சி..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {promptSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(sug.text)}
                  className="text-xs px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/60 dark:border-amber-800/60 rounded-lg transition"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                படத்தின் அளவு (Aspect Ratio)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '16:9', label: '16:9 கிடைமட்டம் (Slides)' },
                  { id: '1:1', label: '1:1 சதுரம் (Square)' },
                  { id: '4:3', label: '4:3 வழமை (Standard)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspectRatio(item.id as any)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                      aspectRatio === item.id
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark Position */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                வாட்டர்மார்க் இடம் (Position)
              </label>
              <select
                value={watermarkPosition}
                onChange={(e) => setWatermarkPosition(e.target.value as any)}
                disabled={!watermarkEnabled}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
              >
                <option value="bottom-right">கீழ் வலதுபக்கம் (Bottom-Right - Recommended)</option>
                <option value="bottom-left">கீழ் இடதுபக்கம் (Bottom-Left)</option>
                <option value="top-right">மேல் வலதுபக்கம் (Top-Right)</option>
                <option value="center">மையப்பகுதி (Center Watermark)</option>
              </select>
            </div>
          </div>

          {/* Watermark Customization Accordion / Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                அகாடமி வாட்டர்மார்க் முத்திரை (Watermark Branding)
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {watermarkEnabled && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    லோகோ மட்டும் காட்சிப்படுத்தல் (எழுத்துக்கள் இன்றி)
                  </span>
                  <input
                    type="checkbox"
                    checked={!includeWatermarkText}
                    onChange={(e) => setIncludeWatermarkText(!e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                </div>

                {includeWatermarkText && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">முதன்மைப் பெயர்</label>
                      <input
                        type="text"
                        value={academyMainText}
                        onChange={(e) => setAcademyMainText(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">துணை விவரம்</label>
                      <input
                        type="text"
                        value={teacherSubText}
                        onChange={(e) => setTeacherSubText(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Gemini AI மூலம் படம் உருவாக்கப்படுகிறது... (Generating...)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  <span>🎨 AI விளக்கப்படம் உருவாக்குக (Generate Visual)</span>
                </>
              )}
            </button>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                {showPaidKeyNotice && (
                  <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                    குறிப்பு: Google AI Studio Settings ➔ Secrets வழியே கட்டண வசதியுள்ள (Paid API Key) இணைக்கப்படும் போது, அதிவேக nano banana பட மாதிரிகள் முழுமையாகச் செயல்படும்.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visual Preview & Actions (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 min-h-[380px]">
          {watermarkedImageUrl ? (
            <div className="w-full space-y-4">
              <div className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md bg-slate-900">
                <img
                  src={watermarkedImageUrl}
                  alt="Generated visual"
                  className="w-full h-auto object-cover max-h-[360px] mx-auto"
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-amber-300 font-mono">
                  {aspectRatio}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  <span>பதிவிறக்குக (PNG)</span>
                </button>

                {onAttachImageToNote && (
                  <button
                    type="button"
                    onClick={() => onAttachImageToNote(watermarkedImageUrl, selectedNoteId)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>குறிப்பில் இணைக்க</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "நகலெடுக்கப்பட்டது! ✓" : "படத் தரவை நகலெடு (Copy Data URL)"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <ImageIcon className="w-8 h-8 opacity-80" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                பாட விளக்கப் படம் இங்கே தோன்றும்
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                இடதுபுறத்தில் தலைப்பு மற்றும் விளக்கத்தை உள்ளிட்டு "🎨 AI விளக்கப்படம் உருவாக்குக" என்பதை அழுத்தவும்.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
