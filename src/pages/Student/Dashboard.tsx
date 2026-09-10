import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CursorTrail } from "../../components/CursorTrail";
import {
  Home,
  Book,
  BookOpen,
  DollarSign,
  User,
  Link,
  Gamepad2,
  Video,
  Globe,
  Bell,
  LogOut,
  Calendar,
  Youtube,
  Edit2,
  Check,
  FileText,
  Download,
  Phone,
  Clock,
  Camera,
  Info,
  X,
  CheckCircle,
  XCircle,
  Play,
  ExternalLink,
  Award,
  QrCode,
  RotateCw,
  MessageCircle,
  ShieldAlert,
  Share2,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
  Folder,
  Search,
  Grid,
  List,
  Star,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import QrScanner from "../../components/QrScanner";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import RecordingSection, { deduplicateCourses, areSubjectsMatching, doesItemMatchGrade, doesItemMatchStudentSubjects, normalizeGradeString, getCanonicalSubjectCategory, filterSubjectsForStudentGrade, isSubjectValidForGrade } from "../../components/RecordingSection";

import { getCourses, getCourseMaterials, getZoomLinks, getYoutubeLinks, getFees, getAttendance, saveAttendance, getClassLinks, getCourseWebsiteLinks, getHomework, getStaffs, getTimeTable, getStudents, saveStudents, getAdminSettings, getClasses, getExamMarks, saveExamMarks, getWebPosts, getStudentMenuLabels, DEFAULT_STUDENT_MENU_LABELS, StudentMenuLabels, getTermExams, getExamSubmissions, saveExamSubmissions } from "../../lib/db";
import { formatEmbedUrl } from "../Admin/TermExam";
import { getUserSession, saveUserSession, clearUserSession } from "../../lib/authSession";
import CountdownTimer from "../../components/CountdownTimer";
import PopupAnnouncement from "../../components/PopupAnnouncement";
import LiveChat from "../../components/LiveChat";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useHomeworkNotifications } from "../../hooks/useHomeworkNotifications";
import { useRealtimeNotifications } from "../../hooks/useRealtimeNotifications";
import { useTimetableNotifications } from "../../hooks/useTimetableNotifications";
import { 
  getUnattendedExams, 
  updateAppBadge, 
  clearAppBadge, 
  showSystemNotification, 
  requestSystemNotificationPermission 
} from "../../lib/badgeManager";
import OfficialReportCard, { ReportCardData, generateSingleStudentPdf } from "../../components/OfficialReportCard";

export const normalizeSub = (str: string) => {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.toLowerCase() === 'tamil') return 'தமிழ்';
  return str.toLowerCase()
    .replace(/\(தரம்\s*\d+\)/gi, '')
    .replace(/\(grade\s*\d+\)/gi, '')
    .replace(/தரம்\s*\d+/gi, '')
    .replace(/grade\s*\d+/gi, '')
    .replace(/[\(\)\-\:\,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getCanonicalSubject = (s: string): string => {
  if (!s) return "";
  const raw = normalizeSub(s);

  if (raw === "tamil" || raw === "தமிழ்") {
    return "தமிழ்";
  }

  if (raw.includes("நயம்") || raw.includes("nayam") || (raw.includes("இலக்கிய") && raw.includes("நயம்"))) {
    return "tamil_ilakkia_nayam";
  }
  if (raw.includes("மொழி") && raw.includes("இலக்கிய")) {
    return "tamil_mozhi_ilakkiam";
  }
  if (raw.includes("30 நாள்") || raw.includes("30 day")) {
    if (raw.includes("15") || raw.includes("30 வது")) return "tamil_30_days_part2";
    return "tamil_30_days";
  }
  if (raw.includes("வினா") || raw.includes("vina") || raw.includes("q&a") || raw.includes("question")) {
    return "tamil_vina_vidai";
  }
  if (raw.includes("வளம்") || raw.includes("game")) {
    return "tamil_mozhi_valam";
  }

  return raw;
};

export const formatSubjectDisplayName = (s?: any): string => {
  if (!s) return "";
  const str = String(s).trim();
  if (str.toLowerCase() === "tamil") return "தமிழ்";
  return str.replace(/\btamil\b/gi, "தமிழ்");
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  
  const [courses, setCourses] = useState<any[]>([]);
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [zoomLinks, setZoomLinks] = useState<any[]>([]);
  const [youtubeLinks, setYoutubeLinks] = useState<any[]>([]);
  const [webPosts, setWebPosts] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classLinks, setClassLinks] = useState<Record<string, string>>({});
  const [courseWebsiteLinks, setCourseWebsiteLinks] = useState<Record<string, string>>({});
  const [homework, setHomework] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [eLearningType, setELearningType] = useState<"videos" | "posts">("videos");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [activeMeetingUrl, setActiveMeetingUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<{subject: string, day: number} | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [selectedMaterialSubject, setSelectedMaterialSubject] = useState<string | null>(null);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>("ALL");
  const [selectedELearningSubject, setSelectedELearningSubject] = useState<string>("All");
  const [showAccessBlockedModal, setShowAccessBlockedModal] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [videoViewMode, setVideoViewMode] = useState<"grid" | "list">("grid");
  const [activeWatchVideo, setActiveWatchVideo] = useState<any | null>(null);
  const [termExams, setTermExams] = useState<any[]>([]);
  const [examSubmissions, setExamSubmissions] = useState<any[]>([]);
  const [activeExamTaking, setActiveExamTaking] = useState<any | null>(null);
  const [marksSubTab, setMarksSubTab] = useState<"exams" | "results" | "reports">("exams");
  const [submittedSuccessExam, setSubmittedSuccessExam] = useState<{ examName: string; subject: string; obtained: number; total: number; percentage: number; gradeLetter: string } | null>(null);
  const [studentSelfMarksInput, setStudentSelfMarksInput] = useState<{ obtained: string; total: string; remarks: string }>({
    obtained: "",
    total: "100",
    remarks: ""
  });
  const [isSubmittingMarks, setIsSubmittingMarks] = useState(false);

  const handleTabSelect = (tabId: string) => {
    const restrictedTabs = ["youtube", "course_materials", "courses", "subjects"];
    if (currentStudentData?.zoomBlocked && restrictedTabs.includes(tabId)) {
      setShowAccessBlockedModal(true);
      return;
    }
    setActiveTab(tabId);
  };

  // Helper to get a color based on subject name
  const getSubjectColorClasses = (subjectName: string) => {
    const themes: Record<string, { bg: string, text: string, border: string, dot: string, tooltip: string }> = {
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', dot: 'bg-indigo-500', tooltip: 'text-indigo-300' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', dot: 'bg-blue-500', tooltip: 'text-blue-300' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', dot: 'bg-emerald-500', tooltip: 'text-emerald-300' },
      rose: { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', dot: 'bg-rose-500', tooltip: 'text-rose-300' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-500', tooltip: 'text-amber-300' },
      violet: { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', dot: 'bg-violet-500', tooltip: 'text-violet-300' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', dot: 'bg-cyan-500', tooltip: 'text-cyan-300' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', dot: 'bg-pink-500', tooltip: 'text-pink-300' },
    };
    
    const colors = ["indigo", "blue", "emerald", "rose", "amber", "violet", "cyan", "pink"];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    return themes[color];
  };
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [filterTeacher, setFilterTeacher] = useState<string>("All");
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [pendingMonthName, setPendingMonthName] = useState("");

  const groupStudentFees = (rawFees: any[]) => {
    // Filter out zero amount records (LKR 0.00)
    const validFees = (rawFees || []).filter((f: any) => {
      const amt = parseFloat(f.amount) || 0;
      const full = parseFloat(f.fullFee) || 0;
      return amt > 0 || full > 0;
    });

    const groups: { [key: string]: any } = {};

    validFees.forEach((fee: any) => {
      let key = fee.batchId;
      if (!key && fee.transactionId) {
        key = fee.transactionId.split('-')[0] + '-' + fee.transactionId.split('-')[1];
        if (fee.transactionId.split('-').length < 2) key = fee.transactionId;
      }
      if (!key) {
        key = `${fee.studentId || fee.studentName}_${fee.date}_${fee.month || 'no_month'}`;
      }

      const itemFull = Number(fee.fullFee || fee.amount) || 0;
      const itemPaid = Number(fee.amount) || 0;
      const itemRem = Number(fee.remainingAmount || "0") || 0;

      const batchFull = fee.batchSubTotal || fee.batchFullFee ? Number(fee.batchSubTotal || fee.batchFullFee) : null;
      const batchDiscount = fee.batchDiscount !== undefined && fee.batchDiscount !== null ? Number(fee.batchDiscount) : null;
      const batchNet = fee.batchNetPayable ? Number(fee.batchNetPayable) : null;
      const batchPaid = fee.batchAmountPaid ? Number(fee.batchAmountPaid) : null;
      const batchRem = fee.batchRemaining ? Number(fee.batchRemaining) : null;
      const itemDiscount = Number(fee.discount) || 0;

      if (!groups[key]) {
        groups[key] = {
          ...fee,
          id: key,
          batchId: key,
          totalAmount: batchFull !== null && !isNaN(batchFull) && batchFull > 0 ? batchFull : itemFull,
          subTotal: batchFull !== null && !isNaN(batchFull) && batchFull > 0 ? batchFull : itemFull,
          discount: batchDiscount !== null && !isNaN(batchDiscount) ? batchDiscount : itemDiscount,
          discountReason: fee.batchDiscountReason || fee.discountReason || "",
          netPayable: batchNet !== null && !isNaN(batchNet) ? batchNet : Math.max(0, itemFull - itemDiscount),
          amountPaid: batchPaid !== null && !isNaN(batchPaid) && batchPaid > 0 ? batchPaid : itemPaid,
          remainingAmount: batchRem !== null && !isNaN(batchRem) ? batchRem : itemRem,
          items: [{ 
            label: (fee.itemName || fee.type), 
            amount: itemFull, 
            discount: itemDiscount,
            paidAmount: itemPaid,
            remainingAmount: itemRem,
            type: fee.type, 
            itemName: fee.itemName || fee.type, 
            category: fee.category,
            month: fee.month
          }],
          displayType: fee.type,
          displayMonth: fee.month
        };
      } else {
        groups[key].items.push({ 
          label: (fee.itemName || fee.type), 
          amount: itemFull, 
          discount: itemDiscount,
          paidAmount: itemPaid,
          remainingAmount: itemRem,
          type: fee.type, 
          itemName: fee.itemName || fee.type, 
          category: fee.category,
          month: fee.month
        });

        if (fee.type === 'Monthly Tuition') {
          groups[key].displayMonth = fee.month;
        }

        const hasBatchLevel = (groups[key].batchSubTotal || groups[key].batchFullFee) && Number(groups[key].batchSubTotal || groups[key].batchFullFee) > 0;
        if (!hasBatchLevel) {
          groups[key].totalAmount = (Number(groups[key].totalAmount) || 0) + itemFull;
          groups[key].subTotal = (Number(groups[key].subTotal) || 0) + itemFull;
          groups[key].discount = (Number(groups[key].discount) || 0) + itemDiscount;
          groups[key].amountPaid = (Number(groups[key].amountPaid) || 0) + itemPaid;
          groups[key].remainingAmount = (Number(groups[key].remainingAmount) || 0) + itemRem;
        }
      }
    });

    return Object.values(groups).sort((a: any, b: any) => 
      new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime()
    );
  };

  // Get student data from login or localStorage
  const [studentData, setStudentData] = useState<any>(location.state);
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);

  // Refresh student data to get latest zoomBlocked status
  const [currentStudentData, setCurrentStudentData] = useState<any>(null);

  const isChatOpen = activeTab === "chat";
  const { unreadCount, markAsRead } = useChatNotifications(studentData ? { id: studentData.id, name: studentData.name, role: "Student", grade: studentData.grade } : null, isChatOpen);

  const { notifications } = useHomeworkNotifications('student', studentData?.grade);
  const { reminders: timetableReminders } = useTimetableNotifications('student', studentData?.grade);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [realtimeNotifications, setRealtimeNotifications] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('notification_history') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [newNotification, setNewNotification] = useState<any>(null);
  const [badgeCount, setBadgeCount] = useState(() => {
    return parseInt(localStorage.getItem(`app_badge_count_${studentData?.grade}`) || "0");
  });
  const [unattendedExamsCount, setUnattendedExamsCount] = useState<number>(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [menuLabels, setMenuLabels] = useState<StudentMenuLabels>(DEFAULT_STUDENT_MENU_LABELS);

  // Synchronize unattended exams and App Icon badge count
  useEffect(() => {
    if (studentData?.id && studentData?.grade) {
      const unattended = getUnattendedExams(termExams, examSubmissions, studentData.id, studentData.grade);
      setUnattendedExamsCount(unattended.length);
      setBadgeCount(unattended.length);
      updateAppBadge(unattended.length);
    }
  }, [termExams, examSubmissions, studentData?.id, studentData?.grade]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      const handleFocus = () => {
        setNotificationPermission(Notification.permission);
        if (studentData?.id && studentData?.grade) {
          const unattended = getUnattendedExams(termExams, examSubmissions, studentData.id, studentData.grade);
          setUnattendedExamsCount(unattended.length);
          setBadgeCount(unattended.length);
          updateAppBadge(unattended.length);
        }
      };
      
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [studentData?.id, studentData?.grade, termExams, examSubmissions]);

  // Helper to get consistent vibrant colors for folders
  const getFolderColor = (folderName: string) => {
    const colors = [
      { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-600', border: 'border-red-100', shadow: 'shadow-red-100' },
      { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-100' },
      { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-600', border: 'border-green-100', shadow: 'shadow-green-100' },
      { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-600', border: 'border-purple-100', shadow: 'shadow-purple-100' },
      { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-600', border: 'border-orange-100', shadow: 'shadow-orange-100' },
      { bg: 'bg-pink-50', text: 'text-pink-600', icon: 'bg-pink-600', border: 'border-pink-100', shadow: 'shadow-pink-100' },
      { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-600', border: 'border-indigo-100', shadow: 'shadow-indigo-100' },
      { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-600', border: 'border-teal-100', shadow: 'shadow-teal-100' },
    ];
    let hash = 0;
    for (let i = 0; i < folderName.length; i++) {
      hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Robust YouTube video ID parser
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (match) return match[1];
    if (url.includes('youtu.be/')) {
      const part = url.split('youtu.be/')[1];
      return part ? part.split('?')[0].split('&')[0] : null;
    }
    if (url.includes('v=')) {
      const part = url.split('v=')[1];
      return part ? part.split('&')[0].split('?')[0] : null;
    }
    return null;
  };

  // Helper to neatly parse day prefix from folder name (e.g., "நாள் - 09 ...")
  const parseFolderTitle = (folderName: string) => {
    if (!folderName) return { dayBadge: null, title: "பொதுவானவை (General)" };
    const dayMatch = folderName.match(/^(நாள்\s*[-–:]*\s*\d+|day\s*[-–:]*\s*\d+)(.*)/i);
    if (dayMatch) {
      const cleanTitle = dayMatch[2].replace(/^[\s\-–:,]+/, '').trim();
      return {
        dayBadge: dayMatch[1].trim(),
        title: cleanTitle || folderName
      };
    }
    return {
      dayBadge: null,
      title: folderName
    };
  };

  const parseSafeDate = (d: any): Date | null => {
    if (!d) return null;
    
    // Check if it's a Firestore Timestamp (has toDate method or seconds property)
    if (typeof d.toDate === "function") {
      try {
        return d.toDate();
      } catch (e) {
        // ignore
      }
    }
    
    if (d.seconds !== undefined) {
      return new Date(d.seconds * 1000);
    }
    
    if (typeof d === "string" || typeof d === "number") {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // In case it's already a Date object
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d;
    }
    
    return null;
  };

  const formatSafeDate = (d: any, options?: Intl.DateTimeFormatOptions, defaultValue = ""): string => {
    const parsed = parseSafeDate(d);
    if (!parsed) return defaultValue;
    try {
      return parsed.toLocaleDateString(undefined, options);
    } catch (e) {
      return defaultValue;
    }
  };

  const formatSafeTimeString = (d: any, options?: Intl.DateTimeFormatOptions, defaultValue = ""): string => {
    const parsed = parseSafeDate(d);
    if (!parsed) return defaultValue;
    try {
      return parsed.toLocaleTimeString([], options);
    } catch (e) {
      return defaultValue;
    }
  };

  const formatSafeDateTimeString = (d: any, defaultValue = ""): string => {
    const parsed = parseSafeDate(d);
    if (!parsed) return defaultValue;
    try {
      return parsed.toLocaleString();
    } catch (e) {
      return defaultValue;
    }
  };

  const getElementTime = (el: any) => {
    if (!el || !el.date) return 0;
    const parsed = parseSafeDate(el.date);
    return parsed ? parsed.getTime() : 0;
  };

  const getMaxElementTime = (elements: any[]) => {
    if (!Array.isArray(elements) || elements.length === 0) return 0;
    let maxT = 0;
    for (let i = 0; i < elements.length; i++) {
      const t = getElementTime(elements[i]);
      if (t > maxT) maxT = t;
    }
    return maxT;
  };

  const clearBadge = () => {
    const badgeKey = `app_badge_count_${studentData?.grade}`;
    localStorage.setItem(badgeKey, "0");
    // Preserve unattended exams in the badge
    const remaining = unattendedExamsCount;
    setBadgeCount(remaining);
    updateAppBadge(remaining);
  };

  useEffect(() => {
    if (showNotifications) {
      clearBadge();
    }
  }, [showNotifications, unattendedExamsCount]);

  const requestNotificationPermission = async () => {
    const permission = await requestSystemNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showSystemNotification("அகரம் தினைஸ் அகாடமி 🎓", {
        body: `அறிவிப்புகள் வெற்றிகரமாக செயல்படுத்தப்பட்டுள்ளன! தற்போது ${unattendedExamsCount} பரீட்சை எழுதப்படவுள்ளது.`,
        badgeCount: unattendedExamsCount || 1,
        url: '/student-dashboard?tab=marks&subTab=exams'
      });
    }
  };
  
  // Real-time notifications for Zoom classes, etc.
  useRealtimeNotifications(studentData?.grade, (notif) => {
    console.log("Dashboard received notification:", notif);
    
    // Add to local state (at the top)
    setRealtimeNotifications(prev => {
      // Check for duplicates
      const isDuplicate = prev.some(p => (notif.id && p.id === notif.id) || (p.message === notif.message && p.title === notif.title));
      if (isDuplicate) return prev;
      
      const updated = [notif, ...prev].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }).slice(0, 50);
      localStorage.setItem('notification_history', JSON.stringify(updated));
      return updated;
    });

    if (!notif._isInitial) {
      setNewNotification(notif);
      const count = parseInt(localStorage.getItem(`app_badge_count_${studentData?.grade}`) || "0");
      setBadgeCount(count);
      
      // Play a gentle notification sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      // Auto hide toast after 10 seconds
      setTimeout(() => setNewNotification(null), 10000);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  });

  useEffect(() => {
    // Keep app badge in sync with unattended exams count
    if (studentData?.id && studentData?.grade) {
      const unattended = getUnattendedExams(termExams, examSubmissions, studentData.id, studentData.grade);
      setUnattendedExamsCount(unattended.length);
      setBadgeCount(unattended.length);
      updateAppBadge(unattended.length);
    }
  }, [studentData?.id, studentData?.grade, termExams, examSubmissions]);

  const handleQrScan = async (decodedText: string) => {
    setShowQrScanner(false);
    try {
      let data;
      try {
        data = JSON.parse(decodedText);
      } catch (e) {
        data = { id: decodedText };
      }

      if (data.type === 'student' || !data.type) {
        const students = await getStudents();
        const student = students.find((s: any) => s.id === data.id);
        if (student) {
          if (student.zoomBlocked) {
            alert("zoom வகுப்பிற்கான கட்டணம் செலுத்தியப் பின் இணைக்கப்படுவீர்கள்");
            return;
          }
          const newStudentData = {
            id: student.id,
            username: student.username,
            name: student.name,
            grade: student.grade,
            rollNo: student.rollNo,
            enrolledClasses: student.enrolledClasses || [],
            role: 'Student'
          };
          saveUserSession(newStudentData);
          setStudentData(newStudentData);
          setCurrentStudentData(student);
          alert(`Successfully logged in as ${student.name}`);
          return;
        }
      }
      alert("Invalid Student QR Code");
    } catch (error) {
      console.error("QR Login Error:", error);
      alert("QR Login failed");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let data = studentData || location.state;
    if (!data) {
      const session = getUserSession();
      if (session && session.role === 'Student') {
        data = session;
        setStudentData(session);
      }
    }

    if (!data) {
      navigate("/", { replace: true });
      return;
    }

    setEnrolledClasses(data.subjects || data.enrolledClasses || []);
    setCurrentStudentData(data);

    const loadData = async () => {
      let freshStudentData: any = data;
      try {
        const allStudents = await getStudents();
        const targetId = String(data.id || data.student_id || '').trim().toLowerCase();
        const targetRoll = String(data.rollNo || '').trim().toLowerCase();
        const targetUser = String(data.username || '').trim().toLowerCase();

        if (Array.isArray(allStudents) && allStudents.length > 0) {
          const matched = allStudents.find((s: any) => {
            if (!s) return false;
            const sId = String(s.id || s.student_id || '').trim().toLowerCase();
            const sRoll = String(s.rollNo || '').trim().toLowerCase();
            const sUser = String(s.username || '').trim().toLowerCase();
            return (targetId && sId === targetId) || (targetRoll && sRoll === targetRoll) || (targetUser && sUser === targetUser);
          });
          
          if (matched) {
            freshStudentData = matched;
            setStudentData(matched);
            setCurrentStudentData(matched);
            setDisplayName(matched.name);
            setProfileImage(matched.image || null);
            setEnrolledClasses(matched.subjects || matched.enrolledClasses || []);
            saveUserSession({ ...data, ...matched, role: 'Student' });
          }
        }
      } catch (err) {
        console.warn("Could not sync fresh student data, retaining session:", err);
      }

      const allCourses = await getCourses();
      const allCourseMaterials = await getCourseMaterials();
      const allZoomLinks = await getZoomLinks();
      const allFees = await getFees();
      const allAttendance = await getAttendance();
      const allStaffs = await getStaffs();
      const allTimetable = await getTimeTable();
      const allExamMarks = await getExamMarks();
      const allClasses = await getClasses();
      const settings = await getAdminSettings();
      const allYoutubeLinks = await getYoutubeLinks();
      const allWebPosts = await getWebPosts();
      const customMenuLabels = await getStudentMenuLabels();
      if (customMenuLabels) {
        setMenuLabels(customMenuLabels);
      }
      
      const studentGrade = freshStudentData.grade?.toString().trim().toLowerCase() || "";
      const normalizedStudentGrade = studentGrade.replace(/[^0-9]/g, '');

      const rawStudentSubs: any[] = [
        ...(Array.isArray(freshStudentData.subjects) ? freshStudentData.subjects : []),
        ...(Array.isArray(freshStudentData.enrolledClasses) ? freshStudentData.enrolledClasses : [])
      ];

      const studentGradeStr = (freshStudentData.grade || "").toString().trim().toLowerCase();
      const studentGradeNum = studentGradeStr.replace(/[^0-9]/g, '');

      let studentSubjectsArray = filterSubjectsForStudentGrade(rawStudentSubs, freshStudentData.grade || "");

      // Fallback: If student has no individual subjects assigned, resolve default subjects for their grade from classes
      if (studentSubjectsArray.length === 0) {
        const matchingClass = allClasses.find((c: any) => {
          if (!c?.name) return false;
          const cName = c.name.toString().trim();
          const cNum = cName.replace(/[^0-9]/g, '');
          return (studentGradeNum && cNum === studentGradeNum) || (cName.toLowerCase() === studentGradeStr);
        });
        if (matchingClass && Array.isArray(matchingClass.subjects) && matchingClass.subjects.length > 0) {
          studentSubjectsArray = filterSubjectsForStudentGrade(matchingClass.subjects, freshStudentData.grade || "");
        }
      }
      studentSubjectsArray = Array.from(new Set(studentSubjectsArray));

      setEnrolledClasses(studentSubjectsArray);
      freshStudentData = {
        ...freshStudentData,
        subjects: studentSubjectsArray,
        enrolledClasses: studentSubjectsArray
      };
      setStudentData(freshStudentData);

      const filterItemByGradeAndSubject = (c: any) => {
        if (!c) return false;

        // 1. Grade Isolation: Item MUST strictly match this student's grade (e.g. தரம் 01 only for தரம் 01)
        const targetStudentGrade = freshStudentData.grade || "தரம் 10";
        const matchesGrade = doesItemMatchGrade(c, targetStudentGrade);
        if (!matchesGrade) return false;

        // 2. Subject Isolation: If student has enrolled subjects, item MUST match their subjects
        if (studentSubjectsArray.length > 0) {
          const matchesSubject = doesItemMatchStudentSubjects(c, studentSubjectsArray);
          if (!matchesSubject) return false;
        }

        return true;
      };

      const filterBySubjectAndGrade = (item: any) => {
        if (!item) return false;
        return filterItemByGradeAndSubject(item);
      };

      setCourses(deduplicateCourses(allCourses.filter(filterBySubjectAndGrade)));
      setCourseMaterials(allCourseMaterials.filter(filterBySubjectAndGrade));
      
      setZoomLinks(allZoomLinks.filter(filterBySubjectAndGrade));
      
      setYoutubeLinks(allYoutubeLinks.filter(filterBySubjectAndGrade));
      setWebPosts(allWebPosts.filter(filterBySubjectAndGrade));

      const studentFees = allFees.filter((f: any) => 
        (f.studentId && (
          f.studentId.toString().trim().toLowerCase() === freshStudentData.id?.toString().trim().toLowerCase() ||
          f.studentId.toString().trim().toLowerCase() === freshStudentData.student_id?.toString().trim().toLowerCase()
        )) ||
        (f.studentName && f.studentName.toString().trim().toLowerCase() === freshStudentData.name?.toString().trim().toLowerCase())
      );
      setFees(groupStudentFees(studentFees));
      
      // Check for pending fees for current and previous months (Starting from April 2026)
      const now = new Date();
      const unpaidMonths: string[] = [];
      
      // Start checking from April 2026 (2026-04)
      const startYear = 2026;
      const startMonthIndex = 3; 
      
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();
      
      let iterStartDate = new Date(startYear, startMonthIndex, 1);
      
      if (freshStudentData.admissionDate) {
        const admissionDate = new Date(freshStudentData.admissionDate);
        if (!isNaN(admissionDate.getTime())) {
          const admStart = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
          if (admStart > iterStartDate) {
            iterStartDate = new Date(admStart);
          }
        }
      }

      const limitDate = new Date(currentYear, currentMonthIndex, 1);
      let currentCheck = new Date(iterStartDate.getFullYear(), iterStartDate.getMonth(), 1);
      
      while (currentCheck <= limitDate) {
        const y = currentCheck.getFullYear();
        const m = String(currentCheck.getMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        
        const hasPaid = studentFees.some((f: any) => f.month === monthKey);
        if (!hasPaid) {
          unpaidMonths.push(currentCheck.toLocaleString('default', { month: 'long', year: 'numeric' }));
        }
        currentCheck.setMonth(currentCheck.getMonth() + 1);
      }

      if (unpaidMonths.length > 0) {
        setHasPendingFees(true);
        setPendingMonthName(unpaidMonths.join(', '));
      } else {
        setHasPendingFees(false);
      }

      setAttendance(allAttendance.filter((a: any) => a.studentId === freshStudentData.id || a.studentId === freshStudentData.student_id));
      getClassLinks().then(setClassLinks);
      getCourseWebsiteLinks().then(setCourseWebsiteLinks);
      setStaffs(allStaffs);
      
      setTimetable(allTimetable.filter((t: any) => {
        const itemGrade = t.grade?.toString().trim().toLowerCase() || "";
        return itemGrade === studentGrade || (normalizedStudentGrade && itemGrade.includes(normalizedStudentGrade));
      }));
      
      setExamMarks(allExamMarks.filter((m: any) => 
        m.studentId === freshStudentData.id || 
        m.studentId === freshStudentData.student_id ||
        m.studentName === freshStudentData.name
      ));
      setClasses(allClasses);
      setAdminSettings(settings);
      
      const [allHomework, loadedTermExams, loadedSubmissions] = await Promise.all([
        getHomework(),
        getTermExams(),
        getExamSubmissions()
      ]);
      setTermExams(loadedTermExams || []);
      setExamSubmissions(loadedSubmissions || []);
      
      const unattended = getUnattendedExams(loadedTermExams || [], loadedSubmissions || [], freshStudentData.id, freshStudentData.grade);
      setUnattendedExamsCount(unattended.length);
      setBadgeCount(unattended.length);
      updateAppBadge(unattended.length);
      
      // Filter homework to only show assignments from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      setHomework(allHomework.filter((h: any) => {
        if (h.grade?.toString().trim().toLowerCase() !== data.grade?.toString().trim().toLowerCase()) return false;
        const hwDate = new Date(h.date);
        return hwDate >= sevenDaysAgo;
      }));
    };
    loadData();

    const handleDbUpdate = (e: CustomEvent) => {
      const key = e.detail?.key;
      if (['courseMaterials', 'courses', 'zoomLinks', 'youtubeLinks', 'webPosts', 'students', 'classes', 'staffs', 'timetable', 'examMarks', 'homework', 'termExams', 'examSubmissions'].includes(key)) {
        loadData();
      }
    };
    window.addEventListener('db_updated', handleDbUpdate as EventListener);

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearInterval(interval);
      window.removeEventListener('db_updated', handleDbUpdate as EventListener);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [navigate, location.state, activeTab]);

  // Handle direct exam navigation via URL parameter e.g., ?examId=exam_123 or ?tab=marks
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const examIdParam = params.get('examId');
    const tabParam = params.get('tab');
    const subTabParam = params.get('subTab');

    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (subTabParam === 'exams' || subTabParam === 'results') {
      setMarksSubTab(subTabParam as "exams" | "results");
    }

    if (examIdParam && termExams.length > 0) {
      const foundExam = termExams.find((ex: any) => ex.id === examIdParam);
      if (foundExam) {
        setActiveTab("marks");
        setMarksSubTab("exams");
        setActiveExamTaking(foundExam);
      }
    }
  }, [location.search, termExams]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const [displayName, setDisplayName] = useState(studentData?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName);
  const [profileImage, setProfileImage] = useState(studentData?.image || null);
  const [generatingReportData, setGeneratingReportData] = useState<{ examName: string, marks: any[] } | null>(null);

  const getGradeLetter = (obt: number, tot: number) => {
    const percent = (obt / tot) * 100;
    if (percent >= 90) return { grade: 'A+', color: 'text-emerald-600 bg-emerald-50' };
    if (percent >= 80) return { grade: 'A', color: 'text-green-600 bg-green-50' };
    if (percent >= 70) return { grade: 'B', color: 'text-indigo-600 bg-indigo-50' };
    if (percent >= 60) return { grade: 'C', color: 'text-blue-600 bg-blue-50' };
    if (percent >= 50) return { grade: 'D', color: 'text-amber-600 bg-amber-50' };
    return { grade: 'F', color: 'text-rose-600 bg-rose-50' };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const students = await getStudents();
        const updatedStudents = students.map((s: any) => 
          s.id === studentData.id ? { ...s, image: base64String } : s
        );
        await saveStudents(updatedStudents);
        setProfileImage(base64String);
        studentData.image = base64String;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    setDisplayName(tempName);
    setIsEditingName(false);
  };

  const handleDownloadIdCard = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('student-id-card-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${studentData.name}_ID_Card.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [3.375, 2.125]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 3.375, 2.125);
        pdf.save(`${studentData.name}_ID_Card.pdf`);
      }
    } catch (error) {
      console.error("Error generating ID card:", error);
      alert("Failed to generate ID card. Please try again.");
    }
  };

  const handleCopyIdCardImage = async () => {
    const element = document.getElementById('student-id-card-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      const response = await fetch(imgData);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (error) {
      console.error("Error copying ID card image:", error);
      alert("Failed to copy image. Copier is restricted in some preview modes. Try downloading as PNG instead. (படமாக நகலெடுக்க முடியவில்லை, PNG வடிவில் பதிவிறக்கம் செய்க.)");
    }
  };

  const handleDownloadCertificate = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('student-certificate-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${studentData.name}_Certificate.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [11, 8.5]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5);
        pdf.save(`${studentData.name}_Certificate.pdf`);
      }
    } catch (error) {
      console.error("Error generating Certificate:", error);
      alert("Failed to generate Certificate. Please try again.");
    }
  };

  const handleStudentSubmitSelfMarks = async (exam: any) => {
    if (!studentSelfMarksInput.obtained || isNaN(Number(studentSelfMarksInput.obtained))) {
      alert("தயவுசெய்து நீங்கள் பெற்ற மதிப்பெண்களை (Marks Obtained) உள்ளிடவும்.");
      return;
    }

    const obt = Number(studentSelfMarksInput.obtained);
    const tot = Number(studentSelfMarksInput.total) || Number(exam.totalMarks) || 100;
    if (obt < 0 || obt > tot) {
      alert(`மதிப்பெண் 0 மற்றும் ${tot} க்குள் இருக்க வேண்டும்.`);
      return;
    }

    setIsSubmittingMarks(true);
    try {
      const percent = (obt / tot) * 100;
      const gl = percent >= 75 ? 'A' : percent >= 65 ? 'B' : percent >= 50 ? 'C' : percent >= 35 ? 'S' : 'W';
      
      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newSubmission = {
        id: submissionId,
        examId: exam.id,
        examName: exam.examName,
        termName: exam.termName,
        subject: exam.subject || 'பொது',
        studentId: studentData.id,
        studentName: studentData.name,
        rollNo: studentData.rollNo || studentData.id,
        grade: studentData.grade,
        obtained: obt,
        total: tot,
        percentage: percent,
        gradeLetter: gl,
        remarks: studentSelfMarksInput.remarks || 'மாணவர் உள்ளீடு (Student Submitted)',
        status: 'submitted' as const,
        submittedAt: new Date().toISOString()
      };

      const currentSubs = await getExamSubmissions();
      const updatedSubs = [
        newSubmission,
        ...currentSubs.filter((s: any) => !(s.examId === exam.id && s.studentId === studentData.id))
      ];
      await saveExamSubmissions(updatedSubs);
      setExamSubmissions(updatedSubs);

      // Also sync into examMarks so it immediately reflects in the Report Card!
      const allMarks = await getExamMarks();
      const updatedMarks = [
        {
          id: submissionId,
          studentId: studentData.id,
          grade: studentData.grade,
          exam: exam.examName,
          subject: exam.subject || 'பொது',
          obtained: obt,
          total: tot,
          remarks: studentSelfMarksInput.remarks || 'மாணவர் உள்ளீடு (Online Exam)',
          date: new Date().toISOString().split('T')[0]
        },
        ...allMarks.filter((m: any) => !(m.studentId === studentData.id && m.exam === exam.examName && m.subject === (exam.subject || 'பொது')))
      ];
      await saveExamMarks(updatedMarks);
      setExamMarks(updatedMarks);

      // Recalculate unattended exams and immediately update app badge!
      const remainingUnattended = getUnattendedExams(termExams, updatedSubs, studentData.id, studentData.grade);
      setUnattendedExamsCount(remainingUnattended.length);
      setBadgeCount(remainingUnattended.length);
      updateAppBadge(remainingUnattended.length);

      window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'examSubmissions' } }));
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'examMarks' } }));

      setSubmittedSuccessExam({
        examName: exam.examName,
        subject: exam.subject || 'பொது',
        obtained: obt,
        total: tot,
        percentage: percent,
        gradeLetter: gl
      });

      alert(`✅ உங்கள் மதிப்பெண் வெற்றிகரமாகப் பதிவுசெய்யப்பட்டது! பெற்ற புள்ளி: ${obt}/${tot} (${gl})`);
      setActiveExamTaking(null);
    } catch (err) {
      console.error("Error submitting marks:", err);
      alert("மதிப்பெண்ணைப் பதிவுசெய்வதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setIsSubmittingMarks(false);
    }
  };

  // Official Report Card Data for Student
  const currentStudentReportCard = useMemo<ReportCardData>(() => {
    const studentMarksList = examMarks.filter(m => m.studentId === studentData?.id);
    const subjects = studentMarksList.map(m => {
      const obt = Number(m.obtained) || 0;
      const tot = Number(m.total) || 100;
      const pct = tot > 0 ? (obt / tot) * 100 : 0;
      let gl = 'W';
      if (pct >= 75) gl = 'A';
      else if (pct >= 65) gl = 'B';
      else if (pct >= 55) gl = 'C';
      else if (pct >= 35) gl = 'S';

      return {
        subject: m.subject || 'பொதுப் பாடம்',
        obtained: obt,
        total: tot,
        percentage: pct,
        gradeLetter: gl,
        status: pct >= 35 ? ("Pass" as const) : ("Fail" as const),
        remarks: m.remarks
      };
    });

    const totalObt = subjects.reduce((sum, s) => sum + s.obtained, 0);
    const totalPos = subjects.reduce((sum, s) => sum + s.total, 0);
    const overallPct = totalPos > 0 ? (totalObt / totalPos) * 100 : 0;
    let overallGrade = 'W';
    if (overallPct >= 75) overallGrade = 'A';
    else if (overallPct >= 65) overallGrade = 'B';
    else if (overallPct >= 55) overallGrade = 'C';
    else if (overallPct >= 35) overallGrade = 'S';

    const numGrade = parseInt((studentData?.grade || '').replace(/\D/g, '')) || 10;

    return {
      studentId: studentData?.id || '',
      studentName: studentData?.name || 'மாணவர்',
      rollNo: studentData?.rollNo || studentData?.id || 'AG-000',
      gradeNumber: numGrade,
      gradeLabel: studentData?.grade || `Grade ${numGrade}`,
      examName: studentMarksList[0]?.exam || "அகரம் உத்தியோகபூர்வ தவணைப் பரீட்சை",
      subjects,
      totalObtained: totalObt,
      totalPossible: totalPos,
      overallPercentage: overallPct,
      overallGrade,
      overallStatus: overallPct >= 35 ? "Pass" : "Fail",
      date: new Date().toISOString().split('T')[0]
    };
  }, [examMarks, studentData]);

  const handleDownloadReportCard = async (examName: string, format: 'png' | 'pdf') => {
    const marksForExam = examMarks.filter(m => m.exam === examName);
    if (marksForExam.length === 0) {
      alert("No marks found for this exam.");
      return;
    }

    setGeneratingReportData({ examName, marks: marksForExam });
    
    // Allow React to render the template
    setTimeout(async () => {
      const element = document.getElementById('report-card-template');
      if (!element) {
        alert("Template not found. Please try again.");
        setGeneratingReportData(null);
        return;
      }

      try {
        const dataUrl = await toPng(element, { quality: 1, pixelRatio: 2, backgroundColor: 'white' });
        
        if (format === 'png') {
          const link = document.createElement('a');
          link.download = `${studentData.name}_${examName}.png`;
          link.href = dataUrl;
          link.click();
        } else {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProps = pdf.getImageProperties(dataUrl);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${studentData.name}_${examName}.pdf`);
        }
      } catch (err) {
        console.error("Download failed:", err);
        alert("Download failed. Please try again.");
      } finally {
        setGeneratingReportData(null);
      }
    }, 500);
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleJoinClass = async (linkUrl: string | null) => {
    // Check if zoom is blocked due to unpaid fees
    if (currentStudentData?.zoomBlocked) {
      setShowAccessBlockedModal(true);
      return;
    }

    // Mark attendance automatically
    const today = new Date().toISOString().split('T')[0];
    const allAttendance = await getAttendance();
    const existing = allAttendance.find((a: any) => a.studentId === studentData.id && a.date === today);
    
    if (!existing) {
      allAttendance.push({
        id: Date.now().toString() + studentData.id,
        studentId: studentData.id,
        date: today,
        status: "Present"
      });
      await saveAttendance(allAttendance);
      // Update local state to reflect immediately
      setAttendance([...attendance, { id: Date.now().toString() + studentData.id, studentId: studentData.id, date: today, status: "Present" }]);
    }
    
    if (linkUrl) {
      const cleanUrl = linkUrl.trim();

      // On mobile or direct click, open in new tab/app for 100% Zoom compatibility (avoiding iframe cross-origin camera/mic blocks)
      // Check if user is on mobile or prefers direct zoom app
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Direct launch in Zoom App or Browser
        window.open(cleanUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // Format standard zoom links for web client if iframe is used
      let finalUrl = cleanUrl;
      try {
        if (cleanUrl.includes('zoom.us/j/')) {
          const urlParts = new URL(cleanUrl);
          const meetingId = urlParts.pathname.split('/j/')[1];
          const pwd = urlParts.searchParams.get('pwd');
          const encodedName = btoa(unescape(encodeURIComponent(studentData.name)));
          finalUrl = `https://zoom.us/wc/join/${meetingId}?prefer=1&un=${encodedName}${pwd ? '&pwd=' + pwd : ''}`;
        } else if (cleanUrl.includes('zoom.us/wc/join/')) {
          const urlParts = new URL(cleanUrl);
          const encodedName = btoa(unescape(encodeURIComponent(studentData.name)));
          if (!urlParts.searchParams.has('un')) {
            finalUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}un=${encodedName}&prefer=1`;
          }
        }
      } catch (e) {
        console.error("Error formatting zoom link", e);
      }
      
      // Store original link alongside formatted for external option
      setActiveMeetingUrl(finalUrl);
    } else {
      alert("Attendance Marked Successfully!");
    }
  };

  const navItems = [
    { id: "profile", name: "Profile", icon: <User size={24} /> },
    { id: "home", name: "Home", icon: <Home size={24} /> },
    { id: "subjects", name: menuLabels.subjects || "My Subjects", icon: <Book size={24} /> },
    { id: "timetable", name: "Timetable", icon: <Calendar size={24} /> },
    { id: "homework", name: menuLabels.homework || "Homework", icon: <BookOpen size={24} /> },
    { id: "fees", name: menuLabels.fees || "Fees", icon: <DollarSign size={24} /> },
    { id: "website", name: "Website", icon: <Globe size={24} /> },
  ];

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeMeetingUrl) {
        requestWakeLock();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    if (activeMeetingUrl) {
      requestWakeLock();
      handleResize(); // initial check
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(console.error);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [activeMeetingUrl]);

  useEffect(() => {
    setSelectedMaterialSubject(null);
  }, [activeTab]);

  if (!studentData) {
    return null;
  }

  if (activeMeetingUrl) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col" id="zoom-container">
        {(!isFullscreen && !isLandscape) && (
          <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center">
              <Video size={20} className="mr-2 text-blue-400" />
              Live Class
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.open(activeMeetingUrl, '_blank', 'noopener,noreferrer');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md font-medium flex items-center gap-1.5 text-xs sm:text-sm"
                title="Open in Zoom App or Browser Tab"
              >
                <ExternalLink size={16} />
                <span>Open in Zoom App</span>
              </button>
              <button 
                onClick={async () => {
                  try {
                    const elem = document.getElementById('zoom-container');
                    if (elem) {
                      if (!document.fullscreenElement) {
                        // User gesture needed
                        if (elem.requestFullscreen) {
                          await elem.requestFullscreen({ navigationUI: "hide" });
                        } else if ((elem as any).webkitRequestFullscreen) {
                          await (elem as any).webkitRequestFullscreen();
                        }
                      }
                    }
                    
                    const screenOrientation: any = window.screen && window.screen.orientation;
                    if (screenOrientation && screenOrientation.lock) {
                      if (!document.fullscreenElement) {
                        await screenOrientation.lock('landscape');
                      }
                    }
                  } catch (err) {
                    console.error("Rotation/Fullscreen failed:", err);
                    alert("Please rotate your device physically to view in landscape mode.");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md font-medium flex items-center gap-1.5"
                title="Fullscreen & Rotate"
              >
                <RotateCw size={18} />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
              <button 
                onClick={() => {
                  if (document.fullscreenElement) {
                    if (document.exitFullscreen) {
                      document.exitFullscreen().catch(err => console.error(err));
                    } else if ((document as any).webkitExitFullscreen) {
                      (document as any).webkitExitFullscreen().catch((err: any) => console.error(err));
                    }
                  }
                  if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                  }
                  setActiveMeetingUrl(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
              >
                <LogOut size={18} className="mr-2" />
                Leave Class
              </button>
            </div>
          </div>
        )}

        {(isFullscreen || isLandscape) && (
          <button 
            onClick={() => {
              if (document.fullscreenElement) {
                if (document.exitFullscreen) {
                  document.exitFullscreen().catch(err => console.error(err));
                } else if ((document as any).webkitExitFullscreen) {
                  (document as any).webkitExitFullscreen().catch((err: any) => console.error(err));
                }
              }
              if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                window.screen.orientation.unlock();
              }
              // If only in landscape (not fullscreen via API), just leave class when clicking X
              if (!document.fullscreenElement) {
                setActiveMeetingUrl(null);
              }
            }}
            className="absolute top-4 right-4 z-[10000] bg-black/50 hover:bg-red-600/90 text-white p-3 rounded-full backdrop-blur-sm transition-all"
            title={document.fullscreenElement ? "Exit Fullscreen" : "Leave Class"}
          >
            {document.fullscreenElement ? <X size={24} /> : <LogOut size={24} />}
          </button>
        )}

        {/* Added pb-12 only when not in fullscreen/landscape to push the Zoom toolbar up */}
        <div className={`flex-1 w-full h-full ${(!isFullscreen && !isLandscape) ? 'pb-12' : ''} bg-black relative`}>
          <iframe 
            src={activeMeetingUrl} 
            className="w-full h-full border-none"
            allow="camera *; microphone *; display-capture *; autoplay *; fullscreen *; clipboard-read; clipboard-write; speaker *"
            allowFullScreen
            title="Zoom Class"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <CursorTrail />
      <PopupAnnouncement userRole="Students" />
      
      {/* Real-time Toast Notification */}
      <AnimatePresence>
        {newNotification && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: 50 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-[100] bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 p-4 max-w-sm overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 animate-bounce">
                <Bell className="text-indigo-600" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 pr-4">{newNotification.title}</h3>
                  <button onClick={() => setNewNotification(null)} className="text-gray-400 hover:text-gray-600">
                    <XCircle size={18} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">{newNotification.message}</p>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => {
                      if (newNotification.type === 'zoom_class') setActiveTab('home');
                      if (newNotification.type === 'homework') setActiveTab('homework');
                      if (newNotification.type === 'youtube' || newNotification.type === 'webpost') setActiveTab('e-learning');
                      setNewNotification(null);
                    }}
                    className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    View Now
                  </button>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-indigo-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Upcoming Class Reminder Banner (30-60 minutes before class) */}
      {timetableReminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-3 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between z-50 border-b border-amber-400 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl animate-bounce">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100 flex items-center gap-1">
                <span>⏰ Upcoming Class Reminder</span>
                <span className="bg-white/30 px-2 py-0.5 rounded-full text-[10px] text-white">Live Alert</span>
              </p>
              <p className="text-sm font-semibold text-white">
                {timetableReminders[0].message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {timetableReminders[0].zoomLinkUrl ? (
              <a
                href={timetableReminders[0].zoomLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-amber-700 hover:bg-amber-50 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1"
              >
                <Video size={14} /> Join Class Now
              </a>
            ) : (
              <button 
                onClick={() => setActiveTab("home")}
                className="bg-white text-amber-700 hover:bg-amber-50 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all"
              >
                View Routine
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pending Fees Reminder Banner */}
      {hasPendingFees && (
        <div className="bg-rose-500 text-white px-4 py-3 shadow-md flex items-center justify-between z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="shrink-0" />
            <p className="text-sm font-medium">
              Reminder: Your fees for <span className="font-bold">{pendingMonthName}</span> are pending. Please pay to avoid access restrictions.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab("fees")}
            className="bg-white text-rose-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-rose-50 transition-colors whitespace-nowrap ml-4"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 text-slate-800 p-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="w-10 h-10 object-cover rounded-full shadow-sm mr-3 border-2 border-indigo-100" />
          ) : (
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3 shadow-sm border-2 border-indigo-50">
              <User size={22} className="text-indigo-600" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              {displayName}
            </h1>
            <p className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{studentData.grade}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          <div className="relative" ref={notificationsRef}>
            <button 
              className="relative p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setBadgeCount(0);
                if ('navigator' in window && 'clearAppBadge' in navigator) {
                  (navigator as any).clearAppBadge().catch(() => {});
                }
              }}
            >
              <Bell size={20} />
              {(realtimeNotifications.length > 0 || badgeCount > 0) && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white px-1 shadow-sm">
                  {badgeCount > 0 ? badgeCount : (realtimeNotifications.length > 0 ? '!' : '')}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[110] overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Notifications</h3>
                    <div className="flex gap-2 items-center">
                       <button 
                         onClick={() => {
                           setRealtimeNotifications([]);
                           localStorage.removeItem('notification_history');
                         }}
                         className="text-[10px] text-gray-400 hover:text-rose-500 font-bold uppercase transition-colors"
                       >
                         Clear
                       </button>
                       <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                         {realtimeNotifications.length}
                       </span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {realtimeNotifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="mx-auto mb-2 text-gray-300" size={24} />
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      realtimeNotifications.map((notif, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" 
                          onClick={() => { 
                            if (notif.type === 'homework') setActiveTab('homework');
                            if (notif.type === 'zoom_class') setActiveTab('home');
                            if (notif.type === 'youtube' || notif.type === 'webpost') setActiveTab('e-learning');
                            if (notif.type === 'exam') {
                              setActiveTab('marks');
                              setMarksSubTab('exams');
                            }
                            setShowNotifications(false); 
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              notif.type === 'zoom_class' ? 'bg-amber-100 text-amber-600' : 
                              notif.type === 'homework' ? 'bg-indigo-100 text-indigo-600' : 
                              notif.type === 'youtube' ? 'bg-rose-100 text-rose-600' : 
                              notif.type === 'exam' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {notif.type === 'zoom_class' ? <Video size={18} /> : 
                               notif.type === 'homework' ? <Book size={18} /> : 
                               notif.type === 'youtube' ? <Youtube size={18} /> : 
                               notif.type === 'exam' ? <Award size={18} /> : <Bell size={18} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-800 leading-tight">{notif.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{notif.message}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                  {notif.type?.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {notif.createdAt ? formatSafeTimeString(notif.createdAt, { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setShowQrScanner(true)}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors"
            title="Scan ID Card to Login"
          >
            <QrCode size={20} />
          </button>
          <button
            onClick={() => {
              clearUserSession();
              navigate("/", { replace: true });
            }}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-transparent pb-32 ${activeTab === 'chat' ? 'flex flex-col p-0 md:p-0 lg:p-0' : 'max-w-7xl mx-auto w-full'}`}>
        {currentStudentData?.zoomBlocked && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-lg shadow-sm mb-6 flex items-start gap-3">
            <Bell className="shrink-0 mt-0.5 text-rose-500" size={20} />
            <div>
              <h3 className="font-bold text-lg">கட்டண அறிவிப்பு (Fee Notice)</h3>
              <p className="text-sm mt-1 text-rose-700">
                மாதக் கட்டணம் செலுத்தப்படவில்லை. தயவுசெய்து கட்டணத்தைச் செலுத்தி வகுப்புகளில் தொடரவும். (Monthly fee not paid. Please pay the fee to continue joining live classes.)
              </p>
            </div>
          </div>
        )}

        {/* Phone Notification & App Badge Enable Banner */}
        {notificationPermission !== 'granted' && (
          <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-lg border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Bell size={22} className="animate-bounce" />
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-300 flex items-center gap-2">
                  <span>ஃபோன் நோட்டிபிகேஷன் & பேட்ஜ் (Instant Phone Notification & Badge)</span>
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">WhatsApp போன்று</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  ஆப் மூடியிருந்தாலும் புதிய எக்ஸாம் வினாத்தாள்கள் வரும்போது உங்கள் மொபைல் நோட்டிபிகேஷன் பார் மற்றும் ஆப் ஐகானில் சிவப்பு பேட்ஜ் காட்டும்.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={async () => {
                  const perm = await requestSystemNotificationPermission();
                  setNotificationPermission(perm);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Bell size={15} />
                நோட்டிபிகேஷன் ஆன் செய் (Allow)
              </button>
            </div>
          </div>
        )}

        {activeTab !== "home" && activeTab !== "chat" && (
          <button 
            onClick={() => setActiveTab("home")}
            className="mb-6 text-slate-500 font-medium flex items-center hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 w-fit"
          >
            ← Back to Home
          </button>
        )}

        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-pink-500 opacity-20 rounded-full blur-xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  Welcome back, {displayName.split(' ')[0]}! 👋
                </h2>
                <p className="text-indigo-100 max-w-lg text-sm sm:text-base">
                  Ready to learn? Access your subjects, homework, and live classes from your personal dashboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              <div
                onClick={() => handleTabSelect("subjects")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-pink-100 transition-colors">
                  <Book size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.subjects || "My Subjects"}</span>
              </div>

              <div
                onClick={() => handleTabSelect("courses")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-100 group-hover:scale-105 transition-all shadow-sm">
                  <Gamepad2 size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.recording || "Tamil Game"}</span>
              </div>

              <div
                onClick={() => handleTabSelect("homework")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.homework || "Homework"}</span>
              </div>

              <div
                onClick={() => handleTabSelect("attendance")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                  <Calendar size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.attendance || "Attendance"}</span>
              </div>

              <div
                onClick={() => handleTabSelect("youtube")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                  <Youtube size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.elearning || "E-Learning"}</span>
              </div>

              <div
                onClick={() => handleTabSelect("marks")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative"
              >
                {unattendedExamsCount > 0 && (
                  <span className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse border-2 border-white flex items-center gap-1 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    {unattendedExamsCount} Exam
                  </span>
                )}
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                  <Award size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.marks || "Marks"}</span>
              </div>

              <div
                onClick={() => handleTabSelect("course_materials")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-red-100 transition-colors">
                  <FileText size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.course_materials || "Course Material"}</span>
              </div>

              <div
                onClick={() => setActiveTab("rules")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                  <ShieldAlert size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.rules || "Rules"}</span>
              </div>

              <div
                onClick={() => setActiveTab("fees")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                  <DollarSign size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.fees || "Fees"}</span>
              </div>

              <div
                onClick={() => {
                  setActiveTab("chat");
                  markAsRead();
                }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative sm:col-span-1 md:col-span-1"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-sm border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                  <MessageCircle size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.chat || "Live Chat"}</span>
              </div>

              <a
                href={`https://wa.me/94778054232?text=${encodeURIComponent(`வணக்கம் அகரம் தினேஸ் ஐயா அவர்களே! எனது பிள்ளை பெயர்: ${studentData.name}, தரம்: ${studentData.grade}, மாவட்டம்: ${studentData.district || 'N/A'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative sm:col-span-1 md:col-span-1"
              >
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
                  <WhatsAppIcon size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">{menuLabels.whatsapp || "WhatsApp"}</span>
              </a>

              {/* Real-time Exams Card with Unattended Badge */}
              <div
                onClick={() => {
                  setActiveTab("marks");
                  setMarksSubTab("exams");
                }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative sm:col-span-1 md:col-span-1"
              >
                {unattendedExamsCount > 0 && (
                  <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white shadow-sm border-2 border-white animate-pulse">
                    {unattendedExamsCount}
                  </span>
                )}
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                  <Award size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">தேர்வுகள் (Exams)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Subject Classes */}
              {enrolledClasses.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                      <Video size={16} />
                    </div>
                    Upcoming Classes
                  </h3>
                  <div className="space-y-3">
                    {zoomLinks
                      .filter(z => enrolledClasses.includes(z.subject))
                      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
                      .slice(0, 3) // Show next 3
                      .map(z => (
                        <div key={z.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-3">
                          <div>
                            <p className="font-bold text-slate-800">{z.title}</p>
                            <p className="text-sm font-medium text-indigo-600 mb-1">{z.subject}</p>
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-400" />
                              <p className="text-xs text-slate-500">{new Date(z.datetime).toLocaleString()}</p>
                            </div>
                            <div className="mt-2 inline-block">
                              <CountdownTimer targetDate={z.datetime} />
                            </div>
                          </div>
                          <button 
                            onClick={() => handleJoinClass(z.link)}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 text-sm shadow-sm transition-colors w-full sm:w-auto text-center"
                          >
                            Join Class
                          </button>
                        </div>
                      ))}
                    {zoomLinks.filter(z => enrolledClasses.includes(z.subject)).length === 0 && (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">No upcoming classes scheduled.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Class Link Section */}
              {classLinks[studentData.grade] && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col justify-center">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Video size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      Live Zoom Class
                    </h3>
                    <p className="text-slate-600">Join your regular class sessions for <span className="font-bold text-indigo-600">{studentData.grade}</span></p>
                  </div>
                  <button 
                    onClick={() => handleJoinClass(classLinks[studentData.grade])}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 text-lg"
                  >
                    <Video size={20} />
                    Join & Mark Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mr-3">
                  <Book size={20} />
                </div>
                My Subjects
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your class details and schedules.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Find all unique subjects offered for this grade from classes, or from enrolledClasses */}
                {filterSubjectsForStudentGrade(
                  Array.from(new Set([
                    ...(classes.find(c => 
                      c.name === studentData.grade || 
                      c.name?.replace(/[^0-9]/g, '') === studentData.grade?.toString().replace(/[^0-9]/g, '')
                    )?.subjects || []),
                    ...(studentData.subjects || []),
                    ...(enrolledClasses || [])
                  ])),
                  studentData.grade || ""
                ).map((subjectName: any) => {
                  const subLower = String(subjectName || "").trim().toLowerCase();
                  const isEnrolled = enrolledClasses.length === 0 || enrolledClasses.some((e: any) => {
                    const eLower = String(e || "").trim().toLowerCase();
                    return eLower === subLower || eLower.includes(subLower) || subLower.includes(eLower);
                  });
                  const staffForSubject = staffs.filter((s: any) => s.assignedClasses?.some((c: any) => 
                    (c.grade === studentData.grade || c.grade?.toString().replace(/[^0-9]/g, '') === studentData.grade?.toString().replace(/[^0-9]/g, '')) && 
                    String(c.subject || "").trim().toLowerCase() === subLower
                  ));
                  const subjectTimetable = timetable.filter(t => String(t.subject || "").trim().toLowerCase() === subLower);
                  const subjectZoomLinks = zoomLinks.filter(z => String(z.subject || "").trim().toLowerCase() === subLower);
                  
                  if (!isEnrolled && enrolledClasses.length > 0) return null;

                  return (
                    <div key={subjectName} className={`p-5 rounded-2xl shadow-sm border transition-all duration-200 bg-indigo-50/50 border-indigo-200`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{subjectName}</h3>
                          <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <User size={14} /> <span className="text-indigo-600">{staffForSubject.map((s: any) => s.name).join(', ') || 'TBA'}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 text-sm text-slate-600">
                          <>
                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                              <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Calendar size={16} className="text-indigo-500"/> Timetable</p>
                              {subjectTimetable.length > 0 ? (
                                <div className="space-y-2">
                                  {subjectTimetable.map(t => (
                                    <div key={t.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{t.day}</span>
                                        {t.zoomLinkUrl && (
                                          <a 
                                            href={t.zoomLinkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold mt-1 transition-colors"
                                          >
                                            <Video size={12} /> Join Class
                                          </a>
                                        )}
                                      </div>
                                      <span className="text-indigo-700 font-bold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                        {t.startTime} - {t.endTime}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed text-center">No timetable set.</p>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                              <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Video size={16} className="text-pink-500"/> Upcoming Zoom Classes</p>
                              {subjectZoomLinks.length > 0 ? (
                                <div className="space-y-3">
                                  {subjectZoomLinks.map(z => (
                                    <div key={z.id} className="bg-white p-4 rounded-xl border border-pink-100 shadow-sm">
                                      <p className="font-bold text-slate-800 mb-1">{z.title}</p>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Clock size={14} className="text-slate-400" />
                                        <p className="text-xs font-medium text-slate-500">{new Date(z.datetime).toLocaleString()}</p>
                                      </div>
                                      <div className="flex flex-col gap-1 mb-3">
                                        {z.meetingId && <p className="text-xs text-slate-600 flex justify-between"><span>Meeting ID:</span> <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{z.meetingId}</span></p>}
                                        {z.passcode && <p className="text-xs text-slate-600 flex justify-between"><span>Passcode:</span> <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{z.passcode}</span></p>}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <button 
                                          onClick={() => handleJoinClass(z.link)} 
                                          className="flex-1 text-xs font-bold bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                                        >
                                          Join Link
                                        </button>
                                        <button 
                                          onClick={() => handleJoinClass(null)} 
                                          className="flex-1 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-center"
                                        >
                                          Attendance
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed text-center">No upcoming classes.</p>
                              )}
                            </div>

                            {courses.filter(c => areSubjectsMatching(c.subject, subjectName) && doesItemMatchGrade(c, studentData?.grade || "தரம் 10")).length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-200/60">
                                <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-500"/> Course Materials</p>
                                <div className="space-y-2">
                                  {courses.filter(c => areSubjectsMatching(c.subject, subjectName) && doesItemMatchGrade(c, studentData?.grade || "தரம் 10")).map(course => (
                                    <a 
                                      key={course.id} 
                                      href={course.link} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 p-3 rounded-xl border border-blue-100 transition-colors group"
                                    >
                                      <span className="font-bold text-blue-900 text-sm">{course.title}</span>
                                      <Link size={16} className="text-blue-500 group-hover:text-blue-700 transition-colors" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                      </div>
                    </div>
                  );
                })}
                
                {staffs.flatMap(s => s.assignedClasses?.filter((c: any) => c.grade === studentData.grade) || []).length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <Book className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No subjects currently available for {studentData.grade}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timetable" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                      <Calendar size={20} />
                    </div>
                    My Timetable
                  </h2>
                  <p className="text-slate-500 ml-13">Schedule for your subjects.</p>
                </div>
                
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl shadow-sm border border-slate-200">
                      <BookOpen size={16} className="text-indigo-400" />
                      <select
                        className="border-none bg-transparent focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                      >
                        <option value="All">All Subjects</option>
                        {Array.from(new Set(
                          (enrolledClasses.length > 0 
                            ? timetable.filter(t => 
                                enrolledClasses.some(sub => sub?.toString().trim().toLowerCase() === t.subject?.toString().trim().toLowerCase())
                              ) 
                            : timetable
                          ).map(t => t.subject)
                        )).map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl shadow-sm border border-slate-200">
                      <User size={16} className="text-indigo-400" />
                      <select
                        className="border-none bg-transparent focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                      >
                        <option value="All">All Teachers</option>
                        {Array.from(new Set(
                          (enrolledClasses.length > 0 
                            ? timetable.filter(t => 
                                enrolledClasses.some(sub => sub?.toString().trim().toLowerCase() === t.subject?.toString().trim().toLowerCase())
                              ) 
                            : timetable
                          ).map(t => t.staffName)
                        )).map(teacher => (
                          <option key={teacher} value={teacher}>{teacher}</option>
                        ))}
                      </select>
                    </div>
                  </div>
              </div>
              
              {(() => {
                let filteredTimetable = enrolledClasses.length > 0 
                  ? timetable.filter(t => 
                      enrolledClasses.some(sub => sub?.toString().trim().toLowerCase() === t.subject?.toString().trim().toLowerCase())
                    )
                  : timetable;
                  
                if (filterSubject !== "All") {
                  filteredTimetable = filteredTimetable.filter(t => t.subject === filterSubject);
                }
                if (filterTeacher !== "All") {
                  filteredTimetable = filteredTimetable.filter(t => t.staffName === filterTeacher);
                }

                const displaySubjects = Array.from(new Set(filteredTimetable.map(t => t.subject)));

                if (displaySubjects.length === 0) {
                  return (
                    <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-slate-100 border-dashed">
                      <Calendar className="mx-auto h-20 w-20 text-slate-200 mb-6" />
                      <h3 className="text-2xl font-black text-slate-400">No classes found for these filters.</h3>
                      <p className="text-slate-400 mt-2">Try changing your subject or teacher selection.</p>
                      {enrolledClasses.length > 0 && (
                        <p className="text-xs text-indigo-400 mt-4 font-bold">Showing only subjects you are registered for.</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displaySubjects.map((subject: any) => {
                      const subjectStr = String(subject);
                      const subjectTimetable = filteredTimetable.filter(t => t.subject === subjectStr);

                      const scheduledDays = subjectTimetable.map(t => t.day?.trim());
                    
                    // Calendar logic
                    const currentDate = new Date();
                    const currentMonth = currentDate.getMonth();
                    const currentYear = currentDate.getFullYear();
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
                    
                    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
                    
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const monthName = currentDate.toLocaleString('default', { month: 'long' });

                    return (
                      <div key={subjectStr} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-lg">{subjectStr}</h3>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">{monthName} {currentYear}</span>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {shortDayNames.map(day => (
                              <div key={day} className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-400 py-1">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {blanksArray.map(blank => (
                              <div key={`blank-${blank}`} className="p-2"></div>
                            ))}
                            {daysArray.map(day => {
                              const date = new Date(currentYear, currentMonth, day);
                              const dayOfWeekName = dayNames[date.getDay()];
                              const isScheduled = scheduledDays.includes(dayOfWeekName);
                              const classDetails = subjectTimetable.find(t => t.day?.trim() === dayOfWeekName);
                              const theme = getSubjectColorClasses(subjectStr);
                              
                              return (
                                <div 
                                  key={day} 
                                  className={`relative flex flex-col items-center justify-center p-2 rounded-xl text-sm transition-all duration-200 ${
                                    isScheduled 
                                      ? `${theme.bg} ${theme.text} font-bold border ${theme.border} shadow-sm` 
                                      : 'text-slate-500 hover:bg-slate-50'
                                  }`}
                                  onMouseEnter={() => isScheduled && setHoveredDay({ subject: subjectStr, day })}
                                  onMouseLeave={() => setHoveredDay(null)}
                                >
                                  <span>{day}</span>
                                  {isScheduled && (
                                    <div className={`w-1.5 h-1.5 ${theme.dot} rounded-full mt-1`}></div>
                                  )}

                                  <AnimatePresence>
                                    {hoveredDay?.subject === subjectStr && hoveredDay?.day === day && classDetails && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-2xl text-xs border border-white/10"
                                      >
                                        <div className="font-bold border-b border-white/10 pb-3 mb-3 flex items-center justify-between text-sm">
                                          <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-indigo-400" /> 
                                            <span>{classDetails.startTime} - {classDetails.endTime}</span>
                                          </div>
                                          {isScheduled && (
                                            <div className={`w-2 h-2 ${theme.dot} rounded-full animate-pulse`}></div>
                                          )}
                                        </div>
                                        <div className="space-y-2 mb-4">
                                          <div className="flex items-center gap-2 text-slate-300">
                                            <User size={14} className="text-slate-500" /> 
                                            <span className="font-medium">{classDetails.staffName}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-slate-300">
                                            <BookOpen size={14} className="text-slate-500" /> 
                                            <span className="font-medium">{classDetails.subject}</span>
                                          </div>
                                        </div>
                                        
                                        {classDetails.zoomLinkUrl && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleJoinClass(classDetails.zoomLinkUrl);
                                            }}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 cursor-pointer"
                                          >
                                            <Video size={14} /> Join Now
                                          </button>
                                        )}

                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95"></div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Legend / Details */}
                          {subjectTimetable.length > 0 ? (
                            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                              {subjectTimetable.map(cls => {
                                const hasZoomLink = zoomLinks.some(z => z.grade === cls.grade && z.subject === cls.subject);
                                return (
                                <div key={cls.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="font-bold text-slate-700 flex items-center gap-2">
                                    {cls.day}s
                                    {hasZoomLink && <Video size={16} className="text-blue-500" title="Zoom Link Available" />}
                                  </span>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">{cls.startTime} - {cls.endTime}</span>
                                      {cls.zoomLinkUrl && (
                                        <button 
                                          onClick={() => handleJoinClass(cls.zoomLinkUrl)}
                                          className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1 font-bold shadow-sm"
                                        >
                                          <Video size={10} /> Join
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-slate-500 text-xs font-medium flex items-center gap-1"><User size={10}/> {cls.staffName}</span>
                                  </div>
                                </div>
                              )})}
                            </div>
                          ) : (
                            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-400 italic">
                              No schedule set yet.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                    {displaySubjects.length > 0 && filteredTimetable.filter(t => displaySubjects.includes(t.subject)).length === 0 && (
                      <div className="col-span-full text-center py-6 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed mt-4">
                        <p>No timetable entries have been added by the admin for your subjects yet.</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <RecordingSection
            courses={courses}
            webPosts={webPosts}
            courseWebsiteLinks={courseWebsiteLinks}
            studentGrade={studentData?.grade || "தரம் 10"}
            studentSubjects={studentData?.subjects || studentData?.enrolledClasses || []}
            onOpenWebsite={(url) => window.open(url, "_blank")}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
            getFolderColor={getFolderColor}
          />
        )}

        {activeTab === "course_materials" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3 shrink-0 shadow-sm">
                      <FileText size={20} />
                    </div>
                    Course Material
                  </h2>
                  <p className="text-slate-500 text-sm font-medium ml-13">பாடக் குறிப்புகள் மற்றும் PDF நூலகம்</p>
                </div>
                {selectedMaterialSubject && (
                  <button
                    onClick={() => {
                      setSelectedMaterialSubject(null);
                      setMaterialCategoryFilter("ALL");
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all w-fit shrink-0 border border-slate-200"
                  >
                    ← Back to Subjects
                  </button>
                )}
              </div>

              {!selectedMaterialSubject ? (
                // Subject List View
                <div>
                  {courseMaterials.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                      <FileText className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                      <h4 className="text-xl font-bold text-slate-700 mb-1">பாடக்குறிப்புகள் எதுவும் இல்லை</h4>
                      <p className="text-slate-500 text-sm">No course materials have been assigned to your subjects yet.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(() => {
                          const studentSubs = (studentData?.subjects || studentData?.enrolledClasses || enrolledClasses || []).map((s: any) => s?.toString().trim()).filter(Boolean);
                          
                          let rawSubs: string[] = [];
                          if (studentSubs.length > 0) {
                            rawSubs = [...studentSubs];
                          } else {
                            const studentGrade = (studentData?.grade || "").toString().trim();
                            const studentGradeNum = studentGrade.replace(/[^0-9]/g, '');
                            const matchingClass = classes.find((c: any) => {
                              if (!c?.name) return false;
                              const cNum = c.name.toString().replace(/[^0-9]/g, '');
                              return (studentGradeNum && cNum === studentGradeNum) || (c.name.toString().trim().toLowerCase() === studentGrade.toLowerCase());
                            });
                            if (matchingClass && Array.isArray(matchingClass.subjects) && matchingClass.subjects.length > 0) {
                              rawSubs = matchingClass.subjects.map((s: any) => s?.toString().trim()).filter(Boolean);
                            }
                          }

                          const allAvailableSubjectNames = filterSubjectsForStudentGrade(rawSubs, studentData?.grade || "");

                          if (allAvailableSubjectNames.length === 0 && courseMaterials.length > 0) {
                            allAvailableSubjectNames.push("General");
                          }

                          const studentGradeNum = (studentData?.grade || "").replace(/[^0-9]/g, '');
                          const isGrade11 = studentGradeNum === "11";
                          const has30DaysMaterials = courseMaterials.some((c: any) => {
                            const t = `${c.subject || ''} ${c.title || ''} ${(c.subjects || []).join(' ')}`.toLowerCase();
                            return t.includes('30 நாள்') || t.includes('30 day') || t.includes('30day');
                          });

                          return (
                            <>
                              {courseMaterials.length > 0 && allAvailableSubjectNames.length > 1 && (
                                <div
                                  onClick={() => {
                                    setSelectedMaterialSubject("ALL_MATERIALS");
                                    setMaterialCategoryFilter("ALL");
                                  }}
                                  className="p-6 rounded-3xl border-2 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between h-48 group relative overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
                                >
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border text-red-700 bg-white/80 border-red-100">
                                      All Subjects (அனைத்தும்)
                                    </span>
                                    <h3 className="text-2xl font-black mt-4 leading-tight group-hover:scale-105 transition-transform duration-300 origin-left text-slate-800">
                                      All PDF Materials
                                    </h3>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-600">
                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                      {courseMaterials.length} PDFs available
                                    </span>
                                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all duration-300">
                                      <ChevronRight size={18} />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Dedicated Highlight Card for 30 Days Tamil Course */}
                              {(isGrade11 || has30DaysMaterials) && (
                                <div
                                  onClick={() => {
                                    setSelectedMaterialSubject("30 நாள் தமிழ் பாடநெறி");
                                    setMaterialCategoryFilter("30_DAYS");
                                  }}
                                  className="p-6 rounded-3xl border-2 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between h-48 group relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 border-amber-300"
                                >
                                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-400 opacity-20 rounded-full blur-2xl"></div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border text-amber-900 bg-amber-100/90 border-amber-300 flex items-center gap-1 w-fit">
                                      <Star size={11} className="fill-amber-600 text-amber-600" />
                                      Special Course (சிறப்பு பாடநெறி)
                                    </span>
                                    <h3 className="text-2xl font-black mt-3 leading-tight group-hover:scale-105 transition-transform duration-300 origin-left text-amber-950">
                                      30 நாள் தமிழ் பாடநெறி
                                    </h3>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-800">
                                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                      {courseMaterials.filter((c: any) => {
                                        const t = `${c.subject || ''} ${c.title || ''} ${(c.subjects || []).join(' ')}`.toLowerCase();
                                        return t.includes('30 நாள்') || t.includes('30 day') || t.includes('30day');
                                      }).length} PDFs available
                                    </span>
                                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-amber-700 shadow-sm border border-amber-200 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all duration-300">
                                      <ChevronRight size={18} />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {allAvailableSubjectNames.map((subjName: any) => {
                                const subjectCourses = courseMaterials.filter((c: any) => 
                                  areSubjectsMatching(c.subject, subjName) || 
                                  (Array.isArray(c.subjects) && c.subjects.some((s: any) => areSubjectsMatching(s, subjName)))
                                );
                                const colorClasses = getSubjectColorClasses(subjName);
                                return (
                                  <div
                                    key={subjName}
                                    onClick={() => {
                                      setSelectedMaterialSubject(subjName);
                                      setMaterialCategoryFilter("ALL");
                                    }}
                                    className={`p-6 rounded-3xl border-2 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between h-48 group relative overflow-hidden ${colorClasses.bg} ${colorClasses.border}`}
                                  >
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-40 rounded-full blur-2xl"></div>
                                    <div>
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${colorClasses.text} bg-white/60`}>
                                        Subject Unit
                                      </span>
                                      <h3 className={`text-2xl font-black mt-4 leading-tight group-hover:scale-105 transition-transform duration-300 origin-left`}>
                                        {subjName}
                                      </h3>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80`}>
                                        <span className={`w-2 h-2 rounded-full ${colorClasses.dot} animate-pulse`}></span>
                                        {subjectCourses.length} PDF{subjectCourses.length > 1 ? 's' : ''} available
                                      </span>
                                      <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all duration-300`}>
                                        <ChevronRight size={18} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Subject PDF Files View
                (() => {
                  const getStudentMaterialCategory = (c: any) => {
                    const allText = `${c.subject || ''} ${c.title || ''} ${(c.subjects || []).join(' ')}`.toLowerCase();
                    if (allText.includes('30 நாள்') || allText.includes('30 day') || allText.includes('30day')) {
                      return {
                        id: '30_DAYS',
                        name: '30 நாள் பாடநெறி',
                        shortName: '🌟 30 நாள் பாடநெறி',
                        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
                      };
                    }
                    if (allText.includes('வினா') || allText.includes('விடை') || allText.includes('vina') || allText.includes('q&a') || allText.includes('paper') || allText.includes('வினாத்தாள்')) {
                      return {
                        id: 'QNA',
                        name: 'வினா விடை / Papers',
                        shortName: '📝 வினா விடை',
                        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
                      };
                    }
                    if (allText.includes('இலக்கிய') || allText.includes('நயம்') || allText.includes('ilakkia')) {
                      return {
                        id: 'LITERATURE',
                        name: 'இலக்கிய நயம்',
                        shortName: '📖 இலக்கிய நயம்',
                        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      };
                    }
                    return {
                      id: 'GENERAL',
                      name: 'பொதுவானவை',
                      shortName: '📁 பாடக் குறிப்புகள்',
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
                    };
                  };

                  const subjectBaseMaterials = courseMaterials.filter((c: any) => {
                    if (selectedMaterialSubject === "ALL_MATERIALS") return true;
                    if (selectedMaterialSubject === "30 நாள் தமிழ் பாடநெறி") {
                      const t = `${c.subject || ''} ${c.title || ''} ${(c.subjects || []).join(' ')}`.toLowerCase();
                      return t.includes('30 நாள்') || t.includes('30 day') || t.includes('30day');
                    }
                    const targetCat = getCanonicalSubjectCategory(selectedMaterialSubject);
                    const cCat = getCanonicalSubjectCategory(c.subject);
                    if (targetCat && cCat) {
                      return cCat === targetCat;
                    }
                    return areSubjectsMatching(c.subject, selectedMaterialSubject) || 
                      (Array.isArray(c.subjects) && c.subjects.some((s: any) => areSubjectsMatching(s, selectedMaterialSubject)));
                  });

                  const count30 = subjectBaseMaterials.filter((c: any) => getStudentMaterialCategory(c).id === '30_DAYS').length;
                  const countQnA = subjectBaseMaterials.filter((c: any) => getStudentMaterialCategory(c).id === 'QNA').length;
                  const countLit = subjectBaseMaterials.filter((c: any) => getStudentMaterialCategory(c).id === 'LITERATURE').length;
                  const countGen = subjectBaseMaterials.filter((c: any) => getStudentMaterialCategory(c).id === 'GENERAL').length;

                  const hasCategories = (count30 > 0 ? 1 : 0) + (countQnA > 0 ? 1 : 0) + (countLit > 0 ? 1 : 0) + (countGen > 0 ? 1 : 0) > 1 || count30 > 0;

                  const displayedMaterials = subjectBaseMaterials.filter((c: any) => {
                    if (materialCategoryFilter === "ALL") return true;
                    return getStudentMaterialCategory(c).id === materialCategoryFilter;
                  });

                  return (
                    <div>
                      <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                            {selectedMaterialSubject === "ALL_MATERIALS" ? "All Subjects (அனைத்து பாடங்கள்)" : selectedMaterialSubject}
                          </span>
                          <h3 className="text-xl font-black text-slate-800 mt-2">Available PDF Documents</h3>
                        </div>
                        <span className="text-sm font-bold text-slate-400">
                          {displayedMaterials.length} File(s)
                        </span>
                      </div>

                      {/* Course Category Filter Bar */}
                      {hasCategories && (
                        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1.5">
                            <Filter size={14} className="text-red-500" />
                            பாடநெறி வகைப்பாடு:
                          </span>
                          <button
                            type="button"
                            onClick={() => setMaterialCategoryFilter("ALL")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              materialCategoryFilter === "ALL"
                                ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            அனைத்தும் ({subjectBaseMaterials.length})
                          </button>
                          {count30 > 0 && (
                            <button
                              type="button"
                              onClick={() => setMaterialCategoryFilter("30_DAYS")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                materialCategoryFilter === "30_DAYS"
                                  ? "bg-amber-600 text-white shadow-md shadow-amber-500/30"
                                  : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                              }`}
                            >
                              <span>🌟 30 நாள் பாடநெறி</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${materialCategoryFilter === "30_DAYS" ? "bg-white/30 text-white" : "bg-amber-200 text-amber-900"}`}>
                                {count30}
                              </span>
                            </button>
                          )}
                          {countQnA > 0 && (
                            <button
                              type="button"
                              onClick={() => setMaterialCategoryFilter("QNA")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                materialCategoryFilter === "QNA"
                                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                                  : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
                              }`}
                            >
                              <span>📝 வினா விடை / Papers</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${materialCategoryFilter === "QNA" ? "bg-white/30 text-white" : "bg-purple-200 text-purple-900"}`}>
                                {countQnA}
                              </span>
                            </button>
                          )}
                          {countLit > 0 && (
                            <button
                              type="button"
                              onClick={() => setMaterialCategoryFilter("LITERATURE")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                materialCategoryFilter === "LITERATURE"
                                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                                  : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              <span>📖 இலக்கிய நயம்</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${materialCategoryFilter === "LITERATURE" ? "bg-white/30 text-white" : "bg-emerald-200 text-emerald-900"}`}>
                                {countLit}
                              </span>
                            </button>
                          )}
                          {countGen > 0 && (count30 > 0 || countQnA > 0 || countLit > 0) && (
                            <button
                              type="button"
                              onClick={() => setMaterialCategoryFilter("GENERAL")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                materialCategoryFilter === "GENERAL"
                                  ? "bg-slate-700 text-white shadow-md"
                                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                              }`}
                            >
                              <span>📁 பொதுவானவை</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${materialCategoryFilter === "GENERAL" ? "bg-white/30 text-white" : "bg-slate-200 text-slate-800"}`}>
                                {countGen}
                              </span>
                            </button>
                          )}
                        </div>
                      )}

                      {displayedMaterials.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                          <h4 className="text-base font-bold text-slate-700 mb-1">இந்த வகைப்பாட்டில் குறிப்புகள் இல்லை</h4>
                          <p className="text-slate-500 text-xs">No PDF materials found for the selected category.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {displayedMaterials.map((course: any) => {
                            const catInfo = getStudentMaterialCategory(course);
                            return (
                              <div 
                                key={course.id}
                                className="bg-slate-50/40 hover:bg-white p-5 rounded-3xl border border-slate-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                                      {course.subject}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${catInfo.badgeClass}`}>
                                      {catInfo.shortName}
                                    </span>
                                    {course.folder && (
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        {course.folder}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-black text-slate-800 text-base leading-snug group-hover:text-red-600 transition-colors">{course.title}</h4>
                                </div>
                                
                                <div className="mt-5 pt-4 border-t border-slate-100/60 flex items-center justify-between gap-4">
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    PDF Document
                                  </span>
                                  <a 
                                    href={course.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-red-100 hover:shadow-xl transition-all"
                                  >
                                    <Download size={14} />
                                    Download PDF
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {activeTab === "youtube" && (() => {
          const studentSubs = (studentData?.subjects || studentData?.enrolledClasses || []).map((s: any) => s?.toString().trim()).filter(Boolean);

          let rawELearningSubjects: string[] = [];
          if (studentSubs.length > 0) {
            rawELearningSubjects = [...studentSubs];
          } else {
            const studentGrade = (studentData?.grade || "").toString().trim();
            const studentGradeNum = studentGrade.replace(/[^0-9]/g, '');
            const matchingClass = classes.find((c: any) => {
              if (!c?.name) return false;
              const cNum = c.name.toString().replace(/[^0-9]/g, '');
              return (studentGradeNum && cNum === studentGradeNum) || (c.name.toString().trim().toLowerCase() === studentGrade.toLowerCase());
            });
            if (matchingClass && Array.isArray(matchingClass.subjects) && matchingClass.subjects.length > 0) {
              rawELearningSubjects = matchingClass.subjects.map((s: any) => s?.toString().trim()).filter(Boolean);
            }
          }

          // Strict grade filtering and canonical deduplication
          const activeELearningSubjects = filterSubjectsForStudentGrade(rawELearningSubjects, studentData?.grade || "");

          const isELearningSubjectMatch = (itemSubject: string | undefined, itemSubjects: string[] | undefined, target: string) => {
            if (target === "All") {
              return doesItemMatchStudentSubjects({ subject: itemSubject, subjects: itemSubjects } as any, activeELearningSubjects);
            }

            const allSubs = [
              itemSubject,
              ...(Array.isArray(itemSubjects) ? itemSubjects : [])
            ].filter((s): s is string => !!s);

            const targetCat = getCanonicalSubjectCategory(target);
            return allSubs.some(s => {
              const sCat = getCanonicalSubjectCategory(s);
              if (targetCat && sCat) {
                return sCat === targetCat;
              }
              return areSubjectsMatching(s, target);
            });
          };

          const filteredYoutubeLinks = youtubeLinks.filter((link: any) => 
            isELearningSubjectMatch(link.subject, link.subjects, selectedELearningSubject)
          );

          const filteredWebPosts = webPosts.filter((post: any) => 
            isELearningSubjectMatch(post.subject, post.subjects, selectedELearningSubject)
          );

          return (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 text-slate-800 flex items-center">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                        <Youtube size={20} />
                      </div>
                      E-Learning Center
                    </h2>
                    <p className="text-slate-500 ml-13">Everything you need to learn at home.</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                      onClick={() => setELearningType("videos")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${eLearningType === 'videos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Videos
                    </button>
                    <button 
                      onClick={() => setELearningType("posts")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${eLearningType === 'posts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Web Posts
                    </button>
                  </div>
                </div>

                {/* Subject Selection Header / Filter Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-800 text-base">Select Subject / பாடத்தைத் தெரிவுசெய்க</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Displaying video recordings and web posts for your enrolled subject.
                      </p>
                    </div>
                    
                    {/* Subject Dropdown Selector */}
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedELearningSubject}
                        onChange={(e) => {
                          setSelectedELearningSubject(e.target.value);
                          if (e.target.value !== "All") {
                            setSelectedMaterialSubject(e.target.value);
                          }
                        }}
                        className="bg-white border-2 border-indigo-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm cursor-pointer"
                      >
                        {activeELearningSubjects.length > 1 && (
                          <option value="All">அனைத்துப் பாடங்களும் (All Subjects)</option>
                        )}
                        {activeELearningSubjects.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject Boxes / Cards */}
                  {activeELearningSubjects.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                      {activeELearningSubjects.length > 1 && (
                        <button
                          onClick={() => setSelectedELearningSubject("All")}
                          className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                            selectedELearningSubject === "All"
                              ? "border-indigo-600 bg-indigo-600 text-white shadow-md font-bold"
                              : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                          }`}
                        >
                          <span className="text-xs font-black">All Subjects</span>
                          <span className="text-[10px] opacity-80 mt-2 font-medium">அனைத்தும்</span>
                        </button>
                      )}
                      
                      {activeELearningSubjects.map((sub: string) => {
                        const color = getSubjectColorClasses(sub);
                        const isSelected = selectedELearningSubject === sub || (activeELearningSubjects.length === 1 && selectedELearningSubject === "All");
                        return (
                          <button
                            key={sub}
                            onClick={() => {
                              setSelectedELearningSubject(sub);
                              setSelectedMaterialSubject(sub);
                            }}
                            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-md font-bold ring-2 ring-indigo-500/30"
                                : `${color.bg} ${color.border} ${color.text} hover:shadow-sm`
                            }`}
                          >
                            <div>
                              <span className={`inline-block w-2 h-2 rounded-full ${isSelected ? "bg-white" : color.dot} mr-1.5`}></span>
                              <span className="text-xs font-black leading-snug line-clamp-2">{sub}</span>
                            </div>
                            <span className={`text-[10px] mt-2 font-semibold ${isSelected ? "text-indigo-100" : "opacity-75"}`}>
                              {isSelected ? "Selected ✓" : "Click to view"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Selection Badge */}
                  <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-indigo-100 text-xs font-bold text-slate-700 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Selected Subject:</span>
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg font-black flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-600" />
                        {activeELearningSubjects.length === 1
                          ? activeELearningSubjects[0]
                          : (selectedELearningSubject === "All" ? "அனைத்துப் பாடங்களும் (All Subjects)" : selectedELearningSubject)}
                      </span>
                    </div>
                    {activeELearningSubjects.length > 1 && selectedELearningSubject !== "All" && (
                      <button 
                        onClick={() => setSelectedELearningSubject("All")}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Show All
                      </button>
                    )}
                  </div>
                </div>
                
                {eLearningType === 'videos' ? (
                  <div className="space-y-4 pt-2">
                    {/* Video Section Controls: Search, View Mode, Expand/Collapse */}
                    {filteredYoutubeLinks.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
                        {/* Search Box */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                          <input 
                            type="text"
                            placeholder="பாடங்கள் அல்லது வீடியோக்களைத் தேடுங்கள் (Search day, topic...)"
                            value={videoSearchQuery}
                            onChange={(e) => setVideoSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          {videoSearchQuery && (
                            <button 
                              onClick={() => setVideoSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* View Mode & Expand All */}
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          {(() => {
                            const groupedFoldersMap: Record<string, any[]> = filteredYoutubeLinks.reduce((acc: any, link: any) => {
                              const folder = link.folder || "இன்னும் வகைப்படுத்தப்படவில்லை (Uncategorized)";
                              if (!acc[folder]) acc[folder] = [];
                              acc[folder].push(link);
                              return acc;
                            }, {});
                            const allFolders = Object.keys(groupedFoldersMap);
                            const allExpanded = allFolders.length > 0 && allFolders.every(f => expandedFolders[f] !== false);

                            return (
                              <button
                                onClick={() => {
                                  const nextState: Record<string, boolean> = {};
                                  allFolders.forEach(f => {
                                    nextState[f] = !allExpanded;
                                  });
                                  setExpandedFolders(nextState);
                                }}
                                className="px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-2xs"
                              >
                                {allExpanded ? "அனைத்தும் சுருக்கு (Collapse All)" : "அனைத்தும் விரி (Expand All)"}
                              </button>
                            );
                          })()}

                          {/* Grid vs List toggle */}
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => setVideoViewMode("grid")}
                              className={`p-1.5 rounded-lg transition-all ${videoViewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                              title="சதுர கிரிட் (Grid View)"
                            >
                              <Grid size={15} />
                            </button>
                            <button
                              onClick={() => setVideoViewMode("list")}
                              className={`p-1.5 rounded-lg transition-all ${videoViewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                              title="பட்டியல் (List View)"
                            >
                              <List size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {filteredYoutubeLinks.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                        <Youtube className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="font-bold">No videos found for this subject selection.</p>
                        <p className="text-xs text-slate-400 mt-1">Try selecting a different subject or "All Subjects".</p>
                      </div>
                    ) : (() => {
                      const searchLower = videoSearchQuery.toLowerCase().trim();

                      // Group links by folder
                      const grouped: Record<string, any[]> = filteredYoutubeLinks.reduce((acc: any, link: any) => {
                        const folder = link.folder || "இன்னும் வகைப்படுத்தப்படவில்லை (Uncategorized)";
                        if (!acc[folder]) acc[folder] = [];
                        acc[folder].push(link);
                        return acc;
                      }, {});

                      // Filter by search query if any
                      const matchingFolders = Object.entries(grouped).map(([folder, links]) => {
                        if (!searchLower) return [folder, links] as [string, any[]];
                        
                        const folderMatches = folder.toLowerCase().includes(searchLower);
                        const matchingLinks = (links as any[]).filter((link: any) => {
                          return (link.title && link.title.toLowerCase().includes(searchLower)) ||
                            (link.subject && link.subject.toLowerCase().includes(searchLower)) ||
                            (Array.isArray(link.subjects) && link.subjects.some((s: string) => s.toLowerCase().includes(searchLower)));
                        });

                        if (folderMatches) {
                          return [folder, links] as [string, any[]];
                        } else if (matchingLinks.length > 0) {
                          return [folder, matchingLinks] as [string, any[]];
                        }
                        return null;
                      }).filter(Boolean) as [string, any[]][];

                      if (matchingFolders.length === 0) {
                        return (
                          <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                            <Search className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                            <p className="font-bold text-sm text-slate-700">தேடலுக்குப் பொருத்தமான வீடியோக்கள் இல்லை</p>
                            <p className="text-xs text-slate-400 mt-1">"{videoSearchQuery}" தொடர்பான பதிவுகள் கிடைக்கவில்லை.</p>
                            <button
                              onClick={() => setVideoSearchQuery("")}
                              className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold"
                            >
                              தேடலை அழிக்க (Clear Search)
                            </button>
                          </div>
                        );
                      }

                      // Sort folders by max element time (most recent first)
                      const sortedFolders = matchingFolders.sort(([folderA, linksA]: any, [folderB, linksB]: any) => {
                        return getMaxElementTime(linksB) - getMaxElementTime(linksA);
                      });

                      return (
                        <div className="space-y-3.5">
                          {sortedFolders.map(([folder, folderLinks]: [string, any], folderIndex: number) => {
                            // First folder defaults open, or if searching default open, or check user toggle
                            const isExpanded = videoSearchQuery.trim() !== "" 
                              ? (expandedFolders[folder] !== false)
                              : (expandedFolders[folder] ?? (folderIndex === 0));
                            const folderColor = getFolderColor(folder);
                            const parsed = parseFolderTitle(folder);
                            const maxTime = getMaxElementTime(folderLinks);

                            return (
                              <div 
                                key={folder} 
                                className={`bg-white border transition-all duration-200 rounded-2xl overflow-hidden shadow-2xs ${
                                  isExpanded ? `${folderColor.border} ring-1 ring-indigo-500/10 shadow-sm` : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {/* Sleek Compact Accordion Header */}
                                <button 
                                  onClick={() => setExpandedFolders(prev => ({ ...prev, [folder]: !isExpanded }))}
                                  className={`w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors group ${
                                    isExpanded ? `${folderColor.bg}` : 'hover:bg-slate-50/80 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 pr-2">
                                    {/* Icon Badge */}
                                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                                      isExpanded 
                                        ? `${folderColor.icon} text-white shadow-md ${folderColor.shadow}` 
                                        : `${folderColor.bg} ${folderColor.text} border ${folderColor.border} group-hover:scale-105`
                                    }`}>
                                      <Youtube size={20} className={isExpanded ? "scale-110" : ""} />
                                    </div>

                                    {/* Title & Metadata */}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        {parsed.dayBadge && (
                                          <span className="bg-indigo-600 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                                            {parsed.dayBadge}
                                          </span>
                                        )}
                                        <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-800 leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                          {parsed.title}
                                        </h3>
                                      </div>

                                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                                        <span className="font-bold text-indigo-600">
                                          {folderLinks.length} வீடியோக்கள்
                                        </span>
                                        {maxTime > 0 && (
                                          <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-400 line-clamp-1">
                                              {formatSafeDate(maxTime, { day: 'numeric', month: 'short' })}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right side: Video count pill & Chevron */}
                                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                    <span className={`text-[11px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border ${folderColor.border} ${folderColor.bg} ${folderColor.text} whitespace-nowrap`}>
                                      {folderLinks.length} Videos
                                    </span>
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-transform duration-300 ${
                                      isExpanded ? 'rotate-180 bg-slate-100 text-slate-700' : ''
                                    }`}>
                                      <ChevronDown size={16} />
                                    </div>
                                  </div>
                                </button>

                                {/* Accordion Content: Compact Square Video Grid */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden border-t border-slate-100 bg-slate-50/60"
                                    >
                                      <div className="p-2.5 sm:p-4">
                                        {videoViewMode === "grid" ? (
                                          /* 2 Columns on Mobile, 3 on Tablet, 4 on Desktop: Square-ish Compact Cards */
                                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                                            {[...folderLinks].sort((a: any, b: any) => {
                                              return getElementTime(b) - getElementTime(a);
                                            }).map((link: any, index: number) => {
                                              const videoId = getYouTubeVideoId(link.link);

                                              return (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95 }}
                                                  animate={{ opacity: 1, scale: 1 }}
                                                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                                  key={link.id || index}
                                                  className="group/item flex flex-col bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs hover:shadow-md border border-slate-200/90 hover:border-red-400 transition-all duration-200"
                                                >
                                                  {/* Compact Thumbnail Container (Aspect 16/10 for balanced square proportion) */}
                                                  <div 
                                                    onClick={() => setActiveWatchVideo(link)}
                                                    className="aspect-[16/10] relative overflow-hidden bg-slate-900 cursor-pointer"
                                                  >
                                                    {videoId ? (
                                                      <img 
                                                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                                                        alt={link.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                                                        referrerPolicy="no-referrer"
                                                        loading="lazy"
                                                      />
                                                    ) : (
                                                      <div className="w-full h-full flex items-center justify-center text-red-500/30">
                                                        <Youtube size={32} />
                                                      </div>
                                                    )}

                                                    {/* Top-Left: Lesson Index Badge */}
                                                    <div className="absolute top-1.5 left-1.5 z-10">
                                                      <span className="bg-black/75 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
                                                        {String(index + 1).padStart(2, '0')}
                                                      </span>
                                                    </div>

                                                    {/* Top-Right: Subject Badge */}
                                                    <div className="absolute top-1.5 right-1.5 z-10 max-w-[55%]">
                                                      <span className="bg-red-600 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs tracking-tight line-clamp-1 block truncate">
                                                        {formatSubjectDisplayName((link.subjects && link.subjects.length > 0 ? link.subjects[0] : link.subject) || "தமிழ்")}
                                                      </span>
                                                    </div>

                                                    {/* Center Play Button Overlay */}
                                                    <div className="absolute inset-0 bg-black/25 group-hover/item:bg-black/10 transition-colors flex items-center justify-center">
                                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center text-white scale-95 group-hover/item:scale-110 transition-transform shadow-[0_2px_12px_rgba(220,38,38,0.5)] border-2 border-white/30">
                                                        <Play size={14} className="ml-0.5" fill="currentColor" />
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Compact Card Content */}
                                                  <div className="p-2 sm:p-3 flex flex-col flex-1 justify-between gap-2">
                                                    <div>
                                                      <h4 
                                                        onClick={() => setActiveWatchVideo(link)}
                                                        className="text-[11px] sm:text-xs md:text-sm font-black text-slate-800 leading-snug line-clamp-2 min-h-[1.8rem] sm:min-h-[2.2rem] group-hover/item:text-red-600 transition-colors cursor-pointer"
                                                        title={link.title}
                                                      >
                                                        {link.title}
                                                      </h4>
                                                    </div>

                                                    {/* Bottom Row: YouTube link + Date */}
                                                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] sm:text-xs">
                                                      <a
                                                        href={link.link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700 hover:underline"
                                                      >
                                                        <Youtube size={13} className="shrink-0" />
                                                        <span className="text-[10px] sm:text-[11px]">YouTube</span>
                                                      </a>

                                                      {link.date && parseSafeDate(link.date) && (
                                                        <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">
                                                          {formatSafeDate(link.date, { day: 'numeric', month: 'short' })}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </motion.div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          /* Compact Horizontal List View */
                                          <div className="space-y-2">
                                            {[...folderLinks].sort((a: any, b: any) => {
                                              return getElementTime(b) - getElementTime(a);
                                            }).map((link: any, index: number) => {
                                              const videoId = getYouTubeVideoId(link.link);

                                              return (
                                                <div 
                                                  key={link.id || index}
                                                  className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-red-400 hover:shadow-xs transition-all"
                                                >
                                                  {/* Left: Mini Square Thumbnail */}
                                                  <div 
                                                    onClick={() => setActiveWatchVideo(link)}
                                                    className="w-20 sm:w-28 aspect-video sm:aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 relative shrink-0 cursor-pointer"
                                                  >
                                                    {videoId ? (
                                                      <img 
                                                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                                                        alt={link.title} 
                                                        className="w-full h-full object-cover" 
                                                        referrerPolicy="no-referrer"
                                                        loading="lazy"
                                                      />
                                                    ) : (
                                                      <div className="w-full h-full flex items-center justify-center text-red-500">
                                                        <Youtube size={20} />
                                                      </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white">
                                                        <Play size={10} className="ml-0.5" fill="currentColor" />
                                                      </div>
                                                    </div>
                                                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] sm:text-[9px] font-bold px-1 rounded">
                                                      {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                  </div>

                                                  {/* Middle: Title & Subject */}
                                                  <div className="flex-1 min-w-0">
                                                    <h4 
                                                      onClick={() => setActiveWatchVideo(link)}
                                                      className="text-xs sm:text-sm font-black text-slate-800 line-clamp-1 cursor-pointer hover:text-red-600"
                                                      title={link.title}
                                                    >
                                                      {link.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-[10px] text-indigo-600 font-bold line-clamp-1">
                                                        {(link.subjects && link.subjects.length > 0 ? link.subjects.map(formatSubjectDisplayName).join(', ') : formatSubjectDisplayName(link.subject)) || "E-Learning"}
                                                      </span>
                                                      {link.date && parseSafeDate(link.date) && (
                                                        <>
                                                          <span className="text-slate-300">•</span>
                                                          <span className="text-[10px] text-slate-400">
                                                            {formatSafeDate(link.date, { day: 'numeric', month: 'short' })}
                                                          </span>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* Right: Watch Button */}
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                      onClick={() => setActiveWatchVideo(link)}
                                                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                                                      title="Watch inside app"
                                                    >
                                                      <Play size={13} />
                                                    </button>
                                                    <a
                                                      href={link.link}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                                                      title="Open on YouTube"
                                                    >
                                                      <Youtube size={14} />
                                                      <span className="hidden sm:inline">YouTube</span>
                                                    </a>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                <div className="space-y-12">
                  {filteredWebPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                      <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p className="font-bold">No web posts found for this subject selection.</p>
                      <p className="text-xs text-slate-400 mt-1">Try selecting a different subject or "All Subjects".</p>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      {Object.entries(filteredWebPosts.reduce((acc: any, post: any) => {
                        const folder = post.folder || "General Materials";
                        if (!acc[folder]) acc[folder] = [];
                        acc[folder].push(post);
                        return acc;
                      }, {})).sort(([folderA, postsA]: any, [folderB, postsB]: any) => {
                        return getMaxElementTime(postsB) - getMaxElementTime(postsA);
                      }).map(([folder, folderPosts]: [string, any]) => {
                        const maxTime = getMaxElementTime(folderPosts);
                        return (
                          <div key={folder} className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                              <div>
                                {maxTime > 0 && (
                                  <p className="text-[10px] font-semibold text-slate-400 mb-1">
                                    கடைசியாகப் புதுப்பிக்கப்பட்டது: {formatSafeDate(maxTime)} {formatSafeTimeString(maxTime, { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                   <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                   {folder}
                                </h3>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                {folderPosts.length} Posts
                              </span>
                            </div>

                          <div className="relative group">
                            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 px-1 snap-x no-scrollbar scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                              {[...folderPosts].sort((a: any, b: any) => {
                                return getElementTime(b) - getElementTime(a);
                              }).map((post: any) => (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={post.id} 
                                  className="flex-shrink-0 w-[290px] sm:w-[350px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all group/post snap-start flex flex-col h-full"
                                >
                                  <div className="flex justify-between items-start gap-3 mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                          {post.subjects && post.subjects.length > 0 ? post.subjects.map(formatSubjectDisplayName).join(', ') : formatSubjectDisplayName(post.subject)}
                                        </span>
                                        {post.date && parseSafeDate(post.date) && (
                                          <span className="text-[10px] font-bold text-slate-400">
                                            {formatSafeDate(post.date)} {formatSafeTimeString(post.date, { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="text-base font-black text-slate-800 leading-tight group-hover/post:text-indigo-600 transition-colors line-clamp-2 min-h-[2.5rem]">{post.title}</h3>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const shareUrl = post.link || window.location.href;
                                        if (navigator.share) {
                                          navigator.share({ title: post.title, text: post.content, url: shareUrl });
                                        } else {
                                          navigator.clipboard.writeText(shareUrl);
                                          alert("Link copied to clipboard!");
                                        }
                                      }}
                                      className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-slate-100 rounded-xl transition-all shrink-0"
                                    >
                                      <Share2 size={16} />
                                    </button>
                                  </div>

                                  {post.imageUrl && (
                                    <div className="mb-4 aspect-[16/10] rounded-xl overflow-hidden border border-slate-100 shadow-inner">
                                       <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover/post:scale-110 transition-transform duration-700" />
                                    </div>
                                  )}

                                  <div className="prose prose-slate prose-xs max-w-none text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 mb-4 flex-1 line-clamp-4">
                                     {post.content.split('\n').slice(0, 3).map((line: string, i: number) => (
                                       <p key={i} className="mb-2 last:mb-0 text-xs leading-relaxed font-medium">
                                         {line}
                                       </p>
                                     ))}
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-auto">
                                    <div></div>
                                    {post.link && (
                                      <a 
                                        href={post.link} 
                                        target="_blank" 
                                        rel="noopener" 
                                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:gap-2 transition-all p-2 bg-indigo-50 rounded-lg"
                                      >
                                        READ <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {/* Horizontal Scroll Hint Overlay */}
                            <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        );
      })()}
        {activeTab === "homework" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                  <FileText size={20} />
                </div>
                Recent Homework
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your assigned homework.</p>
              
              <div className="space-y-4">
                {homework.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
                    <p className="font-medium text-slate-700">All caught up!</p>
                    <p className="text-sm mt-1">No homework assigned yet for your grade.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {homework.map((hw: any) => (
                      <div key={hw.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">{hw.title}</h3>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 mt-1 inline-block">{hw.subject}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Calendar size={12} /> Assigned: {hw.date}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{hw.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <CheckCircle size={20} />
                </div>
                Attendance Record
              </h2>
              <p className="text-slate-500 mb-8 ml-13">Track your class attendance history.</p>
              
              <div className="space-y-4">
                {attendance.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No attendance records found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attendance.map((record: any) => (
                      <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{formatSafeDate(record.date, { month: 'short' })}</span>
                            <span className="text-sm font-bold text-slate-700 leading-none mt-0.5">{parseSafeDate(record.date)?.getDate() || ""}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">{formatSafeDate(record.date, { weekday: 'long' })}</h3>
                            <p className="text-xs text-slate-500">{parseSafeDate(record.date)?.getFullYear() || ""}</p>
                          </div>
                        </div>
                        <div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                            record.status === "Present" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : 
                            record.status === "Absent" ? "bg-rose-100 text-rose-700 border border-rose-200" : 
                            record.status === "Leave" ? "bg-amber-100 text-amber-700 border border-amber-200" : 
                            record.status === "Late" ? "bg-orange-100 text-orange-700 border border-orange-200" : 
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {record.status === "Present" && <CheckCircle size={12} />}
                            {record.status === "Absent" && <XCircle size={12} />}
                            {record.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "marks" && (
          <div className="space-y-6">
            {/* Top Header & Sub-tab Switcher */}
            <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 rounded-3xl text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/10 shadow-inner">
                    <Award size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-widest text-indigo-300 uppercase">Assessment & Exams</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-indigo-950">Online System</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                      பரீட்சைகள் & தேர்வு முடிவுகள் (Examinations & Marks)
                    </h2>
                    <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                      உங்கள் வகுப்புக்கான தவணைப் பரீட்சைகள், கூகுள் ஃபார்ம்ஸ் மற்றும் அறிக்கை அட்டை.
                    </p>
                  </div>
                </div>

                {/* Sub-tab pills */}
                <div className="flex flex-wrap items-center bg-black/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0 gap-1">
                  <button
                    onClick={() => setMarksSubTab("exams")}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      marksSubTab === "exams"
                        ? "bg-amber-400 text-indigo-950 shadow-md"
                        : "text-indigo-100 hover:text-white"
                    }`}
                  >
                    <BookOpen size={16} />
                    <span>1. செய்யும் தேர்வுகள்</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      marksSubTab === "exams" ? "bg-indigo-950 text-amber-300" : "bg-white/20 text-white"
                    }`}>
                      {termExams.filter((ex: any) => {
                        if (!ex.grades || ex.grades.length === 0) return true;
                        if (ex.grades.includes("All")) return true;
                        return ex.grades.some((g: string) => 
                          g === studentData?.grade || 
                          normalizeGradeString(g) === normalizeGradeString(studentData?.grade || '')
                        );
                      }).length}
                    </span>
                  </button>

                  <button
                    onClick={() => setMarksSubTab("results")}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      marksSubTab === "results"
                        ? "bg-amber-400 text-indigo-950 shadow-md"
                        : "text-indigo-100 hover:text-white"
                    }`}
                  >
                    <Award size={16} />
                    <span>2. தேர்வு மதிப்பெண்கள்</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      marksSubTab === "results" ? "bg-indigo-950 text-amber-300" : "bg-white/20 text-white"
                    }`}>
                      {examMarks.filter(m => m.studentId === studentData?.id).length}
                    </span>
                  </button>

                  <button
                    onClick={() => setMarksSubTab("reports")}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      marksSubTab === "reports"
                        ? "bg-amber-400 text-indigo-950 shadow-md"
                        : "text-indigo-100 hover:text-white"
                    }`}
                  >
                    <FileText size={16} />
                    <span>3. உத்தியோகபூர்வ அறிக்கை அட்டை</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SUBTAB 1: TERM EXAMS LIST FOR STUDENT */}
            {marksSubTab === "exams" && (
              <div className="space-y-6">
                {/* Exam Submission Success Celebration Banner */}
                {submittedSuccessExam && (
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-400/30 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shrink-0">
                        🎉
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                          மதிப்பெண் பதிவு செய்யப்பட்டது!
                        </span>
                        <h4 className="text-lg font-black mt-1">
                          வாழ்த்துகள் {studentData?.name}!
                        </h4>
                        <p className="text-xs text-emerald-100">
                          {submittedSuccessExam.examName} ({submittedSuccessExam.subject}) • பெற்ற புள்ளி: <strong>{submittedSuccessExam.obtained}/{submittedSuccessExam.total} ({submittedSuccessExam.gradeLetter})</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setMarksSubTab("reports");
                          setSubmittedSuccessExam(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <FileText size={16} />
                        அறிக்கை அட்டை பார்க்க (View Report Sheet)
                      </button>
                      <button
                        onClick={() => setSubmittedSuccessExam(null)}
                        className="p-2 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Dismiss"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
                {/* Notification & App Icon Badge Status Bar */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                      unattendedExamsCount > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {unattendedExamsCount}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-sm sm:text-base">
                          எழுதப்படாத பரீட்சைகள் (Pending Exams)
                        </span>
                        {unattendedExamsCount > 0 ? (
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            {unattendedExamsCount} Active
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            அனைத்தும் முடிந்தது
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        வாட்ஸ்அப் போன்று ஆப் ஐகானில் சிவப்பு பேட்ஜ் காட்டும். பரீட்சை எழுதி முடித்ததும் பேட்ஜ் குறையும்.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={async () => {
                        if (notificationPermission !== 'granted') {
                          const perm = await requestSystemNotificationPermission();
                          setNotificationPermission(perm);
                        } else {
                          showSystemNotification('அகரம் தினைஸ் அகாடமி 🎓', {
                            body: `🔔 சோதனை அறிவித்தல்: தற்போது ${unattendedExamsCount} பரீட்சை எழுதப்படவுள்ளது!`,
                            badgeCount: unattendedExamsCount || 1,
                            url: '/student-dashboard?tab=marks&subTab=exams'
                          });
                        }
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Bell size={14} className="text-amber-500" />
                      {notificationPermission === 'granted' ? 'நோட்டிபிகேஷன் சோதி (Test)' : 'நோட்டிபிகேஷன் ஆன் செய்'}
                    </button>
                  </div>
                </div>
                {(() => {
                  const studentGradeStr = (studentData?.grade || '').trim();
                  const myExams = termExams.filter((exam: any) => {
                    if (!exam.grades || exam.grades.length === 0) return true;
                    if (exam.grades.includes("All") || exam.grades.includes("அனைத்தும்")) return true;
                    return exam.grades.some((g: string) => {
                      return g === studentGradeStr || 
                             normalizeGradeString(g) === normalizeGradeString(studentGradeStr);
                    });
                  });

                  if (myExams.length === 0) {
                    return (
                      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                          <Award size={32} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800">
                            புதிய பரீட்சைகள் எதுவும் வெளியிடப்படவில்லை
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                            உங்கள் வகுப்புக்கான ({studentData?.grade}) பரீட்சைகள் அல்லது வினாத்தாள்கள் ஆசிரியர் சேர்த்தவுடன் இங்கு காட்டப்படும்.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myExams.map((exam: any) => {
                        const mySubmission = examSubmissions.find(
                          (s: any) => s.examId === exam.id && s.studentId === studentData.id
                        );
                        const hasSubmitted = Boolean(mySubmission);

                        return (
                          <div 
                            key={exam.id}
                            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group"
                          >
                            {/* Poster / Thumbnail or Header Banner */}
                            <div className="relative h-44 bg-gradient-to-br from-indigo-900 to-blue-900 overflow-hidden shrink-0">
                              {exam.thumbnail ? (
                                <img 
                                  src={exam.thumbnail} 
                                  alt={exam.examName} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white">
                                  <Award size={44} className="text-amber-400 mb-2 opacity-90" />
                                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">{exam.subject || "பாடம்"}</span>
                                  <span className="text-sm font-black line-clamp-1 mt-1">{exam.termName}</span>
                                </div>
                              )}

                              {/* Floating Term Badge */}
                              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                                <span className="bg-indigo-900/90 backdrop-blur-md text-amber-300 border border-amber-300/30 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                                  {exam.termName}
                                </span>
                              </div>

                              {/* Bottom Date & Duration */}
                              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl">
                                <span className="flex items-center gap-1">
                                  <Calendar size={13} className="text-amber-300" /> {exam.examDate}
                                </span>
                                {exam.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={13} className="text-amber-300" /> {exam.duration}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Body Content */}
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                    {exam.subject || "பொது"}
                                  </span>
                                  <span className="text-xs font-bold text-slate-500">
                                    புள்ளிகள்: {exam.totalMarks || 100}
                                  </span>
                                </div>

                                <h3 className="font-black text-slate-800 text-base leading-snug line-clamp-2">
                                  {exam.examName}
                                </h3>

                                {exam.instructions && (
                                  <p className="text-xs text-slate-500 line-clamp-2 italic">
                                    "{exam.instructions}"
                                  </p>
                                )}
                              </div>

                              {/* Submission Status & Action Button */}
                              <div className="space-y-3 pt-3 border-t border-slate-100">
                                {hasSubmitted ? (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                      <div>
                                        <p className="text-[11px] font-bold text-emerald-800">மதிப்பெண் சமர்ப்பிக்கப்பட்டது</p>
                                        <p className="text-sm font-black text-emerald-950">
                                          {mySubmission.obtained} / {mySubmission.total}{" "}
                                          <span className="text-xs font-bold text-emerald-700">
                                            (தரம்: {mySubmission.gradeLetter || "A"})
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setActiveExamTaking(exam);
                                        setStudentSelfMarksInput({
                                          obtained: String(mySubmission.obtained),
                                          total: String(mySubmission.total),
                                          remarks: mySubmission.remarks || ""
                                        });
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors"
                                    >
                                      திருத்து / மீண்டும்
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveExamTaking(exam);
                                      setStudentSelfMarksInput({
                                        obtained: "",
                                        total: String(exam.totalMarks || 100),
                                        remarks: ""
                                      });
                                    }}
                                    className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
                                  >
                                    <BookOpen size={16} /> பரீட்சை எழுது (Attend Exam)
                                  </button>
                                )}

                                {/* Question paper / solution downloads if available */}
                                {(exam.paperPdf || exam.solutionPdf) && (
                                  <div className="flex gap-2 pt-1">
                                    {exam.paperPdf && (
                                      <a
                                        href={exam.paperPdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <Download size={12} /> வினாத்தாள்
                                      </a>
                                    )}
                                    {exam.solutionPdf && (
                                      <a
                                        href={exam.solutionPdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <FileText size={12} /> விடைத்தாள்
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUBTAB 2: EXAM RESULTS & REPORT CARD */}
            {marksSubTab === "results" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-slate-800 flex items-center font-sans">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                      <Award size={20} />
                    </div>
                    தேர்வு முடிவுகள் (Exam Results)
                  </h2>
                  <p className="text-slate-500 ml-13 font-medium">Your academic performance and report cards.</p>
                </div>
                <button
                  onClick={() => setMarksSubTab("reports")}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start md:self-auto"
                >
                  <FileText size={16} />
                  உத்தியோகபூர்வ அறிக்கை அட்டை (Official Report Sheet)
                </button>
              </div>

              {examMarks.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Award size={32} className="text-slate-300" />
                  </div>
                  <p className="text-lg font-bold text-slate-400">No results published yet.</p>
                  <p className="text-sm">Results will appear here once the administrator uploads them.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(examMarks.reduce((acc: any, mark: any) => {
                    if (!acc[mark.exam]) acc[mark.exam] = [];
                    acc[mark.exam].push(mark);
                    return acc;
                  }, {})).map(([examName, marks]: [string, any]) => {
                    // Sort marks by subject
                    const sortedMarks = marks.sort((a: any, b: any) => a.subject.localeCompare(b.subject));
                    
                    return (
                      <div key={examName} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                          <h3 className="text-lg font-black text-slate-800">{examName}</h3>
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => setMarksSubTab("reports")}
                              className="bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <FileText size={14} /> அறிக்கை அட்டை
                            </button>
                            <button 
                              onClick={() => generateSingleStudentPdf(currentStudentReportCard)}
                              className="bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Download size={14} /> PDF
                            </button>
                            <button 
                              onClick={() => handleDownloadReportCard(examName, 'png')}
                              className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Camera size={14} /> Image
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-6 overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                                <th className="pb-3 px-2">Subject</th>
                                <th className="pb-3 px-2 text-center">Marks</th>
                                <th className="pb-3 px-2 text-center">Grade</th>
                                <th className="pb-3 px-2">Remarks</th>
                                <th className="pb-3 px-2 text-center">Download</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sortedMarks.map((m: any) => {
                                const percentage = (m.obtained / m.total) * 100;
                                let grade = 'F';
                                let color = 'text-red-600 bg-red-50';
                                
                                if (percentage >= 90) { grade = 'A+'; color = 'text-emerald-600 bg-emerald-50'; }
                                else if (percentage >= 80) { grade = 'A'; color = 'text-green-600 bg-green-50'; }
                                else if (percentage >= 70) { grade = 'B'; color = 'text-blue-600 bg-blue-50'; }
                                else if (percentage >= 60) { grade = 'C'; color = 'text-yellow-600 bg-yellow-50'; }
                                else if (percentage >= 50) { grade = 'D'; color = 'text-orange-600 bg-orange-50'; }

                                return (
                                  <tr key={m.id} className="group hover:bg-white transition-colors">
                                    <td className="py-4 px-2">
                                      <span className="font-bold text-slate-800 text-sm">{m.subject}</span>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className="font-black text-indigo-600 text-base">{m.obtained}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">/ {m.total}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                      <span className={`px-2.5 py-1 rounded-lg font-black text-xs border ${color} border-current/20`}>
                                        {grade}
                                      </span>
                                    </td>
                                    <td className="py-4 px-2">
                                      <p className="text-xs text-slate-600 italic font-medium max-w-[150px] truncate" title={m.remarks}>
                                        {m.remarks || "N/A"}
                                      </p>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                      <button 
                                        onClick={() => {
                                          const tempMark = { ...m, studentName: studentData.name, rollNo: studentData.rollNo };
                                          // For now full report card is same as individual but aggregated
                                          handleDownloadReportCard(examName, 'pdf');
                                        }}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex group-hover:scale-110"
                                      >
                                        <Download size={18} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: OFFICIAL REPORT CARD / CERTIFICATE */}
        {marksSubTab === "reports" && (
          <div className="space-y-6">
            <OfficialReportCard
              data={currentStudentReportCard}
              showActions={true}
            />
          </div>
        )}

        {/* IN-APP EXAM TAKING & MARKS SUBMISSION MODAL */}
          {activeExamTaking && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
              <div className="bg-white rounded-3xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                {/* Top Bar */}
                <div className="bg-indigo-950 text-white px-5 sm:px-8 py-3.5 flex items-center justify-between shrink-0 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveExamTaking(null)}
                      className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                    <div>
                      <h3 className="font-black text-sm sm:text-base line-clamp-1">{activeExamTaking.examName}</h3>
                      <p className="text-[11px] text-indigo-300">
                        {activeExamTaking.termName} • {activeExamTaking.subject || "பாடம்"} • மொத்தப் புள்ளிகள்: {activeExamTaking.totalMarks || 100}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeExamTaking.examLink && (
                      <a
                        href={activeExamTaking.examLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink size={13} /> புதிய தாவலில் (New Tab)
                      </a>
                    )}
                    <button
                      onClick={() => setActiveExamTaking(null)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                    >
                      வெளியேறு (Exit)
                    </button>
                  </div>
                </div>

                {/* Embedded Exam Area */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col">
                  {activeExamTaking.examLink ? (
                    <iframe
                      src={formatEmbedUrl(activeExamTaking.examLink)}
                      title={activeExamTaking.examName}
                      className="w-full h-full border-0 flex-1"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : activeExamTaking.paperPdf ? (
                    <iframe
                      src={activeExamTaking.paperPdf}
                      title="Question Paper PDF"
                      className="w-full h-full border-0 flex-1"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <Award size={48} className="text-indigo-400" />
                      <h4 className="text-lg font-bold text-slate-700">பரீட்சை வினாத்தாள் இணைப்பு</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {activeExamTaking.instructions || "அனைத்து வினாக்களுக்கும் கவனமாக விடையளிக்கவும்."}
                      </p>
                    </div>
                  )}

                  {/* Bottom Marks Submission Dock */}
                  <div className="bg-white border-t border-slate-200 p-4 sm:p-5 shadow-2xl shrink-0">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                      <div className="shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className="text-sm font-black text-slate-800">
                            பரீட்சை முடிந்துவிட்டதா? உங்கள் புள்ளிகளை (Marks) உள்ளீடு செய்யவும்
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          பரீட்சையை முடித்துவிட்டு நீங்கள் பெற்ற மதிப்பெண்களை கீழே பதிவிட்டுச் சமர்ப்பிக்கவும்.
                        </p>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleStudentSubmitSelfMarks(activeExamTaking);
                        }}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            பெற்ற புள்ளி:
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="85"
                            value={studentSelfMarksInput.obtained}
                            onChange={(e) => setStudentSelfMarksInput({ ...studentSelfMarksInput, obtained: e.target.value })}
                            className="w-24 border-2 border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 rounded-xl px-3 py-2 text-center text-base font-black text-indigo-700 bg-white"
                          />
                          <span className="text-xs font-bold text-slate-400">
                            / {studentSelfMarksInput.total || activeExamTaking.totalMarks || 100}
                          </span>
                        </div>

                        <input
                          type="text"
                          placeholder="குறிப்புகள் (Optional)"
                          value={studentSelfMarksInput.remarks}
                          onChange={(e) => setStudentSelfMarksInput({ ...studentSelfMarksInput, remarks: e.target.value })}
                          className="border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 flex-1 min-w-[140px]"
                        />

                        <button
                          type="submit"
                          disabled={isSubmittingMarks}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          <CheckCircle2 size={16} />
                          <span>{isSubmittingMarks ? "சமர்ப்பிக்கப்படுகிறது..." : "புள்ளிகளைச் சமர்ப்பி"}</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "rules" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mr-3">
                  <ShieldAlert size={20} />
                </div>
                விதிமுறைகள் மற்றும் நிபந்தனைகள் (Rules & Regulations)
              </h2>
              <p className="text-slate-500 mb-8 ml-13">மாணவர்கள் தங்கள் கற்றல் சூழலை மரியாதையுடனும், ஒழுக்கத்துடனும் பேணுவதற்கு இது உதவும்.</p>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: "01", text: "நிர்ணயிக்கப்பட்ட வருகைப்பதிவு: மாணவர்களின் சிறந்த கற்றல் செயல்பாடுகளுக்காக வருகைப்பதிவு கட்டாயமாகும்.", color: "indigo" },
                  { id: "02", text: "தவறான தகவல் தடை: மாணவர்கள் மற்ற மாணவர்களின் தொலைபேசி எண்களை எந்த காரணத்திற்காகவும் தவறாகப் பயன்படுத்தக் கூடாது.", color: "rose" },
                  { id: "03", text: "கட்டண ஒழுங்கு: குறிப்பிட்ட தேதியில் கட்டணத்தை செலுத்தாவிடில், வகுப்பிலிருந்து நீக்கப்படுவர்.", color: "amber" },
                  { id: "04", text: "வீட்டுப்பாடம் (Homework): வீட்டுப்பாடங்கள் செய்வது கட்டாயமாகும்.", color: "emerald" },
                  { id: "05", text: "நன்னடத்தை: வகுப்பிற்கு இடையூறு விளைவிக்கும் மாணவர்கள் உடனடியாக வெளியேற்றப்படுவார்கள்.", color: "slate" }
                ].map((rule) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={rule.id} 
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-${rule.color}-100 text-${rule.color}-600 flex items-center justify-center font-bold text-sm shrink-0 border border-${rule.color}-200`}>
                      {rule.id}
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed">{rule.text}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Info size={16} />
                  </div>
                  <h3 className="font-bold">முக்கிய குறிப்பு (Important Note)</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  மாணவர்களின் கல்வி முன்னேற்றத்திற்காகவும், அகாடமியின் ஒழுக்கத்தைப் பேணுவதற்காகவும் இந்த விதிமுறைகள் கடுமையாகப் பின்பற்றப்படுகின்றன. 
                  அகரம் தினேஷ் அகாடமி (Agaram Dhines Academy) உடன் இணைந்திருக்கும் ஒவ்வொரு மாணவரும் இந்த விதிமுறைகளுக்குக் கட்டுப்பட வேண்டும்.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fees" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <span className="font-bold text-lg">₨</span>
                </div>
                Fee Status
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your payment history.</p>
              
              <div className="space-y-4">
                {fees.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-xl text-slate-300">₨</span>
                    </div>
                    <p>கட்டண விபரங்கள் எதுவும் இல்லை (No fee records found).</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fees.map((feeGroup: any) => {
                      const isPartial = feeGroup.remainingAmount && parseInt(feeGroup.remainingAmount) > 0;
                      return (
                        <div key={feeGroup.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                          {/* Top Highlight Indicator */}
                          <div className={`absolute top-0 right-0 left-0 h-1.5 ${isPartial ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-black text-slate-800 text-base leading-tight uppercase">
                                {feeGroup.items?.length === 1 
                                  ? (feeGroup.items[0].itemName || feeGroup.items[0].type)
                                  : `${feeGroup.items?.length || 1} Fees Paid (ஒருமித்த கட்டணம்)`}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                {feeGroup.month || feeGroup.displayMonth ? `வகுப்புக் கட்டணம் - ${feeGroup.month || feeGroup.displayMonth}` : 'பாடநெறிக்கான கட்டணம் (Course Fee)'}
                              </p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                              isPartial ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {isPartial ? "Partial (மீதி உள்ளது)" : "Fully Paid (முழுதும்)"}
                            </span>
                          </div>

                          <div className="space-y-2 border-y border-slate-100 py-3.5 my-3.5 text-xs">
                            {feeGroup.items && feeGroup.items.length > 0 && (
                              <div className="space-y-1.5 mb-2 pb-2 border-b border-slate-100">
                                {feeGroup.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-slate-600 font-semibold text-[11px]">
                                    <span>• {item.itemName || item.label}</span>
                                    <span className="text-slate-800">LKR {item.paidAmount || item.amount}.00</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-between text-slate-500 font-medium">
                              <span>Full Course Fee (முழுக் கட்டணம்):</span>
                              <span className="font-bold text-slate-800">LKR {feeGroup.totalAmount || feeGroup.fullFee || feeGroup.amount}.00</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-medium">
                              <span className="text-emerald-600 font-bold">Amount Paid (செலுத்தியது):</span>
                              <span className="font-bold text-emerald-600">LKR {feeGroup.amountPaid || feeGroup.amount}.00</span>
                            </div>
                            {isPartial && (
                              <div className="flex justify-between text-slate-500 font-medium">
                                <span className="text-red-500 font-bold">Remaining Balance (மீதிக்கட்டணம்):</span>
                                <span className="font-black text-red-600">LKR {feeGroup.remainingAmount}.00</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="text-left">
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Paid Date</p>
                              <p className="text-xs text-slate-700 font-bold mt-0.5">{feeGroup.date || "N/A"}</p>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedReceipt({
                                  ...feeGroup,
                                  studentName: studentData.name,
                                  rollNo: studentData.rollNo,
                                  grade: studentData.grade
                                });
                                setShowReceiptModal(true);
                              }}
                              className="text-[11px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FileText size={13} className="text-slate-500" />
                              View Slip (பெறுசீட்டு)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col -mx-4 -mt-4 h-[calc(100vh-140px)]">
            <div className="bg-white shadow-sm border-b border-slate-200 p-4 z-10 flex items-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                <WhatsAppIcon size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Live Chat Support
              </h2>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50">
              <LiveChat currentUser={{ id: studentData.id, name: studentData.name, role: "Student", grade: studentData.grade }} />
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative group">
                  <div className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden transition-transform group-hover:scale-105">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-slate-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg transition-colors border-2 border-white">
                    <Camera size={16} />
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg" 
                      className="hidden" 
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                
                <div className="text-center mt-5">
                  {isEditingName ? (
                    <div className="flex items-center justify-center space-x-2">
                      <input 
                        type="text" 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="border-b-2 border-indigo-500 bg-transparent px-2 py-1 text-center font-bold text-2xl text-slate-800 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveName} className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded-lg transition-colors">
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 group">
                      <h2 className="text-2xl font-bold text-slate-800">
                        {displayName}
                      </h2>
                      <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1.5 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-500 mt-1">Display Name</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Account Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><User size={16} className="text-slate-400"/> Admin Given Name</span>
                    <span className="font-bold text-slate-800">{studentData.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><User size={16} className="text-slate-400"/> Username</span>
                    <span className="font-bold text-slate-800">{studentData.username}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><Book size={16} className="text-slate-400"/> Grade</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{studentData.grade}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><FileText size={16} className="text-slate-400"/> Roll No</span>
                    <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{studentData.rollNo}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 mt-6">
                <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Download size={18} /> Downloads
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Student ID Card</h4>
                      <p className="text-xs text-slate-500 mt-1">Download your official ID card</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-2">
                      <div className="flex gap-2 w-full">
                        <button onClick={() => handleDownloadIdCard('pdf')} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-opacity whitespace-nowrap cursor-pointer">PDF</button>
                        <button onClick={() => handleDownloadIdCard('png')} className="flex-1 bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-opacity whitespace-nowrap cursor-pointer">PNG</button>
                      </div>
                      <button 
                        onClick={handleCopyIdCardImage}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm
                          ${copiedId 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                            : 'bg-[#1e1e24] hover:bg-[#2e2e34] text-white'
                          }`}
                      >
                        {copiedId ? (
                          <>
                            <Check size={13} />
                            Copied! (நகலெடுக்கப்பட்டது)
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            Copy Image (படமாக நகலெடு)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      <Award size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Certificate</h4>
                      <p className="text-xs text-slate-500 mt-1">Download your certificate</p>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                      <button onClick={() => handleDownloadCertificate('pdf')} className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">PDF</button>
                      <button onClick={() => handleDownloadCertificate('png')} className="flex-1 bg-amber-100 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">PNG</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => window.open("https://www.agaramdhines.lk/lp-profile/", "_blank")}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
                >
                  <User size={20} />
                  Manage External Profile
                </button>
              </div>
            </div>

            {/* Zoom Class Link Section in Profile */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                  <Video size={16} />
                </div>
                Class Links
              </h3>
              <p className="text-sm text-slate-500 mb-6 ml-11">Your registered live class links for {studentData.grade}</p>
              
              <div className="space-y-4">
                {classLinks[studentData.grade] && (
                  <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100 shadow-sm">
                    <span className="font-bold text-indigo-800 truncate mr-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      CLASS
                    </span>
                    <button 
                      onClick={() => handleJoinClass(classLinks[studentData.grade])}
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap shadow-sm transition-colors"
                    >
                      Join Now
                    </button>
                  </div>
                )}
                
                {zoomLinks.map(link => (
                  <div key={link.id} className="bg-white p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all gap-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-lg truncate mr-2">{link.title}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{new Date(link.datetime).toLocaleString()}</span>
                        <CountdownTimer targetDate={link.datetime} />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {link.meetingId && <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Meeting ID: <span className="font-mono font-bold text-slate-700 ml-1">{link.meetingId}</span></span>}
                        {link.passcode && <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Passcode: <span className="font-mono font-bold text-slate-700 ml-1">{link.passcode}</span></span>}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button 
                        onClick={() => handleJoinClass(null)}
                        className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-100 whitespace-nowrap transition-colors"
                      >
                        Mark Attendance
                      </button>
                      <button 
                        onClick={() => handleJoinClass(link.link)}
                        className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap shadow-sm transition-colors"
                      >
                        Join Now
                      </button>
                    </div>
                  </div>
                ))}

                {!classLinks[studentData.grade] && zoomLinks.length === 0 && (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <Video className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p>No class links available.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fee History Section in Profile */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <DollarSign size={16} />
                </div>
                Monthly Fee History
              </h3>
              <div className="space-y-3">
                {fees.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <DollarSign className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p>கட்டண விபரங்கள் இல்லை (No fee records found).</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fees.map((fee: any) => {
                      const isPartial = fee.remainingAmount && parseInt(fee.remainingAmount) > 0;
                      return (
                        <div key={fee.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0 text-sm">
                          <div>
                            <span className="text-slate-800 font-bold block leading-tight">
                              {fee.itemName || fee.type || "Fees Payment"}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                              {fee.date} • {fee.type === 'Monthly Tuition' ? `வகுப்புக் கட்டணம் (${fee.month})` : 'பாடநெறிக்கான கட்டணம்'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs">
                              LKR {fee.amount}
                            </span>
                            {isPartial ? (
                              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[10px]">
                                Bal: {fee.remainingAmount}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[9px] uppercase">
                                Full
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Access Blocked / Fee Pending Modal */}
      {showAccessBlockedModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 border border-rose-100 relative animate-scale-up">
            <button
              onClick={() => setShowAccessBlockedModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-rose-200">
              <ShieldAlert size={36} />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider rounded-full mb-3 border border-rose-200">
                📢 அணுகல் தவிர்க்கப்பட்டுள்ளது
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-snug">
                கட்டணம் செலுத்தாத மாணவர்களுக்கான அணுகல் தவிர்க்கப்பட்டுள்ளது
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed">
                உங்கள் வகுப்புக் கட்டணம் செலுத்தப்படாததால் e-Learning, YouTube பாடங்கள், Course Materials மற்றும் நேரலை Zoom வகுப்புகளுக்கான அணுகல் தவிர்க்கப்பட்டுள்ளது. தயவுசெய்து நிலுவைக் கட்டணத்தை செலுத்தவும்.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setShowAccessBlockedModal(false);
                  setActiveTab("fees");
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                கட்டணம் செலுத்துக (Pay Fees)
              </button>

              <a
                href={`https://wa.me/94778054232?text=${encodeURIComponent(`வணக்கம், எனது பெயர்: ${studentData?.name || ''}, தரம்: ${studentData?.grade || ''}. எனது கணக்கு அணுகல் தவிர்க்கப்பட்டுள்ளது. கட்டணம் செலுத்திய விவரத்தை அனுப்ப விரும்புகிறேன்.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl border border-emerald-200 transition-all text-xs flex items-center justify-center gap-2"
              >
                <WhatsAppIcon size={16} />
                WhatsApp மூலம் தொடர்பு கொள்க
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-lg">
        <div className="bg-[#1e1e24] rounded-full flex justify-between items-center px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "website") {
                    window.open("https://agaramdhines.lk", "_blank");
                  } else {
                    handleTabSelect(item.id);
                  }
                }}
                className="relative flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 z-10"
              >
                {/* Lifted Active Icon */}
                <div 
                  className={`absolute transition-all duration-500 ease-out flex flex-col items-center
                    ${isActive ? '-translate-y-8' : 'translate-y-0 opacity-0 pointer-events-none'}`}
                >
                  {/* The Green Circle with Icon */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 rounded-full border-[4px] border-slate-50 flex items-center justify-center text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                  </div>
                  {/* The Label */}
                  <span className="bg-white text-gray-900 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 shadow-md whitespace-nowrap">
                    {item.name}
                  </span>
                  {/* The Glowing Dot */}
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] mt-1"></div>
                </div>

                {/* Inactive Icon */}
                <div 
                  className={`transition-all duration-300 text-gray-400 hover:text-gray-200 relative
                    ${isActive ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                >
                  {React.cloneElement(item.icon as React.ReactElement, { size: 22 })}
                  {item.id === 'home' && badgeCount > 0 && !isActive && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full shadow-lg border border-white">
                      {badgeCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden Templates for Download */}
      <div className="fixed top-0 left-0 z-[-50] pointer-events-none opacity-0">
        {/* ID Card Template */}
        <div 
          id="student-id-card-template" 
          className="w-[3.375in] h-[2.125in] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl p-2.5 relative overflow-hidden text-white shadow-xl shrink-0 flex flex-col justify-between"
        >
          {/* Subtle background glow accents */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-400/20 rounded-full blur-xl pointer-events-none"></div>

          {/* Top Header Row */}
          <div className="flex items-center justify-between gap-1.5 border-b border-white/20 pb-1 z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-9 h-9 bg-white rounded-full p-0.5 shadow-md border border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
                <img 
                  src={adminSettings?.profileImage || "/logo.png"} 
                  alt="AGARAM DHINES ONLINE ACADEMY" 
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-[9px] font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs truncate">
                  {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                </h3>
                <p className="text-[7.5px] font-extrabold text-amber-200 leading-tight drop-shadow-xs truncate">
                  அகரம் தினேஷ் ஆன்லைன் அகாடமி
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[6.5px] font-black bg-amber-400 text-indigo-950 px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                OFFICIAL ID
              </span>
              <span className="text-[7px] font-extrabold text-sky-100 block mt-0.5 whitespace-nowrap">
                📞 778054232
              </span>
            </div>
          </div>

          {/* Student Main Info Row */}
          <div className="flex items-center gap-2 my-0.5 z-10">
            <div className="w-10 h-10 rounded-full border-2 border-white/90 overflow-hidden shrink-0 bg-white/20 flex items-center justify-center shadow-md">
              {profileImage ? (
                <img src={profileImage} alt={studentData.name} className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[11px] font-extrabold text-white truncate leading-tight drop-shadow-xs">
                {studentData.name}
              </h2>
              <div className="flex items-center gap-2 text-[8px] text-sky-100 mt-0.5">
                <span>Grade: <strong className="text-amber-200">{studentData.grade}</strong></span>
                <span className="text-white/40">•</span>
                <span>Roll No: <strong className="text-white">{studentData.rollNo || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          {/* Enrolled Subjects List - Colorful Badges */}
          <div className="z-10 bg-black/20 backdrop-blur-xs p-1 rounded-md border border-white/15">
            <span className="text-[6.5px] font-black uppercase tracking-wider text-sky-200 block mb-0.5">
              Subjects / பாடங்கள்:
            </span>
            <div className="flex flex-wrap gap-1 max-h-[26px] overflow-hidden">
              {(() => {
                const subs = studentData.subjects || studentData.enrolledClasses;
                const badgeColors = [
                  'bg-amber-400 text-indigo-950',
                  'bg-emerald-400 text-indigo-950',
                  'bg-sky-300 text-indigo-950',
                  'bg-pink-300 text-indigo-950',
                  'bg-purple-300 text-indigo-950',
                  'bg-yellow-300 text-indigo-950',
                ];
                if (Array.isArray(subs) && subs.length > 0) {
                  return subs.map((s: string, idx: number) => (
                    <span 
                      key={idx} 
                      className={`text-[7px] font-black px-1.5 py-0.2 rounded shadow-xs whitespace-nowrap ${badgeColors[idx % badgeColors.length]}`}
                    >
                      {s}
                    </span>
                  ));
                }
                return (
                  <span className="text-[7px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-indigo-950">
                    All Registered Courses
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Footer Credentials & QR Code */}
          <div className="flex items-end justify-between gap-1 mt-0.5 z-10">
            <div className="bg-black/25 backdrop-blur-xs px-1.5 py-0.5 rounded border border-white/20 text-[7.5px] font-mono leading-tight flex-1">
              <p className="text-white/80 flex justify-between"><span>User:</span> <span className="text-white font-bold">{studentData.username}</span></p>
              <p className="text-white/80 flex justify-between"><span>Pass:</span> <span className="text-amber-200 font-bold">{studentData.password}</span></p>
            </div>
            <div className="bg-white p-0.5 rounded shrink-0 shadow-md">
              <QRCodeSVG value={studentData.id} size={32} level="H" includeMargin={false} />
            </div>
          </div>
        </div>

        {/* Certificate Template */}
        <div 
          id="student-certificate-template" 
          className="w-[11in] h-[8.5in] bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-10 relative shrink-0 flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          {/* Ornate Gold & Royal Blue Borders */}
          <div className="absolute inset-4 border-[10px] border-double border-indigo-900 rounded-3xl pointer-events-none"></div>
          <div className="absolute inset-7 border-2 border-amber-400/80 rounded-2xl pointer-events-none"></div>
          
          {/* Ornate Corner Accents */}
          <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-amber-500 pointer-events-none"></div>
          <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-amber-500 pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-amber-500 pointer-events-none"></div>
          <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-amber-500 pointer-events-none"></div>

          {/* Background Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
            <Award size={520} className="text-indigo-900" />
          </div>

          <div className="relative z-10 h-full w-full flex flex-col items-center justify-between text-center px-12 py-4">
            
            {/* Top Academy Logo & Branding Header */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg border-2 border-amber-400 mb-2 overflow-hidden flex items-center justify-center">
                <img 
                  src={adminSettings?.profileImage || "/logo.png"} 
                  alt="AGARAM DHINES ONLINE ACADEMY" 
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wider text-indigo-950 leading-tight">
                {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
              </h3>
              <p className="text-base font-extrabold text-amber-600 mt-0.5 tracking-wide">
                அகரம் தினேஷ் ஆன்லைன் அகாடமி <span className="text-indigo-800 text-sm ml-2 font-bold">| 📞 778054232</span>
              </p>
            </div>

            {/* Certificate Main Title */}
            <div className="my-2">
              <h1 className="text-5xl font-serif font-black text-indigo-900 tracking-wide uppercase drop-shadow-xs">
                Certificate of Excellence
              </h1>
              <p className="text-sm font-black text-amber-600 uppercase tracking-[0.3em] mt-1">
                Official Academic Award
              </p>
            </div>

            {/* Presentation Line & Name */}
            <div className="w-full max-w-3xl">
              <p className="text-base text-gray-600 font-medium tracking-widest uppercase mb-1">
                This is proudly presented to
              </p>
              <h2 className="text-4xl font-extrabold text-indigo-950 border-b-4 border-amber-400 pb-2 px-10 inline-block font-serif drop-shadow-xs">
                {studentData.name}
              </h2>
            </div>

            {/* Citation */}
            <p className="text-lg text-gray-700 max-w-3xl leading-relaxed font-serif my-2">
              For outstanding academic performance, dedication, and active participation in <span className="font-bold text-indigo-900">Grade {studentData.grade}</span> at AGARAM DHINES ONLINE ACADEMY.
            </p>

            {/* Footer with Signatures, Seal & Student Credentials + QR */}
            <div className="flex justify-between items-end w-full mt-auto pt-4">
              {/* Date */}
              <div className="text-center w-48">
                <p className="font-bold text-gray-900 text-sm mb-1">{new Date().toLocaleDateString()}</p>
                <div className="w-full border-b-2 border-indigo-900 mb-1"></div>
                <p className="font-bold text-indigo-900 text-xs uppercase tracking-widest">Date / தேதி</p>
              </div>

              {/* Center Stamp & Credentials Badge */}
              <div className="flex items-center gap-4 bg-white/90 p-3 rounded-2xl border-2 border-amber-300 shadow-md backdrop-blur-sm">
                <div className="bg-white p-1 rounded-lg border border-indigo-100 shadow-xs">
                  <QRCodeSVG value={studentData.id} size={70} level="H" includeMargin={false} />
                </div>
                <div className="text-left text-xs font-medium text-slate-800 space-y-0.5">
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">Roll No:</span> <strong className="text-slate-900">{studentData.rollNo || 'N/A'}</strong></p>
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">Username:</span> <span className="font-mono font-bold text-indigo-700">{studentData.username}</span></p>
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">Password:</span> <span className="font-mono font-bold text-amber-600">{studentData.password}</span></p>
                </div>
              </div>

              {/* Director Signature */}
              <div className="text-center w-48">
                <div className="font-serif italic text-xl text-indigo-900 font-bold mb-1">Dhines Nivas</div>
                <div className="w-full border-b-2 border-indigo-900 mb-1"></div>
                <p className="font-bold text-indigo-900 text-xs uppercase tracking-widest">Director / இயக்குனர்</p>
              </div>
            </div>

          </div>
        </div>

        {/* Full Report Card Template */}
        {generatingReportData && (
          <div 
            id="report-card-template" 
            className="w-[210mm] min-h-[297mm] bg-white p-12 text-slate-900 flex flex-col items-center border border-gray-100"
          >
            {/* Header with Academy Info */}
            <div className="w-full flex justify-between items-start border-b-4 border-indigo-900 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-indigo-900 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg">
                  A
                </div>
                <div>
                  <h1 className="text-3xl font-black text-indigo-900 tracking-tighter uppercase">Agaram Academy</h1>
                  <p className="text-indigo-600 font-bold text-sm tracking-widest uppercase">E-Learning & Academic Centre</p>
                  <p className="text-xs text-gray-500 font-medium mt-1 italic">Knowledge for a better future</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="bg-indigo-900 text-white px-4 py-2 rounded-lg font-black text-xs tracking-widest uppercase mb-2 shadow-sm">
                  Official Progress Report
                </div>
                <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={studentData.id} size={60} level="H" />
                </div>
              </div>
            </div>

            {/* Student Profile Info */}
            <div className="w-full grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-8 rounded-3xl border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full -mr-16 -mt-16"></div>
               <div className="flex items-center gap-6 relative z-10">
                  <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white shrink-0">
                    {profileImage ? (
                      <img src={profileImage} alt={studentData.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Student Name</p>
                    <h2 className="text-2xl font-black text-slate-800 leading-tight">{studentData.name}</h2>
                    <p className="text-indigo-600 font-bold text-sm mt-1">{studentData.rollNo || 'N/A'}</p>
                  </div>
               </div>
               
               <div className="flex flex-col justify-center space-y-4 relative z-10">
                  <div className="flex justify-between border-b border-indigo-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Grade / Class</span>
                    <span className="font-bold text-slate-800">{studentData.grade}</span>
                  </div>
                  <div className="flex justify-between border-b border-indigo-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exam Period</span>
                    <span className="font-black text-indigo-700">{generatingReportData.examName}</span>
                  </div>
                  <div className="flex justify-between border-b border-indigo-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date Issued</span>
                    <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
                  </div>
               </div>
            </div>

            {/* Marks Table */}
            <div className="w-full mb-12 flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-indigo-900 text-white">
                    <th className="py-4 px-6 text-left rounded-tl-2xl font-black uppercase tracking-widest text-xs">Subject Name</th>
                    <th className="py-4 px-6 text-center font-black uppercase tracking-widest text-xs">Max Marks</th>
                    <th className="py-4 px-6 text-center font-black uppercase tracking-widest text-xs">Obtained</th>
                    <th className="py-4 px-6 text-center font-black uppercase tracking-widest text-xs">Grade</th>
                    <th className="py-4 px-6 text-left rounded-tr-2xl font-black uppercase tracking-widest text-xs">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generatingReportData.marks.map((m: any, idx: number) => {
                    const { grade, color } = getGradeLetter(m.obtained, m.total);
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-5 px-6 font-bold text-slate-800">{m.subject}</td>
                        <td className="py-5 px-6 text-center font-bold text-slate-400">{m.total}</td>
                        <td className="py-5 px-6 text-center font-black text-indigo-600 text-lg">{m.obtained}</td>
                        <td className="py-5 px-6 text-center">
                          <span className={`px-3 py-1.5 rounded-lg font-black text-sm border ${color.replace('text-', 'border-').split(' ')[0]}/20 ${color}`}>
                            {grade}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-slate-600 italic font-medium text-sm">{m.remarks || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50/50 border-t-2 border-indigo-100">
                    <td className="py-6 px-6 font-black text-slate-800 uppercase tracking-widest text-sm">Overall Result</td>
                    <td className="py-6 px-6 text-center font-black text-slate-400">
                      {generatingReportData.marks.reduce((sum, m) => sum + Number(m.total), 0)}
                    </td>
                    <td className="py-6 px-6 text-center font-black text-2xl text-indigo-900">
                      {generatingReportData.marks.reduce((sum, m) => sum + Number(m.obtained), 0)}
                    </td>
                    <td className="py-6 px-6 text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-3">
                         <span className="text-[10px] font-black uppercase text-indigo-400">Status:</span>
                         <span className="text-emerald-600 font-black tracking-widest uppercase">PASSED</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Area */}
            <div className="w-full grid grid-cols-2 gap-20 mt-auto pt-10 border-t border-gray-100 px-10">
               <div className="text-center">
                  <div className="h-16 flex items-center justify-center mt-2">
                    {/* Placeholder for Signature */}
                    <div className="w-16 h-1 bg-indigo-900 mb-2 opacity-10"></div>
                  </div>
                  <div className="w-full border-t border-slate-300 pt-3">
                    <p className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Academic Director</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Agaram Dhines</p>
                  </div>
               </div>
               <div className="text-center">
                  <div className="h-16 flex flex-col items-center justify-center">
                    <Award size={32} className="text-indigo-900 opacity-20" />
                  </div>
                  <div className="w-full border-t border-slate-300 pt-3">
                    <p className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Academy Stamp</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Verified Document</p>
                  </div>
               </div>
            </div>
            
            {/* Footer */}
            <div className="mt-20 w-full pt-8 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium"> This is a computer-generated report. It is valid without an original signature. </p>
              <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest mt-2">Built with Excellence by Agaram Dhines Academy</p>
            </div>
          </div>
        )}
      </div>

      {showQrScanner && (
        <QrScanner 
          onScan={handleQrScan} 
          onClose={() => setShowQrScanner(false)} 
        />
      )}

      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
            {/* Header / Dismiss */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">Receipt / பற்றுச்சீட்டு</h3>
              <button 
                onClick={() => {
                  setSelectedReceipt(null);
                  setShowReceiptModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-inner relative overflow-hidden">
                {/* Visual Official Decal */}
                <div className="absolute top-4 right-[-30px] rotate-45 bg-emerald-600 text-white font-black text-[8px] uppercase tracking-widest px-8 py-0.5 shadow-sm">
                  PAID
                </div>

                <div className="text-center mb-6">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-12 h-12 mx-auto mb-1.5 object-contain"
                  />
                  <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">AGARAM DHINES ONLINE ACADEMY</h2>
                  <p className="text-[8px] font-bold text-pink-600 uppercase tracking-[2px] mt-0.5 italic leading-none">excellence in digital learning</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 border-y border-slate-100 py-3 text-[11px]">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Invoiced To:</span>
                    <span className="font-bold text-slate-800 block">{selectedReceipt.studentName}</span>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Roll No: {selectedReceipt.rollNo || "N/A"}</span>
                    <span className="text-[10px] text-slate-500 font-semibold block">Class: {selectedReceipt.grade || "N/A"}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Details:</span>
                    <span className="text-[10px] text-slate-850 font-bold block">No: {selectedReceipt.transactionId || "N/A"}</span>
                    <span className="text-[10px] text-slate-850 font-semibold block mt-0.5">Date: {selectedReceipt.date}</span>
                    <span className="text-[10px] text-slate-850 font-semibold block">Via: {selectedReceipt.method || "N/A"}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-[11px]">
                  <div className="border-b border-slate-100 pb-2 text-[8px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                    selectedReceipt.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start py-1 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="font-bold text-slate-800 uppercase">{item.itemName || item.label || item.type}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic mt-0.5">
                            {item.type === 'Monthly Tuition' ? `வகுப்புக் கட்டணம் - ${selectedReceipt.month || item.month}` : 'பாடநெறிக்கான கட்டணம் (Course Fee)'}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800">LKR {item.paidAmount || item.amount}.00</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-start py-1">
                      <div>
                        <p className="font-bold text-slate-800 uppercase">{selectedReceipt.itemName || selectedReceipt.type}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic mt-0.5">
                          {selectedReceipt.type === 'Monthly Tuition' ? `வகுப்புக் கட்டணம் - ${selectedReceipt.month}` : 'பாடநெறிக்கான கட்டணம் (Course Fee)'}
                        </p>
                      </div>
                      <span className="font-bold text-slate-800">LKR {selectedReceipt.amountPaid || selectedReceipt.fullFee || selectedReceipt.amount}.00</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[11px]">
                  <div className="flex justify-between items-center text-slate-550 font-medium">
                    <span>Sub Total (முழு கட்டணம்)</span>
                    <span className="font-bold">LKR {selectedReceipt.subTotal || selectedReceipt.totalAmount || selectedReceipt.fullFee || selectedReceipt.amount}.00</span>
                  </div>
                  {selectedReceipt.discount && Number(selectedReceipt.discount) > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-emerald-600 font-bold">
                        <span>Discount (கட்டணக் கழிவு) {selectedReceipt.discountReason ? `[${selectedReceipt.discountReason}]` : ''}</span>
                        <span>- LKR {selectedReceipt.discount}.00</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 font-bold">
                        <span>Net Payable (கழிவு போக மொத்தம்)</span>
                        <span>LKR {selectedReceipt.netPayable || (Number(selectedReceipt.subTotal || selectedReceipt.totalAmount || selectedReceipt.amount) - Number(selectedReceipt.discount))}.00</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Paid Amount (செலுத்தியது)</span>
                    <span>LKR {selectedReceipt.amountPaid || selectedReceipt.amount}.00</span>
                  </div>
                  {selectedReceipt.remainingAmount && parseInt(selectedReceipt.remainingAmount) > 0 && (
                    <div className="flex justify-between items-center text-red-500 font-bold">
                      <span>Remaining Balance (மீதி கட்டணம்)</span>
                      <span>LKR {selectedReceipt.remainingAmount}.00</span>
                    </div>
                  )}

                  <div className="mt-3 flex justify-between items-center p-3 rounded-xl bg-emerald-500 text-white font-bold shadow-md shadow-emerald-100">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold">TOTAL PAID (இன்று செலுத்தியது)</span>
                    <span className="text-sm font-black text-white">
                      LKR {selectedReceipt.amountPaid || selectedReceipt.amount}.00
                    </span>
                  </div>
                </div>

                <div className="text-center pt-5 border-t border-dashed border-slate-100 mt-5">
                  <CheckCircle size={18} className="mx-auto text-emerald-500 mb-1" />
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[2px]">THANK YOU FOR YOUR PAYMENT</p>
                </div>
              </div>
            </div>

            {/* Print Action Bottom Bar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button 
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Receipt - ${selectedReceipt.studentName}</title>
                        <style>
                          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                          body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 40px; display: flex; justify-content: center; }
                          .receipt { width: 450px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); font-size: 14px; color: #334155; position: relative; }
                          .header { text-align: center; margin-bottom: 24px; }
                          .logo { width: 64px; height: 64px; margin-bottom: 8px; object-fit: contain; }
                          .title { font-size: 16px; font-weight: 950; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
                          .subtitle { font-size: 9px; font-weight: bold; color: #db2777; letter-spacing: 2px; margin: 4px 0 0; text-transform: uppercase; italic; }
                          .divider { border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 12px 0; margin: 16px 0; display: flex; justify-content: space-between; }
                          .bold { font-weight: bold; color: #1e293b; }
                          .small-title { font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                          th { border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; text-align: left; }
                          td { padding: 12px 0; border-bottom: 1px solid #f8fafc; }
                          .summary { margin-top: 16px; border-top: 2px solid #f1f5f9; padding-top: 16px; display: flex; flex-direction: column; gap: 8px; }
                          .summary-row { display: flex; justify-content: space-between; font-size: 12px; }
                          .total-banner { background: #10b981; color: white; display: flex; justify-content: space-between; padding: 12px; border-radius: 8px; font-weight: 900; margin-top: 12px; font-size: 13px; }
                          .footer { text-align: center; margin-top: 24px; border-top: 1px dashed #f1f5f9; padding-top: 16px; font-size: 10px; color: #94a3b8; }
                        </style>
                      </head>
                      <body>
                        <div class="receipt">
                          <div style="absolute; top: 12px; right: 12px; transform: rotate(45deg); background: #10b981; color: white; font-weight: 900; font-size: 9px; padding: 3px 12px; border-radius: 4px;">PAID</div>
                          <div class="header">
                            <img src="/logo.png" class="logo" />
                            <div class="title">AGARAM DHINES ONLINE ACADEMY</div>
                            <div class="subtitle">excellence in digital learning</div>
                          </div>
                          
                          <div class="divider">
                            <div>
                              <div class="small-title">Invoiced To:</div>
                              <div class="bold" style="font-size: 13px;">${selectedReceipt.studentName}</div>
                              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Roll No: ${selectedReceipt.rollNo || "N/A"}</div>
                              <div style="font-size: 11px; color: #64748b;">Class: ${selectedReceipt.grade || "N/A"}</div>
                            </div>
                            <div style="text-align: right;">
                              <div class="small-title">Details:</div>
                              <div style="font-size: 11px; font-weight: bold;">No: ${selectedReceipt.transactionId || "N/A"}</div>
                              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${selectedReceipt.date || "N/A"}</div>
                              <div style="font-size: 11px; color: #64748b;">Via: ${selectedReceipt.method || "N/A"}</div>
                            </div>
                          </div>
                          
                          <table>
                            <thead>
                              <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <div class="bold" style="text-transform: uppercase;">${selectedReceipt.itemName || selectedReceipt.type || "Fees Payment"}</div>
                                  <div style="font-size: 10px; color: #94a3b8; margin-top: 3px; font-style: italic;">
                                    ${selectedReceipt.type === 'Monthly Tuition' ? `வகுப்புக் கட்டணம் - \${selectedReceipt.month}` : 'பாடநெறிக்கான கட்டணம் (Course Fee)'}
                                  </div>
                                </td>
                                <td style="text-align: right;" class="bold">LKR ${selectedReceipt.fullFee || selectedReceipt.amount}.00</td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <div class="summary">
                            <div class="summary-row">
                              <span style="color: #64748b; font-weight: bold;">Sub Total (முழு கட்டணம்)</span>
                              <span class="bold">LKR ${selectedReceipt.fullFee || selectedReceipt.amount}.00</span>
                            </div>
                            <div class="summary-row" style="color: #10b981; font-weight: bold;">
                              <span>Paid Amount (செலுத்திய தொகை)</span>
                              <span>LKR ${selectedReceipt.amount}.00</span>
                            </div>
                            \${selectedReceipt.remainingAmount && parseInt(selectedReceipt.remainingAmount) > 0 ? \`
                            <div class="summary-row" style="color: #ef4444; font-weight: bold;">
                              <span>Remaining Balance (மீதி கட்டணம்)</span>
                              <span>LKR \${selectedReceipt.remainingAmount}.00</span>
                            </div>
                            \` : ''}
                            
                            <div class="total-banner">
                              <span>TOTAL PAID TODAY (இன்று செலுத்தியது)</span>
                              <span>LKR ${selectedReceipt.amount}.00</span>
                            </div>
                          </div>
                          
                          <div class="footer">
                            <div style="font-weight: bold; margin-bottom: 4px; color: #1e293b;">THANK YOU FOR YOUR PAYMENT</div>
                            <div>www.agaramdhines.lk | excellence in digital learning</div>
                          </div>
                        </div>
                        <script>
                          window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                          }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="flex-1 bg-indigo-600 hover:bg-slate-800 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                Print Receipt (பற்றுச்சீட்டு அச்சிடுக)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app YouTube Video Player Modal */}
      <AnimatePresence>
        {activeWatchVideo && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setActiveWatchVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-slate-800 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
                    <Youtube size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm md:text-base truncate">
                      {activeWatchVideo.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400">
                      {(activeWatchVideo.subjects && activeWatchVideo.subjects.length > 0 ? activeWatchVideo.subjects.map(formatSubjectDisplayName).join(', ') : formatSubjectDisplayName(activeWatchVideo.subject)) || "E-Learning"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveWatchVideo(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Embedded Player */}
              <div className="relative aspect-video bg-black w-full">
                {(() => {
                  const vidId = getYouTubeVideoId(activeWatchVideo.link);
                  return vidId ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1&rel=0`}
                      title={activeWatchVideo.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <Youtube size={48} className="text-red-500 mb-3" />
                      <p className="text-sm font-bold text-white">நேரடி YouTube இணைப்பு</p>
                      <a 
                        href={activeWatchVideo.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        YouTube-ல் பார்க்க
                      </a>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-[11px] text-slate-400">
                  {activeWatchVideo.date && parseSafeDate(activeWatchVideo.date) ? `தேதி: ${formatSafeDate(activeWatchVideo.date)}` : 'பதிவு செய்யப்பட்டுள்ளது'}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={activeWatchVideo.link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Youtube size={14} />
                    YouTube App-ல் திறக்க
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
