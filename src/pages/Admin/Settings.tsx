import React, { useState, useEffect, useRef } from "react";
import { 
  getAdminSettings, 
  saveAdminSettings, 
  exportCustomPathBackup,
  restoreCustomPathBackup,
  getSystemBackups,
  saveSystemBackupSnapshot,
  deleteSystemBackupSnapshot,
  ALL_BACKUP_COLLECTIONS
} from "../../lib/db";
import { QRCodeSVG } from "qrcode.react";
import { 
  Download, 
  QrCode, 
  Database, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  History, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Folder, 
  Layers, 
  Check, 
  X, 
  HardDrive, 
  GraduationCap,
  BookOpen,
  Coins,
  Users,
  FileCheck,
  Settings as SettingsIcon,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const BACKUP_MODULES = [
  {
    id: "students",
    name: "மாணவர் தரவுகள் (Students & Records)",
    path: "data/students",
    collections: ["students", "behaviourRecords"],
    icon: GraduationCap,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  {
    id: "academics",
    name: "வகுப்புகள் & பாடங்கள் (Classes, Schedule & Courses)",
    path: "data/academics",
    collections: ["classes", "schedule", "timetable", "subjects", "courses", "courseMaterials", "youtubeLinks", "zoomLinks", "classLinks", "courseWebsiteLinks"],
    icon: BookOpen,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  {
    id: "finance",
    name: "கட்டணங்கள் & நிதி (Fees & Accounts)",
    path: "data/finance",
    collections: ["fees", "incomeExpense"],
    icon: Coins,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: "staff",
    name: "ஆசிரியர்கள் & வருகை (Staff & Attendance)",
    path: "data/staff",
    collections: ["staffs", "staffAttendance", "attendance"],
    icon: Users,
    color: "bg-purple-50 text-purple-700 border-purple-200"
  },
  {
    id: "exams",
    name: "தேர்வுகள் & மதிப்பெண்கள் (Exams, Homework & Marks)",
    path: "data/exams",
    collections: ["examMarks", "examSettings", "grades", "homework", "questionPapers"],
    icon: FileCheck,
    color: "bg-amber-50 text-amber-700 border-amber-200"
  },
  {
    id: "system",
    name: "அமைப்புகள் & இணையதளம் (Settings & Content)",
    path: "data/system",
    collections: ["adminSettings", "homePageContent", "announcements", "chatbotSettings", "passwordRequests", "webPosts"],
    icon: SettingsIcon,
    color: "bg-rose-50 text-rose-700 border-rose-200"
  },
  {
    id: "chat",
    name: "நேரலை உரையாடல்கள் (Chat Messages)",
    path: "data/chat",
    collections: ["chatMessages"],
    icon: MessageSquare,
    color: "bg-sky-50 text-sky-700 border-sky-200"
  }
];

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    username: "",
    password: "",
    email: "",
    profileImage: "",
    instituteName: "DINESHKUMAR AGARAM DHINES"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [showQr, setShowQr] = useState(false);
  
  // Date & Path Backup States
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [savedBackups, setSavedBackups] = useState<any[]>([]);
  
  // Path Configuration State
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [targetPath, setTargetPath] = useState(`Backups/${todayDateStr}`);
  const [backupNote, setBackupNote] = useState(`Backup ${new Date().toLocaleDateString("en-GB")}`);
  const [selectedModules, setSelectedModules] = useState<string[]>(BACKUP_MODULES.map(m => m.id));
  
  // Date Filter State
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState(todayDateStr);
  const [endDate, setEndDate] = useState(todayDateStr);

  // Local Directory Handle (File System Access API)
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [directoryName, setDirectoryName] = useState<string>("");

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restorePayload, setRestorePayload] = useState<any>(null);
  const [restoreSelectedKeys, setRestoreSelectedKeys] = useState<string[]>([]);
  const [restoreSourceLabel, setRestoreSourceLabel] = useState("");

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAdminSettings().then(data => {
      if (data) setSettings(data);
    });
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const list = await getSystemBackups();
      if (Array.isArray(list)) {
        setSavedBackups(list);
      }
    } catch (e) {
      console.error("Error fetching backups:", e);
    }
  };

  const getSelectedCollectionsList = () => {
    const collections: string[] = [];
    selectedModules.forEach(modId => {
      const mod = BACKUP_MODULES.find(m => m.id === modId);
      if (mod) collections.push(...mod.collections);
    });
    return Array.from(new Set(collections));
  };

  const handlePickLocalDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker({
          mode: 'readwrite'
        });
        setDirectoryHandle(handle);
        setDirectoryName(handle.name);
        setTargetPath(`${handle.name}/${todayDateStr}`);
      } else {
        alert("உங்கள் உலாவி நேரடி கோப்புறை தேர்வை ஆதரிக்கவில்லை. நீங்கள் மேலே உள்ள பாதை (PATH) பெயரைக் குறிப்பிட்டால் அதே பெயரில் கோப்பு பதிவிறக்கப்படும்.");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn("Directory picker error:", err);
      }
    }
  };

  const handleCreateAndDownloadBackup = async (saveToDisk: boolean = true) => {
    try {
      const chosenCollections = getSelectedCollectionsList();
      if (chosenCollections.length === 0) {
        alert("தயவுசெய்து குறைந்தது ஒரு தரவுப் பாதையைத் (Module) தேர்ந்தெடுக்கவும்.");
        return;
      }

      setBackupLoading(true);

      const now = new Date();
      const sanitizedPath = (targetPath.trim() || `Backups/${todayDateStr}`).replace(/\\/g, '/');
      const timeFormatted = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, "-");
      const safePathTag = sanitizedPath.replace(/[^a-zA-Z0-9_\-\/]/g, "_");

      const options = {
        pathPrefix: sanitizedPath,
        selectedCollections: chosenCollections,
        dateFilter: {
          enabled: dateFilterEnabled,
          startDate: dateFilterEnabled ? startDate : undefined,
          endDate: dateFilterEnabled ? endDate : undefined
        },
        note: backupNote.trim() || `Path: ${sanitizedPath}`
      };

      // 1. Save Snapshot to online database history
      const newSnapshot = await saveSystemBackupSnapshot(options);
      await fetchBackups();

      // 2. If Save to Disk / Download requested
      if (saveToDisk) {
        const backupObj = await exportCustomPathBackup(options);
        const jsonStr = JSON.stringify(backupObj, null, 2);

        let savedDirectly = false;
        // Try saving directly to picked directory if handle exists
        if (directoryHandle) {
          try {
            const fileName = `Agaram_Backup_${todayDateStr}_${timeFormatted}.json`;
            const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            savedDirectly = true;
          } catch (dirErr) {
            console.warn("Could not write directly to directory handle, falling back to download:", dirErr);
          }
        }

        if (!savedDirectly) {
          const blob = new Blob([jsonStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const cleanFileName = `Agaram_Backup_${safePathTag.replace(/\//g, '_')}_${todayDateStr}_${timeFormatted}.json`;
          link.download = cleanFileName;
          link.click();
          URL.revokeObjectURL(url);
        }
      }

      setBackupMsg(`காப்புப்பிரதி வெற்றியடைந்தது! பாதை: "${sanitizedPath}" (${newSnapshot.formattedDate})`);
      setTimeout(() => setBackupMsg(""), 6000);
    } catch (err: any) {
      alert("Backup Error: " + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleOpenRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBackupLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json || typeof json !== 'object' || !json.data) {
        alert("செல்லுபடியற்ற காப்புப்பிரதி கோப்பு (Invalid Backup JSON)");
        setBackupLoading(false);
        e.target.value = "";
        return;
      }

      const availableKeys = Object.keys(json.data).filter(k => ALL_BACKUP_COLLECTIONS.includes(k));
      setRestorePayload(json);
      setRestoreSelectedKeys(availableKeys);
      setRestoreSourceLabel(file.name);
      setRestoreModalOpen(true);
    } catch (err: any) {
      alert("கோப்பை வாசிப்பதில் பிழை: " + err.message);
    } finally {
      setBackupLoading(false);
      e.target.value = "";
    }
  };

  const handleOpenRestoreFromSnapshot = (snapshot: any) => {
    if (!snapshot || !snapshot.data) return;
    const availableKeys = Object.keys(snapshot.data).filter(k => ALL_BACKUP_COLLECTIONS.includes(k));
    setRestorePayload({
      ...snapshot,
      exportDateFormatted: snapshot.formattedDate || snapshot.dateStr,
      path: snapshot.path || "Saved Snapshot"
    });
    setRestoreSelectedKeys(availableKeys);
    setRestoreSourceLabel(snapshot.note || `Snapshot (${snapshot.formattedDate || snapshot.dateStr})`);
    setRestoreModalOpen(true);
  };

  const executeRestore = async () => {
    if (!restorePayload || restoreSelectedKeys.length === 0) {
      alert("மீட்டமைக்க குறைந்தபட்சம் ஒரு தரவுப் பாதையைத் தேர்ந்தெடுக்கவும்.");
      return;
    }

    const dateLabel = restorePayload.exportDateFormatted || (restorePayload.exportDate ? new Date(restorePayload.exportDate).toLocaleString("en-GB") : "Unknown Date");
    const pathLabel = restorePayload.path || "Default Path";

    if (!confirm(`தேர்ந்தெடுக்கப்பட்ட ${restoreSelectedKeys.length} தரவுப் பாதைகளை மீட்டமைக்க (Restore) உறுதியாக விரும்புகிறீர்களா?\n\nகோப்பு திகதி: ${dateLabel}\nபாதை: ${pathLabel}\n\n(தற்போதைய தரவுகள் இந்த காப்புப்பிரதி நிலைக்கு மாற்றப்படும்)`)) {
      return;
    }

    try {
      setBackupLoading(true);
      const result = await restoreCustomPathBackup(restorePayload, restoreSelectedKeys);
      setRestoreModalOpen(false);
      setBackupMsg(`வெற்றிகரமாக ${result.totalRestored} தரவுப் பாதைகள் மீட்டமைக்கப்பட்டன!`);
      setTimeout(() => {
        setBackupMsg("");
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      alert("Restore Error: " + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (confirm("இந்த திகதி காப்புப்பிரதி பதிவை நீக்க விரும்புகிறீர்களா?")) {
      await deleteSystemBackupSnapshot(id);
      await fetchBackups();
    }
  };

  const handleDownloadSnapshotJSON = (snapshot: any) => {
    const backupObj = {
      system: "Agaram Dhines Online Academy",
      version: "2.0",
      path: snapshot.path || "Backups/Saved_Snapshot",
      exportDate: snapshot.dateStr,
      exportDateFormatted: snapshot.formattedDate,
      note: snapshot.note,
      includedCollections: snapshot.includedCollections,
      data: snapshot.data
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const formattedFileDate = (snapshot.formattedDate || snapshot.id).replace(/[^a-zA-Z0-9]/g, "_");
    link.href = url;
    link.download = `Agaram_Backup_${formattedFileDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const toggleAllModules = () => {
    if (selectedModules.length === BACKUP_MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(BACKUP_MODULES.map(m => m.id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAdminSettings(settings);
    setSuccessMessage(true);
    setTimeout(() => setSuccessMessage(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleForgotPassword = async () => {
    if (!settings.email) {
      alert("Please set a registered email address first.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`[SIMULATED EMAIL] Sent to ${settings.email}\n\nYour password reset code is: ${code}`);
    
    const enteredCode = prompt("Enter the 6-digit confirmation code sent to your email:");
    if (enteredCode === code) {
      const newPassword = prompt("Enter your new password:");
      if (newPassword) {
        const updatedSettings = { ...settings, password: newPassword };
        setSettings(updatedSettings);
        await saveAdminSettings(updatedSettings);
        alert("Password changed successfully!");
      }
    } else if (enteredCode !== null) {
      alert("Invalid confirmation code.");
    }
  };

  const handleDownloadQrImage = async () => {
    if (qrRef.current) {
      try {
        const url = await toPng(qrRef.current, { pixelRatio: 3, backgroundColor: 'transparent' });
        const link = document.createElement("a");
        link.download = "admin-login-qr.png";
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating QR code image:", error);
      }
    }
  };

  const handleDownloadQrPdf = async () => {
    if (qrRef.current) {
      try {
        const imgData = await toPng(qrRef.current, { pixelRatio: 3, backgroundColor: 'transparent' });
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 10, 10, 100, 150);
        pdf.save("admin-login-qr.pdf");
      } catch (error) {
        console.error("Error generating QR code PDF:", error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Settings Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-indigo-600" />
              நிர்வாகி சுயவிவர அமைப்புகள் (Admin Profile Settings)
            </h2>
            <p className="text-xs text-gray-500 mt-1">கணக்கு பெயர், கடவுச்சொல் மற்றும் நிறுவன விபரங்களை மாற்றியமைக்கலாம்.</p>
          </div>
          <button 
            onClick={() => setShowQr(true)}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors"
          >
            <QrCode size={16} /> Login QR
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 mb-2 border-2 border-indigo-500 group cursor-pointer shadow-inner">
              <img 
                src={settings.profileImage || "https://picsum.photos/seed/admin/100/100"} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <span className="text-xs font-semibold">Change</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-gray-600 w-full text-center">
              சுயவிவரப் படம் (Profile Image)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                நிறுவனத்தின் பெயர் (Institute Name)
              </label>
              <input
                type="text"
                value={settings.instituteName}
                onChange={(e) => setSettings({...settings, instituteName: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                நிர்வாகி பயனர் பெயர் (Admin Username)
              </label>
              <input
                type="text"
                value={settings.username}
                onChange={(e) => setSettings({...settings, username: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                பதிவுசெய்யப்பட்ட மின்னஞ்சல் (Registered Email)
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({...settings, email: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  நிர்வாகி கடவுச்சொல் (Password)
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.password}
                  onChange={(e) => setSettings({...settings, password: e.target.value})}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {successMessage ? (
              <div className="text-emerald-700 font-medium text-xs bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!
              </div>
            ) : <div />}
            <button
              type="submit"
              className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
            >
              மாற்றங்களைச் சேமி (Save Settings)
            </button>
          </div>
        </form>
      </div>

      {/* Date & Path Based Backup & Restore System */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                திகதி & பாதை வாரியான தரவு காப்புப்பிரதி & மீட்டமைத்தல் (Date & PATH Backup & Restore)
              </h3>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              விரும்பிய பாதை (Path/Folder), குறிப்பிட்ட காலப்பகுதி (Date Range) மற்றும் குறிப்பிட்ட தொகுதிகளைத் (Modules) தேர்ந்தெடுத்து துல்லியமாக Backup & Restore செய்யலாம்.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> V2.0 Enhanced Engine
            </span>
          </div>
        </div>

        {backupMsg && (
          <div className="mt-5 text-emerald-800 font-medium text-xs bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupMsg}</span>
          </div>
        )}

        {/* 1. PATH CONFIGURATION SECTION */}
        <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                1. காப்புப்பிரதி பாதை அமைப்பு (PATH & Folder Configuration)
              </h4>
            </div>
            {directoryName && (
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Folder: {directoryName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                சேமிப்பு பாதை / கோப்புறை பெயர் (Storage PATH / Subfolder Prefix):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="e.g. Backups/2026-08-20/ or Grade10/Term1"
                  className="w-full text-sm font-mono bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 pl-9 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <Folder className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                உள்ளக கணினி கோப்புறை (Local Folder):
              </label>
              <button
                type="button"
                onClick={handlePickLocalDirectory}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium px-3.5 py-2.5 rounded-xl text-xs transition-colors shadow-2xs"
              >
                <HardDrive className="w-4 h-4 text-indigo-600" />
                {directoryName ? "கோப்புறை மாற்றுக" : "கணினி Folder தேர்வு"}
              </button>
            </div>
          </div>

          {/* Path Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-gray-500 font-medium mr-1">விரைவு பாதைகள் (Presets):</span>
            <button
              type="button"
              onClick={() => setTargetPath(`Backups/${todayDateStr}`)}
              className="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors font-mono"
            >
              📁 Backups/{todayDateStr}/
            </button>
            <button
              type="button"
              onClick={() => setTargetPath(`Agaram_Backups/Monthly_${todayDateStr.slice(0, 7)}`)}
              className="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors font-mono"
            >
              📁 Agaram_Backups/Monthly/
            </button>
            <button
              type="button"
              onClick={() => setTargetPath(`Snapshots/Students_Data_${todayDateStr}`)}
              className="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors font-mono"
            >
              📁 Snapshots/Students_Data/
            </button>
            <button
              type="button"
              onClick={() => setTargetPath(`Archive/Term_Final_${todayDateStr}`)}
              className="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors font-mono"
            >
              📁 Archive/Term_Final/
            </button>
          </div>
        </div>

        {/* 2. DATE FILTER & BACKUP NOTE */}
        <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              2. திகதி தெரிவு & குறிப்பு (Date Filter & Backup Label)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                காப்புப்பிரதி குறிப்பு / பெயர் (Backup Note / Label):
              </label>
              <input
                type="text"
                value={backupNote}
                onChange={(e) => setBackupNote(e.target.value)}
                placeholder="e.g. 1st Term Exam Backup or Weekly Snapshot"
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  திகதி வரம்பு வடிகட்டி (Date Range Filtering):
                </label>
                <button
                  type="button"
                  onClick={() => setDateFilterEnabled(!dateFilterEnabled)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    dateFilterEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {dateFilterEnabled ? "Active (இயக்கத்தில்)" : "அனைத்து காலமும் (All Time)"}
                </button>
              </div>

              {dateFilterEnabled ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="text-[10px] text-gray-500">From (தொடக்கத் திகதி):</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">To (முடிவுத் திகதி):</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-2 text-center">
                  முழுமையான காலப்பகுதி காப்புப்பிரதி (Full Database Snapshot)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. MODULE & COLLECTION PATH SELECTION */}
        <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                3. குறிப்பிட்ட தரவுப் பாதைகள் / தொகுதிகள் (Data Modules & Collections)
              </h4>
            </div>
            <button
              type="button"
              onClick={toggleAllModules}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
            >
              {selectedModules.length === BACKUP_MODULES.length ? "அனைத்தையும் விடுவி (Deselect All)" : "அனைத்தையும் தேர்ந்தெடு (Select All)"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {BACKUP_MODULES.map((mod) => {
              const isSelected = selectedModules.includes(mod.id);
              const ModIcon = mod.icon;
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs' 
                      : 'border-gray-200 bg-gray-50/50 opacity-70 hover:opacity-100 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-white text-xs ${
                    isSelected ? 'bg-indigo-600' : 'border border-gray-400 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <ModIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{mod.name.split('(')[0]}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                      /{mod.path}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ACTION BUTTONS */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleCreateAndDownloadBackup(true)}
            disabled={backupLoading || selectedModules.length === 0}
            className="sm:col-span-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            {backupLoading ? "காத்திருக்கவும்..." : "பாதை & திகதியுடன் Backup செய்து பதிவிறக்கு"}
          </button>

          <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all shadow-sm cursor-pointer text-center">
            <UploadCloud className="w-4 h-4" />
            JSON கோப்பிலிருந்து Restore
            <input
              type="file"
              accept=".json"
              onChange={handleOpenRestoreFromFile}
              disabled={backupLoading}
              className="hidden"
            />
          </label>
        </div>

        {/* 5. SAVED DATE & PATH BACKUPS SNAPSHOTS HISTORY */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                சேமிக்கப்பட்ட திகதி & பாதை காப்புப்பிரதிகள் (Saved Date & Path Backups)
              </h4>
            </div>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
              {savedBackups.length} Backups Saved
            </span>
          </div>

          {savedBackups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs bg-white rounded-xl border border-dashed border-gray-300">
              இன்னும் திகதி வாரியான காப்புப்பிரதிகள் சேமிக்கப்படவில்லை. மேலேயுள்ள "Backup செய்க" பொத்தானை அழுத்தவும்.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {savedBackups.map((b) => (
                <div 
                  key={b.id} 
                  className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 mt-0.5 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                        <span>{b.formattedDate || b.dateStr}</span>
                        {b.path && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded-md border border-slate-200">
                            📁 {b.path}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-indigo-700">{b.note || "System Backup"}</span>
                        {b.includedCollections && (
                          <span className="text-gray-400">• {b.includedCollections.length} தொகுதிகள்</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenRestoreFromSnapshot(b)}
                      disabled={backupLoading}
                      title="பாதை தெரிவுடன் மீட்டமைக்க (Restore with Path Selection)"
                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadSnapshotJSON(b)}
                      title="JSON கோப்பாக பதிவிறக்குக"
                      className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSnapshot(b.id)}
                      title="நீக்குக"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RESTORE PREVIEW & SELECTIVE PATH MODAL */}
      {restoreModalOpen && restorePayload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    மீட்டமைத்தல் முன்னோட்டம் & பாதை தேர்வு (Restore Preview)
                  </h3>
                  <p className="text-xs text-gray-500">{restoreSourceLabel}</p>
                </div>
              </div>
              <button 
                onClick={() => setRestoreModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-gray-500">காப்புப்பிரதி திகதி:</span>
                <span className="font-semibold text-gray-900">{restorePayload.exportDateFormatted || restorePayload.exportDate || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">மூலப் பாதை (Source Path):</span>
                <span className="font-mono text-indigo-700 font-bold">{restorePayload.path || "Full_System"}</span>
              </div>
              {restorePayload.note && (
                <div className="flex justify-between">
                  <span className="text-gray-500">குறிப்பு:</span>
                  <span className="italic text-gray-700">{restorePayload.note}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800">
                மீட்டமைக்க வேண்டிய தரவுப் பாதைகளைத் தேர்ந்தெடுக்கவும் ({restoreSelectedKeys.length} தெரிவு):
              </label>
              <button
                type="button"
                onClick={() => {
                  const allAvail = Object.keys(restorePayload.data || {}).filter(k => ALL_BACKUP_COLLECTIONS.includes(k));
                  if (restoreSelectedKeys.length === allAvail.length) {
                    setRestoreSelectedKeys([]);
                  } else {
                    setRestoreSelectedKeys(allAvail);
                  }
                }}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                Toggle All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-56 pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
              {Object.keys(restorePayload.data || {}).map((key) => {
                if (!ALL_BACKUP_COLLECTIONS.includes(key)) return null;
                const isSelected = restoreSelectedKeys.includes(key);
                const count = Array.isArray(restorePayload.data[key]) 
                  ? `${restorePayload.data[key].length} records` 
                  : (restorePayload.data[key] ? 'Config Object' : 'Empty');

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        setRestoreSelectedKeys(restoreSelectedKeys.filter(k => k !== key));
                      } else {
                        setRestoreSelectedKeys([...restoreSelectedKeys, key]);
                      }
                    }}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-medium' : 'bg-white border-gray-200 text-gray-600 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-white text-[10px] ${
                        isSelected ? 'bg-indigo-600' : 'border border-gray-400 bg-white'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-mono">{key}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 font-sans">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                ரத்து செய் (Cancel)
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={backupLoading || restoreSelectedKeys.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {backupLoading ? "மீட்டமைக்கிறது..." : "தேர்ந்தெடுத்த பாதைகளை மீட்டமை (Restore Selected)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Admin Login QR Code</h3>
            <p className="text-xs text-gray-500 mb-4">Scan this QR code with the app scanner to log in instantly as Admin.</p>
            
            <div ref={qrRef} className="bg-white p-4 rounded-xl border border-gray-200 inline-block mb-4 shadow-2xs">
              <QRCodeSVG 
                value={JSON.stringify({ 
                  type: "ADMIN_LOGIN", 
                  user: settings.username, 
                  pass: settings.password 
                })}
                size={200}
                level="H"
                includeMargin={true}
              />
              <p className="text-[11px] font-bold text-gray-700 mt-2">AGARAM DHINES ACADEMY</p>
              <p className="text-[10px] text-gray-500">Admin Authentication Pass</p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleDownloadQrImage}
                className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium py-2 rounded-xl text-xs transition-colors"
              >
                <Download size={14} /> Download Image
              </button>
              <button
                onClick={handleDownloadQrPdf}
                className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium py-2 rounded-xl text-xs transition-colors"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>

            <button
              onClick={() => setShowQr(false)}
              className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium py-2 rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
