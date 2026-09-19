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
  Music
} from "lucide-react";
import { 
  getCourseMaterials, 
  saveCourseMaterials, 
  getYoutubeLinks, 
  saveYoutubeLinks,
  getTamilAsanKnowledge,
  saveTamilAsanKnowledge,
  getChatbotSettings,
  saveChatbotSettings,
  getAllUnifiedLinks,
  saveAllUnifiedLinks,
  UnifiedLinkItem
} from "../lib/db";
import { uploadFileToFirebaseStorage } from "../lib/firebase";
import { resolveMediaUrl } from "../lib/fileStorage";
import {
  getTamilAsanSettings,
  saveTamilAsanSettings,
  TamilAsanSettings,
  DEFAULT_TAMIL_ASAN_SETTINGS,
  playTeacherVoice
} from "../lib/tamilAsanEngine";

const GRADES = [
  "அனைத்து வகுப்புகள்",
  "30 DAY'S TAMIL COURSE",
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
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
  // Tabs: universal_links (Default), firebase_pdf, general_notes, voice_settings
  const [activeTab, setActiveTab] = useState<'universal_links' | 'firebase_pdf' | 'general_notes' | 'voice_settings'>('universal_links');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Unified Links State (Ordered Links Hub)
  const [unifiedLinks, setUnifiedLinks] = useState<UnifiedLinkItem[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkGrade, setLinkGrade] = useState("அனைத்து வகுப்புகள்");
  const [linkSubject, setLinkSubject] = useState("தமிழ்");
  const [isBulkLinkMode, setIsBulkLinkMode] = useState(false);
  const [bulkLinksText, setBulkLinksText] = useState("");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'youtube' | 'drive' | 'web' | 'pdf'>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Tab 2: Direct Firebase PDF Upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfGrades, setPdfGrades] = useState<string[]>(["தரம் 10", "தரம் 11"]);
  const [pdfSubject, setPdfSubject] = useState("தமிழ்");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Tab 3: General Knowledge & Special Notes for Asan
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState("இலக்கணம்");
  const [noteGrade, setNoteGrade] = useState("அனைத்து வகுப்புகள் (General)");
  const [noteContent, setNoteContent] = useState("");

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
      const [uLinks, kList, settings] = await Promise.all([
        getAllUnifiedLinks().catch(() => []),
        getTamilAsanKnowledge().catch(() => []),
        getTamilAsanSettings().catch(() => DEFAULT_TAMIL_ASAN_SETTINGS)
      ]);
      setUnifiedLinks(uLinks);
      setKnowledgeList(kList);
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
              subject: linkSubject
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
  // Delete Unified Link
  // -------------------------------------------------------------
  const handleDeleteUnifiedLink = async (id: string) => {
    if (!window.confirm("இந்த இணைப்பை நீக்க விரும்புகிறீர்களா?")) return;
    const filtered = unifiedLinks.filter(item => item.id !== id);
    // Re-index so order remains 1, 2, 3...
    const reindexed = filtered.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    setUnifiedLinks(reindexed);
    await saveAllUnifiedLinks(reindexed);
    showNotification("இணைப்பு நீக்கப்பட்டு வரிசை சீரமைக்கப்பட்டது.", 'info');
    onMaterialsUpdated?.();
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
    if (linkSearchQuery.trim()) {
      const q = linkSearchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchUrl = item.url?.toLowerCase().includes(q);
      const matchSub = item.subject?.toLowerCase().includes(q);
      const matchGrade = item.grade?.toLowerCase().includes(q);
      if (!matchTitle && !matchUrl && !matchSub && !matchGrade) return false;
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
  // Tab 3: Save General Notes
  // -------------------------------------------------------------
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert("தலைப்பு மற்றும் விபரத்தை உள்ளிடவும்!");
      return;
    }

    setIsLoading(true);
    try {
      const current = await getTamilAsanKnowledge();
      const newItem = {
        id: Date.now().toString(),
        title: noteTitle.trim(),
        category: noteCategory,
        grade: noteGrade,
        content: noteContent.trim(),
        createdAt: Date.now()
      };
      const updated = [newItem, ...current];
      await saveTamilAsanKnowledge(updated);
      setKnowledgeList(updated);
      showNotification("பொதுவான அறிவு / இலக்கணக் குறிப்பு தமிழ் ஆசானின் நினைவகத்தில் சேர்க்கப்பட்டது!", 'success');
      setNoteTitle("");
      setNoteContent("");
    } catch (e: any) {
      showNotification(`பிழை: ${e?.message || e}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!window.confirm("இந்தக் குறிப்பை நீக்க விரும்புகிறீர்களா?")) return;
    try {
      const current = await getTamilAsanKnowledge();
      const updated = current.filter((k: any) => k.id !== id);
      await saveTamilAsanKnowledge(updated);
      setKnowledgeList(updated);
      showNotification("குறிப்பு நீக்கப்பட்டது.", 'info');
    } catch (e: any) {
      showNotification(`நீக்குவதில் பிழை: ${e?.message || e}`, 'error');
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

                {/* Title & Grade & Subject Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Title */}
                  <div className="md:col-span-6">
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

                  {/* Grade */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">வகுப்பு / தரம் (Grade)</label>
                    <select
                      value={linkGrade}
                      onChange={(e) => setLinkGrade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                    >
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">பாடம் / பிரிவு</label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">வகுப்பு / தரம்</label>
                    <select
                      value={linkGrade}
                      onChange={(e) => setLinkGrade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">பாடம் / பிரிவு</label>
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

            {/* Search and Grade Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  placeholder="தலைப்பு அல்லது லிங்க் கொண்டு தேட..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500"
                >
                  <option value="all">அனைத்து வகுப்புகள் (All Grades)</option>
                  {GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
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
                <h4 className="font-bold text-slate-700 text-sm">இன்னும் இணைப்புகள் இல்லை</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  மேலே உள்ள உள்ளீட்டுப் பகுதியில் உங்கள் Google Drive, YouTube அல்லது எந்தவொரு இணைய லிங்க்கையும் ஒட்டிச் சேர்க்கத் தொடங்கவும்.
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">வகுப்பு / தரம்</label>
              <div className="flex flex-wrap gap-2">
                {GRADES.filter(g => g !== 'அனைத்து வகுப்புகள்').map((g) => {
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: General Knowledge & Special Notes                                  */}
      {/* ========================================================================= */}
      {activeTab === 'general_notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              புதிய குறிப்பு / விதி சேர்க்க
            </h3>
            <p className="text-xs text-slate-500">
              இலக்கண விதிகள், அகாடமி வழிகாட்டல்கள் போன்றவற்றைத் தட்டச்சு செய்து சேர்க்கலாம்.
            </p>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">தலைப்பு <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="எ.கா: வலிமிகும் இடங்கள் விதி 1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">பிரிவு / வகை</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="இலக்கணம்">இலக்கணம்</option>
                  <option value="இலக்கிய நயம்">இலக்கிய நயம்</option>
                  <option value="வினா விடை">வினா விடை</option>
                  <option value="பொதுவான தகவல்">பொதுவான தகவல்</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">பொருந்தும் தரம்</label>
                <select
                  value={noteGrade}
                  onChange={(e) => setNoteGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="அனைத்து வகுப்புகள் (General)">அனைத்து வகுப்புகள் (General)</option>
                  {GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">விளக்கம் / குறிப்பு உரை <span className="text-red-500">*</span></label>
                <textarea
                  rows={6}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="இங்கு விளக்கங்களைத் தட்டச்சு செய்யவும்..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Save size={14} /> ஆசான் நினைவகத்தில் சேமி
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <BookOpen size={16} className="text-slate-600" />
                தற்போது நினைவகத்தில் உள்ள விசேட குறிப்புகள் ({knowledgeList.length})
              </h3>
            </div>

            {knowledgeList.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                இன்னும் விசேடக் குறிப்புகள் சேர்க்கப்படவில்லை. இடதுபுறப் படிவத்தைப் பயன்படுத்திச் சேர்க்கலாம்.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {knowledgeList.map((item: any) => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                        <button
                          onClick={() => handleDeleteKnowledge(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          {item.grade || 'பொதுவானது'}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          {item.category || 'குறிப்பு'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl line-clamp-3 whitespace-pre-wrap font-sans">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
                    <label className="text-[11px] font-bold text-slate-700">ElevenLabs API Key:</label>
                    <input
                      type="password"
                      value={elevenLabsApiKey}
                      onChange={(e) => setElevenLabsApiKey(e.target.value)}
                      placeholder="sk_..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Voice ID (ஆசானின் குரல் ID):</label>
                    <input
                      type="text"
                      value={elevenLabsVoiceId}
                      onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                      placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-purple-500 font-mono"
                    />
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
    </div>
  );
}
