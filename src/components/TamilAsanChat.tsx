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
  ArrowDown,
  Pin,
  PinOff,
  History,
  Bookmark,
  Trash2,
  Copy,
  Check,
  Search,
  Plus,
  Palette,
  Download,
  Eye,
  Maximize2
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
import { 
  StudentSearchItem, 
  getStudentSearchHistory, 
  saveStudentSearchItem, 
  togglePinStudentSearchItem, 
  deleteStudentSearchItem, 
  clearStudentSearchHistory 
} from "../lib/studentChatCache";
import { applyWatermarkToImage, downloadDataUrl } from "../lib/watermarkImage";

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
  imagePrompt?: string;
  generatedImageUrl?: string;
  isGeneratingImage?: boolean;
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
  
  // Student Local Search History & Pinned Doubts Cache
  const [searchHistory, setSearchHistory] = useState<StudentSearchItem[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyTab, setHistoryTab] = useState<'all' | 'pinned'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-1",
      sender: "asan",
      text: `வணக்கம் அன்புச் செல்வமே! நான் அகரம் தினேஸ் Online Academy-ன் AI தமிழ் ஆசான்.

நீங்கள் நலமாக இருக்கிறீர்களா? உங்கள் பெயர் என்ன? நீங்கள் எந்த வகுப்பில் (தரத்தில) படிக்கிறீர்கள்?

இன்று தமிழில் உங்களுக்கு என்ன சந்தேகம் அல்லது எந்தப் பாடம் கற்க விரும்புகிறீர்கள் என்று சொல்லுங்கள், நாம் துல்லியமாக ஒன்றாகப் படிப்போம்!`,
      timestamp: new Date(),
      suggestedFollowUps: [
        "பெயர்ச்சொல் என்றால் என்ன?",
        "வேற்றுமை உருபுகள் யாவை?",
        "இலக்கணப் பயிற்சி வினாக்கள்"
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoVoiceReply, setAutoVoiceReply] = useState(false); // Default to FALSE: text answer only. Student can click voice button if they want audio.
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // AI Image Generation & Lightbox States
  const [showImageGenModal, setShowImageGenModal] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxPrompt, setLightboxPrompt] = useState<string>("");
  const [isGeneratingImageGlobal, setIsGeneratingImageGlobal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getTamilAsanSettings().then(s => setSettings(s));
    setSearchHistory(getStudentSearchHistory());
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

  // Handle AI Image Generation with Agaram Dhines Watermark Logo
  const handleGenerateImage = async (promptToUse: string, contextLesson?: string, targetMsgId?: string) => {
    const trimmedPrompt = promptToUse.trim();
    if (!trimmedPrompt) return;

    setShowImageGenModal(false);
    setIsGeneratingImageGlobal(true);

    const promptUserDisplay = `🎨 படம் உருவாக்குக: "${trimmedPrompt}"`;
    const userMsgId = Date.now().toString();
    const asanPlaceholderId = (Date.now() + 1).toString();

    // Add user request message if not targeting an existing message
    if (!targetMsgId) {
      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: "user",
        text: promptUserDisplay,
        timestamp: new Date(),
        grade: selectedGrade,
        category: selectedCategory
      };
      setMessages(prev => [...prev, userMsg]);
    }

    // Add Asan generating placeholder
    const generatingMsg: ChatMessage = {
      id: asanPlaceholderId,
      sender: "asan",
      text: `🎨 **அகரம் தினேஸ் AI ஆசான் "${trimmedPrompt}" கல்விப் படத்தைத் தயாரிக்கிறார்...**\n\nஅதிகாரப்பூர்வ வாட்டர்மார்க் லோகோ மற்றும் ஆசிரியர் விபரங்களுடன் கூடிய படம் உருவாக்கப்பட்டு வருகிறது. சற்று நேரத்தில் உயர் தெளிவுத்திறனில் காட்சிப்படுத்தப்படும்.`,
      timestamp: new Date(),
      imagePrompt: trimmedPrompt,
      isGeneratingImage: true
    };
    setMessages(prev => [...prev, generatingMsg]);

    try {
      const res = await fetch("/api/tamil-asan/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          lessonContext: contextLesson || `${selectedGrade} ${selectedCategory}`,
          aspectRatio: imageAspectRatio || "16:9"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.imageBase64) {
        throw new Error(data.error || "படம் உருவாக்குவதில் தற்காலிகப் பிழை ஏற்பட்டது.");
      }

      // Raw image data URL
      const rawUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;

      // Watermark image with Academy Logo only (no text, per user specification)
      let finalWatermarkedUrl = rawUrl;
      try {
        finalWatermarkedUrl = await applyWatermarkToImage(rawUrl, {
          logoUrl: "/logo.png",
          position: "bottom-right",
          opacity: 0.92,
          showLogo: true,
          includeText: false
        });
      } catch (wmErr) {
        console.warn("Watermarking fallback:", wmErr);
      }

      // Update message with generated watermarked image
      setMessages(prev => prev.map(m => {
        if (m.id === asanPlaceholderId) {
          return {
            ...m,
            isGeneratingImage: false,
            generatedImageUrl: finalWatermarkedUrl,
            imagePrompt: trimmedPrompt,
            text: `✨ **அகரம் தினேஸ் அகாடமி AI கல்விப் படம் உருவாக்கப்பட்டது!**\n\n📌 **கருத்து / வினா:** ${trimmedPrompt}\n\nஅகரம் தினேஸ் அகாடமியின் அதிகாரப்பூர்வ லோகோ முத்திரையுடன் படம் கீழே இணைக்கப்பட்டுள்ளது. நீங்கள் இதனை முழுத் திரையில் பெரிதாக்கவோ அல்லது பதிவிறக்கவோ செய்யலாம்.`
          };
        }
        return m;
      }));
    } catch (err: any) {
      console.error("Image generation error:", err);
      setMessages(prev => prev.map(m => {
        if (m.id === asanPlaceholderId) {
          return {
            ...m,
            isGeneratingImage: false,
            text: `⚠️ படம் உருவாக்குவதில் தற்காலிகத் தாமதம் ஏற்பட்டது: ${err?.message || "தயவுசெய்து மீண்டும் ஒருமுறை முயற்சிக்கவும்."}`
          };
        }
        return m;
      }));
    } finally {
      setIsGeneratingImageGlobal(false);
    }
  };

  const handleSubmit = async (overrideText?: string) => {
    const questionText = (overrideText || inputQuery).trim();
    if (!questionText && !selectedImage) return;

    // Check if user is asking to create/draw an image
    const isImageIntent = /^(படம்|வரைக|படம் வரை|படம் உருவாக்கு|புகைப்படம்|create image|generate image|draw|image of|\/image)\b/i.test(questionText) ||
                          questionText.includes("படம் வரைந்து காட்டு") ||
                          questionText.includes("படம் உருவாக்கு") ||
                          questionText.includes("படம் காட்டு");

    if (isImageIntent && !selectedImage) {
      const cleanedPrompt = questionText
        .replace(/^(படம்|வரைக|படம் வரை|படம் உருவாக்கு|புகைப்படம்|create image|generate image|draw|image of|\/image)\s*[:=-]?\s*/i, "")
        .replace(/படம் வரைந்து காட்டு|படம் உருவாக்கு|படம் காட்டு/g, "")
        .trim();
      
      handleGenerateImage(cleanedPrompt || questionText);
      setInputQuery("");
      removeImage();
      return;
    }

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
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('asan' as const),
        text: m.text
      }));

      const response = await askTamilAsan({
        question: questionText,
        grade: selectedGrade,
        category: selectedCategory,
        imageBase64,
        imageMimeType,
        answerLength,
        chatHistory: historyPayload
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

      // Automatically save to student's local device cache (localStorage) for privacy & offline pinning
      try {
        saveStudentSearchItem({
          id: asanMessage.id,
          question: questionText || "பட விளக்கம்",
          answer: response.answer,
          grade: selectedGrade,
          category: selectedCategory,
          suggestedFollowUps: response.suggestedFollowUps,
          isPinned: false
        });
        setSearchHistory(getStudentSearchHistory());
      } catch (e) {
        console.warn("Could not save to student local cache:", e);
      }

      // Gemini Voice Mode: Auto play teacher voice directly (Text + Voice delivered together)
      if (autoVoiceReply) {
        handleSpeak(response.answer, asanMessage.id);
      }
    } catch (err: any) {
      console.error("Tamil Asan error:", err);
      const isKeyProblem = err?.message?.includes("leaked") || err?.message?.includes("KEY") || err?.message?.includes("403");
      const errText = isKeyProblem 
        ? "Firebase அறிவுத்தளத்திலிருந்து தகவல்களைப் பெறுவதில் சிறு தாமதம் ஏற்பட்டுள்ளது. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."
        : "தொழில்நுட்பக் கோளாறு காரணமாக விடை பெறுவதில் தாமதம் ஏற்பட்டுள்ளது. தயவுசெய்து மீண்டும் ஒருமுறை கேட்கவும்.";
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "asan",
          text: errText,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Student Local Cache & History Actions
  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn("Copy failed:", err);
    }
  };

  const handleTogglePin = (historyItemIdOrMsgId: string, question?: string, answer?: string) => {
    const existing = searchHistory.find(h => h.id === historyItemIdOrMsgId || (question && h.question === question));
    if (existing) {
      const updated = togglePinStudentSearchItem(existing.id);
      setSearchHistory(updated);
    } else if (question && answer) {
      saveStudentSearchItem({
        id: historyItemIdOrMsgId,
        question,
        answer,
        grade: selectedGrade,
        category: selectedCategory,
        isPinned: true
      });
      setSearchHistory(getStudentSearchHistory());
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteStudentSearchItem(id);
    setSearchHistory(updated);
  };

  const handleClearAllHistory = () => {
    if (window.confirm("உங்கள் சாதனத்தில் சேமிக்கப்பட்டுள்ள அனைத்து தேடல் வரலாற்றையும் அழிக்க விரும்புகிறீர்களா?")) {
      clearStudentSearchHistory();
      setSearchHistory([]);
    }
  };

  const handleLoadHistoryItem = (item: StudentSearchItem) => {
    setMessages([
      {
        id: `q-${item.id}`,
        sender: "user",
        text: item.question,
        timestamp: new Date(item.timestamp),
        grade: item.grade,
        category: item.category
      },
      {
        id: item.id,
        sender: "asan",
        text: item.answer,
        timestamp: new Date(item.timestamp),
        suggestedFollowUps: item.suggestedFollowUps
      }
    ]);
    setShowHistoryDrawer(false);
  };

  const handleNewChat = () => {
    if (stopVoiceRef.current) stopVoiceRef.current();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
    setMessages([
      {
        id: "intro-" + Date.now(),
        sender: "asan",
        text: `வணக்கம் அன்புச் செல்வமே! நான் அகரம் தினேஸ் Online Academy-ன் AI தமிழ் ஆசான்.\n\nதமிழில் உங்களுக்கு என்ன சந்தேகம் அல்லது எந்தப் பாடம் கற்க விரும்புகிறீர்கள் என்று சொல்லுங்கள், நாம் துல்லியமாக ஒன்றாகப் படிப்போம்!`,
        timestamp: new Date(),
        suggestedFollowUps: [
          "பெயர்ச்சொல் என்றால் என்ன?",
          "வேற்றுமை உருபுகள் யாவை?",
          "இலக்கணப் பயிற்சி வினாக்கள்"
        ]
      }
    ]);
    setInputQuery("");
    removeImage();
    setShowHistoryDrawer(false);
  };

  const renderBoldSpans = (text: string, keyPrefix: string) => {
    if (!text.includes('**')) return text;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-${i}`} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderFormattedText = (content: string, isUserMessage: boolean) => {
    if (isUserMessage) {
      return <div className="whitespace-pre-wrap leading-relaxed space-y-2">{content}</div>;
    }

    const lines = content.split('\n');
    return (
      <div className="space-y-2 leading-relaxed">
        {lines.map((line, lineIdx) => {
          if (!line.trim()) {
            return <div key={lineIdx} className="h-1.5" />;
          }

          const hasMarkdownLink = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/.test(line);
          const hasRawUrl = !hasMarkdownLink && /https?:\/\/[^\s)]+/.test(line);

          if (hasMarkdownLink) {
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            const regex = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;

            while ((match = regex.exec(line)) !== null) {
              if (match.index > lastIndex) {
                parts.push(renderBoldSpans(line.substring(lastIndex, match.index), `sub-${lineIdx}-${lastIndex}`));
              }
              const linkText = match[1];
              const linkUrl = match[2];
              const isPdf = linkText.toLowerCase().includes('pdf') || linkUrl.toLowerCase().includes('pdf') || linkText.includes('பதிவிறக்க') || linkUrl.includes('drive.google.com/file');
              const isVideo = linkText.toLowerCase().includes('வீடியோ') || linkUrl.toLowerCase().includes('youtu');
              const isWa = linkUrl.includes('wa.me');

              if (isPdf) {
                // Strictly DO NOT render any PDF download button/link
                parts.push(
                  <span key={`pdf-ref-${lineIdx}-${match.index}`} className="font-semibold text-slate-800">
                    {linkText} <span className="text-xs font-normal text-slate-500">(ஆசிரியரின் பாடப் பதிவு)</span>
                  </span>
                );
              } else {
                parts.push(
                  <a
                    key={`link-${lineIdx}-${match.index}`}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-xl text-xs transition-all my-1 shadow-2xs cursor-pointer ${
                      isVideo
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        : isWa
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {isVideo && <Youtube size={14} className="text-red-600 shrink-0" />}
                    {isWa && <ExternalLink size={14} className="text-emerald-600 shrink-0" />}
                    {!isVideo && !isWa && <ExternalLink size={14} className="shrink-0" />}
                    <span>{linkText}</span>
                  </a>
                );
              }
              lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
              parts.push(renderBoldSpans(line.substring(lastIndex), `sub-${lineIdx}-${lastIndex}`));
            }

            return <div key={lineIdx} className="leading-relaxed">{parts}</div>;
          }

          if (hasRawUrl) {
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            const regex = /(https?:\/\/[^\s)]+)/g;

            while ((match = regex.exec(line)) !== null) {
              if (match.index > lastIndex) {
                parts.push(renderBoldSpans(line.substring(lastIndex, match.index), `sub-${lineIdx}-${lastIndex}`));
              }
              const linkUrl = match[1];
              parts.push(
                <a
                  key={`raw-${lineIdx}-${match.index}`}
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 underline break-all my-0.5"
                >
                  <span>{linkUrl}</span>
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              );
              lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
              parts.push(renderBoldSpans(line.substring(lastIndex), `sub-${lineIdx}-${lastIndex}`));
            }

            return <div key={lineIdx} className="leading-relaxed">{parts}</div>;
          }

          return <div key={lineIdx} className="leading-relaxed">{renderBoldSpans(line, `line-${lineIdx}`)}</div>;
        })}
      </div>
    );
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
          {/* History / Pinned Doubts Button */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            title="மாணவரின் சாதனத்தில் சேமிக்கப்பட்ட முந்தைய தேடல் வரலாறு & பின் செய்தவை"
          >
            <History size={15} className="text-amber-300" />
            <span className="hidden sm:inline">வரலாறு</span>
            {searchHistory.length > 0 && (
              <span className="bg-amber-400 text-red-950 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                {searchHistory.length}
              </span>
            )}
            {searchHistory.some(i => i.isPinned) && (
              <span className="text-[11px]" title="பின் செய்யப்பட்டவை">📌</span>
            )}
          </button>

          {/* New Question Button */}
          <button
            onClick={handleNewChat}
            className="px-2.5 py-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            title="புதிய வினா கேட்க / திரையை மீளமைக்க"
          >
            <Plus size={15} />
            <span className="hidden md:inline">புதிய கேள்வி</span>
          </button>

          {/* Voice Auto-Reply Toggle */}
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
            <span className="hidden sm:inline">குரல்: {autoVoiceReply ? "ஆன்" : "ஆஃப்"}</span>
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

        <div className="flex items-center gap-2">
          {searchHistory.length > 0 && (
            <button
              onClick={() => {
                setHistoryTab('pinned');
                setShowHistoryDrawer(true);
              }}
              className="text-[11px] text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1 font-bold cursor-pointer transition-colors"
              title="பின் செய்த கேள்விகளைக் காண"
            >
              <span>📌 பின் செய்தவை</span>
              <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 rounded-full font-bold">
                {searchHistory.filter(i => i.isPinned).length}
              </span>
            </button>
          )}

          <div className="hidden md:flex text-[11px] text-red-800 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 items-center gap-1.5 font-semibold">
            <Volume2 size={13} className="text-red-700" />
            <span>டெக்ஸ்ட் + நேரடி ஆசான் குரல்</span>
          </div>
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
                  {renderFormattedText(msg.text, isUser)}

                  {/* Generated Image Loading Indicator */}
                  {msg.isGeneratingImage && (
                    <div className="mt-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 flex items-center gap-3 animate-pulse shadow-xs">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                        <Palette size={18} className="animate-spin text-amber-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black flex items-center gap-1.5 text-amber-900">
                          <Sparkles size={13} className="text-amber-600" />
                          <span>அகரம் தினேஸ் AI ஆசான் வாட்டர்மார்க் லோகோவுடன் படத்தைத் தயாரிக்கிறார்...</span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 mt-0.5 truncate">
                          கருத்து: "{msg.imagePrompt}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Generated Image with Agaram Dhines Watermark */}
                  {msg.generatedImageUrl && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-amber-300 bg-slate-900 shadow-md">
                      {/* Top Header Badge */}
                      <div className="bg-gradient-to-r from-red-900 via-amber-900 to-slate-900 px-3 py-1.5 flex items-center justify-between text-white border-b border-amber-400/20">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-300" />
                          <span className="text-[11px] font-black text-amber-200">
                            அகரம் தினேஸ் AI கல்விப் படம் (Watermark Logo)
                          </span>
                        </div>
                        <span className="text-[10px] bg-amber-400 text-red-950 px-2 py-0.2 rounded-full font-black">
                          அதிகாரப்பூர்வம்
                        </span>
                      </div>

                      {/* Image Display */}
                      <div 
                        onClick={() => {
                          setLightboxImageUrl(msg.generatedImageUrl || null);
                          setLightboxPrompt(msg.imagePrompt || "பாடம் காட்சி விளக்கம்");
                        }}
                        className="relative cursor-pointer group flex items-center justify-center bg-black/40 overflow-hidden"
                      >
                        <img
                          src={msg.generatedImageUrl}
                          alt={msg.imagePrompt || "Agaram Dhines Lesson Visual"}
                          className="w-full h-auto object-contain max-h-80 transition-transform duration-300 group-hover:scale-[1.01]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 shadow-lg flex items-center gap-1.5">
                            <Maximize2 size={13} className="text-amber-300" /> பெரிதாகக் காண்க
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-2.5 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-amber-200/90 truncate max-w-xs font-semibold">
                          🎯 {msg.imagePrompt || "பாடக் கருத்து விளக்கம்"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxImageUrl(msg.generatedImageUrl || null);
                              setLightboxPrompt(msg.imagePrompt || "பாடம் காட்சி விளக்கம்");
                            }}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="பெரிதாகக் காண்க"
                          >
                            <Eye size={12} className="text-amber-300" />
                            <span>பெரிதாக்கு</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (msg.generatedImageUrl) {
                                downloadDataUrl(msg.generatedImageUrl, `agaram-dhines-${Date.now()}.png`);
                              }
                            }}
                            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 font-black rounded-lg text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                            title="வாட்டர்மார்க் லோகோவுடன் பதிவிறக்குக"
                          >
                            <Download size={12} />
                            <span>பதிவிறக்கு</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Bar (Speak / Pin / Copy / Image / Timestamp) */}
                  <div className={`mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] ${
                    isUser ? 'text-blue-100 border-blue-500/30' : 'text-slate-400'
                  }`}>
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {!isUser && (
                      <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                        {/* Create Image Button for this lesson */}
                        <button
                          type="button"
                          onClick={() => {
                            const topic = msg.imagePrompt || msg.text.split('\n')[0].replace(/[#*`_]/g, '').trim().slice(0, 90);
                            handleGenerateImage(topic, `${msg.grade || selectedGrade}`, msg.id);
                          }}
                          className="flex items-center gap-1 px-2.5 py-0.8 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold cursor-pointer transition-all text-[10px]"
                          title="இப்பாடத்திற்கு AI படம் உருவாக்குக (Create Image with Logo)"
                        >
                          <Palette size={11} className="text-amber-700" />
                          <span>🎨 படம் உருவாக்குக</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="flex items-center gap-1 px-2 py-0.8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-all text-[10px]"
                          title="பதிலை நகலெடு"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-600" />
                              <span className="text-emerald-700 font-bold">நகலெடுக்கப்பட்டது</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>நகலெடு</span>
                            </>
                          )}
                        </button>

                        {/* Pin Button */}
                        {msg.id !== 'intro-1' && (() => {
                          const matchingHistory = searchHistory.find(h => h.id === msg.id || h.answer === msg.text);
                          const isItemPinned = !!matchingHistory?.isPinned;
                          return (
                            <button
                              onClick={() => {
                                const prevUserMsg = messages.slice(0, messages.findIndex(m => m.id === msg.id)).reverse().find(m => m.sender === 'user');
                                handleTogglePin(msg.id, prevUserMsg?.text || "சந்தேகம்", msg.text);
                              }}
                              className={`flex items-center gap-1 px-2.5 py-0.8 rounded-full font-bold cursor-pointer transition-all text-[10px] ${
                                isItemPinned
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                              }`}
                              title={isItemPinned ? "பின் நீக்கு (Unpin)" : "மாணவர் நினைவூட்டலுக்கு பின் செய் (Pin to local device)"}
                            >
                              <Pin size={11} className={isItemPinned ? 'text-amber-600 fill-amber-500' : ''} />
                              <span>{isItemPinned ? "பின் செய்யப்பட்டது 📌" : "பின் செய்"}</span>
                            </button>
                          );
                        })()}

                        {/* Speak Button */}
                        <button
                          onClick={() => handleSpeak(
                            msg.id === 'intro-1' && settings.welcomeVoiceText ? settings.welcomeVoiceText : msg.text,
                            msg.id,
                            msg.id === 'intro-1' ? settings.welcomeAudioUrl : undefined
                          )}
                          className={`flex items-center gap-1 font-bold px-2.5 py-0.8 rounded-full transition-all cursor-pointer text-[10px] ${
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
                                <span className="w-0.5 h-3 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                                <span className="w-0.5 h-2 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span>நிறுத்து ⏹️</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={11} className="text-red-700" />
                              <span>கேள் ▶️</span>
                            </>
                          )}
                        </button>
                      </div>
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

          {/* AI Image Generation Button (Gemini / ChatGPT style) */}
          <button
            type="button"
            onClick={() => {
              if (inputQuery.trim()) {
                handleGenerateImage(inputQuery);
                setInputQuery("");
              } else {
                setShowImageGenModal(true);
              }
            }}
            disabled={isGeneratingImageGlobal || isLoading}
            className="p-2.5 rounded-xl transition-all shrink-0 cursor-pointer border bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white border-amber-400 shadow-xs flex items-center gap-1 font-bold text-xs"
            title="🎨 AI படம் உருவாக்குக (Create Image with Watermark Logo)"
          >
            <Palette size={18} />
            <span className="hidden sm:inline">படம் உருவாக்கு</span>
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

      {/* Student Local Search History & Pinned Doubts Slide-over Drawer */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-40 cursor-pointer"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-96 md:w-[420px] bg-white z-50 shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="p-4 bg-gradient-to-r from-red-800 to-amber-900 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <History size={20} className="text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-100 flex items-center gap-1.5">
                      <span>எனது தேடல் வரலாறு</span>
                      <span className="bg-amber-400 text-red-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                        {searchHistory.length}
                      </span>
                    </h4>
                    <p className="text-[11px] text-red-100/80">சாதனத்தில் சேமிக்கப்பட்ட சந்தேகங்கள்</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewChat}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-amber-200 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="புதிய வினா கேட்க"
                  >
                    <Plus size={16} />
                    <span className="text-[11px]">புதியது</span>
                  </button>
                  <button
                    onClick={() => setShowHistoryDrawer(false)}
                    className="p-1.5 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Search Bar in History */}
              <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="முந்தைய கேள்விகளில் தேடுக..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-red-600"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs: All vs Pinned */}
              <div className="flex border-b border-slate-200 bg-white px-3 pt-2 gap-2 text-xs">
                <button
                  onClick={() => setHistoryTab('all')}
                  className={`pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    historyTab === 'all'
                      ? 'border-red-700 text-red-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History size={13} />
                  <span>அனைத்தும் ({searchHistory.length})</span>
                </button>

                <button
                  onClick={() => setHistoryTab('pinned')}
                  className={`pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    historyTab === 'pinned'
                      ? 'border-amber-600 text-amber-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Pin size={13} className="fill-amber-500 text-amber-600" />
                  <span>பின் செய்தவை ({searchHistory.filter(i => i.isPinned).length})</span>
                </button>
              </div>

              {/* History Items List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
                {(() => {
                  let filtered = searchHistory;
                  if (historyTab === 'pinned') {
                    filtered = filtered.filter(i => i.isPinned);
                  }
                  if (historySearchQuery.trim()) {
                    const q = historySearchQuery.toLowerCase();
                    filtered = filtered.filter(i => 
                      i.question.toLowerCase().includes(q) || 
                      i.answer.toLowerCase().includes(q) ||
                      (i.grade && i.grade.toLowerCase().includes(q))
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                          {historyTab === 'pinned' ? <Pin size={22} /> : <History size={22} />}
                        </div>
                        <p className="text-xs font-semibold">
                          {historyTab === 'pinned' 
                            ? "பின் செய்யப்பட்ட சந்தேகங்கள் எதுவும் இல்லை."
                            : "முந்தைய தேடல்கள் எதுவும் இல்லை."}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                          {historyTab === 'pinned'
                            ? "முக்கியமான இலக்கண விடைகளை உடனே படிக்க 📌 பொத்தானை அழுத்தவும்."
                            : "நீங்கள் கேட்கும் கேள்விகள் தானாக உங்கள் சாதனத்தில் மட்டுமே சேமிக்கப்படும்."}
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((item) => {
                    const isPinned = !!item.isPinned;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleLoadHistoryItem(item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-xs relative ${
                          isPinned
                            ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                            : 'bg-white border-slate-200 hover:border-red-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-xs text-slate-900 group-hover:text-red-700 transition-colors line-clamp-2 leading-snug">
                            {item.question}
                          </h5>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Pin Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(item.id, item.question, item.answer);
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isPinned
                                  ? 'text-amber-700 bg-amber-200/60 hover:bg-amber-200'
                                  : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={isPinned ? "பின் நீக்கு (Unpin)" : "நினைவூட்டலுக்கு பின் செய் (Pin)"}
                            >
                              <Pin size={13} className={isPinned ? 'fill-amber-600 text-amber-700' : ''} />
                            </button>

                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(item.answer, item.id);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="பதிலை நகலெடு"
                            >
                              {copiedId === item.id ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="இக்கேள்வியை நீக்குக"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Answer Preview */}
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                          {item.answer.replace(/[#*`_]/g, '')}
                        </p>

                        {/* Metadata Footer */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                            {item.grade || 'பொது'}
                          </span>
                          <span>
                            {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Drawer Footer with Privacy Notice & Clear All */}
              <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>🔒</span>
                    <span>சாதனத்தில் மட்டுமே சேமிக்கப்படுகிறது (Private Cache)</span>
                  </div>

                  {searchHistory.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="text-[11px] text-red-600 hover:text-red-800 hover:underline font-semibold cursor-pointer"
                    >
                      அனைத்தையும் நீக்கு
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* Quick Interactive AI Image Generation Modal (ChatGPT / Gemini style)      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showImageGenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-amber-200/80 w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-800 via-amber-900 to-slate-900 text-white p-4.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400 text-red-950 rounded-xl shadow-xs">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-amber-100 flex items-center gap-1.5">
                      <span>AI படம் உருவாக்குக (Create Image)</span>
                      <span className="bg-amber-400 text-red-950 text-[10px] font-black px-2 py-0.2 rounded-full">
                        Logo Watermark
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-200/80">
                      நீங்கள் விரும்பும் பாடக் கருத்தை உள்ளிட, அகரம் தினேஸ் AI உடனடியாக படம் தயாரிக்கும்
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageGenModal(false)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* Prompt Textarea */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                    படத்திற்கான தலைப்பு அல்லது விளக்கம் (Image Prompt):
                  </label>
                  <textarea
                    rows={3}
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    placeholder="எ.கா: திருவள்ளுவர் திருக்குறள் ஏட்டுச்சுவடி எழுதும் எழிலான காட்சி..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white rounded-xl p-3 text-xs text-slate-900 outline-none transition-all resize-none shadow-2xs font-medium"
                    autoFocus
                  />
                </div>

                {/* Quick Topic Chips */}
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5 text-[11px]">
                    விரைவான பரிந்துரைகள் (Quick Suggestions):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "திருவள்ளுவர் ஏட்டுச்சுவடி எழுதும் காட்சி",
                      "காகமும் நரியும் - பாட்டி வடை கதை",
                      "பூம்புகார் துறைமுகம் - பழந்தமிழர் கப்பல்கள்",
                      "இலக்கண மரபு மரம் - 5 இலக்கணப் பிரிவுகள்",
                      "நல்லூர் கந்தசுவாமி கோவில் தேர் திருவிழா"
                    ].map((topic, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCustomImagePrompt(topic)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-[11px] font-semibold transition-all text-left cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      >
                        💡 {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    படத்தின் அளவு வடிவம் (Aspect Ratio):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '16:9' as const, label: '16:9 (Landscape)', desc: 'பாட விளக்கம்' },
                      { id: '1:1' as const, label: '1:1 (Square)', desc: 'சமூக வலைத்தளம்' },
                      { id: '9:16' as const, label: '9:16 (Portrait)', desc: 'மொபைல் காட்சி' },
                    ].map(ar => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setImageAspectRatio(ar.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          imageAspectRatio === ar.id
                            ? 'bg-red-50 border-red-600 text-red-900 font-bold shadow-2xs ring-1 ring-red-600'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[11px]">{ar.label}</div>
                        <div className="text-[9px] text-slate-500">{ar.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Watermark Assurance Banner */}
                <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-2xl flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-red-950 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    ✓
                  </div>
                  <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
                    உருவாக்கப்படும் ஒவ்வொரு படத்திலும் <strong>அகரம் தினேஸ் ஆன்லைன் அகாடமியின் பொன்வளைய லோகோ மட்டும்</strong> அழகாக வாட்டர்மார்க்காக இணைக்கப்பட்டு காட்சிப்படுத்தப்படும் (எழுத்துக்கள் இன்றி நேர்த்தியாக அமையும்).
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowImageGenModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  ரத்து செய்
                </button>

                <button
                  type="button"
                  disabled={!customImagePrompt.trim() || isGeneratingImageGlobal}
                  onClick={() => {
                    handleGenerateImage(customImagePrompt);
                    setCustomImagePrompt("");
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-red-600 to-red-700 hover:from-amber-400 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-200" />
                  <span>✨ படம் உருவாக்குக (Create Image with Logo)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* Lightbox Modal (High-Resolution Zoom & Full View)                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {lightboxImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-amber-400/40 shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Lightbox Header */}
              <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 p-3.5 px-5 flex items-center justify-between border-b border-white/10 text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold truncate text-amber-200">
                    {lightboxPrompt || "அகரம் தினேஸ் AI கல்விப் படம்"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(lightboxImageUrl, `agaram-dhines-${Date.now()}.png`)}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-red-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="முழுப் படத்தை பதிவிறக்குக"
                  >
                    <Download size={13} />
                    <span>பதிவிறக்குக</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxImageUrl(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Full Image Preview */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
                <img
                  src={lightboxImageUrl}
                  alt={lightboxPrompt || "Full View"}
                  className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Lightbox Footer */}
              <div className="p-3 bg-slate-950/90 border-t border-white/10 text-center text-xs text-amber-200/80 font-medium">
                🛡️ அகரம் தினேஸ் ஆன்லைன் அகாடமி அதிகாரப்பூர்வ வாட்டர்மார்க் லோகோ பதிவு செய்யப்பட்டுள்ளது.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
