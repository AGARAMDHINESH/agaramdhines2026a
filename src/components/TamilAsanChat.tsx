import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  Image as ImageIcon, 
  X, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Sparkles, 
  FileText, 
  Youtube, 
  ExternalLink, 
  GraduationCap, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  askTamilAsan, 
  playTeacherVoice, 
  getTamilAsanSettings, 
  TamilAsanSettings, 
  DEFAULT_TAMIL_ASAN_SETTINGS,
  GuruSourceReference 
} from "../lib/tamilAsanEngine";

interface ChatMessage {
  id: string;
  sender: 'user' | 'asan';
  text: string;
  timestamp: Date;
  grade?: string;
  category?: string;
  imageUrl?: string;
  sources?: GuruSourceReference[];
  suggestedFollowUps?: string[];
}

interface TamilAsanChatProps {
  initialGrade?: string;
  studentName?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
}

const CATEGORIES = [
  { id: "பொது", label: "பொதுவான தமிழ்" },
  { id: "இலக்கணம்", label: "இலக்கணம் (Grammar)" },
  { id: "இலக்கியம்", label: "இலக்கிய நயம் & செய்யுள்" },
  { id: "மொழிவளம்", label: "மொழிவளம் & சொற்பயிற்சி" },
  { id: "ஆக்கத்திறன்", label: "கட்டுரை & ஆக்கத்திறன்" },
  { id: "வினாவிடை", label: "தேர்வு வினா-விடை" }
];

const GRADES = [
  "பொது (General)",
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", 
  "தரம் 10", "தரம் 11", "தரம் 12", "தரம் 13",
  "30 DAY'S TAMIL COURSE"
];

export default function TamilAsanChat({
  initialGrade = "பொது (General)",
  studentName = "மாணவர்",
  onClose,
  isEmbedded = false
}: TamilAsanChatProps) {
  const [settings, setSettings] = useState<TamilAsanSettings>(DEFAULT_TAMIL_ASAN_SETTINGS);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedCategory, setSelectedCategory] = useState<string>("பொது");
  const [answerLength, setAnswerLength] = useState<'concise' | 'detailed'>('concise');
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-1",
      sender: "asan",
      text: `வணக்கம் அன்புச் செல்வமே! நான் அகரம் தினேஸ் Online Academy-ன் AI தமிழ் ஆசான்.

நீங்கள் நலமாக இருக்கிறீர்களா? உங்கள் பெயர் என்ன? நீங்கள் எந்த வகுப்பில் (தரத்தில) படிக்கிறீர்கள்?

இன்று தமிழில் உங்களுக்கு என்ன சந்தேகம் அல்லது எந்தப் பாடம் கற்க விரும்புகிறீர்கள் என்று சொல்லுங்கள், நாம் இயல்பாக ஒன்றாகப் படிப்போம்!`,
      timestamp: new Date(),
      suggestedFollowUps: [
        "வணக்கம் ஆசான்!",
        "எனக்கு இலக்கணத்தில் ஒரு சந்தேகம்",
        "மாதிரி வினாத்தாள்கள் பயிற்சி செய்ய வேண்டும்"
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true); // Enabled by default for Gemini-style interactive voice + text
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getTamilAsanSettings().then(s => setSettings(s));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Show jump to bottom button if user scrolled up by more than 90px
    const isUp = scrollHeight - scrollTop - clientHeight > 90;
    setShowScrollBottom(isUp);
  };

  // Voice recognition (Speech to Text in Tamil)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("உங்கள் உலாவியில் குரல் அறிதல் (Voice Input) வசதி செயல்படவில்லை. Google Chrome-ஐ பயன்படுத்தவும்.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ta-LK'; // Tamil (Sri Lanka) or 'ta-IN'
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSpeak = async (text: string, msgId?: string, customAudioUrl?: string) => {
    if (stopVoiceRef.current) {
      stopVoiceRef.current();
      stopVoiceRef.current = null;
    }

    if (isSpeaking && speakingMessageId === msgId) {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId || null);
    stopVoiceRef.current = await playTeacherVoice(
      text, 
      settings,
      () => {
        setIsSpeaking(true);
        if (msgId) setSpeakingMessageId(msgId);
      },
      () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      },
      customAudioUrl
    );
  };

  const handleSubmit = async (overrideText?: string) => {
    const questionText = (overrideText || inputQuery).trim();
    if (!questionText && !selectedImage) return;

    // Convert image to base64 if present
    let imageBase64: string | undefined = undefined;
    let imageMimeType: string | undefined = undefined;

    if (selectedImage) {
      imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.readAsDataURL(selectedImage);
      });
      imageMimeType = selectedImage.type;
    }

    const currentImagePreview = imagePreview;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: questionText || "படத்திலுள்ள வினாவை விளக்குக.",
      timestamp: new Date(),
      grade: selectedGrade,
      category: selectedCategory,
      imageUrl: currentImagePreview || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery("");
    removeImage();
    setIsLoading(true);

    try {
      const response = await askTamilAsan({
        question: questionText,
        grade: selectedGrade,
        category: selectedCategory,
        imageBase64,
        imageMimeType,
        answerLength
      });

      const asanMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "asan",
        text: response.answer,
        timestamp: new Date(),
        sources: response.usedSources,
        suggestedFollowUps: response.suggestedFollowUps
      };

      setMessages(prev => [...prev, asanMessage]);

      // Gemini Voice Mode: Auto play teacher voice directly (Text + Voice delivered together)
      if (autoVoiceReply) {
        handleSpeak(response.answer, asanMessage.id);
      }
    } catch (err: any) {
      console.error("Tamil Asan error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "asan",
          text: "மன்னிக்கவும் அன்புச் செல்வமே, தொழில்நுட்பக் கோளாறு காரணமாக விடை பெறுவதில் தாமதம் ஏற்பட்டுள்ளது. மீண்டும் ஒருமுறை கேட்கவும் அல்லது இணைய இணைப்பை சரிபார்க்கவும்.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-0 bg-slate-50 relative overflow-hidden ${isEmbedded ? 'rounded-2xl border border-slate-200 shadow-sm' : 'w-full'}`}>
      {/* Header with Teacher Profile & Voice Indicator */}
      <div className="shrink-0 bg-gradient-to-r from-red-700 via-red-800 to-amber-900 text-white p-4 shadow-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-300 shadow-inner bg-amber-100 flex items-center justify-center text-red-800">
              <img 
                src="/logo.png" 
                alt="Dhines Master" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <GraduationCap size={24} className="text-red-700" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base md:text-lg leading-tight flex items-center gap-1.5 text-amber-100">
                <span>{settings.aiName}</span>
                <span className="bg-amber-400/20 text-amber-200 text-[11px] px-2 py-0.5 rounded-full border border-amber-300/30">ஆசான் குரல்</span>
              </h3>
            </div>
            <p className="text-xs text-red-100/90 flex items-center gap-1 mt-0.5">
              <span>{settings.teacherName}</span> • <span>அகரம் தினேஸ் அகாடமி</span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !autoVoiceReply;
              setAutoVoiceReply(next);
              if (!next && isSpeaking) {
                if (stopVoiceRef.current) stopVoiceRef.current();
                setIsSpeaking(false);
                setSpeakingMessageId(null);
              }
            }}
            className={`px-3 py-1.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs ${
              autoVoiceReply 
                ? 'bg-amber-400 text-red-950 border-amber-300 shadow-md ring-1 ring-amber-300' 
                : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
            }`}
            title={autoVoiceReply ? "குரல் வழி பதில் இயக்கத்தில் உள்ளது (Auto Voice Reply ON)" : "குரல் பதில் முடக்கப்பட்டுள்ளது (Voice Muted)"}
          >
            {autoVoiceReply ? <Volume2 size={15} className="animate-pulse" /> : <VolumeX size={15} />}
            <span>குரல் பதில்: {autoVoiceReply ? "ஆன் (ON)" : "ஆஃப்"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Grade & Subject Filter Strip */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs text-xs z-10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-slate-500 font-semibold shrink-0">தரம்:</span>
          <select 
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-100 text-slate-800 font-medium py-1 px-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
          >
            {GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <span className="text-slate-500 font-semibold shrink-0 ml-2">பிரிவு:</span>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-100 text-slate-800 font-medium py-1 px-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          {/* Answer Mode Toggle: சுருக்கம் vs விளக்கம் */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => setAnswerLength('concise')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                answerLength === 'concise' 
                  ? 'bg-red-700 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="2 முதல் 4 குறிப்புகளில் சுருக்கமான நேரடி பதில்"
            >
              <span>⚡ சுருக்கம்</span>
            </button>
            <button
              type="button"
              onClick={() => setAnswerLength('detailed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                answerLength === 'detailed' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="முழுமையான விரிவான விளக்கம்"
            >
              <span>📖 விளக்கம்</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-red-800 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 flex items-center gap-1.5 shrink-0 font-semibold">
          <Volume2 size={13} className="text-red-700" />
          <span>டெக்ஸ்ட் + நேரடி குரல் உரையாடல் முறை</span>
        </div>
      </div>

      {/* Chat Messages Container - Internal scroll only; typing area remains permanently fixed at bottom */}
      <div 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50 relative scroll-smooth"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center shadow-xs ${
                  isUser 
                    ? 'bg-blue-600 text-white font-bold text-xs' 
                    : 'bg-red-800 text-amber-200 border border-amber-300'
                }`}>
                  {isUser ? studentName.charAt(0) || "U" : <GraduationCap size={18} />}
                </div>

                {/* Content Bubble */}
                <div className={`p-4 rounded-2xl shadow-sm text-sm ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                }`}>
                  {/* Image Attachment */}
                  {msg.imageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200/40 max-h-60 bg-black/10">
                      <img src={msg.imageUrl} alt="User Upload" className="w-full h-auto object-contain" />
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                    {msg.text}
                  </div>

                  {/* Action Bar (Speak / Timestamp) */}
                  <div className={`mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] ${
                    isUser ? 'text-blue-100 border-blue-500/30' : 'text-slate-400'
                  }`}>
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {!isUser && (
                      <button
                        onClick={() => handleSpeak(
                          msg.id === 'intro-1' && settings.welcomeVoiceText ? settings.welcomeVoiceText : msg.text,
                          msg.id,
                          msg.id === 'intro-1' ? settings.welcomeAudioUrl : undefined
                        )}
                        className={`flex items-center gap-1.5 font-bold ml-3 px-2.5 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                          isSpeaking && speakingMessageId === msg.id
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                        }`}
                        title="ஆசான் குரலில் கேட்க"
                      >
                        {isSpeaking && speakingMessageId === msg.id ? (
                          <>
                            <div className="flex items-center gap-0.5 h-3">
                              <span className="w-0.5 h-2 bg-white animate-pulse" />
                              <span className="w-0.5 h-3.5 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                              <span className="w-0.5 h-2 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span>ஆசான் பேசுகிறார் (நிறுத்து ⏹️)</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} className="text-red-700" />
                            <span>ஆசான் குரலில் கேள் ▶️</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggested Follow Up Questions */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-12">
                  {msg.suggestedFollowUps.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(q)}
                      className="text-xs bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full transition-all text-left shadow-2xs font-medium"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-800 text-amber-200 border border-amber-300 flex items-center justify-center shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-semibold text-slate-600">
                ஆசான் சிந்திக்கிறார்... விரைவில் விடை & குரல் விளக்கம் தருகிறார்...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump to Bottom Button if student scrolled up */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowScrollBottom(false);
          }}
          className="absolute bottom-20 right-5 z-30 bg-red-700 hover:bg-red-800 text-white px-3.5 py-1.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border-2 border-white transition-all hover:scale-105 active:scale-95 animate-bounce"
          title="புதிய செய்திக்குச் செல்ல (Scroll to latest)"
        >
          <span>கீழே செல்ல</span>
          <ArrowDown size={14} />
        </button>
      )}

      {/* Active Speaking Status Bar (Gemini Voice Live Indicator) */}
      {isSpeaking && (
        <div className="shrink-0 bg-gradient-to-r from-red-800 via-red-700 to-amber-900 text-white px-4 py-2 flex items-center justify-between text-xs shadow-md border-t border-red-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-0.5 h-3.5">
              <span className="w-1 h-2.5 bg-amber-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-2 bg-amber-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="w-1 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
            </div>
            <span className="font-semibold text-amber-100">
              தலைமை ஆசான் திரு. D. தினேஷ்குமார் குரல் வழியே பேசுகிறார்...
            </span>
          </div>
          <button
            onClick={() => {
              if (stopVoiceRef.current) stopVoiceRef.current();
              setIsSpeaking(false);
              setSpeakingMessageId(null);
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <VolumeX size={13} />
            <span>ஒலியை நிறுத்து ⏹️</span>
          </button>
        </div>
      )}

      {/* Input Form Area - PERMANENTLY DOCKED & VISIBLE AT THE BOTTOM */}
      <div className="shrink-0 sticky bottom-0 z-20 bg-white border-t border-slate-200 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {/* Preview of selected image */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-16 w-auto object-cover rounded-lg border border-slate-300 shadow-xs" />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow-sm cursor-pointer"
              title="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-center gap-2"
        >
          {/* Image Upload Input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors shrink-0 border border-slate-200 hover:border-red-300 cursor-pointer bg-slate-50"
            title="வினாத்தாள் அல்லது பக்கத்தின் புகைப்படத்தை இணைக்க (Upload Question Paper / Image)"
          >
            <ImageIcon size={20} />
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer border ${
              isListening 
                ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-md' 
                : 'text-slate-600 hover:text-red-700 hover:bg-red-50 border-slate-200 hover:border-red-300 bg-slate-50'
            }`}
            title={isListening ? "குரலைக் கவனிக்கிறது... (Listening)" : "தமிழில் பேச கிளிக் செய்யவும் (Voice Input)"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={isListening ? "தமிழில் பேசவும்..." : "கேள்வியைத் தட்டச்சு செய்க (எ.கா: பண்புத்தொகை விளக்கம் தாருங்கள்)..."}
            className="flex-1 min-w-0 bg-slate-100 border border-slate-200 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 rounded-xl px-4 py-2.5 text-sm transition-all text-slate-800 outline-none"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputQuery.trim() && !selectedImage) || isLoading}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shrink-0 shadow-sm flex items-center justify-center cursor-pointer"
            title="கேள்வியைக் கேள்"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
