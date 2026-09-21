import React, { useState, useEffect, useRef } from "react";
import { 
  GraduationCap, 
  UploadCloud, 
  Youtube, 
  FileText, 
  Check, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Link2,
  BookOpen,
  Plus,
  Save,
  Radio,
  Layers,
  Globe,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Edit3,
  X,
  Volume2,
  VolumeX,
  Mic,
  Square,
  Play,
  Sliders,
  Music,
  FolderPlus,
  Tag,
  Settings2,
  HelpCircle,
  MessageSquare,
  Eye,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu
} from "lucide-react";
import TamilAsanRagShowcase from "./TamilAsanRagShowcase";
import { 
  getCourseMaterials, 
  saveCourseMaterials, 
  getYoutubeLinks, 
  saveYoutubeLinks,
  getTamilAsanKnowledge,
  saveTamilAsanKnowledge,
  deleteTamilAsanKnowledge,
  TamilAsanKnowledgeItem,
  KnowledgeQAItem,
  getChatbotSettings,
  saveChatbotSettings,
  getAllUnifiedLinks,
  saveAllUnifiedLinks,
  deleteUnifiedLink,
  UnifiedLinkItem,
  getCustomKnowledgeCategories,
  saveCustomKnowledgeCategories,
  getCustomKnowledgeGrades,
  saveCustomKnowledgeGrades
} from "../lib/db";
import { uploadFileToFirebaseStorage } from "../lib/firebase";
import { resolveMediaUrl } from "../lib/fileStorage";
import { TamilAsanVisualsStudio } from "./TamilAsanVisualsStudio";
import {
  getTamilAsanSettings,
  saveTamilAsanSettings,
  TamilAsanSettings,
  DEFAULT_TAMIL_ASAN_SETTINGS,
  playTeacherVoice
} from "../lib/tamilAsanEngine";

const DEFAULT_GRADES = [
  "அனைத்து வகுப்புகள்",
  "30 DAY'S TAMIL COURSE",
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

const DEFAULT_CATEGORIES = [
  "இலக்கணம்",
  "இலக்கிய நயம்",
  "வினா விடை",
  "பொதுவான தகவல்",
  "மாதிரி வினாத்தாள்கள்",
  "30 நாள் பாடநெறி",
  "கட்டுரை & கடிதம்"
];

const NOTE_CARD_THEMES = [
  {
    cardBg: "bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-300/80 hover:border-emerald-500",
    accentBar: "bg-emerald-500",
    titleColor: "text-emerald-950",
    gradeBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dateColor: "text-emerald-700",
    categoryBadge: "bg-emerald-200/60 text-emerald-900 border-emerald-300/70",
    iconBg: "text-emerald-600 hover:bg-emerald-100",
    accentDot: "bg-emerald-500"
  },
  {
    cardBg: "bg-indigo-50/70 hover:bg-indigo-100/60 border-indigo-300/80 hover:border-indigo-500",
    accentBar: "bg-indigo-500",
    titleColor: "text-indigo-950",
    gradeBadge: "bg-indigo-100 text-indigo-800 border-indigo-300",
    dateColor: "text-indigo-700",
    categoryBadge: "bg-indigo-200/60 text-indigo-900 border-indigo-300/70",
    iconBg: "text-indigo-600 hover:bg-indigo-100",
    accentDot: "bg-indigo-500"
  },
  {
    cardBg: "bg-amber-50/70 hover:bg-amber-100/60 border-amber-300/80 hover:border-amber-500",
    accentBar: "bg-amber-500",
    titleColor: "text-amber-950",
    gradeBadge: "bg-amber-100 text-amber-800 border-amber-300",
    dateColor: "text-amber-800",
    categoryBadge: "bg-amber-200/60 text-amber-900 border-amber-300/70",
    iconBg: "text-amber-600 hover:bg-amber-100",
    accentDot: "bg-amber-500"
  },
  {
    cardBg: "bg-rose-50/70 hover:bg-rose-100/60 border-rose-300/80 hover:border-rose-500",
    accentBar: "bg-rose-500",
    titleColor: "text-rose-950",
    gradeBadge: "bg-rose-100 text-rose-800 border-rose-300",
    dateColor: "text-rose-700",
    categoryBadge: "bg-rose-200/60 text-rose-900 border-rose-300/70",
    iconBg: "text-rose-600 hover:bg-rose-100",
    accentDot: "bg-rose-500"
  },
  {
    cardBg: "bg-cyan-50/70 hover:bg-cyan-100/60 border-cyan-300/80 hover:border-cyan-500",
    accentBar: "bg-cyan-500",
    titleColor: "text-cyan-950",
    gradeBadge: "bg-cyan-100 text-cyan-800 border-cyan-300",
    dateColor: "text-cyan-700",
    categoryBadge: "bg-cyan-200/60 text-cyan-900 border-cyan-300/70",
    iconBg: "text-cyan-600 hover:bg-cyan-100",
    accentDot: "bg-cyan-500"
  },
  {
    cardBg: "bg-purple-50/70 hover:bg-purple-100/60 border-purple-300/80 hover:border-purple-500",
    accentBar: "bg-purple-500",
    titleColor: "text-purple-950",
    gradeBadge: "bg-purple-100 text-purple-800 border-purple-300",
    dateColor: "text-purple-700",
    categoryBadge: "bg-purple-200/60 text-purple-900 border-purple-300/70",
    iconBg: "text-purple-600 hover:bg-purple-100",
    accentDot: "bg-purple-500"
  },
  {
    cardBg: "bg-teal-50/70 hover:bg-teal-100/60 border-teal-300/80 hover:border-teal-500",
    accentBar: "bg-teal-500",
    titleColor: "text-teal-950",
    gradeBadge: "bg-teal-100 text-teal-800 border-teal-300",
    dateColor: "text-teal-700",
    categoryBadge: "bg-teal-200/60 text-teal-900 border-teal-300/70",
    iconBg: "text-teal-600 hover:bg-teal-100",
    accentDot: "bg-teal-500"
  },
  {
    cardBg: "bg-orange-50/70 hover:bg-orange-100/60 border-orange-300/80 hover:border-orange-500",
    accentBar: "bg-orange-500",
    titleColor: "text-orange-950",
    gradeBadge: "bg-orange-100 text-orange-800 border-orange-300",
    dateColor: "text-orange-800",
    categoryBadge: "bg-orange-200/60 text-orange-900 border-orange-300/70",
    iconBg: "text-orange-600 hover:bg-orange-100",
    accentDot: "bg-orange-500"
  }
];

const COMMON_SUBJECTS = [
  "தமிழ்",
  "இலக்கணம் (Grammar)",
  "தமிழ் இலக்கிய நயம்",
  "தமிழ் வினா விடை & மாதிரி வினாத்தாள்கள்",
  "30 நாள் பாடநெறி",
  "பொதுவானவை"
];

interface Props {
  onBack?: () => void;
  onMaterialsUpdated?: () => void;
}

export default function TamilAsanKnowledgeHub({ onBack, onMaterialsUpdated }: Props) {
  // Tabs: universal_links (Default), firebase_pdf, general_notes, rag_pipeline, voice_settings, ai_visuals
  const [activeTab, setActiveTab] = useState<'universal_links' | 'firebase_pdf' | 'general_notes' | 'rag_pipeline' | 'voice_settings' | 'ai_visuals'>('universal_links');
  const [visualStudioTargetNote, setVisualStudioTargetNote] = useState<TamilAsanKnowledgeItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Unified Links State (Ordered Links Hub)
  const [unifiedLinks, setUnifiedLinks] = useState<UnifiedLinkItem[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkGrade, setLinkGrade] = useState("அனைத்து வகுப்புகள்");
  const [linkSubject, setLinkSubject] = useState("தமிழ்");
  const [linkCategory, setLinkCategory] = useState("இலக்கணம்");
  const [isBulkLinkMode, setIsBulkLinkMode] = useState(false);
  const [bulkLinksText, setBulkLinksText] = useState("");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'youtube' | 'drive' | 'web' | 'pdf'>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Dynamic Categories and Grades
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [gradesList, setGradesList] = useState<string[]>(DEFAULT_GRADES);
  const [isManageCatsGradesOpen, setIsManageCatsGradesOpen] = useState(false);
  const [manageModalTab, setManageModalTab] = useState<'categories' | 'grades'>('categories');
  const [newCategoryModalInput, setNewCategoryModalInput] = useState("");
  const [newGradeModalInput, setNewGradeModalInput] = useState("");

  // Inline Quick Add state
  const [inlineAddType, setInlineAddType] = useState<'category' | 'grade' | null>(null);
  const [inlineAddContext, setInlineAddContext] = useState<'link' | 'pdf' | 'note' | null>(null);
  const [inlineAddText, setInlineAddText] = useState("");

  // Tab 2: Direct Firebase PDF Upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfGrades, setPdfGrades] = useState<string[]>(["தரம் 10", "தரம் 11"]);
  const [pdfSubject, setPdfSubject] = useState("தமிழ்");
  const [pdfCategory, setPdfCategory] = useState("இலக்கணம்");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pdfSearchQuery, setPdfSearchQuery] = useState("");
  const [pdfGradeFilter, setPdfGradeFilter] = useState<string>('all');
  const [pdfCategoryFilter, setPdfCategoryFilter] = useState<string>('all');

  // Tab 3: General Knowledge & Special Notes for Asan
  const [knowledgeList, setKnowledgeList] = useState<TamilAsanKnowledgeItem[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState("இலக்கணம்");
  const [noteGrade, setNoteGrade] = useState("அனைத்து வகுப்புகள்");
  const [noteContent, setNoteContent] = useState("");
  const [noteTopicsText, setNoteTopicsText] = useState("");
  const [qaList, setQaList] = useState<KnowledgeQAItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [selectedViewNote, setSelectedViewNote] = useState<TamilAsanKnowledgeItem | null>(null);
  const [expandedAccordionIds, setExpandedAccordionIds] = useState<Set<string>>(new Set());
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState("");
  const [knowledgeGradeFilter, setKnowledgeGradeFilter] = useState<string>("all");
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState<string>("all");

  // Tab 4: Teacher Voice & Welcome Greeting
  const [asanSettings, setAsanSettings] = useState<TamilAsanSettings>(DEFAULT_TAMIL_ASAN_SETTINGS);
  const [welcomeText, setWelcomeText] = useState("");
  const [welcomeAudioUrl, setWelcomeAudioUrl] = useState("");
  const [resolvedAudioPreview, setResolvedAudioPreview] = useState("");
  const [answerLengthSetting, setAnswerLengthSetting] = useState<'concise' | 'detailed'>('concise');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState("");
  const [voiceCloningEnabled, setVoiceCloningEnabled] = useState(true);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceUploadProgress, setVoiceUploadProgress] = useState(0);
  const [voiceUploadStatusText, setVoiceUploadStatusText] = useState("");
  const [lastUploadedVoiceInfo, setLastUploadedVoiceInfo] = useState<{
    name: string;
    size: string;
    time: string;
  } | null>(null);
  const [isVoiceSettingsSaved, setIsVoiceSettingsSaved] = useState(false);

  // PDF upload confirmation state
  const [lastUploadedPdfInfo, setLastUploadedPdfInfo] = useState<{
    title: string;
    order: number;
    time: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const stopVoiceTestRef = useRef<(() => void) | null>(null);

  const loadAllData = async () => {
    try {
      const [uLinks, kList, settings, cats, grs] = await Promise.all([
        getAllUnifiedLinks().catch(() => []),
        getTamilAsanKnowledge().catch(() => []),
        getTamilAsanSettings().catch(() => DEFAULT_TAMIL_ASAN_SETTINGS),
        getCustomKnowledgeCategories().catch(() => DEFAULT_CATEGORIES),
        getCustomKnowledgeGrades().catch(() => DEFAULT_GRADES)
      ]);
      setUnifiedLinks(uLinks);
      setKnowledgeList(kList);
      if (Array.isArray(cats) && cats.length > 0) {
        setCategoriesList(cats);
        if (!cats.includes(linkCategory)) setLinkCategory(cats[0]);
        if (!cats.includes(noteCategory)) setNoteCategory(cats[0]);
        if (!cats.includes(pdfCategory)) setPdfCategory(cats[0]);
      }
      if (Array.isArray(grs) && grs.length > 0) {
        setGradesList(grs);
      }
      if (settings) {
        setAsanSettings(settings);
        setWelcomeText(settings.welcomeVoiceText || DEFAULT_TAMIL_ASAN_SETTINGS.welcomeVoiceText);
        setWelcomeAudioUrl(settings.welcomeAudioUrl || "");
        setAnswerLengthSetting(settings.defaultAnswerLength || 'concise');
        setElevenLabsApiKey(settings.elevenLabsApiKey || "");
        setElevenLabsVoiceId(settings.elevenLabsVoiceId || "");
        setVoiceCloningEnabled(settings.voiceCloningEnabled ?? true);
      }
    } catch (e) {
      console.warn("Error loading data in TamilAsanKnowledgeHub:", e);
    }
  };

  const handleAddCustomCategory = async (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    if (categoriesList.includes(trimmed)) {
      showNotification("இந்தப் பிரிவு ஏற்கனவே பட்டியலில் உள்ளது!", 'info');
      return;
    }
    const updated = [...categoriesList, trimmed];
    setCategoriesList(updated);
    await saveCustomKnowledgeCategories(updated);
    showNotification(`புதிய பிரிவு "${trimmed}" வெற்றிகரமாகச் சேர்க்கப்பட்டது!`, 'success');
  };

  const handleDeleteCustomCategory = async (catName: string) => {
    if (categoriesList.length <= 1) {
      alert("குறைந்தது ஒரு பிரிவு இருக்க வேண்டும்!");
      return;
    }
    if (!window.confirm(`"${catName}" பிரிவை நீக்க விரும்புகிறீர்களா?`)) return;
    const updated = categoriesList.filter(c => c !== catName);
    setCategoriesList(updated);
    await saveCustomKnowledgeCategories(updated);
    if (linkCategory === catName) setLinkCategory(updated[0]);
    if (noteCategory === catName) setNoteCategory(updated[0]);
    if (pdfCategory === catName) setPdfCategory(updated[0]);
    showNotification(`பிரிவு "${catName}" நீக்கப்பட்டது.`, 'info');
  };

  const handleAddCustomGrade = async (gradeName: string) => {
    const trimmed = gradeName.trim();
    if (!trimmed) return;
    if (gradesList.includes(trimmed)) {
      showNotification("இந்த வகுப்பு ஏற்கனவே பட்டியலில் உள்ளது!", 'info');
      return;
    }
    const updated = [...gradesList, trimmed];
    setGradesList(updated);
    await saveCustomKnowledgeGrades(updated);
    showNotification(`புதிய வகுப்பு/தரம் "${trimmed}" வெற்றிகரமாகச் சேர்க்கப்பட்டது!`, 'success');
  };

  const handleDeleteCustomGrade = async (gradeName: string) => {
    if (gradesList.length <= 1) {
      alert("குறைந்தது ஒரு வகுப்பு இருக்க வேண்டும்!");
      return;
    }
    if (!window.confirm(`"${gradeName}" வகுப்பை நீக்க விரும்புகிறீர்களா?`)) return;
    const updated = gradesList.filter(g => g !== gradeName);
    setGradesList(updated);
    await saveCustomKnowledgeGrades(updated);
    if (linkGrade === gradeName) setLinkGrade(updated[0]);
    if (noteGrade === gradeName) setNoteGrade(updated[0]);
    showNotification(`வகுப்பு "${gradeName}" நீக்கப்பட்டது.`, 'info');
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    let active = true;
    if (!welcomeAudioUrl) {
      setResolvedAudioPreview("");
      return;
    }
    resolveMediaUrl(welcomeAudioUrl).then(url => {
      if (active) setResolvedAudioPreview(url);
    }).catch(() => {
      if (active) setResolvedAudioPreview(welcomeAudioUrl);
    });
    return () => { active = false; };
  }, [welcomeAudioUrl]);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  // -------------------------------------------------------------
  // Link Helper Functions
  // -------------------------------------------------------------
  const detectLinkType = (rawUrl: string): 'youtube' | 'drive' | 'web' | 'pdf' | 'other' => {
    if (!rawUrl) return 'other';
    const u = rawUrl.toLowerCase().trim();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('drive.google.com')) return 'drive';
    if (u.includes('.pdf') || u.includes('firebasestorage.googleapis.com')) return 'pdf';
    if (u.startsWith('http://') || u.startsWith('https://')) return 'web';
    return 'other';
  };

  const formatUrlIfDrive = (rawUrl: string): string => {
    if (!rawUrl) return "";
    const trimmed = rawUrl.trim();
    if (trimmed.includes('drive.google.com')) {
      const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return trimmed;
  };

  const detectedType = detectLinkType(linkUrl);

  // -------------------------------------------------------------
  // Add / Edit Single Unified Link
  // -------------------------------------------------------------
  const handleSaveUnifiedLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkUrl.trim()) {
      alert("தயவுசெய்து ஒரு இணைப்பை (Link URL) உள்ளிடவும்!");
      return;
    }

    const cleanedUrl = formatUrlIfDrive(linkUrl.trim());
    const type = detectLinkType(cleanedUrl);
    
    // Auto-derive title if empty
    let finalTitle = linkTitle.trim();
    if (!finalTitle) {
      if (type === 'youtube') finalTitle = `YouTube வீடியோ வகுப்பு #${unifiedLinks.length + 1}`;
      else if (type === 'drive') finalTitle = `Google Drive பாடக் குறிப்பு #${unifiedLinks.length + 1}`;
      else if (type === 'pdf') finalTitle = `PDF ஆவணக் குறிப்பு #${unifiedLinks.length + 1}`;
      else finalTitle = `இணையதளப் பாடம் #${unifiedLinks.length + 1}`;
    }

    setIsLoading(true);
    try {
      let updatedList: UnifiedLinkItem[] = [];

      if (editingLinkId) {
        // Edit existing link while keeping its order intact
        updatedList = unifiedLinks.map(item => {
          if (item.id === editingLinkId) {
            return {
              ...item,
              title: finalTitle,
              url: cleanedUrl,
              type,
              grade: linkGrade,
              subject: linkSubject,
              category: linkCategory
            };
          }
          return item;
        });
        showNotification("இணைப்பு வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது!", 'success');
        setEditingLinkId(null);
      } else {
        // Add as next item in strict order
        const nextOrder = unifiedLinks.length > 0 
          ? Math.max(...unifiedLinks.map(l => Number(l.order) || 0)) + 1 
          : 1;

        const newItem: UnifiedLinkItem = {
          id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          order: nextOrder,
          title: finalTitle,
          url: cleanedUrl,
          type,
          grade: linkGrade,
          subject: linkSubject,
          category: linkCategory,
          createdAt: Date.now()
        };

        updatedList = [...unifiedLinks, newItem];
        showNotification(`வரிசை #${nextOrder}-ல் இணைப்பு வெற்றிகரமாக இணைக்கப்பட்டது!`, 'success');
      }

      // Re-sort strictly by order
      updatedList.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

      // Save strictly to unified links storage (AI Tamil Asan Knowledge Hub)
      // This keeps it completely separate from Student Portal Course Materials!
      await saveAllUnifiedLinks(updatedList);
      setUnifiedLinks(updatedList);

      // Reset input fields so user can immediately paste the NEXT link
      setLinkUrl("");
      setLinkTitle("");
      onMaterialsUpdated?.();
    } catch (err: any) {
      console.error("Save unified link error:", err);
      showNotification(`பிழை: ${err?.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Bulk Add Links in Consecutive Order
  // -------------------------------------------------------------
  const handleBulkAddLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkLinksText.trim()) {
      alert("தயவுசெய்து இணைப்புகளை உள்ளிடவும் (ஒரு வரியில் ஒன்று)!");
      return;
    }

    setIsLoading(true);
    try {
      const lines = bulkLinksText.split('\n').map(l => l.trim()).filter(Boolean);
      let nextOrder = unifiedLinks.length > 0 
        ? Math.max(...unifiedLinks.map(l => Number(l.order) || 0)) + 1 
        : 1;

      const newItems: UnifiedLinkItem[] = [];

      for (const line of lines) {
        let title = "";
        let url = "";

        if (line.includes('http://') || line.includes('https://')) {
          const parts = line.split(/https?:\/\//);
          if (parts[0] && parts[0].trim()) {
            title = parts[0].replace(/[-–—:|]+$/, '').trim();
            url = 'https://' + parts[1].trim();
          } else {
            url = line;
          }
        } else {
          continue; // Skip lines without links
        }

        const formatted = formatUrlIfDrive(url);
        const type = detectLinkType(formatted);

        if (!title) {
          if (type === 'youtube') title = `YouTube வகுப்பு #${nextOrder}`;
          else if (type === 'drive') title = `Google Drive குறிப்பு #${nextOrder}`;
          else if (type === 'pdf') title = `PDF ஆவணம் #${nextOrder}`;
          else title = `இணையதளப் பாடம் #${nextOrder}`;
        }

        newItems.push({
          id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          order: nextOrder++,
          title,
          url: formatted,
          type,
          grade: linkGrade,
          subject: linkSubject,
          category: linkCategory,
          createdAt: Date.now()
        });
      }

      if (newItems.length === 0) {
        alert("சரியான இணைய இணைப்புகள் எதுவும் கண்டுபிடிக்கப்படவில்லை!");
        setIsLoading(false);
        return;
      }

      const combined = [...unifiedLinks, ...newItems];
      combined.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

      await saveAllUnifiedLinks(combined);
      setUnifiedLinks(combined);
      setBulkLinksText("");
      setIsBulkLinkMode(false);
      showNotification(`வெற்றி! ${newItems.length} புதிய இணைப்புகள் அடுத்தடுத்த வரிசைகளில் சேர்க்கப்பட்டன!`, 'success');
      onMaterialsUpdated?.();
    } catch (err: any) {
      showNotification(`பிழை: ${err?.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Order Controls: Move Up & Move Down
  // -------------------------------------------------------------
  const handleMoveUp = async (index: number) => {
    if (index <= 0 || index >= unifiedLinks.length) return;
    const current = [...unifiedLinks];
    
    // Swap items
    const temp = current[index];
    current[index] = current[index - 1];
    current[index - 1] = temp;

    // Normalize order index
    const reordered = current.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    setUnifiedLinks(reordered);
    await saveAllUnifiedLinks(reordered);
    showNotification("வரிசை மாற்றப்பட்டது!", 'info');
  };

  const handleMoveDown = async (index: number) => {
    if (index < 0 || index >= unifiedLinks.length - 1) return;
    const current = [...unifiedLinks];

    // Swap items
    const temp = current[index];
    current[index] = current[index + 1];
    current[index + 1] = temp;

    // Normalize order index
    const reordered = current.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    setUnifiedLinks(reordered);
    await saveAllUnifiedLinks(reordered);
    showNotification("வரிசை மாற்றப்பட்டது!", 'info');
  };

  // -------------------------------------------------------------
  // Delete Unified Link - Strict Manual Admin Deletion (Database & Local)
  // -------------------------------------------------------------
  const handleDeleteUnifiedLink = async (id: string) => {
    if (!window.confirm("இந்த இணைப்பை நிரந்தரமாக நீக்க விரும்புகிறீர்களா? (இணைப்பு உங்கள் சாதனத்திலிருந்தும், தரவுத்தளத்திலிருந்தும் முழுமையாக நீக்கப்படும்)")) return;
    setIsLoading(true);
    try {
      const reindexed = await deleteUnifiedLink(id);
      setUnifiedLinks(reindexed);
      showNotification("இணைப்பு தரவுத்தளத்திலிருந்து முழுமையாக நீக்கப்பட்டு வரிசை சீரமைக்கப்பட்டது! ✓", 'info');
      onMaterialsUpdated?.();
    } catch (e: any) {
      showNotification(`நீக்குவதில் பிழை: ${e?.message || e}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // -------------------------------------------------------------
  // Filtering & Sorting of Unified Links
  // -------------------------------------------------------------
  const filteredLinks = unifiedLinks.filter(item => {
    if (selectedTypeFilter !== 'all' && item.type !== selectedTypeFilter) return false;
    if (selectedGradeFilter !== 'all' && item.grade !== selectedGradeFilter) return false;
    if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
    if (linkSearchQuery.trim()) {
      const q = linkSearchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchUrl = item.url?.toLowerCase().includes(q);
      const matchSub = item.subject?.toLowerCase().includes(q);
      const matchGrade = item.grade?.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchUrl && !matchSub && !matchGrade && !matchCat) return false;
    }
    return true;
  });

  // -------------------------------------------------------------
  // Tab 2: Direct Firebase PDF Upload Handler
  // -------------------------------------------------------------
  const handleUploadPdfToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      alert("தயவுசெய்து ஒரு PDF கோப்பைத் தேர்ந்தெடுக்கவும்!");
      return;
    }
    if (!pdfTitle.trim()) {
      alert("குறிப்பின் தலைப்பை உள்ளிடவும்!");
      return;
    }

    setIsLoading(true);
    setUploadProgress(15);
    try {
      const cleanFileName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `course-materials/${Date.now()}_${cleanFileName}`;

      const downloadUrl = await uploadFileToFirebaseStorage(pdfFile, storagePath, (percent) => {
        setUploadProgress(Math.max(20, Math.min(95, percent)));
      });

      setUploadProgress(100);

      // Add to unified links
      const nextOrder = unifiedLinks.length > 0 
        ? Math.max(...unifiedLinks.map(l => Number(l.order) || 0)) + 1 
        : 1;

      const newUnifiedItem: UnifiedLinkItem = {
        id: `pdf_${Date.now()}`,
        order: nextOrder,
        title: pdfTitle.trim(),
        url: downloadUrl,
        type: 'pdf',
        grade: pdfGrades.join(', '),
        subject: pdfSubject,
        category: pdfCategory,
        createdAt: Date.now()
      };

      const updatedUnified = [...unifiedLinks, newUnifiedItem];
      await saveAllUnifiedLinks(updatedUnified);
      setUnifiedLinks(updatedUnified);

      setLastUploadedPdfInfo({
        title: pdfTitle.trim(),
        order: nextOrder,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      showNotification(`வெற்றி! PDF கோப்பு முழுமையாக பதிவேற்றம் செய்யப்பட்டு வரிசை #${nextOrder}-ல் சேர்க்கப்பட்டது! ✓`, 'success');
      setPdfFile(null);
      setPdfTitle("");
      onMaterialsUpdated?.();
    } catch (err: any) {
      showNotification(`பதிவேற்றத்தில் பிழை: ${err?.message || err}`, 'error');
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  // -------------------------------------------------------------
  // Tab 3: Save & Edit General Notes / Grounding Rules
  // -------------------------------------------------------------
  const handleAddQA = () => {
    if (!newQuestion.trim()) {
      showNotification("தயவுசெய்து வினாவை (Question) உள்ளிடவும்!", 'info');
      return;
    }
    const newEntry: KnowledgeQAItem = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: newQuestion.trim(),
      answer: newAnswer.trim()
    };
    setQaList(prev => [...prev, newEntry]);
    setNewQuestion("");
    setNewAnswer("");
    showNotification("மாதிரி வினா & விடை சேர்க்கப்பட்டது!", 'info');
  };

  const handleRemoveQA = (indexToRemove: number) => {
    setQaList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEditKnowledge = (item: TamilAsanKnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setNoteTitle(item.title);
    setNoteCategory(item.category || categoriesList[0] || "இலக்கணம்");
    setNoteGrade(item.grade || "அனைத்து வகுப்புகள்");
    setNoteContent(item.content || "");
    setNoteTopicsText(Array.isArray(item.topics) ? item.topics.join(", ") : "");
    if (Array.isArray(item.qaPairs) && item.qaPairs.length > 0) {
      setQaList(item.qaPairs);
    } else if (Array.isArray(item.expectedQuestions) && item.expectedQuestions.length > 0) {
      setQaList(item.expectedQuestions.map((q, idx) => ({
        id: `qa_${idx}`,
        question: q,
        answer: ""
      })));
    } else {
      setQaList([]);
    }
    setNewQuestion("");
    setNewAnswer("");
    setSelectedViewNote(null);
  };

  const handleCancelEditKnowledge = () => {
    setEditingKnowledgeId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteTopicsText("");
    setQaList([]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert("தலைப்பு மற்றும் விரிவான விளக்க உரையினை உள்ளிடவும்!");
      return;
    }

    setIsLoading(true);
    try {
      const current = await getTamilAsanKnowledge();

      const parsedTopics = noteTopicsText
        .split(/[,\n]/)
        .map(t => t.trim())
        .filter(Boolean);

      const parsedQuestions = qaList.map(q => q.question.trim()).filter(Boolean);
      const cleanQaPairs: KnowledgeQAItem[] = qaList.map(q => ({
        id: q.id || `qa_${Date.now()}`,
        question: q.question.trim(),
        answer: (q.answer || '').trim()
      }));

      if (editingKnowledgeId) {
        const updated = current.map(item => {
          if (item.id === editingKnowledgeId) {
            return {
              ...item,
              title: noteTitle.trim(),
              category: noteCategory,
              grade: noteGrade,
              topics: parsedTopics,
              expectedQuestions: parsedQuestions,
              qaPairs: cleanQaPairs,
              content: noteContent.trim(),
              updatedAt: Date.now()
            };
          }
          return item;
        });
        await saveTamilAsanKnowledge(updated);
        setKnowledgeList(updated);
        setEditingKnowledgeId(null);
        showNotification("பாடக்குறிப்பு & மாதிரி வினா-விடைகள் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது! ✓", 'success');
      } else {
        const newItem: TamilAsanKnowledgeItem = {
          id: `note_${Date.now()}`,
          title: noteTitle.trim(),
          category: noteCategory,
          grade: noteGrade,
          topics: parsedTopics,
          expectedQuestions: parsedQuestions,
          qaPairs: cleanQaPairs,
          content: noteContent.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const updated = [newItem, ...current];
        await saveTamilAsanKnowledge(updated);
        setKnowledgeList(updated);
        showNotification("புதிய பாடக்குறிப்பு & மாதிரி வினா-விடைகள் தமிழ் ஆசான் நினைவகத்தில் சேர்க்கப்பட்டது! ✓", 'success');
      }

      setNoteTitle("");
      setNoteContent("");
      setNoteTopicsText("");
      setQaList([]);
      setNewQuestion("");
      setNewAnswer("");
    } catch (e: any) {
      showNotification(`பிழை: ${e?.message || e}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!window.confirm("இந்தக் குறிப்பை நிரந்தரமாக நீக்க விரும்புகிறீர்களா? (இக்குறிப்பு உங்கள் சாதனத்திலிருந்தும், தரவுத்தளத்திலிருந்தும் (Database) முழுமையாக நீக்கப்படும்)")) return;
    setIsLoading(true);
    try {
      const updated = await deleteTamilAsanKnowledge(id);
      setKnowledgeList(updated);
      if (editingKnowledgeId === id) {
        handleCancelEditKnowledge();
      }
      showNotification("பாடக்குறிப்பு தரவுத்தளத்திலிருந்தும் (Database) முழுமையாக நீக்கப்பட்டது! ✓", 'info');
    } catch (e: any) {
      showNotification(`நீக்குவதில் பிழை: ${e?.message || e}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Tab 4: Voice Recording, Upload & Settings Handlers
  // -------------------------------------------------------------
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert("மைக்ரோஃபோன் அணுகல் அனுமதி பெற முடியவில்லை: " + (err?.message || "தயவுசெய்து அனுமதி வழங்கவும்."));
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleUploadRecordedVoice = async () => {
    if (!recordedAudioBlob) return;
    setIsUploadingVoice(true);
    setVoiceUploadProgress(10);
    setVoiceUploadStatusText("பதிவு செய்யப்பட்ட குரல் படிக்கப்படுகிறது...");
    setIsVoiceSettingsSaved(false);
    try {
      const fileName = `teacher_recorded_voice_${Date.now()}.webm`;
      const sizeKB = (recordedAudioBlob.size / 1024).toFixed(0) + " KB";
      const downloadUrl = await uploadFileToFirebaseStorage(
        recordedAudioBlob, 
        `tamil_asan_voices/${fileName}`,
        (percent) => {
          setVoiceUploadProgress(percent);
          if (percent < 45) {
            setVoiceUploadStatusText(`குரல் கோப்பு தயார் செய்யப்படுகிறது... (${percent}%)`);
          } else if (percent < 90) {
            setVoiceUploadStatusText(`பாதுகாப்பாகக் கிளவுடில் சேமிக்கப்படுகிறது... (${percent}%)`);
          } else {
            setVoiceUploadStatusText(`முழுமையடைகிறது... (${percent}%)`);
          }
        }
      );
      setVoiceUploadProgress(100);
      setVoiceUploadStatusText("குரல் முழுமையாகப் பதிவேற்றப்பட்டது! ✓");
      setWelcomeAudioUrl(downloadUrl);

      const info = {
        name: "நேரடி குரல் பதிவு (Microphone Record)",
        size: sizeKB,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setLastUploadedVoiceInfo(info);

      // Auto-save settings immediately
      const updated: TamilAsanSettings = {
        ...asanSettings,
        welcomeVoiceText: welcomeText,
        welcomeAudioUrl: downloadUrl.trim(),
        defaultAnswerLength: answerLengthSetting,
        elevenLabsApiKey: elevenLabsApiKey.trim(),
        elevenLabsVoiceId: elevenLabsVoiceId.trim(),
        voiceCloningEnabled: voiceCloningEnabled,
        voiceProvider: (elevenLabsApiKey.trim() && elevenLabsVoiceId.trim()) ? 'elevenlabs' : 'browser'
      };
      await saveTamilAsanSettings(updated);
      setAsanSettings(updated);
      setIsVoiceSettingsSaved(true);

      showNotification("ஆசானின் நேரடி குரல் பதிவு முழுமையாகப் பதிவேற்றப்பட்டு சேமிக்கப்பட்டது! ✓", "success");
    } catch (err: any) {
      console.error("Upload recorded voice error:", err);
      showNotification("குரல் பதிவேற்றம் தோல்வியடைந்தது: " + (err?.message || err), "error");
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVoice(true);
    setVoiceUploadProgress(10);
    setVoiceUploadStatusText("கோப்பு படிக்கப்படுகிறது... (Reading audio file)");
    setIsVoiceSettingsSaved(false);
    try {
      const extension = file.name.split('.').pop() || 'mp3';
      const fileName = `teacher_voice_file_${Date.now()}.${extension}`;
      const fileSizeMB = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(2) + " MB" 
        : (file.size / 1024).toFixed(0) + " KB";

      const downloadUrl = await uploadFileToFirebaseStorage(
        file,
        `tamil_asan_voices/${fileName}`,
        (percent) => {
          setVoiceUploadProgress(percent);
          if (percent < 45) {
            setVoiceUploadStatusText(`கோப்பு என்கோடிங் செய்யப்படுகிறது... (${percent}%)`);
          } else if (percent < 90) {
            setVoiceUploadStatusText(`கிளவுடில் பாதுகாப்பாகச் சேமிக்கப்படுகிறது... (${percent}%)`);
          } else {
            setVoiceUploadStatusText(`முழுமையடைகிறது... (${percent}%)`);
          }
        }
      );

      setVoiceUploadProgress(100);
      setVoiceUploadStatusText("கோப்பு முழுமையாகப் பதிவேற்றப்பட்டது! ✓");
      setWelcomeAudioUrl(downloadUrl);

      const info = {
        name: file.name,
        size: fileSizeMB,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setLastUploadedVoiceInfo(info);

      // Auto-save settings immediately
      const updated: TamilAsanSettings = {
        ...asanSettings,
        welcomeVoiceText: welcomeText,
        welcomeAudioUrl: downloadUrl.trim(),
        defaultAnswerLength: answerLengthSetting,
        elevenLabsApiKey: elevenLabsApiKey.trim(),
        elevenLabsVoiceId: elevenLabsVoiceId.trim(),
        voiceCloningEnabled: voiceCloningEnabled,
        voiceProvider: (elevenLabsApiKey.trim() && elevenLabsVoiceId.trim()) ? 'elevenlabs' : 'browser'
      };
      await saveTamilAsanSettings(updated);
      setAsanSettings(updated);
      setIsVoiceSettingsSaved(true);

      showNotification(`கோப்பு முழுவதும் வெற்றிகரமாகப் பதிவேற்றப்பட்டு சேமிக்கப்பட்டது! (${file.name} - ${fileSizeMB})`, "success");
    } catch (err: any) {
      console.error("Upload audio file error:", err);
      showNotification("ஆடியோ பதிவேற்றம் தோல்வியடைந்தது: " + (err?.message || err), "error");
    } finally {
      setIsUploadingVoice(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };

  const handleSaveVoiceSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const updated: TamilAsanSettings = {
        ...asanSettings,
        welcomeVoiceText: welcomeText,
        welcomeAudioUrl: welcomeAudioUrl.trim(),
        defaultAnswerLength: answerLengthSetting,
        elevenLabsApiKey: elevenLabsApiKey.trim(),
        elevenLabsVoiceId: elevenLabsVoiceId.trim(),
        voiceCloningEnabled: voiceCloningEnabled,
        voiceProvider: (elevenLabsApiKey.trim() && elevenLabsVoiceId.trim()) ? 'elevenlabs' : 'browser'
      };
      await saveTamilAsanSettings(updated);
      setAsanSettings(updated);
      showNotification("ஆசானின் குரல் மற்றும் வரவேற்பு அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!", "success");
    } catch (err: any) {
      console.error("Save voice settings error:", err);
      showNotification("அமைப்புகளை சேமிப்பதில் பிழை: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWelcomeVoice = async () => {
    if (stopVoiceTestRef.current) {
      stopVoiceTestRef.current();
      stopVoiceTestRef.current = null;
    }
    if (isTestingVoice) {
      setIsTestingVoice(false);
      return;
    }

    const testSettings: TamilAsanSettings = {
      ...asanSettings,
      welcomeVoiceText: welcomeText,
      welcomeAudioUrl: welcomeAudioUrl.trim(),
      elevenLabsApiKey: elevenLabsApiKey.trim(),
      elevenLabsVoiceId: elevenLabsVoiceId.trim(),
      voiceCloningEnabled: voiceCloningEnabled,
      voiceProvider: (elevenLabsApiKey.trim() && elevenLabsVoiceId.trim()) ? 'elevenlabs' : 'browser'
    };

    stopVoiceTestRef.current = await playTeacherVoice(
      welcomeText,
      testSettings,
      () => setIsTestingVoice(true),
      () => setIsTestingVoice(false),
      welcomeAudioUrl.trim() || undefined
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-red-950 to-amber-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Link2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-amber-100">
                  AI தமிழ் ஆசான் அறிவுத்தளம் & லிங்க் மையம்
                </h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  வரிசைப்படி • Ordered RAG
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Google Drive, YouTube, Web Links, PDF என எந்தவொரு இணைப்பையும் இங்கே ஒரே இடத்தில் சேர்க்கலாம். நீங்கள் சேர்க்க சேர்க்க அனைத்தும் வரிசையாக (#1, #2, #3...) தானாக அடுக்கப்படும்!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsManageCatsGradesOpen(true);
                setManageModalTab('categories');
              }}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="பிரிவுகள் மற்றும் வகுப்புகளை நிர்வகிக்க"
            >
              <Tag size={15} />
              <span className="hidden sm:inline">பிரிவுகள் & வகுப்புகள்</span>
            </button>
            <div className="bg-white/10 px-4 py-2 rounded-2xl text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">மொத்த இணைப்புகள்</p>
              <p className="text-xl font-black text-amber-300 leading-tight">{unifiedLinks.length}</p>
            </div>
            <button
              onClick={loadAllData}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-amber-200 transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Dual Knowledge Notice */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-3 flex items-start gap-2.5 text-amber-200">
            <span className="text-base">🔒</span>
            <p className="leading-relaxed">
              <strong>மாணவர் போர்டலில் காட்டப்படாது:</strong> இங்கு நீங்கள் சேர்க்கும் லிங்க்குகள் மற்றும் PDF-கள் AI தமிழ் ஆசானுக்கான வழிகாட்டலாக மட்டுமே இருக்கும். மாணவர்களின் நேரடி கோர்ஸ் மெட்டீரியல் பதிவிறக்கப் பட்டியலில் இவை தோன்றாது.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-200">
            <span className="text-base">🎯</span>
            <p className="leading-relaxed">
              <strong>இரட்டை அறிவு இணைப்பு (Dual Reference):</strong> AI தமிழ் ஆசான், Course Materials பக்கத்தில் மாணவர்களுக்காக உள்ள பாடக்குறிப்புகளையும், இங்குள்ள லிங்க்குகளையும் ஒன்றாகக் கற்றுக்கொண்டு மாணவர்களுக்கு துல்லியமாகப் பதிலளிக்கும்.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('universal_links')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'universal_links'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Link2 size={16} />
          <span>🔗 அனைத்து லிங்க்குகள் (Google Drive, YouTube, Web - வரிசைப்படி)</span>
        </button>

        <button
          onClick={() => setActiveTab('firebase_pdf')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'firebase_pdf'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <UploadCloud size={16} />
          <span>கணினியிலிருந்து நேரடி PDF பதிவேற்றம்</span>
        </button>

        <button
          onClick={() => setActiveTab('general_notes')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'general_notes'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <BookOpen size={16} />
          <span>ஆசான் விசேட பொதுக் குறிப்புகள்</span>
        </button>

        <button
          onClick={() => setActiveTab('rag_pipeline')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rag_pipeline'
              ? 'bg-gradient-to-r from-indigo-800 to-slate-900 text-white shadow-md ring-2 ring-indigo-400'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Cpu size={16} className="text-amber-400" />
          <span>⚡ RAG கட்டமைப்பு (4-Step Pipeline & 3 Guarantees)</span>
        </button>

        <button
          onClick={() => setActiveTab('voice_settings')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'voice_settings'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Volume2 size={16} />
          <span>🎙️ ஆசானின் குரல் & வரவேற்பு உரை (Teacher Voice)</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_visuals')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'ai_visuals'
              ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md ring-2 ring-rose-300'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Sparkles size={16} className="text-amber-400" />
          <span>🎨 AI பாடப் படங்கள் & வாட்டர்மார்க் (AI Visuals)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNIVERSAL LINKS MANAGER (ORDERED - PRIMARY VIEW)                   */}
      {/* ========================================================================= */}
      {activeTab === 'universal_links' && (
        <div className="space-y-6">
          {/* Main Add Link Input Panel */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-sm font-black">
                    {editingLinkId ? "✏️" : `#${unifiedLinks.length + 1}`}
                  </span>
                  {editingLinkId ? "இணைப்பைத் திருத்துதல் (Edit Link)" : "புதிய லிங்க் சேர்க்க (Add Link)"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Google Drive, YouTube வீடியோ/சேனல், PDF, அல்லது இணையதள லிங்க்கை ஒட்டினால் போதும்; தானாகவே வரிசைப்படி சேமிக்கப்படும்!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBulkLinkMode(!isBulkLinkMode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center ${
                  isBulkLinkMode 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {isBulkLinkMode ? <X size={14} /> : <Plus size={14} />}
                <span>{isBulkLinkMode ? "ஒற்றை லிங்க் முறைக்கு மாறு" : "ஒரே நேரத்தில் பல லிங்க்குகள் ஒட்டுக (Bulk Add)"}</span>
              </button>
            </div>

            {/* Mode A: Single Link Add Form */}
            {!isBulkLinkMode ? (
              <form onSubmit={handleSaveUnifiedLink} className="space-y-5">
                {/* Link URL Input with Realtime Type Detector Badge */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      இணைப்பு (Google Drive, YouTube, Web URL, PDF) <span className="text-red-500">*</span>
                    </label>
                    {linkUrl.trim() && (
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                        detectedType === 'youtube' ? 'bg-red-100 text-red-700 border border-red-200' :
                        detectedType === 'drive' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        detectedType === 'pdf' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {detectedType === 'youtube' && <><Youtube size={12} /> YouTube கண்டறியப்பட்டது</>}
                        {detectedType === 'drive' && <><Link2 size={12} /> Google Drive கண்டறியப்பட்டது (Auto-preview)</>}
                        {detectedType === 'pdf' && <><FileText size={12} /> PDF ஆவணம் கண்டறியப்பட்டது</>}
                        {detectedType === 'web' && <><Globe size={12} /> வலைத்தள இணைப்பு கண்டறியப்பட்டது</>}
                        {detectedType === 'other' && <>🌐 நேரடி இணைப்பு</>}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={linkUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinkUrl(val);
                        // Auto-fill title if empty
                        if (!linkTitle && val) {
                          const t = detectLinkType(val);
                          if (t === 'youtube') setLinkTitle(`YouTube வகுப்பு #${unifiedLinks.length + 1}`);
                          else if (t === 'drive') setLinkTitle(`Google Drive குறிப்பு #${unifiedLinks.length + 1}`);
                          else if (t === 'pdf') setLinkTitle(`PDF ஆவணக் குறிப்பு #${unifiedLinks.length + 1}`);
                        }
                      }}
                      placeholder="https://drive.google.com/... அல்லது https://youtube.com/... அல்லது https://www.agaramdhines.lk/..."
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Title & Grade & Category & Subject Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Title */}
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      குறிப்பு / வீடியோவின் தலைப்பு (Title)
                    </label>
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="எ.கா: தரம் 11 - தமிழ் வினாத்தாள் விளக்கம் 2026"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                    />
                  </div>

                  {/* Grade with Quick Add */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">வகுப்பு / தரம் (Grade)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('grade');
                          setInlineAddContext('link');
                          setInlineAddText("");
                        }}
                        className="text-[10px] font-black text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={12} /> புதிய வகுப்பு
                      </button>
                    </div>
                    {inlineAddType === 'grade' && inlineAddContext === 'link' ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={inlineAddText}
                          onChange={(e) => setInlineAddText(e.target.value)}
                          placeholder="எ.கா: தரம் 05..."
                          className="flex-1 bg-white border-2 border-red-500 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (inlineAddText.trim()) {
                                handleAddCustomGrade(inlineAddText);
                                setLinkGrade(inlineAddText.trim());
                                setInlineAddType(null);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inlineAddText.trim()) {
                              handleAddCustomGrade(inlineAddText);
                              setLinkGrade(inlineAddText.trim());
                              setInlineAddType(null);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 cursor-pointer"
                        >
                          சேர்
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineAddType(null)}
                          className="px-2 py-1.5 bg-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={linkGrade}
                        onChange={(e) => setLinkGrade(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                      >
                        {gradesList.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Category with Quick Add */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">பாடப்பிரிவு வகை (Category)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('category');
                          setInlineAddContext('link');
                          setInlineAddText("");
                        }}
                        className="text-[10px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={12} /> புதிய பிரிவு
                      </button>
                    </div>
                    {inlineAddType === 'category' && inlineAddContext === 'link' ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={inlineAddText}
                          onChange={(e) => setInlineAddText(e.target.value)}
                          placeholder="எ.கா: சிறுகதை நயம்..."
                          className="flex-1 bg-white border-2 border-amber-500 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (inlineAddText.trim()) {
                                handleAddCustomCategory(inlineAddText);
                                setLinkCategory(inlineAddText.trim());
                                setInlineAddType(null);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inlineAddText.trim()) {
                              handleAddCustomCategory(inlineAddText);
                              setLinkCategory(inlineAddText.trim());
                              setInlineAddType(null);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 cursor-pointer"
                        >
                          சேர்
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineAddType(null)}
                          className="px-2 py-1.5 bg-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={linkCategory}
                        onChange={(e) => setLinkCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                      >
                        {categoriesList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Subject */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">பாடம் / துணைப்பிரிவு</label>
                    <select
                      value={linkSubject}
                      onChange={(e) => setLinkSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                    >
                      {COMMON_SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit / Add Button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !linkUrl.trim()}
                    className="flex-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg shadow-red-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {editingLinkId ? <Save size={18} /> : <Plus size={18} />}
                    <span>
                      {isLoading 
                        ? "சேமிக்கப்படுகிறது..." 
                        : editingLinkId 
                          ? "மாற்றங்களைச் சேமிக்கவும்" 
                          : `வரிசை #${unifiedLinks.length + 1}-ல் இந்த லிங்க்கைச் சேர்க்க (Add Link)`}
                    </span>
                  </button>

                  {editingLinkId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLinkId(null);
                        setLinkUrl("");
                        setLinkTitle("");
                      }}
                      className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      ரத்து செய்
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Mode B: Bulk Paste Links Form */
              <form onSubmit={handleBulkAddLinks} className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  💡 <strong>மொத்தமாகச் சேர்க்கும் வழிமுறை:</strong> கீழே உள்ள கட்டத்தில் ஒவ்வொரு வரியிலும் ஒரு லிங்க்கை ஒட்டவும். 
                  விருப்பப்பட்டால் <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-amber-300">தலைப்பு - https://...</code> என்ற வடிவிலும் ஒட்டலாம். அனைத்தும் அடுத்தடுத்த வரிசைகளில் தானாகச் சேர்க்கப்படும்.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    இணைப்புகளின் பட்டியல் (ஒரு வரிக்கு ஒரு இணைப்பு) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={bulkLinksText}
                    onChange={(e) => setBulkLinksText(e.target.value)}
                    placeholder={`https://drive.google.com/file/d/1...\nhttps://www.youtube.com/watch?v=...\nதரம் 11 வினாத்தாள் - https://drive.google.com/...`}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-2xl p-4 text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">வகுப்பு / தரம்</label>
                    <select
                      value={linkGrade}
                      onChange={(e) => setLinkGrade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {gradesList.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">பாடப்பிரிவு வகை (Category)</label>
                    <select
                      value={linkCategory}
                      onChange={(e) => setLinkCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {categoriesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">பாடம் / துணைப்பிரிவு</label>
                    <select
                      value={linkSubject}
                      onChange={(e) => setLinkSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {COMMON_SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !bulkLinksText.trim()}
                  className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Plus size={18} />
                  <span>{isLoading ? "சேர்க்கப்படுகிறது..." : "அனைத்து இணைப்புகளையும் வரிசைப்படி சேர்க்கவும்"}</span>
                </button>
              </form>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ORDERED LINKS TABLE / LIST VIEW                                           */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            {/* Header & Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Layers className="text-red-600" size={20} />
                  <span>இணைக்கப்பட்ட அனைத்து லிங்க்குகள் (வரிசைப்படி - Ordered Links)</span>
                  <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                    {filteredLinks.length} / {unifiedLinks.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  மேல் மற்றும் கீழ் அம்புக்குறிகளைப் பயன்படுத்தி (⬆️ / ⬇️) எப்போது வேண்டுமானாலும் வரிசையை மாற்றி அமைக்கலாம்.
                </p>
              </div>

              {/* Quick Type Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'all', label: 'அனைத்தும்', icon: Layers },
                  { key: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-600' },
                  { key: 'drive', label: 'Google Drive', icon: Link2, color: 'text-blue-600' },
                  { key: 'web', label: 'வலைத்தளம்', icon: Globe, color: 'text-emerald-600' },
                  { key: 'pdf', label: 'PDF', icon: FileText, color: 'text-amber-600' }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSel = selectedTypeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedTypeFilter(tab.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSel 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon size={13} className={tab.color} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  placeholder="தலைப்பு, லிங்க் அல்லது பிரிவு கொண்டு தேட..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500"
                >
                  <option value="all">அனைத்து வகுப்புகள் (All Grades)</option>
                  {gradesList.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500"
                >
                  <option value="all">அனைத்துப் பிரிவுகள் (All Categories)</option>
                  {categoriesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* The Ordered Links List */}
            {filteredLinks.length === 0 ? (
              <div className="py-16 px-4 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Link2 size={28} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">இணைப்புகள் எதுவும் இல்லை</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  தேர்ந்தெடுக்கப்பட்ட வடிகட்டிகளுக்கு ஏற்ப இணைப்புகள் இல்லை அல்லது மேலே உள்ள படிவத்தைப் பயன்படுத்தி புதிய இணைப்புகளைச் சேர்க்கவும்.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((item, index) => {
                  const isYt = item.type === 'youtube';
                  const isDrive = item.type === 'drive';
                  const isPdf = item.type === 'pdf';

                  return (
                    <div
                      key={item.id}
                      className="bg-white border-2 border-slate-100 hover:border-red-200 rounded-2xl p-4 transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left Side: Order Number + Type Icon + Title & Link */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Order Number Badge */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-amber-300 font-black text-sm flex items-center justify-center shrink-0 shadow-sm border border-slate-700">
                          #{item.order}
                        </div>

                        {/* Type Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isYt ? 'bg-red-50 text-red-600' :
                          isDrive ? 'bg-blue-50 text-blue-600' :
                          isPdf ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {isYt && <Youtube size={20} />}
                          {isDrive && <Link2 size={20} />}
                          {isPdf && <FileText size={20} />}
                          {!isYt && !isDrive && !isPdf && <Globe size={20} />}
                        </div>

                        {/* Title & URL Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm truncate">
                              {item.title}
                            </h4>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              isYt ? 'bg-red-100 text-red-700' :
                              isDrive ? 'bg-blue-100 text-blue-700' :
                              isPdf ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isYt ? 'YouTube' : isDrive ? 'Google Drive' : isPdf ? 'PDF' : 'Website'}
                            </span>
                            {item.category && (
                              <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                🏷️ {item.category}
                              </span>
                            )}
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {item.grade || 'அனைத்து வகுப்புகள்'}
                            </span>
                            {item.subject && (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                {item.subject}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                              {item.url}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Reorder Arrows (⬆️ ⬇️) & Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                          title="வரிசையில் மேலே நகர்த்தவும்"
                        >
                          <ArrowUp size={14} />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === filteredLinks.length - 1}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                          title="வரிசையில் கீழே நகர்த்தவும்"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>

                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopy(item.url, item.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            copiedLinkId === item.id 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="நகலெடு"
                        >
                          {copiedLinkId === item.id ? <Check size={14} /> : <Copy size={14} />}
                          <span className="hidden sm:inline">{copiedLinkId === item.id ? "நகலெடுக்கப்பட்டது" : "நகல்"}</span>
                        </button>

                        {/* Open Link */}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                          title="புதிய தாவலில் திறக்கவும்"
                        >
                          <ExternalLink size={14} />
                          <span className="hidden sm:inline">திறக்க</span>
                        </a>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLinkId(item.id);
                            setLinkUrl(item.url);
                            setLinkTitle(item.title);
                            setLinkGrade(item.grade || 'அனைத்து வகுப்புகள்');
                            setLinkSubject(item.subject || 'தமிழ்');
                            setLinkCategory(item.category || categoriesList[0] || 'இலக்கணம்');
                            setIsBulkLinkMode(false);
                            window.scrollTo({ top: 150, behavior: 'smooth' });
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-all cursor-pointer"
                          title="திருத்து"
                        >
                          <Edit3 size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUnifiedLink(item.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-all cursor-pointer"
                          title="நீக்கு"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Direct Firebase PDF Upload                                         */}
      {/* ========================================================================= */}
      {activeTab === 'firebase_pdf' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <UploadCloud className="text-red-600" size={24} />
              நேரடி PDF கோப்பு பதிவேற்றம் (Firebase Cloud Storage)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              உங்கள் கணினியிலிருந்து நேரடியாக PDF கோப்பைப் பதிவேற்றி, தானாகவே அடுத்த வரிசை எண்ணுடன் லிங்க் பட்டியலில் இணைக்கலாம்.
            </p>
          </div>

          <form onSubmit={handleUploadPdfToFirebase} className="space-y-6">
            <div className="border-2 border-dashed border-red-300 hover:border-red-500 bg-red-50/40 rounded-3xl p-6 sm:p-8 text-center transition-colors">
              <input
                type="file"
                id="pdfUploadInput"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPdfFile(e.target.files[0]);
                    if (!pdfTitle) {
                      setPdfTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }
                }}
                className="hidden"
              />
              <label htmlFor="pdfUploadInput" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <FileText size={32} />
                </div>
                {pdfFile ? (
                  <div>
                    <span className="text-sm font-black text-red-700 block">{pdfFile.name}</span>
                    <span className="text-xs text-slate-500">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB - கிளிக் செய்து மாற்றலாம்</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-black text-slate-800 block">PDF கோப்பை இங்கு இழுத்துப் போடவும் அல்லது தேர்ந்தெடுக்கவும்</span>
                    <span className="text-xs text-slate-500">PDF அல்லது Word கோப்புகள் (அதிகபட்சம் 25MB வரை)</span>
                  </div>
                )}
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                பாடக் குறிப்புத் தலைப்பு (Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="எ.கா: தரம் 11 - தமிழ் இலக்கணம் முழுமையான கையேடு"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-red-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category for PDF */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">பாடப்பிரிவு வகை (Category)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineAddType('category');
                      setInlineAddContext('pdf');
                      setInlineAddText("");
                    }}
                    className="text-[10px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={12} /> புதிய பிரிவு
                  </button>
                </div>
                {inlineAddType === 'category' && inlineAddContext === 'pdf' ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={inlineAddText}
                      onChange={(e) => setInlineAddText(e.target.value)}
                      placeholder="எ.கா: வினாத்தாள் கையேடு..."
                      className="flex-1 bg-white border-2 border-amber-500 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (inlineAddText.trim()) {
                            handleAddCustomCategory(inlineAddText);
                            setPdfCategory(inlineAddText.trim());
                            setInlineAddType(null);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (inlineAddText.trim()) {
                          handleAddCustomCategory(inlineAddText);
                          setPdfCategory(inlineAddText.trim());
                          setInlineAddType(null);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 cursor-pointer"
                    >
                      சேர்
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineAddType(null)}
                      className="px-2 py-1.5 bg-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={pdfCategory}
                    onChange={(e) => setPdfCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-red-500"
                  >
                    {categoriesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subject for PDF */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">பாடம் / துணைப்பிரிவு</label>
                <select
                  value={pdfSubject}
                  onChange={(e) => setPdfSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-red-500"
                >
                  {COMMON_SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grades for PDF */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">பொருந்தும் வகுப்புகள் (Grades)</label>
                <button
                  type="button"
                  onClick={() => {
                    setInlineAddType('grade');
                    setInlineAddContext('pdf');
                    setInlineAddText("");
                  }}
                  className="text-[10px] font-black text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={12} /> புதிய வகுப்பு
                </button>
              </div>

              {inlineAddType === 'grade' && inlineAddContext === 'pdf' && (
                <div className="flex gap-1.5 mb-2 max-w-sm">
                  <input
                    type="text"
                    value={inlineAddText}
                    onChange={(e) => setInlineAddText(e.target.value)}
                    placeholder="எ.கா: தரம் 05..."
                    className="flex-1 bg-white border-2 border-red-500 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (inlineAddText.trim()) {
                          handleAddCustomGrade(inlineAddText);
                          setPdfGrades([...pdfGrades, inlineAddText.trim()]);
                          setInlineAddType(null);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inlineAddText.trim()) {
                        handleAddCustomGrade(inlineAddText);
                        setPdfGrades([...pdfGrades, inlineAddText.trim()]);
                        setInlineAddType(null);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 cursor-pointer"
                  >
                    சேர்
                  </button>
                  <button
                    type="button"
                    onClick={() => setInlineAddType(null)}
                    className="px-2 py-1.5 bg-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {gradesList.filter(g => g !== 'அனைத்து வகுப்புகள்').map((g) => {
                  const isSel = pdfGrades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        if (pdfGrades.includes(g)) {
                          setPdfGrades(pdfGrades.filter(x => x !== g));
                        } else {
                          setPdfGrades([...pdfGrades, g]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSel
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSel && <Check size={14} className="stroke-[3]" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {uploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>கிளவுடில் பாதுகாப்பாகப் பதிவேற்றப்படுகிறது...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {lastUploadedPdfInfo && !isLoading && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-xs sm:text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>PDF கோப்பு முழுமையாக பதிவேற்றம் செய்யப்பட்டது! ✓ (100% சேமிக்கப்பட்டது)</span>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                    வரிசை #{lastUploadedPdfInfo.order}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700 bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                  <span className="font-bold text-slate-900 truncate">{lastUploadedPdfInfo.title}</span>
                  <span className="text-slate-400 shrink-0 ml-2">{lastUploadedPdfInfo.time}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !pdfFile}
              className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud size={20} />
              <span>{isLoading ? "பதிவேற்றப்படுகிறது..." : `Firebase-ல் பதிவேற்றி வரிசை #${unifiedLinks.length + 1}-ல் சேர்க்க`}</span>
            </button>
          </form>

          {/* ========================================================================= */}
          {/* Saved Firebase PDF Files Explorer                                         */}
          {/* ========================================================================= */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FileText className="text-amber-600" size={20} />
                  <span>பதிவேற்றப்பட்டு சேமிக்கப்பட்ட PDF கோப்புகள் (Saved PDFs)</span>
                  <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                    {unifiedLinks.filter(l => l.type === 'pdf' || l.url?.toLowerCase().includes('.pdf') || l.url?.includes('firebasestorage')).length} கோப்புகள்
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  இங்கு நீங்கள் பதிவேற்றிய அனைத்து PDF கோப்புகளும் Firebase Storage-ல் நேரலையாக சேமிக்கப்பட்டு AI தமிழ் ஆசானுக்கு உடனடியாகக் கிடைக்கும்.
                </p>
              </div>
            </div>

            {/* Filter Pills for PDF category & grade */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">அனைத்து வகுப்புகள்</option>
                {gradesList.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">அனைத்துப் பிரிவுகள்</option>
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* PDF List Cards */}
            {(() => {
              const allPdfs = unifiedLinks.filter(l => l.type === 'pdf' || l.url?.toLowerCase().includes('.pdf') || l.url?.includes('firebasestorage'));
              const filteredPdfs = allPdfs.filter(l => {
                if (selectedGradeFilter !== 'all' && l.grade && !l.grade.includes(selectedGradeFilter)) return false;
                if (selectedCategoryFilter !== 'all' && l.category !== selectedCategoryFilter) return false;
                return true;
              });

              if (filteredPdfs.length === 0) {
                return (
                  <div className="py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
                    <FileText size={24} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">இன்னும் PDF கோப்புகள் எதுவும் பதிவேற்றப்படவில்லை.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {filteredPdfs.map((pdfItem) => {
                    const isFirebaseCloud = pdfItem.url?.includes('firebasestorage.googleapis.com');
                    return (
                      <div
                        key={pdfItem.id}
                        className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
                            #{pdfItem.order}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {pdfItem.title}
                              </h4>
                              {pdfItem.category && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  🏷️ {pdfItem.category}
                                </span>
                              )}
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {pdfItem.grade || 'அனைத்து வகுப்புகள்'}
                              </span>
                              {isFirebaseCloud && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                  ☁️ Firebase Cloud
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5 max-w-md">
                              {pdfItem.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(pdfItem.url, pdfItem.id)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="லிங்க் நகலெடு"
                          >
                            {copiedLinkId === pdfItem.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span>{copiedLinkId === pdfItem.id ? "நகலானது" : "நகல்"}</span>
                          </button>

                          <a
                            href={pdfItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1"
                            title="PDF-ஐத் திறக்க"
                          >
                            <ExternalLink size={13} />
                            <span>திறக்க</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteUnifiedLink(pdfItem.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            title="நீக்கு"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: General Knowledge & Special Notes (RAG Grounding Hub)               */}
      {/* ========================================================================= */}
      {activeTab === 'general_notes' && (
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white p-5 rounded-3xl border border-indigo-500/20 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    ஆசிரியரின் அதிகாரப்பூர்வப் பாடக் குறிப்புகள் & மாதிரி வினாக்கள் (Grounding Knowledge Base)
                  </h2>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    இங்கு உள்ளிடப்படும் பாடக்குறிப்புகள், உபதலைப்புகள் மற்றும் எதிர்பார்க்கப்படும் வினாக்களே AI தமிழ் ஆசானின் முதன்மை ஆதாரமாக அமையும்.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('rag_pipeline')}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105"
                >
                  <Cpu size={14} />
                  <span>RAG கட்டமைப்பு & நேரடிச் சோதனை ➔</span>
                </button>
                <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  மொத்தக் குறிப்புகள்: {knowledgeList.length}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form: Add / Edit Note */}
            <div className={`lg:col-span-5 bg-white p-6 rounded-3xl border shadow-sm space-y-4 ${
              editingKnowledgeId ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  {editingKnowledgeId ? (
                    <>
                      <Edit3 size={18} className="text-amber-600" />
                      <span>குறிப்பைத் திருத்துதல் (Editing Note)</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={18} className="text-indigo-600" />
                      <span>புதிய குறிப்பு / மாதிரி வினாக்கள் சேர்க்க</span>
                    </>
                  )}
                </h3>
                {editingKnowledgeId && (
                  <button
                    type="button"
                    onClick={handleCancelEditKnowledge}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    ரத்து செய்
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                மாணவர்கள் கேட்கக்கூடிய தலைப்புகள், எதிர்பார்க்கப்படும் வினாக்கள் மற்றும் உங்கள் பிரத்தியேக விளக்கங்களைத் தட்டச்சு செய்து சேமிக்கவும்.
              </p>

              <form onSubmit={handleSaveNote} className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    முதன்மைத் தலைப்பு / பாடம் <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="எ.கா: இரண்டாம் வேற்றுமை உருபுகள் (ஐ)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Category & Grade Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">பிரிவு (Category)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('category');
                          setInlineAddContext('note');
                          setInlineAddText("");
                        }}
                        className="text-[10px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={11} /> புதியது
                      </button>
                    </div>
                    {inlineAddType === 'category' && inlineAddContext === 'note' ? (
                      <div className="flex gap-1 mb-1">
                        <input
                          type="text"
                          value={inlineAddText}
                          onChange={(e) => setInlineAddText(e.target.value)}
                          placeholder="புதிய பிரிவு..."
                          className="flex-1 bg-white border-2 border-amber-500 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (inlineAddText.trim()) {
                                handleAddCustomCategory(inlineAddText);
                                setNoteCategory(inlineAddText.trim());
                                setInlineAddType(null);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inlineAddText.trim()) {
                              handleAddCustomCategory(inlineAddText);
                              setNoteCategory(inlineAddText.trim());
                              setInlineAddType(null);
                            }
                          }}
                          className="px-2 py-1 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 cursor-pointer"
                        >
                          சேர்
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineAddType(null)}
                          className="px-1.5 py-1 bg-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={noteCategory}
                        onChange={(e) => setNoteCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      >
                        {categoriesList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Grade */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">தரம் (Grade)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('grade');
                          setInlineAddContext('note');
                          setInlineAddText("");
                        }}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={11} /> புதியது
                      </button>
                    </div>
                    {inlineAddType === 'grade' && inlineAddContext === 'note' ? (
                      <div className="flex gap-1 mb-1">
                        <input
                          type="text"
                          value={inlineAddText}
                          onChange={(e) => setInlineAddText(e.target.value)}
                          placeholder="எ.கா: தரம் 11..."
                          className="flex-1 bg-white border-2 border-indigo-500 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (inlineAddText.trim()) {
                                handleAddCustomGrade(inlineAddText);
                                setNoteGrade(inlineAddText.trim());
                                setInlineAddType(null);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inlineAddText.trim()) {
                              handleAddCustomGrade(inlineAddText);
                              setNoteGrade(inlineAddText.trim());
                              setInlineAddType(null);
                            }
                          }}
                          className="px-2 py-1 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 cursor-pointer"
                        >
                          சேர்
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineAddType(null)}
                          className="px-1.5 py-1 bg-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={noteGrade}
                        onChange={(e) => setNoteGrade(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      >
                        <option value="அனைத்து வகுப்புகள்">அனைத்து வகுப்புகள்</option>
                        {gradesList.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Note Content / Text Notes (Placed FIRST before Questions as requested) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <FileText size={12} className="text-indigo-600" />
                      விளக்கம் / விரிவான பாடக் குறிப்பு உரை (Detailed Lesson Content) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">இலக்கண விதிகள், உதாரணங்கள்</span>
                  </div>
                  <textarea
                    rows={7}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="இங்கு ஆசிரியரின் உரை, இலக்கண விதிகள், வரைவிலக்கணம், மற்றும் தெளிவான சான்றுகள்/எடுத்துக்காட்டுகளைத் தட்டச்சு செய்யவும்..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all leading-relaxed"
                  />
                </div>

                {/* Topics / Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Tag size={12} className="text-emerald-600" />
                      உபதலைப்புகள் / குறிச்சொற்கள் (Topics / Keywords)
                    </label>
                    <span className="text-[10px] text-slate-400">காற்புள்ளி (,) கொண்டு பிரிக்கவும்</span>
                  </div>
                  <input
                    type="text"
                    value={noteTopicsText}
                    onChange={(e) => setNoteTopicsText(e.target.value)}
                    placeholder="எ.கா: வேற்றுமை, இரண்டாம் வேற்றுமை, செயப்படுபொருள், ஐ உருபு"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Expected Student Questions & Teacher Answers (Placed SECOND as requested) */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
                        <HelpCircle size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950">
                          எதிர்பார்க்கப்படும் வினாக்கள் & விடைகள் (Q&A)
                        </h4>
                        <p className="text-[10px] text-amber-800/80">
                          மாணவர்கள் கேட்கக்கூடிய வினாக்களையும் அதற்கான விடைகளையும் ஒவ்வொன்றாகச் சேர்க்கலாம்
                        </p>
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {qaList.length} வினாக்கள்
                    </span>
                  </div>

                  {/* Add New Question & Answer Inputs */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        மாணவர் கேட்கும் மாதிரி வினா (Question):
                      </label>
                      <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="எ.கா: பெயர்ச்சொல் என்றால் என்ன?"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !newAnswer.trim()) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        ஆசிரியரின் நேரடி விடை / விளக்கம் (Answer):
                      </label>
                      <textarea
                        rows={2}
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="எ.கா: ஒன்றன் பெயரைக் குறிக்கும் சொல் பெயர்ச்சொல் எனப்படும். (எ.கா: கண்ணன், மரம்)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white leading-relaxed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddQA}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                    >
                      <Plus size={14} className="stroke-[3]" />
                      <span>மாதிரி வினா & விடை சேர்க்க (Add Q&A)</span>
                    </button>
                  </div>

                  {/* List of Added Q&A items */}
                  {qaList.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {qaList.map((qa, idx) => (
                        <div 
                          key={qa.id || idx} 
                          className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5 relative group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                                வினா {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {qa.question}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveQA(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                              title="நீக்கு"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {qa.answer && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed pl-2.5 border-l-2 border-l-amber-500">
                              <span className="font-bold text-slate-700">விடை: </span>
                              {qa.answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[11px] text-amber-800/70 italic">
                      மாதிரி வினாக்கள் இன்னும் சேர்க்கப்படவில்லை. மேலே தட்டச்சு செய்து [+] சொடுக்கவும்.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 ${
                      editingKnowledgeId 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                        : 'bg-slate-900 hover:bg-black text-white'
                    } font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer`}
                  >
                    <Save size={14} /> 
                    {editingKnowledgeId ? "மாற்றங்களை உறுதிசெய் / புதுப்பி" : "ஆசான் நினைவகத்தில் சேமி"}
                  </button>
                  {editingKnowledgeId && (
                    <button
                      type="button"
                      onClick={handleCancelEditKnowledge}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      ரத்து
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right List: Search, Filter, and Current Knowledge Items */}
            <div className="lg:col-span-7 space-y-4">
              {/* Search and Filters Bar */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={knowledgeSearchQuery}
                      onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                      placeholder="தலைப்பு, உபதலைப்பு, மாதிரி வினா அல்லது விளக்கத்தைத் தேடுக..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    {knowledgeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setKnowledgeSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Grade Filter */}
                  <div className="w-full sm:w-44">
                    <select
                      value={knowledgeGradeFilter}
                      onChange={(e) => setKnowledgeGradeFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="all">அனைத்து வகுப்புகளும்</option>
                      {gradesList.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="w-full sm:w-40">
                    <select
                      value={knowledgeCategoryFilter}
                      onChange={(e) => setKnowledgeCategoryFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="all">அனைத்துப் பிரிவுகளும்</option>
                      {categoriesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Filtered Notes List: Clean Colorful Boxes displaying Title, Grade, and Date */}
              {(() => {
                const qLower = knowledgeSearchQuery.trim().toLowerCase();
                const filtered = knowledgeList.filter((item: TamilAsanKnowledgeItem) => {
                  if (knowledgeGradeFilter !== 'all') {
                    if (item.grade && !item.grade.includes(knowledgeGradeFilter)) return false;
                  }
                  if (knowledgeCategoryFilter !== 'all') {
                    if (item.category !== knowledgeCategoryFilter) return false;
                  }
                  if (qLower) {
                    const matchTitle = (item.title || '').toLowerCase().includes(qLower);
                    const matchContent = (item.content || '').toLowerCase().includes(qLower);
                    const matchCat = (item.category || '').toLowerCase().includes(qLower);
                    const matchTopics = (item.topics || []).some(t => t.toLowerCase().includes(qLower));
                    const matchQuestions = (item.expectedQuestions || []).some(q => q.toLowerCase().includes(qLower));
                    const matchQAPairs = (item.qaPairs || []).some(qa => 
                      qa.question.toLowerCase().includes(qLower) || (qa.answer && qa.answer.toLowerCase().includes(qLower))
                    );
                    if (!matchTitle && !matchContent && !matchCat && !matchTopics && !matchQuestions && !matchQAPairs) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-2">
                      <BookOpen size={32} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">
                        {knowledgeSearchQuery || knowledgeGradeFilter !== 'all' || knowledgeCategoryFilter !== 'all'
                          ? "வடிகட்டலுக்கு ஏற்ற பாடக்குறிப்புகள் ஏதும் கிடைக்கவில்லை."
                          : "இன்னும் விசேடப் பாடக்குறிப்புகள் சேர்க்கப்படவில்லை. இடதுபுறப் படிவத்தைப் பயன்படுத்திச் சேர்க்கலாம்."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[780px] overflow-y-auto pr-1">
                    {/* Accordion Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">பாடக்குறிப்புகள் ({filtered.length})</span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">• தலைப்பைச் சொடுக்க விரிந்து/சுருங்கும்</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedAccordionIds(new Set(filtered.map(f => f.id)))}
                          className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/80 transition-colors cursor-pointer"
                        >
                          அனைத்தையும் விரிக்க
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedAccordionIds(new Set())}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          அனைத்தையும் சுருக்க
                        </button>
                      </div>
                    </div>

                    {filtered.map((item: TamilAsanKnowledgeItem, idx: number) => {
                      const isEditing = editingKnowledgeId === item.id;
                      const isExpanded = expandedAccordionIds.has(item.id);
                      const theme = NOTE_CARD_THEMES[idx % NOTE_CARD_THEMES.length];
                      const dateTimestamp = item.updatedAt || item.createdAt || Date.now();
                      const formattedDate = new Date(dateTimestamp).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });
                      const qaItems = (item.qaPairs && item.qaPairs.length > 0)
                        ? item.qaPairs
                        : (item.expectedQuestions || []).map((q, i) => ({ id: `eq_${i}`, question: q, answer: '' }));
                      const qaCount = qaItems.length;

                      return (
                        <div 
                          key={item.id} 
                          id={`accordion-note-${item.id}`}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${theme.cardBg} ${
                            isEditing ? 'ring-2 ring-amber-400 border-amber-400' : ''
                          }`}
                        >
                          {/* ========================================================================= */}
                          {/* COLOR-CODED BAR HEADER: Title, Date, Grade & Metadata                     */}
                          {/* ========================================================================= */}
                          <div 
                            onClick={() => {
                              setExpandedAccordionIds(prev => {
                                const next = new Set(prev);
                                if (next.has(item.id)) {
                                  next.delete(item.id);
                                } else {
                                  next.add(item.id);
                                }
                                return next;
                              });
                            }}
                            className="relative p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none group"
                          >
                            {/* Left Decorative Accent Strip */}
                            <div className={`absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full ${theme.accentBar}`} />

                            {/* Bar Metadata: Title, Grade, Date */}
                            <div className="pl-2 space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-black text-sm sm:text-base leading-snug tracking-tight truncate ${theme.titleColor}`}>
                                  {item.title}
                                </h4>
                                {isEditing && (
                                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm shrink-0">
                                    தற்போது திருத்தப்படுகிறது
                                  </span>
                                )}
                              </div>

                              {/* Color-Coded Metadata Badges */}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {/* 1. Grade Badge */}
                                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${theme.gradeBadge}`}>
                                  {item.grade || 'அனைத்து வகுப்புகள்'}
                                </span>

                                {/* 2. Date Badge */}
                                <span className={`text-[11px] font-bold flex items-center gap-1 ${theme.dateColor}`}>
                                  <Calendar size={13} className="shrink-0 opacity-80" />
                                  <span>திகதி: {formattedDate}</span>
                                </span>

                                {/* Category Chip */}
                                {item.category && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${theme.categoryBadge}`}>
                                    {item.category}
                                  </span>
                                )}

                                {/* Expected Questions Count Badge */}
                                {qaCount > 0 && (
                                  <span className="bg-white/80 text-slate-700 border border-slate-200/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <HelpCircle size={11} className="text-amber-600" />
                                    <span>{qaCount} வினாக்கள்</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right Actions & Expand Chevron Toggle */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Quick Edit & Delete Buttons */}
                              <div 
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVisualStudioTargetNote(item);
                                    setActiveTab('ai_visuals');
                                  }}
                                  className="p-1.5 bg-white/80 border border-slate-200/70 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer hover:scale-105 flex items-center gap-1 text-[11px] font-bold"
                                  title="இந்தக் குறிப்பிற்கு AI விளக்கப்படம் & வாட்டர்மார்க் உருவாக்குக"
                                >
                                  <Sparkles size={13} className="text-amber-500" />
                                  <span className="hidden sm:inline">AI படம்</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditKnowledge(item)}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer hover:scale-105 ${
                                    isEditing
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-white/80 border border-slate-200/70 text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                                  }`}
                                  title="குறிப்பைத் திருத்து (Edit)"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKnowledge(item.id)}
                                  className="p-1.5 bg-white/80 border border-slate-200/70 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer hover:scale-105"
                                  title="குறிப்பை நீக்கு (Delete)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Accordion Expand/Collapse Indicator */}
                              <div className={`w-8 h-8 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs flex items-center justify-center transition-transform duration-300 ${
                                isExpanded ? 'rotate-180 bg-indigo-50 border-indigo-200 text-indigo-700' : 'text-slate-500 group-hover:text-slate-800'
                              }`}>
                                <ChevronDown size={17} />
                              </div>
                            </div>
                          </div>

                          {/* ========================================================================= */}
                          {/* EXPANDED ACCORDION BODY: Detailed Content & 'Expected Questions'          */}
                          {/* ========================================================================= */}
                          {isExpanded && (
                            <div className="bg-white/95 border-t border-slate-200/80 p-4 sm:p-6 space-y-5 rounded-b-2xl shadow-inner animate-fadeIn">
                              {/* 1. DETAILED TEXT CONTENT SECTION */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <BookOpen size={14} className="text-indigo-600" />
                                    <span>பாட விளக்கம் & விரிவான உள்ளடக்கம் (Detailed Text Content)</span>
                                  </h5>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.content);
                                      setCopiedNoteId(item.id);
                                      setTimeout(() => setCopiedNoteId(null), 2000);
                                    }}
                                    className="text-[11px] font-bold text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                    title="உரையை நகலெடு"
                                  >
                                    {copiedNoteId === item.id ? (
                                      <>
                                        <Check size={12} className="text-emerald-600" />
                                        <span className="text-emerald-700">நகலெடுக்கப்பட்டது!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>நகலெடு</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-2xl text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal select-text">
                                  {item.content}
                                </div>

                                {/* Topics / Keywords Tags */}
                                {item.topics && item.topics.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                      <Tag size={12} /> முக்கியச் சொற்கள்:
                                    </span>
                                    {item.topics.map((t, tidx) => (
                                      <span key={tidx} className="bg-indigo-50 border border-indigo-200/70 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 2. 'EXPECTED QUESTIONS' SECTION INSIDE ACCORDION */}
                              <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                                    <HelpCircle size={15} className="text-amber-600" />
                                    <span>எதிர்பார்க்கப்படும் வினாக்கள் & மாதிரி விடைகள் (Expected Questions)</span>
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                      {qaCount}
                                    </span>
                                  </h5>
                                </div>

                                {qaCount > 0 ? (
                                  <div className="grid grid-cols-1 gap-2.5">
                                    {qaItems.map((qa, qidx) => (
                                      <div 
                                        key={qa.id || qidx}
                                        className="bg-gradient-to-r from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-xl p-3 space-y-1.5 shadow-2xs"
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="bg-amber-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            Q{qidx + 1}
                                          </span>
                                          <div className="text-xs font-black text-slate-900 leading-snug">
                                            {qa.question}
                                          </div>
                                        </div>

                                        {qa.answer && qa.answer.trim() ? (
                                          <div className="pl-7 text-[11px] sm:text-xs text-slate-700 bg-white/90 border border-amber-200/60 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                                            <span className="font-bold text-amber-800">மாதிரி விடை: </span>
                                            {qa.answer}
                                          </div>
                                        ) : (
                                          <div className="pl-7 text-[10px] text-slate-400 italic">
                                            (விடை உள்ளிடப்படவில்லை - AI ஆசான் தனது பாடக்குறிப்பிலிருந்து தானாக விளக்குவார்)
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-amber-50/40 border border-dashed border-amber-300 rounded-xl p-3.5 text-center text-xs text-amber-900/80 flex items-center justify-between gap-3">
                                    <span>இக்குறிப்பில் இன்னும் மாதிரி வினாக்கள் சேர்க்கப்படவில்லை.</span>
                                    <button
                                      type="button"
                                      onClick={() => handleEditKnowledge(item)}
                                      className="text-amber-800 hover:text-amber-950 font-black text-[11px] underline cursor-pointer shrink-0"
                                    >
                                      + வினாக்களைச் சேர்க்க
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Accordion Footer Action Bar */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditKnowledge(item)}
                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Edit3 size={13} />
                                    <span>திருத்து</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKnowledge(item.id)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>நீக்கு</span>
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedAccordionIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(item.id);
                                      return next;
                                    });
                                  }}
                                  className="text-slate-500 hover:text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <span>சுருக்கு</span>
                                  <ChevronUp size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DETAIL VIEW MODAL: Opens when teacher clicks a box to view/edit          */}
          {/* ========================================================================= */}
          {selectedViewNote && (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
              onClick={() => setSelectedViewNote(null)}
            >
              <div 
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-black px-2.5 py-0.5 rounded-lg">
                        {selectedViewNote.grade || 'அனைத்து வகுப்புகள்'}
                      </span>
                      {selectedViewNote.category && (
                        <span className="bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-black px-2.5 py-0.5 rounded-lg">
                          {selectedViewNote.category}
                        </span>
                      )}
                      <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                        <Calendar size={12} className="text-indigo-400" />
                        {new Date(selectedViewNote.updatedAt || selectedViewNote.createdAt || Date.now()).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                      {selectedViewNote.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedViewNote(null)}
                    className="text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="மூடு"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body: Scrollable */}
                <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
                  {/* Detailed Lesson Content (First) */}
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText size={15} className="text-indigo-600" />
                      <span>1. விளக்கம் / விரிவான பாடக் குறிப்பு உரை:</span>
                    </h4>
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedViewNote.content}
                    </div>
                  </div>

                  {/* Topics Chips */}
                  {Array.isArray(selectedViewNote.topics) && selectedViewNote.topics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Tag size={15} className="text-emerald-600" />
                        <span>2. உபதலைப்புகள் / குறிச்சொற்கள்:</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedViewNote.topics.map((t, idx) => (
                          <span 
                            key={idx}
                            className="bg-emerald-50 text-emerald-900 border border-emerald-300/80 text-xs font-bold px-2.5 py-1 rounded-lg"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expected Questions & Answers (Second) */}
                  {((selectedViewNote.qaPairs && selectedViewNote.qaPairs.length > 0) || 
                    (selectedViewNote.expectedQuestions && selectedViewNote.expectedQuestions.length > 0)) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle size={15} className="text-amber-600" />
                        <span>3. எதிர்பார்க்கப்படும் மாதிரி வினாக்கள் & விடைகள் (Q&A):</span>
                      </h4>

                      {/* Structured QA Pairs */}
                      {selectedViewNote.qaPairs && selectedViewNote.qaPairs.length > 0 ? (
                        <div className="space-y-2.5">
                          {selectedViewNote.qaPairs.map((qa, qIdx) => (
                            <div 
                              key={qa.id || qIdx}
                              className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-2xl space-y-2 shadow-2xs"
                            >
                              <div className="flex items-start gap-2">
                                <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                                  வினா {qIdx + 1}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-amber-950">
                                  {qa.question}
                                </span>
                              </div>
                              {qa.answer && (
                                <div className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-xl border border-amber-200/60 pl-3 border-l-4 border-l-amber-500 leading-relaxed">
                                  <span className="font-bold text-slate-900">ஆசிரியரின் விடை: </span>
                                  {qa.answer}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Fallback for legacy plain questions */
                        <ul className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-1.5">
                          {selectedViewNote.expectedQuestions?.map((q, qIdx) => (
                            <li key={qIdx} className="text-xs sm:text-sm text-amber-950 font-medium flex items-start gap-2">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedViewNote;
                      setSelectedViewNote(null);
                      handleEditKnowledge(item);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Edit3 size={15} />
                    <span>இக்குறிப்பைத் திருத்து (Edit Note)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedViewNote(null)}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    மூடு (Close)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RAG PIPELINE ARCHITECTURE & LIVE VERIFICATION                        */}
      {/* ========================================================================= */}
      {activeTab === 'rag_pipeline' && (
        <TamilAsanRagShowcase
          knowledgeList={knowledgeList}
          onNavigateToNotes={() => setActiveTab('general_notes')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TEACHER VOICE & WELCOME GREETING MANAGER                           */}
      {/* ========================================================================= */}
      {activeTab === 'voice_settings' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-red-950 text-white p-6 rounded-3xl border border-amber-500/30 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-500 flex items-center justify-center text-white shadow-md shrink-0">
                  <Volume2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-amber-100">
                    தலைமை ஆசான் திரு. D. தினேஷ்குமார் அவர்களின் நேரடி குரல் மேலாண்மை
                  </h2>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    மாணவர்கள் அறிவுத்தளத்திற்குள் நுழையும்போது கேட்கும் வரவேற்புக் குரல் மற்றும் AI குரல் அமைப்புகளை இங்கு நிர்வகிக்கலாம்.
                  </p>
                </div>
              </div>

              {/* Instant Test Button */}
              <button
                type="button"
                onClick={handleTestWelcomeVoice}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 ${
                  isTestingVoice
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                {isTestingVoice ? <VolumeX size={16} /> : <Play size={16} />}
                <span>{isTestingVoice ? "ஒலியை நிறுத்து" : "குரலை இப்போதே சோதிக்க ▶️"}</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-amber-200/90">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-md">
                முக்கிய விதி
              </span>
              <span>
                மாணவர்கள் கோரினால் மட்டுமே குரல் ஒலிக்கும். தேவை இல்லாமல் பின்னணியில் குரல் ஒலிக்காது.
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveVoiceSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Real Audio Upload & Microphone Recording */}
            <div className="space-y-6">
              {/* Option 1: Record Voice Live in Browser */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <Mic size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">1. நேரடி மைக்ரோஃபோன் குரல் பதிவு (Live Record)</h3>
                      <p className="text-[11px] text-slate-500">உங்கள் சொந்தக் குரலில் வரவேற்பு உரையைப் பேசி பதிவு செய்யுங்கள்</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center animate-pulse shadow-lg">
                        <Mic size={24} />
                      </div>
                      <p className="text-sm font-black text-red-600">
                        குரல் பதிவாகிறது... ({recordingSeconds} வினாடிகள்)
                      </p>
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Square size={14} />
                        <span>பதிவை நிறுத்து (Stop)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                      >
                        <Mic size={16} />
                        <span>குரல் பதிவு செய்யத் தொடங்கு (Start Recording)</span>
                      </button>
                      <p className="text-[11px] text-slate-400">
                        "வணக்கம் மாணவர்களே, உங்களை அன்புடன் இந்த அறிவுத்தளத்துக்கு அழைக்கிறோம்" என்று பேசவும்.
                      </p>
                    </div>
                  )}

                  {/* Recorded Audio Preview */}
                  {recordedAudioUrl && !isRecording && (
                    <div className="w-full mt-3 pt-3 border-t border-slate-200 flex flex-col items-center gap-2.5">
                      <p className="text-xs font-bold text-slate-700">பதிவு செய்யப்பட்ட குரல் மாதிரி:</p>
                      <audio controls src={recordedAudioUrl} className="w-full max-w-sm h-10" />
                      <button
                        type="button"
                        disabled={isUploadingVoice}
                        onClick={handleUploadRecordedVoice}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingVoice ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                        <span>{isUploadingVoice ? "பதிவேற்றப்படுகிறது..." : "இக்குரலை வரவேற்பு ஆடியோவாகப் பயன்படுத்து"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 2: Upload Audio File (.mp3, .wav, .m4a) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Music size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">2. கணினியிலிருந்து ஆடியோ கோப்பு பதிவேற்றம் (Audio File)</h3>
                    <p className="text-[11px] text-slate-500">ஏற்கனவே பதிவு செய்யப்பட்ட உங்கள் MP3, M4A, WAV கோப்பைப் பதிவேற்றவும்</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-dashed border-amber-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                    id="teacher-audio-file-input"
                  />
                  <label
                    htmlFor="teacher-audio-file-input"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <UploadCloud size={16} />
                    <span>{isUploadingVoice ? "கோப்பு பதிவேற்றப்படுகிறது..." : "ஆடியோ கோப்பைத் தேர்ந்தெடுக்கவும் (MP3/WAV)"}</span>
                  </label>
                  <p className="text-[11px] text-slate-400">அதிகபட்ச அளவு: 15MB. பாதுகாப்பாக கிளவுடில் சேமிக்கப்படும்.</p>
                </div>

                {/* Upload Progress Bar */}
                {isUploadingVoice && (
                  <div className="w-full p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-black text-amber-900">
                      <span className="flex items-center gap-2">
                        <RefreshCw size={15} className="animate-spin text-amber-700" />
                        {voiceUploadStatusText || "கோப்பு பதிவேற்றப்படுகிறது..."}
                      </span>
                      <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                        {voiceUploadProgress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-300 rounded-full"
                        style={{ width: `${voiceUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-amber-800">தயவுசெய்து காத்திருக்கவும். கோப்பு முழுமையாகச் சேமிக்கப்பட்டு உறுதிப்படுத்தப்படும்.</p>
                  </div>
                )}

                {/* Upload Complete Confirmation Box */}
                {lastUploadedVoiceInfo && !isUploadingVoice && (
                  <div className="w-full p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 font-black text-xs sm:text-sm">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span>கோப்பு முழுமையாகப் பதிவேற்றம் செய்யப்பட்டது! ✓ (100% சேமிக்கப்பட்டது)</span>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        முடிந்தது ✓
                      </span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 text-xs text-slate-700 flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <Music size={14} className="text-emerald-600 shrink-0" />
                        {lastUploadedVoiceInfo.name}
                      </span>
                      <span className="text-slate-500 text-[11px] shrink-0 ml-2">({lastUploadedVoiceInfo.size})</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-emerald-900">பதிவேற்றப்பட்ட ஆடியோவை இப்போதே இயக்கிக் கேட்கவும்:</p>
                      <audio controls src={resolvedAudioPreview || welcomeAudioUrl} className="w-full h-9" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveVoiceSettings()}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                    >
                      <Check size={16} />
                      <span>{isVoiceSettingsSaved ? "அமைப்புகள் முழுமையாகச் சேமிக்கப்பட்டுள்ளது ✓" : "இவ்வமைப்புகளை இப்போது உறுதிசெய்து சேமிக்கவும்"}</span>
                    </button>
                  </div>
                )}

                {/* Option 3: Direct Audio URL */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>தற்போதைய வரவேற்பு ஆடியோ URL (Direct Audio Link):</span>
                    {welcomeAudioUrl && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        இணைக்கப்பட்டுள்ளது ✓
                      </span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={welcomeAudioUrl}
                    onChange={(e) => setWelcomeAudioUrl(e.target.value)}
                    placeholder="https://firebasestorage.googleapis.com/... அல்லது நேரடி ஆடியோ லிங்க்"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 font-mono"
                  />
                  {welcomeAudioUrl && (
                    <div className="pt-2">
                      <audio controls src={resolvedAudioPreview || welcomeAudioUrl} className="w-full h-9" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Text & Length Settings & Cloning */}
            <div className="space-y-6">
              {/* Welcome Text & Answer Length Mode */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">வரவேற்பு உரை & மாணவர் விடை அமைப்பு</h3>
                    <p className="text-[11px] text-slate-500">வரவேற்பு வாசகம் மற்றும் பதிலின் இயல்புநிலை நீளம்</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    வரவேற்புக் குரல் உரை (Welcome Voice Text):
                  </label>
                  <textarea
                    rows={3}
                    value={welcomeText}
                    onChange={(e) => setWelcomeText(e.target.value)}
                    placeholder="வணக்கம் மாணவர்களே, உங்களை அன்புடன் இந்த அறிவுத்தளத்துக்கு அழைக்கிறோம்..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-amber-500 leading-relaxed font-medium"
                  />
                  <p className="text-[10px] text-slate-400">
                    ஆடியோ கோப்பு இல்லாத பட்சத்தில், இந்த உரை இயற்கை தமிழ் குரல் மூலம் பேசப்படும்.
                  </p>
                </div>

                {/* Answer Length Choice */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700">
                    இயல்புநிலை விடை வடிவம் (Default Answer Length):
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAnswerLengthSetting('concise')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        answerLengthSetting === 'concise'
                          ? 'border-red-600 bg-red-50/70 shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">⚡</span>
                        <span className="text-xs font-black text-slate-900">சுருக்கமான பதில் (Concise)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        2 முதல் 4 நேரடி புள்ளிகள் (Bullet points) மட்டுமே. விரைவான தேர்வு குறிப்புகள்.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswerLengthSetting('detailed')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        answerLengthSetting === 'detailed'
                          ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">📖</span>
                        <span className="text-xs font-black text-slate-900">விரிவான விளக்கம் (Detailed)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        முன்னுரை, விளக்கம், உதாரணங்கள் மற்றும் செய்யுள் வரிகளுடன் கூடிய முழுமையான விடை.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional: ElevenLabs AI Voice Cloning for Live dynamic answers */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">ElevenLabs AI குரல் குளோனிங் (விரும்பினால்)</h3>
                      <p className="text-[11px] text-slate-500">ஆசானின் குரல் மாதிரியை வைத்து AI-யை உங்கள் குரலில் பேச வைக்கலாம்</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceCloningEnabled}
                      onChange={(e) => setVoiceCloningEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>ElevenLabs API Key:</span>
                      {elevenLabsApiKey && !elevenLabsApiKey.startsWith("sk_") && (
                        <span className="text-[10px] text-red-600 font-semibold">⚠️ sk_ விசை தேவை</span>
                      )}
                      {elevenLabsApiKey && elevenLabsApiKey.startsWith("sk_") && (
                        <span className="text-[10px] text-emerald-600 font-semibold">✓ சரியான வடிவம்</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={elevenLabsApiKey}
                      onChange={(e) => setElevenLabsApiKey(e.target.value)}
                      placeholder="sk_..."
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono ${
                        elevenLabsApiKey && !elevenLabsApiKey.startsWith("sk_") 
                          ? "border-red-400 focus:border-red-500" 
                          : "border-slate-200 focus:border-purple-500"
                      }`}
                    />
                    <span className="text-[10px] text-amber-700 block leading-relaxed">
                      கட்டாயம் <strong>sk_</strong> எனத் தொடங்க வேண்டும். ElevenLabs Dashboard ➔ Developers ➔ API Keys சென்று உருவாக்கும் போது <strong>Text to Speech (அனுமதி)</strong> அல்லது <strong>Full Access</strong> தேர்ந்தெடுக்கப்பட வேண்டும்.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Voice ID (ஆசானின் குரல் ID):</label>
                    <input
                      type="text"
                      value={elevenLabsVoiceId}
                      onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                      placeholder="e.g. OUBMjq0LvBjb07bhwD3H"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-purple-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      உதாரணம்: OUBMjq0LvBjb07bhwD3H (ElevenLabs Voice Library-ல் உள்ள குரலின் ID)
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  குறிப்பு: ElevenLabs விவரங்கள் வழங்கப்படாத போது, உலாவி வழங்கும் இயல்பான உயர்தர தமிழ் குரலில் (Tamil TTS) பதிலளிக்கப்படும்.
                </p>
              </div>

              {/* Save All Settings Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>ஆசானின் குரல் & விடை அமைப்புகளைப் புதுப்பித்துச் சேமி</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AI LESSON VISUALS & WATERMARK STUDIO                               */}
      {/* ========================================================================= */}
      {activeTab === 'ai_visuals' && (
        <TamilAsanVisualsStudio
          knowledgeNotes={knowledgeList}
          selectedNote={visualStudioTargetNote}
          onAttachImageToNote={(imageUrl, noteId) => {
            if (noteId) {
              const target = knowledgeList.find(k => k.id === noteId);
              if (target) {
                const updatedContent = `${target.content}\n\n![விளக்கப்படம்](${imageUrl})`;
                const updated = knowledgeList.map(k => k.id === noteId ? { ...k, content: updatedContent } : k);
                saveTamilAsanKnowledge(updated);
                setKnowledgeList(updated);
                showNotification("விளக்கப்படம் பாடக்குறிப்பில் வெற்றிகரமாக இணைக்கப்பட்டது! ✓", "success");
                setActiveTab('general_notes');
                return;
              }
            }
            setNoteContent(prev => `${prev}\n\n![விளக்கப்படம்](${imageUrl})`);
            showNotification("விளக்கப்படம் பாடக்குறிப்பு உரைப்பகுதியில் சேர்க்கப்பட்டது! ✓", "success");
            setActiveTab('general_notes');
          }}
          showNotification={showNotification}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANAGE CATEGORIES & GRADES                                         */}
      {/* ========================================================================= */}
      {isManageCatsGradesOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-amber-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-100">
                    பிரிவுகள் & வகுப்புகள் நிர்வாகம்
                  </h3>
                  <p className="text-xs text-slate-300">
                    விருப்பப்படி புதிய பாடப்பிரிவுகள் மற்றும் வகுப்புகளைச் சேர்க்கவும், நீக்கவும்
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageCatsGradesOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
              <button
                type="button"
                onClick={() => setManageModalTab('categories')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  manageModalTab === 'categories'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>🏷️ பாடப்பிரிவு வகைகள் ({categoriesList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setManageModalTab('grades')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  manageModalTab === 'grades'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>🎓 வகுப்புகள் / தரங்கள் ({gradesList.length})</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {manageModalTab === 'categories' ? (
                <div className="space-y-4">
                  {/* Add Category Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryModalInput}
                      onChange={(e) => setNewCategoryModalInput(e.target.value)}
                      placeholder="புதிய பிரிவு வகை பெயர் (எ.கா: சிறுகதை நயம், மொழிபெயர்ப்பு)..."
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCategoryModalInput.trim()) {
                            handleAddCustomCategory(newCategoryModalInput.trim());
                            setNewCategoryModalInput("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryModalInput.trim()) {
                          handleAddCustomCategory(newCategoryModalInput.trim());
                          setNewCategoryModalInput("");
                        }
                      }}
                      disabled={!newCategoryModalInput.trim()}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus size={14} /> சேர்க்க
                    </button>
                  </div>

                  {/* List of Categories */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      தற்போது பயன்பாட்டில் உள்ள பிரிவுகள்:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoriesList.map((cat) => {
                        return (
                          <div
                            key={cat}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              <span className="text-amber-600">🏷️</span> {cat}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                              title="பிரிவை நீக்க"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add Grade Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGradeModalInput}
                      onChange={(e) => setNewGradeModalInput(e.target.value)}
                      placeholder="புதிய வகுப்பு / தரம் (எ.கா: தரம் 05, A/L 2026, தரம் 12)..."
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newGradeModalInput.trim()) {
                            handleAddCustomGrade(newGradeModalInput.trim());
                            setNewGradeModalInput("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newGradeModalInput.trim()) {
                          handleAddCustomGrade(newGradeModalInput.trim());
                          setNewGradeModalInput("");
                        }
                      }}
                      disabled={!newGradeModalInput.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus size={14} /> சேர்க்க
                    </button>
                  </div>

                  {/* List of Grades */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      தற்போது பயன்பாட்டில் உள்ள வகுப்புகள்:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {gradesList.map((grade) => {
                        const isAll = grade === 'அனைத்து வகுப்புகள்';
                        return (
                          <div
                            key={grade}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              <span className="text-red-600">🎓</span> {grade}
                            </span>
                            {!isAll && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomGrade(grade)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                                title="வகுப்பை நீக்க"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                சேர்க்கப்படும் மாற்றங்கள் உடனடியாக நினைவகத்தில் மற்றும் தரவுத்தளத்தில் சேமிக்கப்படும்.
              </p>
              <button
                type="button"
                onClick={() => setIsManageCatsGradesOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                முடிந்தது
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
