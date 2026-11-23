import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Link2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import {
  deleteStudentTermMarkEntry,
  getAdminSettings,
  getStudents,
  getStudentTermMarkEntries,
  getSubjects,
  saveStudentTermMarkEntries,
  StudentTermMarkEntry,
  syncTermMarkEntryToExamMarks
} from "../../lib/db";
import { findStudentByRollAndPhone, normalizeRollCore } from "../../lib/rollUtils";
import { checkObjectMatchesPhone } from "../../lib/phoneUtils";

const ROWS_PER_A4_PAGE = 22;

const CANONICAL_GRADES = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Grade 13"
];

const normalizeCanonicalGrade = (raw: any): string => {
  if (!raw) return "";
  const str = String(raw).trim();
  const numMatch = str.match(/\b(6|7|8|9|10|11|12|13)\b/) || str.match(/0?(6|7|8|9|10|11|12|13)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 6 && n <= 13) return `Grade ${n}`;
  }
  if (/a\s*\/?\s*l/i.test(str)) return "Grade 12";
  return str;
};

const calcAverage = (entry: StudentTermMarkEntry): number | null => {
  const vals = [entry.term1Marks, entry.term2Marks, entry.term3Marks]
    .map((v) => (v !== "" && v !== undefined && v !== null ? Number(v) : NaN))
    .filter((n) => !isNaN(n));
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
};

const getGradeLetter = (avg: number | null): string => {
  if (avg === null) return "—";
  if (avg >= 75) return "A";
  if (avg >= 65) return "B";
  if (avg >= 55) return "C";
  if (avg >= 35) return "S";
  return "W";
};

const getGradeBadgeColor = (grade: string) => {
  switch (grade) {
    case "A":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "B":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "C":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "S":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "W":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

export default function TermMarksManagement() {
  const [entries, setEntries] = useState<StudentTermMarkEntry[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "matched" | "unmatched">("all");

  // Selection & UI feedback
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit / Create Modal
  const [editingEntry, setEditingEntry] = useState<StudentTermMarkEntry | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [editStudentSearch, setEditStudentSearch] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[]; label: string } | null>(null);

  // A4 Print / PDF Preview Modal
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const shareableUrl = useMemo(() => {
    if (typeof window === "undefined") return "/term-marks-submit";
    return `${window.location.origin}/term-marks-submit`;
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [loadedEntries, loadedStudents, loadedSubjects, loadedSettings] = await Promise.all([
        getStudentTermMarkEntries(),
        getStudents(),
        getSubjects(),
        getAdminSettings()
      ]);
      setEntries(Array.isArray(loadedEntries) ? loadedEntries : []);
      setStudents(Array.isArray(loadedStudents) ? loadedStudents : []);
      setSettings(loadedSettings || {});

      const subjSet = new Set<string>(["தமிழ்", "கணிதம்", "விஞ்ஞானம்", "ஆங்கிலம்", "வரலாறு", "புவியியல்"]);
      if (Array.isArray(loadedSubjects)) {
        loadedSubjects.forEach((s: any) => {
          const nm = typeof s === "string" ? s : s?.name || s?.subjectName;
          if (nm) subjSet.add(String(nm).trim());
        });
      }
      if (Array.isArray(loadedEntries)) {
        loadedEntries.forEach((e) => {
          if (e.subject) subjSet.add(e.subject);
        });
      }
      setSubjectsList(Array.from(subjSet));
    } catch (err) {
      console.error("Failed to load term marks management data:", err);
      showToast("தரவுகளை ஏற்றுவதில் பிழை ஏற்பட்டது.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const onDbUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (["studentTermMarkEntries", "students"].includes(custom.detail?.key)) {
        loadAll();
      }
    };
    window.addEventListener("db_updated", onDbUpdated);
    return () => window.removeEventListener("db_updated", onDbUpdated);
  }, []);

  const availableGrades = CANONICAL_GRADES;

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qRollCore = normalizeRollCore(searchQuery);

    return entries.filter((e) => {
      if (gradeFilter !== "All" && normalizeCanonicalGrade(e.grade || "") !== gradeFilter) return false;
      if (subjectFilter !== "All" && (e.subject || "") !== subjectFilter) return false;
      if (statusFilter === "matched" && !e.matched) return false;
      if (statusFilter === "unmatched" && e.matched) return false;

      if (!q) return true;
      const matchName =
        String(e.studentName || "").toLowerCase().includes(q) ||
        String(e.submittedName || "").toLowerCase().includes(q);
      const matchRoll =
        String(e.officialRollNo || "").toLowerCase().includes(q) ||
        String(e.submittedRollNo || "").toLowerCase().includes(q) ||
        (qRollCore.length >= 2 &&
          (normalizeRollCore(e.officialRollNo).includes(qRollCore) ||
            normalizeRollCore(e.submittedRollNo).includes(qRollCore)));
      const matchPhone = checkObjectMatchesPhone(
        { phone: e.phone, whatsapp: e.officialPhone },
        searchQuery
      );
      return matchName || matchRoll || matchPhone;
    });
  }, [entries, searchQuery, gradeFilter, subjectFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredEntries.length;
    const matchedCount = filteredEntries.filter((e) => e.matched).length;
    const unmatchedCount = total - matchedCount;
    const term3Nums = filteredEntries
      .map((e) => (e.term3Marks !== "" ? Number(e.term3Marks) : NaN))
      .filter((n) => !isNaN(n));
    const term3Avg =
      term3Nums.length > 0
        ? Math.round((term3Nums.reduce((a, b) => a + b, 0) / term3Nums.length) * 10) / 10
        : 0;
    return { total, matchedCount, unmatchedCount, term3Avg, term3Count: term3Nums.length };
  }, [filteredEntries]);

  const paginatedPages = useMemo(() => {
    const pages: StudentTermMarkEntry[][] = [];
    for (let i = 0; i < filteredEntries.length; i += ROWS_PER_A4_PAGE) {
      pages.push(filteredEntries.slice(i, i + ROWS_PER_A4_PAGE));
    }
    if (pages.length === 0) pages.push([]);
    return pages;
  }, [filteredEntries]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      showToast("மாணவர் மதிப்பெண் பதிவு லிங்க் நகலெடுக்கப்பட்டது!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast("லிங்க் நகலெடுக்க முடியவில்லை.", "error");
    }
  };

  const handleCopyWhatsAppMsg = async () => {
    const academy = settings?.academyName || "நமது கல்வி நிறுவனம்";
    const msg = `📢 *${academy} — தவணை மதிப்பெண் பதிவு*\n\nஅன்பான மாணவர்களே,\nஉங்களின் *1-ஆம், 2-ஆம் மற்றும் 3-ஆம் தவணை மதிப்பெண்களை* கீழே உள்ள லிங்க் மூலம் உடனடியாகப் பதிவு செய்யவும்:\n\n🔗 ${shareableUrl}\n\n✅ பதிவு செய்யும் போது உங்கள் *பெயர், ரோல் நம்பர் (Roll Number), போன் நம்பர்* மற்றும் மதிப்பெண்களை உள்ளிடவும்.\n✅ பதிவு செய்தவுடன் உங்கள் *Student Panel*-ல் மதிப்பெண்கள் தானாகவே காட்டப்படும்.`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedWhatsApp(true);
      showToast("WhatsApp செய்தி நகலெடுக்கப்பட்டது! குழுக்களில் Paste செய்யவும்.");
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      showToast("நகலெடுக்க முடியவில்லை.", "error");
    }
  };

  const handleReverifyAndSyncAll = async () => {
    if (entries.length === 0) return;
    setSyncingAll(true);
    try {
      const latestStudents = await getStudents();
      const updatedEntries: StudentTermMarkEntry[] = [];
      let newlyMatched = 0;
      let syncedCount = 0;

      for (const entry of entries) {
        const res = findStudentByRollAndPhone(
          latestStudents,
          entry.submittedRollNo || entry.officialRollNo,
          entry.phone,
          entry.submittedName || entry.studentName
        );
        const next: StudentTermMarkEntry =
          res.matched && res.student
            ? {
                ...entry,
                studentId: String(res.student.id || res.student.student_id || ""),
                officialRollNo: res.officialRollNo,
                studentName: String(res.student.name || entry.studentName).trim(),
                grade: String(res.student.grade || entry.grade || "").trim(),
                officialPhone: String(res.student.phone || res.student.whatsapp || entry.officialPhone || ""),
                matched: true,
                matchMethod: res.matchMethod,
                phoneVerified: res.phoneVerified,
                updatedAt: new Date().toISOString()
              }
            : entry;

        if (!entry.matched && next.matched) newlyMatched++;
        updatedEntries.push(next);

        if (next.matched || next.officialRollNo) {
          await syncTermMarkEntryToExamMarks(next);
          syncedCount++;
        }
      }

      await saveStudentTermMarkEntries(updatedEntries);
      setEntries(updatedEntries);
      showToast(
        `முடிந்தது! ${syncedCount} பதிவுகள் Student Panel-உடன் இணைக்கப்பட்டன (${newlyMatched} புதிய பொருத்தங்கள்).`
      );
    } catch (err) {
      console.error("Re-verify & sync error:", err);
      showToast("மறுசரிபார்ப்பில் பிழை ஏற்பட்டது.", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      showToast("பதிவிறக்க எந்தப் பதிவும் இல்லை.", "error");
      return;
    }

    const rows = filteredEntries.map((e, idx) => {
      const avg = calcAverage(e);
      return {
        "No": idx + 1,
        "Official Roll No": e.officialRollNo || "-",
        "Submitted Roll No": e.submittedRollNo || "-",
        "Student Name": e.studentName || e.submittedName || "-",
        "Grade": e.grade || "-",
        "Phone Number": e.phone || e.officialPhone || "-",
        "Subject": e.subject || "-",
        "1st Term": e.term1Marks !== "" ? Number(e.term1Marks) : "",
        "2nd Term": e.term2Marks !== "" ? Number(e.term2Marks) : "",
        "3rd Term": e.term3Marks !== "" ? Number(e.term3Marks) : "",
        "Average (%)": avg !== null ? avg : "",
        "Grade Letter": getGradeLetter(avg),
        "Status": e.matched ? (e.phoneVerified ? "Verified (Roll+Phone)" : "Matched (Roll)") : "Unmatched",
        "Date": e.updatedAt ? new Date(e.updatedAt).toLocaleDateString("en-GB") : ""
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 22 },
      { wch: 28 },
      { wch: 13 },
      { wch: 16 },
      { wch: 22 },
      { wch: 11 },
      { wch: 11 },
      { wch: 11 },
      { wch: 13 },
      { wch: 13 },
      { wch: 22 },
      { wch: 13 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Term Marks");
    const dateStamp = new Date().toISOString().split("T")[0];
    const gradeTag = gradeFilter !== "All" ? `_${gradeFilter.replace(/\s+/g, "_")}` : "";
    XLSX.writeFile(workbook, `Term_Marks_Report${gradeTag}_${dateStamp}.xlsx`);
    showToast("Excel கோப்பு (.xlsx) வெற்றிகரமாகப் பதிவிறக்கப்பட்டது!");
  };

  const handleDownloadPdf = async () => {
    if (filteredEntries.length === 0) {
      showToast("PDF பதிவிறக்க எந்தப் பதிவும் இல்லை.", "error");
      return;
    }
    setGeneratingPdf(true);
    try {
      // Ensure print container is rendered
      await new Promise((r) => setTimeout(r, 120));
      const container = pdfContainerRef.current;
      if (!container) throw new Error("PDF container not ready");

      const pageEls = container.querySelectorAll<HTMLElement>("[data-pdf-page='true']");
      if (pageEls.length === 0) throw new Error("No PDF pages found");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        const imgData = await toPng(el, {
          quality: 0.98,
          pixelRatio: 2.2,
          backgroundColor: "#ffffff"
        });
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      }

      const dateStamp = new Date().toISOString().split("T")[0];
      const gradeTag = gradeFilter !== "All" ? `_${gradeFilter.replace(/\s+/g, "_")}` : "";
      pdf.save(`Term_Marks_Report${gradeTag}_${dateStamp}.pdf`);
      showToast("Bordered PDF கோப்பு வெற்றிகரமாகப் பதிவிறக்கப்பட்டது!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("PDF உருவாக்குவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.", "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleOpenNewModal = () => {
    setIsNewModal(true);
    setEditStudentSearch("");
    setEditingEntry({
      id: `tmark_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      studentId: "",
      officialRollNo: "",
      submittedRollNo: "",
      studentName: "",
      submittedName: "",
      phone: "",
      officialPhone: "",
      grade: gradeFilter !== "All" ? gradeFilter : "",
      subject: subjectFilter !== "All" ? subjectFilter : "தமிழ்",
      term1Marks: "",
      term2Marks: "",
      term3Marks: "",
      totalMarksPerTerm: 100,
      matched: false,
      matchMethod: "unmatched",
      phoneVerified: false,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const handleOpenEditModal = (entry: StudentTermMarkEntry) => {
    setIsNewModal(false);
    setEditStudentSearch("");
    setEditingEntry({ ...entry });
  };

  const handleLinkStudentInModal = (student: any) => {
    if (!editingEntry || !student) return;
    setEditingEntry({
      ...editingEntry,
      studentId: String(student.id || student.student_id || ""),
      officialRollNo: String(student.rollNo || student.studentCode || student.username || student.id || "").trim(),
      submittedRollNo: editingEntry.submittedRollNo || String(student.rollNo || "").trim(),
      studentName: String(student.name || "").trim(),
      submittedName: editingEntry.submittedName || String(student.name || "").trim(),
      grade: String(student.grade || editingEntry.grade || "").trim(),
      phone: editingEntry.phone || String(student.phone || student.whatsapp || "").trim(),
      officialPhone: String(student.phone || student.whatsapp || "").trim(),
      matched: true,
      matchMethod: "roll+phone",
      phoneVerified: true
    });
    setEditStudentSearch("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setSavingEdit(true);
    try {
      // Auto-resolve roll + phone if not manually linked
      let finalEntry = { ...editingEntry, updatedAt: new Date().toISOString() };
      if (!finalEntry.studentId && (finalEntry.officialRollNo || finalEntry.submittedRollNo || finalEntry.phone)) {
        const res = findStudentByRollAndPhone(
          students,
          finalEntry.officialRollNo || finalEntry.submittedRollNo,
          finalEntry.phone,
          finalEntry.studentName
        );
        if (res.matched && res.student) {
          finalEntry = {
            ...finalEntry,
            studentId: String(res.student.id || res.student.student_id || ""),
            officialRollNo: res.officialRollNo,
            studentName: String(res.student.name || finalEntry.studentName).trim(),
            grade: String(res.student.grade || finalEntry.grade || "").trim(),
            officialPhone: String(res.student.phone || res.student.whatsapp || ""),
            matched: true,
            matchMethod: res.matchMethod,
            phoneVerified: res.phoneVerified
          };
        }
      }

      const current = await getStudentTermMarkEntries();
      const idx = current.findIndex((item) => item.id === finalEntry.id);
      const next = [...current];
      if (idx >= 0) next[idx] = finalEntry;
      else next.unshift(finalEntry);

      await saveStudentTermMarkEntries(next);
      await syncTermMarkEntryToExamMarks(finalEntry);
      setEntries(next);
      setEditingEntry(null);
      showToast("மதிப்பெண் சேமிக்கப்பட்டு Student Panel-உடன் இணைக்கப்பட்டது!");
    } catch (err) {
      console.error("Save term mark entry error:", err);
      showToast("சேமிப்பதில் பிழை ஏற்பட்டது.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      for (const id of deleteConfirm.ids) {
        await deleteStudentTermMarkEntry(id);
      }
      setEntries((prev) => prev.filter((e) => !deleteConfirm.ids.includes(e.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteConfirm.ids.forEach((id) => next.delete(id));
        return next;
      });
      showToast(`${deleteConfirm.ids.length} பதிவு(கள்) நீக்கப்பட்டன.`);
    } catch (err) {
      console.error("Delete entry error:", err);
      showToast("நீக்குவதில் பிழை ஏற்பட்டது.", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const modalStudentSuggestions = useMemo(() => {
    const q = editStudentSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    const qCore = normalizeRollCore(q);
    return students
      .filter((s) => {
        const nm = String(s.name || "").toLowerCase().includes(q);
        const rl =
          String(s.rollNo || "").toLowerCase().includes(q) ||
          (qCore.length >= 2 && normalizeRollCore(s.rollNo).includes(qCore));
        const ph = checkObjectMatchesPhone(s, q);
        return nm || rl || ph;
      })
      .slice(0, 6);
  }, [students, editStudentSearch]);

  const toggleSelectAllFiltered = () => {
    const allIds = filteredEntries.map((e) => e.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const academyName = settings?.academyName || "நமது கல்வி நிறுவனம் (Academy)";

  // Reusable Bordered A4 Sheets renderer (used for both PDF capture and Print Preview)
  const renderA4Pages = () => (
    <div className="space-y-6">
      {paginatedPages.map((pageRows, pageIndex) => (
        <div
          key={pageIndex}
          data-pdf-page="true"
          className="bg-white text-slate-900 mx-auto"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "12mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pageBreakAfter: pageIndex < paginatedPages.length - 1 ? "always" : "auto"
          }}
        >
          {/* Outer Crisp Border Frame */}
          <div className="border-2 border-slate-800 p-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Sheet Header */}
              <div className="border-b-2 border-slate-800 pb-3 mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {settings?.logo && (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                    />
                  )}
                  <div>
                    <div className="text-base font-black text-slate-900 tracking-tight">
                      {academyName}
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      மாணவர் தவணை மதிப்பெண் அறிக்கை — Student Term Marks Report (1st, 2nd &amp; 3rd Term)
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-700 leading-snug">
                  <div>
                    <strong>Grade:</strong> {gradeFilter}
                  </div>
                  <div>
                    <strong>Subject:</strong> {subjectFilter}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date().toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>

              {/* Clean Bordered Table */}
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-8">#</th>
                    <th className="border border-slate-700 px-2 py-2 text-left">Roll Number</th>
                    <th className="border border-slate-700 px-2 py-2 text-left">மாணவர் பெயர் (Student Name)</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-16">Grade</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-left w-24">Phone</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-left w-20">Subject</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-12">T1</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-12">T2</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-12 bg-emerald-900">T3</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-12">Avg</th>
                    <th className="border border-slate-700 px-1.5 py-2 text-center w-10">Grd</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="border border-slate-600 py-8 text-center text-slate-500">
                        பதிவுகள் எதுவும் இல்லை (No Records Found)
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, rIdx) => {
                      const globalIdx = pageIndex * ROWS_PER_A4_PAGE + rIdx + 1;
                      const avg = calcAverage(row);
                      const gl = getGradeLetter(avg);
                      return (
                        <tr key={row.id} className={rIdx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center font-semibold">
                            {globalIdx}
                          </td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold text-[10px]">
                            {row.officialRollNo || "-"}
                          </td>
                          <td className="border border-slate-600 px-2 py-1.5 font-semibold">
                            {row.studentName || row.submittedName || "-"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center">
                            {row.grade || "-"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 font-mono text-[10px]">
                            {row.phone || row.officialPhone || "-"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5">
                            {row.subject || "-"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center font-semibold">
                            {row.term1Marks !== "" ? row.term1Marks : "—"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center font-semibold">
                            {row.term2Marks !== "" ? row.term2Marks : "—"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center font-black bg-emerald-50 text-emerald-900">
                            {row.term3Marks !== "" ? row.term3Marks : "—"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center font-bold">
                            {avg !== null ? `${avg}%` : "—"}
                          </td>
                          <td className="border border-slate-600 px-1.5 py-1.5 text-center font-black">
                            {gl}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer inside outer border */}
            <div className="border-t-2 border-slate-800 pt-2.5 mt-4 flex items-center justify-between text-[10px] font-semibold text-slate-700">
              <div>
                Total Students: <strong>{filteredEntries.length}</strong> &nbsp;|&nbsp; Verified:{" "}
                <strong>{stats.matchedCount}</strong> &nbsp;|&nbsp; 3rd Term Avg:{" "}
                <strong>{stats.term3Avg}%</strong>
              </div>
              <div>
                Page {pageIndex + 1} of {paginatedPages.length}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl border font-bold text-sm flex items-center gap-2.5 ${
            toastMsg.type === "error"
              ? "bg-rose-600 text-white border-rose-700"
              : "bg-slate-900 text-white border-slate-700"
          }`}
        >
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Page Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Award size={22} />
            </span>
            தவணை மதிப்பெண் மேலாண்மை (Term Marks Portal)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            மாணவர்களின் 1st, 2nd &amp; 3rd Term மதிப்பெண் பதிவுகள், தானியங்கி Roll Number + Phone சரிபார்ப்பு &amp; Student Panel இணைப்பு.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} /> புதிய பதிவு (Add Marks)
          </button>
          <button
            type="button"
            onClick={handleReverifyAndSyncAll}
            disabled={syncingAll || entries.length === 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={15} className={syncingAll ? "animate-spin" : ""} />
            {syncingAll ? "இணைக்கப்படுகிறது..." : "மறுசரிபார்த்து Student Panel-ல் Sync செய்க"}
          </button>
        </div>
      </div>

      {/* Shareable Student Link Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-300">
              <Link2 size={14} /> மாணவர்களுக்கு அனுப்ப வேண்டிய லிங்க் (Public Student Submission Link)
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              இந்த லிங்க்கை WhatsApp குழுக்களில் மாணவர்களுக்கு அனுப்புங்கள். மாணவர்கள் பெயர், ரோல் நம்பர், போன் நம்பர் மற்றும் 1, 2, 3-ஆம் தவணை மதிப்பெண்களைப் பதிவிட்டதும், Roll Number (Capital/Small/Symbols எதுவாக இருந்தாலும்) தானாகச் சரிபார்க்கப்பட்டு இங்கும் Student Panel-லும் காட்டப்படும்.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-emerald-200 break-all">
              {shareableUrl}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-indigo-50 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copiedLink ? "நகலெடுக்கப்பட்டது!" : "லிங்க் நகலெடு (Copy Link)"}
            </button>
            <button
              type="button"
              onClick={handleCopyWhatsAppMsg}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {copiedWhatsApp ? <Check size={16} /> : <Share2 size={16} />}
              {copiedWhatsApp ? "செய்தி நகலெடுக்கப்பட்டது!" : "WhatsApp செய்தி நகலெடு"}
            </button>
            <a
              href={shareableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={15} /> திற (Open)
            </a>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500">மொத்த பதிவுகள் (Total)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <ShieldCheck size={14} /> சரிபார்க்கப்பட்டவை (Verified)
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.matchedCount}</div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <ShieldAlert size={14} /> சரிபார்க்க வேண்டியவை (Unmatched)
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.unmatchedCount}</div>
        </div>
        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-indigo-700">3-ஆம் தவணை சராசரி (3rd Term Avg)</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {stats.term3Count > 0 ? `${stats.term3Avg}%` : "—"}
          </div>
        </div>
      </div>

      {/* Filters & Export Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="பெயர், ரோல் நம்பர், போன் நம்பர் தேடு..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">அனைத்து தரங்களும் (All Grades)</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">அனைத்து பாடங்களும் (All Subjects)</option>
              {subjectsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">அனைத்தும் (All)</option>
              <option value="matched">Verified Only</option>
              <option value="unmatched">Unmatched Only</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter size={13} /> காட்டப்படுபவை: <strong className="text-slate-800">{filteredEntries.length}</strong>
            </span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirm({
                    ids: Array.from(selectedIds),
                    label: `தேர்ந்தெடுக்கப்பட்ட ${selectedIds.size} மதிப்பெண் பதிவுகள்`
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} /> தேர்ந்தெடுத்ததை நீக்கு ({selectedIds.size})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredEntries.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} /> Excel பதிவிறக்கம் (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf || filteredEntries.length === 0}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={15} /> {generatingPdf ? "PDF உருவாகிறது..." : "Bordered PDF பதிவிறக்கம்"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              disabled={filteredEntries.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={15} /> A4 Preview / Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm font-medium">
            தரவுகள் ஏற்றப்படுகின்றன...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-700">தவணை மதிப்பெண் பதிவுகள் இன்னும் இல்லை</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              மேலே உள்ள <strong>மாணவர் லிங்க்கை</strong> நகலெடுத்து மாணவர்களுக்கு அனுப்புங்கள், அல்லது &ldquo;புதிய பதிவு&rdquo; மூலம் நேரடியாக உள்ளிடவும்.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-3 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredEntries.length > 0 &&
                        filteredEntries.every((e) => selectedIds.has(e.id))
                      }
                      onChange={toggleSelectAllFiltered}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 w-10">#</th>
                  <th className="px-3 py-3">Official Roll No</th>
                  <th className="px-3 py-3">மாணவர் பெயர் (Student)</th>
                  <th className="px-3 py-3">Grade</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3 text-center">1st Term</th>
                  <th className="px-3 py-3 text-center">2nd Term</th>
                  <th className="px-3 py-3 text-center bg-emerald-900">3rd Term</th>
                  <th className="px-3 py-3 text-center">Avg / Grd</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((entry, idx) => {
                  const avg = calcAverage(entry);
                  const gl = getGradeLetter(avg);
                  const isSel = selectedIds.has(entry.id);
                  const rollChanged =
                    entry.submittedRollNo &&
                    entry.officialRollNo &&
                    entry.submittedRollNo.trim() !== entry.officialRollNo.trim();

                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        isSel ? "bg-indigo-50/70" : idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                      } hover:bg-indigo-50/40`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(entry.id)) next.delete(entry.id);
                              else next.add(entry.id);
                              return next;
                            })
                          }
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-indigo-700 text-xs">
                          {entry.officialRollNo || "-"}
                        </div>
                        {rollChanged && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Typed: {entry.submittedRollNo}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {entry.studentName || entry.submittedName}
                        </div>
                        {entry.submittedName &&
                          entry.studentName &&
                          entry.submittedName.toLowerCase() !== entry.studentName.toLowerCase() && (
                            <div className="text-[10px] text-slate-400">
                              Typed: {entry.submittedName}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {entry.grade || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {entry.phone || entry.officialPhone || "-"}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                        {entry.subject}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">
                        {entry.term1Marks !== "" ? entry.term1Marks : "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">
                        {entry.term2Marks !== "" ? entry.term2Marks : "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-black text-emerald-800 bg-emerald-50/70">
                        {entry.term3Marks !== "" ? entry.term3Marks : "—"}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {avg !== null ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800">{avg}%</span>
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${getGradeBadgeColor(
                                gl
                              )}`}
                            >
                              {gl}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {entry.matched ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck size={12} />
                            {entry.phoneVerified ? "Verified" : "Matched"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <ShieldAlert size={12} /> Unmatched
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(entry)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                            title="திருத்து / மாணவரை இணை (Edit / Link Student)"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                ids: [entry.id],
                                label: `${entry.studentName} (${entry.officialRollNo})`
                              })
                            }
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="நீக்கு (Delete)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Off-screen Container for Crisp Bordered A4 PDF Capture */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: "-99999px", top: 0, pointerEvents: "none" }}
      >
        <div ref={pdfContainerRef}>{renderA4Pages()}</div>
      </div>

      {/* A4 Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex flex-col">
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 print:hidden">
            <div className="font-black text-sm sm:text-base flex items-center gap-2">
              <Printer size={18} className="text-emerald-400" />
              A4 Bordered Print Preview ({paginatedPages.length} Pages)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> {generatingPdf ? "PDF உருவாகிறது..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Print
              </button>
              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-slate-200">{renderA4Pages()}</div>
        </div>
      )}

      {/* Edit / Add / Link Student Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base">
                {isNewModal ? "புதிய தவணை மதிப்பெண் பதிவு" : "மதிப்பெண் திருத்தம் & மாணவர் இணைப்பு"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* Quick Link to Official Student DB */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 space-y-2">
                <label className="block text-xs font-black text-indigo-900">
                  மாணவர் தரவுத்தளத்தில் தேடி இணைக்கவும் (Link Official Student)
                </label>
                <input
                  type="text"
                  value={editStudentSearch}
                  onChange={(e) => setEditStudentSearch(e.target.value)}
                  placeholder="பெயர், ரோல் நம்பர் அல்லது போன் நம்பர் தட்டச்சு செய்க..."
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {modalStudentSuggestions.length > 0 && (
                  <div className="bg-white rounded-xl border border-indigo-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {modalStudentSuggestions.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleLinkStudentInModal(st)}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{st.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {st.rollNo} • {st.grade} • {st.phone}
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          தேர்ந்தெடு
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">மாணவர் பெயர்</label>
                  <input
                    type="text"
                    required
                    value={editingEntry.studentName}
                    onChange={(e) => setEditingEntry({ ...editingEntry, studentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Roll No</label>
                  <input
                    type="text"
                    required
                    value={editingEntry.officialRollNo}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, officialRollNo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={editingEntry.grade}
                    onChange={(e) => setEditingEntry({ ...editingEntry, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingEntry.phone}
                    onChange={(e) => setEditingEntry({ ...editingEntry, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">பாடம் (Subject)</label>
                <input
                  type="text"
                  required
                  value={editingEntry.subject}
                  onChange={(e) => setEditingEntry({ ...editingEntry, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">1st Term</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editingEntry.term1Marks}
                    onChange={(e) => setEditingEntry({ ...editingEntry, term1Marks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">2nd Term</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editingEntry.term2Marks}
                    onChange={(e) => setEditingEntry({ ...editingEntry, term2Marks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">3rd Term ★</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editingEntry.term3Marks}
                    onChange={(e) => setEditingEntry({ ...editingEntry, term3Marks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-center font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  ரத்து செய்
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-xs cursor-pointer"
                >
                  {savingEdit ? "சேமிக்கிறது..." : "சேமித்து Student Panel-ல் Sync செய்க"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">பதிவை நீக்கவா? (Confirm Delete)</h3>
            <p className="text-sm text-slate-600">
              <strong>{deleteConfirm.label}</strong> — இதனை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                இல்லை (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer"
              >
                ஆம், நீக்கு (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
