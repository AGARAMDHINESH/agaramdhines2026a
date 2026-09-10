import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  DollarSign, 
  Target, 
  Calendar, 
  UploadCloud, 
  FileText, 
  File, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  TrendingUp, 
  Sparkles,
  CheckCircle,
  ExternalLink,
  Eye,
  X
} from "lucide-react";
import { 
  getEmployeeTasks, 
  getDailyWorkUploads, 
  saveDailyWorkUploads, 
  deleteDailyWorkUpload,
  DailyWorkUpload, 
  EmployeeTask, 
  getStaffAttendance, 
  saveStaffAttendance 
} from "../../../lib/db";
import { jsPDF } from "jspdf";
import { processAndUploadWorkFile, downloadAnyWorkFile } from "../../../lib/fileStorage";

interface DesignWorkerHomeProps {
  staff: any;
  adminSettings: any;
  onNavigateTab: (tabId: string) => void;
  onRefreshStaff?: () => void;
}

export default function DesignWorkerHome({ staff, adminSettings, onNavigateTab, onRefreshStaff }: DesignWorkerHomeProps) {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Data states
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [uploads, setUploads] = useState<DailyWorkUpload[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<DailyWorkUpload['category']>("Typing & Data Entry");
  const [workCount, setWorkCount] = useState<number>(1);
  const [workUnit, setWorkUnit] = useState<string>("Pages");
  const [uploadDriveLink, setUploadDriveLink] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<DailyWorkUpload | null>(null);

  useEffect(() => {
    loadAllData();

    const handleDbUpdate = (e: any) => {
      if (e.detail?.key === 'dailyWorkUploads' && Array.isArray(e.detail?.data)) {
        const myUploads = e.detail.data.filter((u: any) => u.staffId === staff.id || u.staffName === staff.name);
        setUploads(myUploads);
      } else if (['employeeTasks', 'staffAttendance', 'staffs'].includes(e.detail?.key)) {
        loadAllData();
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [staff.id]);

  const loadAllData = async () => {
    setLoading(false);
    try {
      const [allTasks, allUploads, allAtt] = await Promise.all([
        getEmployeeTasks(),
        getDailyWorkUploads(),
        getStaffAttendance()
      ]);

      const myTasks = (allTasks || []).filter(t => t.staffId === staff.id || t.staffName === staff.name || t.staffId === 'general');
      setTasks(myTasks);

      const myUploads = (allUploads || []).filter(u => u.staffId === staff.id || u.staffName === staff.name);
      setUploads(myUploads);

      const myAtt = (allAtt || []).filter((a: any) => a.staffId === staff.id || a.staffName === staff.name);
      setAttendance(myAtt);
    } catch (err) {
      console.warn("Failed to load design worker data:", err);
    }
  };

  // 1. This Month's Work Metrics
  const thisMonthUploads = uploads.filter(u => u.date?.startsWith(currentMonthStr));
  const thisMonthTasks = tasks.filter(t => (t.completedDate || t.assignedDate || '').startsWith(currentMonthStr));
  
  const totalPagesTypedThisMonth = thisMonthUploads.reduce((sum, u) => sum + (Number(u.workCount) || 0), 0) +
    thisMonthTasks.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (Number(t.workCount) || 0), 0);
  
  const totalFilesSubmitted = thisMonthUploads.length;

  // 2. Salary Metrics
  const baseSalary = Number(staff.salary) || 0;
  const payments = staff.payments || [];
  
  const normalizeMonth = (mStr: string) => {
    if (!mStr) return "";
    const s = String(mStr).trim().toLowerCase();
    if (/^\d{4}-\d{1,2}$/.test(s)) {
      const [y, m] = s.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase();
    }
    return s;
  };

  const currentMonthPayment = payments.find((p: any) => {
    if (!p) return false;
    if (p.month === currentMonthStr || p.month === currentMonthName) return true;
    return normalizeMonth(p.month) === normalizeMonth(currentMonthStr) || normalizeMonth(p.month) === normalizeMonth(currentMonthName);
  });

  const isPaidThisMonth = !!currentMonthPayment;
  const paidAmount = currentMonthPayment ? Number(currentMonthPayment.amount) || baseSalary : 0;

  // 3. Target Completion Metrics
  const monthlyTarget = Number(staff.monthlyTarget) || 50; // e.g. 50 pages or deliverables
  const targetCompletedCount = totalPagesTypedThisMonth;
  const targetPercentage = Math.min(100, Math.round((targetCompletedCount / monthlyTarget) * 100));

  // 4. Attendance Metrics
  const thisMonthAttendance = attendance.filter((a: any) => a.date?.startsWith(currentMonthStr));
  const daysPresentCount = thisMonthAttendance.filter((a: any) => (a.status || a.type || '').toLowerCase().includes('present') || (a.status || a.type || '').toLowerCase().includes('in') || (a.type || '').toLowerCase().includes('check')).length;
  const daysInMonthSoFar = Math.max(1, new Date().getDate());
  const attendanceRate = Math.min(100, Math.round((daysPresentCount / daysInMonthSoFar) * 100)) || (daysPresentCount > 0 ? 100 : 0);
  
  const todayAttendanceRecord = attendance.find((a: any) => a.date?.startsWith(todayStr));
  const isCheckedInToday = !!todayAttendanceRecord;

  // Quick 1-Click Check-in / Check-out
  const handleToggleAttendanceToday = async () => {
    try {
      const now = new Date();
      const allAtt = await getStaffAttendance() || [];

      if (isCheckedInToday) {
        // Mark check out
        const updated = allAtt.map((a: any) => {
          if ((a.staffId === staff.id || a.staffName === staff.name) && a.date?.startsWith(todayStr)) {
            return {
              ...a,
              checkOutTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              updatedAt: now.toISOString()
            };
          }
          return a;
        });
        await saveStaffAttendance(updated);
        setAttendance(updated.filter((a: any) => a.staffId === staff.id || a.staffName === staff.name));
      } else {
        // Mark check in
        const newRecord = {
          id: `att_${Date.now()}`,
          staffId: staff.id,
          staffName: staff.name,
          date: todayStr,
          checkInTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Present',
          type: 'Self Check-in',
          createdAt: now.toISOString()
        };
        const updated = [newRecord, ...allAtt];
        await saveStaffAttendance(updated);
        setAttendance(updated.filter((a: any) => a.staffId === staff.id || a.staffName === staff.name));
      }
    } catch (err) {
      console.error("Failed to update attendance:", err);
    }
  };

  // File Upload Handlers (PDF, Word, JPG, PNG)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per upload

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files) {
      const files: File[] = Array.from(e.target.files);
      
      // Check for video files
      const hasVideo = files.some((file: File) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v', '.3gp'].includes(ext) || file.type.startsWith('video/');
      });

      if (hasVideo) {
        setUploadError("⚠️ Large video files cannot be uploaded directly. Direct upload is supported for Documents (Word .doc, .docx), PDFs (.pdf), and Images (JPG, JPEG, PNG). For video files, please paste your Google Drive link in the Google Drive Link field below.");
      }

      // Check for oversized files (> 5MB)
      const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        const sizeMb = (oversizedFiles[0].size / (1024 * 1024)).toFixed(1);
        setUploadError(`⚠️ கோப்பின் அளவு 5 MB-ஐ விட அதிகமாக உள்ளது (${sizeMb} MB). ஒரு பதிவேற்றத்திற்கு 5 MB-க்கு உட்பட்ட கோப்புகளை மட்டுமே நேரடியாகப் பதிவேற்ற முடியும் (தினசரி எத்தனை முறை வேண்டுமானாலும் பதிவேற்றலாம்). 5 MB-க்கு மேல் உள்ள கோப்புகளுக்கு Google Drive இணைப்பைப் பயன்படுத்தவும்.`);
      }

      // Allowed extensions: Documents, PDFs, Images
      const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      const validFiles: File[] = files.filter((file: File) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        return allowedExts.includes(ext) && !file.type.startsWith('video/') && file.size <= MAX_FILE_SIZE;
      });

      if (validFiles.length !== files.length && !hasVideo && oversizedFiles.length === 0) {
        setUploadError("Some files were skipped. Direct upload supports PDF, Word (.doc, .docx), JPG, and PNG files up to 5 MB.");
      }

      setSelectedFiles(validFiles);

      if (!uploadTitle && validFiles.length > 0) {
        const rawName = validFiles[0].name.replace(/\.[^/.]+$/, "");
        setUploadTitle(rawName);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 && !uploadDriveLink.trim()) {
      setUploadError("Please select at least one PDF, Word document, JPG, or PNG file (under 5 MB) for direct upload, or provide a Google Drive link.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const newUploads: DailyWorkUpload[] = [];

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          
          // Ultra-fast Process and upload file with IndexedDB cache + Firestore chunks + Firebase Storage race
          const { fileUrl, base64Data, chunkCount, hasChunks } = await processAndUploadWorkFile(file, uploadId, staff.id);

          const uploadEntry: DailyWorkUpload = {
            id: uploadId,
            staffId: staff.id,
            staffName: staff.name,
            title: uploadTitle || file.name,
            category: uploadCategory,
            date: todayStr,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            fileData: file.size < 60000 ? base64Data : undefined, // Keep tiny base64 only if <60KB
            driveLink: uploadDriveLink.trim() || undefined,
            fileUrl: fileUrl || uploadDriveLink.trim() || undefined,
            hasChunks: hasChunks,
            chunkCount: chunkCount,
            workCount: Number(workCount) || 1,
            workUnit: workUnit,
            notes: uploadNotes,
            status: 'Pending',
            createdAt: new Date().toISOString()
          };

          newUploads.push(uploadEntry);
        }
      } else if (uploadDriveLink.trim()) {
        // Link-only submission (e.g. video in Google Drive)
        const uploadEntry: DailyWorkUpload = {
          id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          staffId: staff.id,
          staffName: staff.name,
          title: uploadTitle || "Work Submission via Google Drive",
          category: uploadCategory,
          date: todayStr,
          fileName: "Google Drive Link",
          fileType: "application/link",
          fileSize: 0,
          driveLink: uploadDriveLink.trim(),
          fileUrl: uploadDriveLink.trim(),
          workCount: Number(workCount) || 1,
          workUnit: workUnit,
          notes: uploadNotes,
          status: 'Pending',
          createdAt: new Date().toISOString()
        };
        newUploads.push(uploadEntry);
      }

      const allUploads = await getDailyWorkUploads();
      const updatedList = [...newUploads, ...allUploads];
      await saveDailyWorkUploads(updatedList);

      setUploads(updatedList.filter(u => u.staffId === staff.id || u.staffName === staff.name));
      setSelectedFiles([]);
      setUploadTitle("");
      setUploadDriveLink("");
      setUploadNotes("");
      setWorkCount(1);
      setUploadSuccess(`கோப்பு உடனடியாக பதிவேற்றப்பட்டது! (${newUploads.length} work record synced). Admin can now view & download your file instantly.`);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError("Failed to upload file. " + (err?.message || "Please try again."));
    } finally {
      setIsUploading(false);
    }
  };

  // Direct Universal File Download (Word, PDF, PNG, JPG)
  const handleDownloadFile = async (upload: DailyWorkUpload) => {
    await downloadAnyWorkFile(upload);
  };

  // Delete Upload
  const handleDeleteUpload = async (uploadId: string) => {
    if (!window.confirm("Are you sure you want to delete this uploaded work file?")) return;
    try {
      const updated = await deleteDailyWorkUpload(uploadId);
      setUploads(updated.filter(u => u.staffId === staff.id || u.staffName === staff.name));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Helper for file type icons & colors
  const getFileBadge = (fileName: string, fileType?: string) => {
    const lower = (fileName || "").toLowerCase();
    if (lower.endsWith('.pdf') || fileType?.includes('pdf')) {
      return { label: 'PDF', bg: 'bg-red-100 text-red-700 border-red-200', icon: <FileText size={16} className="text-red-600" /> };
    }
    if (lower.endsWith('.doc') || lower.endsWith('.docx') || fileType?.includes('word')) {
      return { label: 'WORD', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: <File size={16} className="text-blue-600" /> };
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || fileType?.includes('image')) {
      return { label: 'IMAGE', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <ImageIcon size={16} className="text-emerald-600" /> };
    }
    return { label: 'FILE', bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileText size={16} className="text-gray-600" /> };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Quick Salary Slip Download
  const handleQuickDownloadSalarySlip = () => {
    const doc = new jsPDF();
    const instName = adminSettings?.instituteName || "AGARAM DHINES ACADEMY";

    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text(instName, 105, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text(`STAFF SALARY SLIP - ${currentMonthName.toUpperCase()}`, 105, 26, { align: "center" });

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Helpline / Accounts: +94778054232 • Email: ${adminSettings?.email || "info@agaramacademy.lk"}`, 105, 31, { align: "center" });

    doc.line(14, 34, 196, 34);

    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Staff Name: ${staff.name}`, 14, 42);
    doc.text(`Role: ${staff.role || "Design Worker"}`, 14, 48);
    doc.text(`Staff ID: ${staff.id}`, 14, 54);
    doc.text(`Phone: ${staff.phone || "+94778054232"}`, 14, 60);

    doc.text(`Month: ${currentMonthName}`, 130, 42);
    doc.text(`Status: ${isPaidThisMonth ? "PAID IN FULL" : "PENDING"}`, 130, 48);
    doc.text(`Helpline: +94778054232`, 130, 54);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 60);

    doc.line(14, 65, 196, 65);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Earnings & Disbursal Breakdown:", 14, 75);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text("1. Monthly Base Salary", 14, 85);
    doc.text(`Rs. ${baseSalary.toLocaleString()}`, 160, 85);

    if (currentMonthPayment?.bonus) {
      doc.text("2. Performance Bonus / Allowance", 14, 93);
      doc.text(`Rs. ${Number(currentMonthPayment.bonus).toLocaleString()}`, 160, 93);
    }

    doc.line(14, 102, 196, 102);
    doc.setFont("helvetica", "bold");
    doc.text("Net Total Payable:", 14, 110);
    doc.text(`Rs. ${(isPaidThisMonth ? paidAmount : baseSalary).toLocaleString()}`, 160, 110);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Official Helpline: +94778054232 | This is a computer-generated salary slip from Agaram Online Academy.", 105, 135, { align: "center" });

    doc.save(`${staff.name}_Salary_Slip_${currentMonthStr}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-blue-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles size={14} className="text-yellow-300" />
              Design & Typography Workspace
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              வணக்கம், {staff.name}!
            </h1>
            <p className="text-blue-200 text-sm max-w-xl">
              Track your monthly typing and graphic design deliverables, check attendance and salary status, and upload daily work files directly to the administration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleAttendanceToday}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md ${
                isCheckedInToday 
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                  : "bg-white hover:bg-blue-50 text-blue-900"
              }`}
            >
              <CheckCircle2 size={16} />
              <span>{isCheckedInToday ? "Checked-in Today ✓" : "Mark Today Check-in"}</span>
            </button>

            <button
              onClick={() => onNavigateTab("work")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-2xl font-bold text-xs border border-blue-400/30 transition-all backdrop-blur-xs"
            >
              <Briefcase size={16} />
              <span>View All Tasks</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Four Crucial Metric Cards Required by User */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: This Month's Work */}
        <div 
          onClick={() => onNavigateTab("work")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Briefcase size={22} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {currentMonthName}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Month's Work</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {totalPagesTypedThisMonth} <span className="text-xs font-bold text-gray-500">Items / Pages</span>
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <FileCheckIcon size={13} /> {totalFilesSubmitted} daily file(s) uploaded
            </p>
          </div>
        </div>

        {/* Card 2: Salary Earned */}
        <div 
          onClick={() => onNavigateTab("salary")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <DollarSign size={22} />
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              isPaidThisMonth 
                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                : "bg-amber-100 text-amber-800 border-amber-200"
            }`}>
              {isPaidThisMonth ? "Paid ✓" : "Pending"}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Salary</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              Rs. {baseSalary.toLocaleString()}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); handleQuickDownloadSalarySlip(); }}
              className="text-xs text-emerald-700 font-bold hover:underline mt-1 flex items-center gap-1"
            >
              <Download size={13} /> Download Slip
            </button>
          </div>
        </div>

        {/* Card 3: Target Completion */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Target size={22} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              {targetPercentage}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Completion</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {targetCompletedCount} <span className="text-xs font-bold text-gray-400">/ {monthlyTarget} Target</span>
            </p>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${targetPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 4: Attendance Details */}
        <div 
          onClick={() => onNavigateTab("my-attendance")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
              <Calendar size={22} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
              {attendanceRate}% Rate
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attendance Details</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {daysPresentCount} <span className="text-xs font-bold text-gray-500">Days Present</span>
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-1">
              Today: {isCheckedInToday ? "Checked In" : "Not yet checked in"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Daily Work File Upload System (PDF, Word, JPG, PNG) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1.5">
              <UploadCloud size={14} /> Daily Work Submissions
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900">
              Upload Daily Completed Work Files
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              Upload your daily completed work in <strong>PDF, Word (.doc, .docx), JPG, or PNG</strong> format. Admin can review and download them directly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 border border-gray-200">
              Formats: PDF • Word • JPG • PNG
            </span>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUploadSubmit} className="bg-slate-50/70 p-5 md:p-6 rounded-2xl border border-slate-200/80 space-y-5">
          {uploadError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle size={16} />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* File Picker Zone */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Work File to Upload (Max 5 MB per File)
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                Unlimited Daily Uploads • 5 MB per File / நாள் ஒன்றுக்கு எத்தனை முறை வேண்டுமானாலும் பதிவேற்றலாம் (Max 5 MB)
              </span>
            </div>
            <div className="relative border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-white transition-colors cursor-pointer group">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "Click or drag & drop files here (Max 5 MB per file)"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Supports <strong>PDF, Word (.doc, .docx), JPG (JPEG), and PNG</strong> • Limit: 5 MB per upload (Unlimited uploads per day)
                  </p>
                </div>
              </div>
            </div>

            {/* Selected files preview pills */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => {
                  const badge = getFileBadge(file.name, file.type);
                  return (
                    <div key={idx} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${badge.bg}`}>
                      {badge.icon}
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <span className="opacity-75">({formatFileSize(file.size)})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Work / File Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grade 11 Tamil Paper Part 1"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Typing & Data Entry">Typing & Data Entry (தட்டச்சு)</option>
                <option value="Question Paper">Question Paper (வினாத்தாள்)</option>
                <option value="Graphic Design">Graphic Design (வடிவமைப்பு)</option>
                <option value="Course Material">Course Material (பாடக் குறிப்புகள்)</option>
                <option value="Thumbnails & Media">Thumbnails & Media (பதாகைகள்)</option>
                <option value="Other">Other Work</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Quantity / Pages
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={workCount}
                  onChange={(e) => setWorkCount(Number(e.target.value))}
                  className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <select
                  value={workUnit}
                  onChange={(e) => setWorkUnit(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="Pages">Pages (பக்கங்கள்)</option>
                  <option value="Thumbnails">Thumbnails</option>
                  <option value="Designs">Designs</option>
                  <option value="Papers">Question Papers</option>
                  <option value="Files">Files</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Submission Date
              </label>
              <input
                type="date"
                readOnly
                value={todayStr}
                className="w-full px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Google Drive Link (Optional / விருப்பத்திற்கேற்ப Google Drive இணைப்பு)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={uploadDriveLink}
                  onChange={(e) => setUploadDriveLink(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <ExternalLink size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Direct upload is preferred for PDF/Word/JPG files. You may also provide a Google Drive link here.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Work Notes / Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Completed typing section 1-5, proofread and exported to PDF format."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || (selectedFiles.length === 0 && !uploadDriveLink.trim())}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <UploadCloud size={18} />
              <span>{isUploading ? "Uploading File(s)..." : "Submit Daily Work"}</span>
            </button>
          </div>
        </form>

        {/* Uploaded Works Table & History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Uploaded Work Records & Downloads ({uploads.length})
            </h3>
          </div>

          {uploads.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">File & Title</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category & Volume</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Status</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Download / Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {uploads.map((u) => {
                    const badge = getFileBadge(u.fileName, u.fileType);
                    const isApproved = u.status === 'Approved';
                    const hasDriveLink = Boolean(u.driveLink || (u.fileUrl && u.fileUrl.startsWith('http')));

                    return (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}>
                              {badge.icon}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-900 truncate max-w-xs">{u.title}</p>
                              <p className="text-xs text-gray-400 truncate max-w-xs">
                                {u.fileName} {u.fileSize ? `• ${formatFileSize(u.fileSize)}` : ''}
                              </p>
                              {u.notes && <p className="text-[11px] text-gray-500 italic mt-0.5">{u.notes}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {u.category}
                          </span>
                          <p className="text-xs font-bold text-gray-700 mt-1">
                            {u.workCount} {u.workUnit || 'Pages'}
                          </p>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">
                          <p className="font-semibold text-gray-800">{u.date}</p>
                          <p className="text-[11px] text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isApproved 
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}>
                            {isApproved ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                            {u.status}
                          </span>
                          {u.adminNotes && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate max-w-[150px]">
                              "{u.adminNotes}"
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-1.5">
                          {u.fileData ? (
                            <button
                              onClick={() => handleDownloadFile(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                              title="Download file directly"
                            >
                              <Download size={14} /> Download
                            </button>
                          ) : null}

                          {hasDriveLink && (
                            <a
                              href={u.driveLink || u.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                              title="Open Google Drive Link"
                            >
                              <ExternalLink size={13} /> Drive Link
                            </a>
                          )}

                          <button
                            onClick={() => handleDeleteUpload(u.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-flex items-center"
                            title="Delete file record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <UploadCloud size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No daily work files uploaded yet.</p>
              <p className="text-xs text-gray-500 mt-0.5">Use the upload box above to submit today's work files.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileCheckIcon({ size = 16, className = "" }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <path d="m9 15 2 2 4-4"></path>
    </svg>
  );
}
