import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Hash,
  Info,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  AlertCircle
} from "lucide-react";
import {
  getAdminSettings,
  getStudents,
  getStudentTermMarkEntries,
  getSubjects,
  saveStudentTermMarkEntries,
  StudentTermMarkEntry,
  syncTermMarkEntryToExamMarks
} from "../lib/db";
import { findStudentByRollAndPhone, normalizeRollCore } from "../lib/rollUtils";

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
  return "";
};

const DEFAULT_SUBJECTS = [
  "தமிழ்",
  "கணிதம்",
  "விஞ்ஞானம்",
  "ஆங்கிலம்",
  "வரலாறு",
  "புவியியல்",
  "குடியுரிமைக் கல்வி",
  "சைவநெறி",
  "வணிகமும் கணக்கீடும்",
  "தகவல் தொடர்பாடல் தொழில்நுட்பம் (ICT)",
  "சுகாதாரமும் உடற்கல்வியும்"
];

const computeGradeLetter = (pct: number) => {
  if (pct >= 75) return { letter: "A", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (pct >= 65) return { letter: "B", color: "bg-blue-100 text-blue-800 border-blue-200" };
  if (pct >= 55) return { letter: "C", color: "bg-amber-100 text-amber-800 border-amber-200" };
  if (pct >= 35) return { letter: "S", color: "bg-orange-100 text-orange-800 border-orange-200" };
  return { letter: "W", color: "bg-rose-100 text-rose-800 border-rose-200" };
};

export default function PublicTermMarksSubmit() {
  const [students, setStudents] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [settings, setSettings] = useState<any>({});
  const [loadingInit, setLoadingInit] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("தமிழ்");
  const [customSubject, setCustomSubject] = useState("");
  const [term1Marks, setTerm1Marks] = useState("");
  const [term2Marks, setTerm2Marks] = useState("");
  const [term3Marks, setTerm3Marks] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedReceipt, setSubmittedReceipt] = useState<StudentTermMarkEntry | null>(null);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      try {
        const [stList, subjList, adminSet] = await Promise.all([
          getStudents(),
          getSubjects(),
          getAdminSettings()
        ]);
        if (!active) return;
        setStudents(Array.isArray(stList) ? stList : []);
        setSettings(adminSet || {});

        const subjNames = new Set<string>(DEFAULT_SUBJECTS);
        if (Array.isArray(subjList)) {
          subjList.forEach((s: any) => {
            const label = typeof s === "string" ? s : s?.name || s?.subjectName;
            if (label && String(label).trim()) subjNames.add(String(label).trim());
          });
        }
        setAvailableSubjects(Array.from(subjNames));
      } catch (err) {
        console.error("Failed loading public term marks init:", err);
      } finally {
        if (active) setLoadingInit(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  // Live Roll Number + Phone verification against academy DB
  const liveMatch = useMemo(() => {
    if (!rollNo.trim() && !phone.trim()) return null;
    if (normalizeRollCore(rollNo).length < 2 && phone.replace(/\D/g, "").length < 6) return null;
    return findStudentByRollAndPhone(students, rollNo, phone, name);
  }, [students, rollNo, phone, name]);

  // Auto-populate canonical grade (Grade 6 - Grade 13) when matched
  useEffect(() => {
    if (liveMatch?.matched && liveMatch.student?.grade) {
      const canonical = normalizeCanonicalGrade(liveMatch.student.grade);
      if (canonical) setGrade(canonical);
    }
  }, [liveMatch?.matched, liveMatch?.student?.id, liveMatch?.student?.grade]);

  const validateMarkField = (val: string, label: string): string | null => {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (isNaN(num) || num < 0 || num > 100) {
      return `${label} 0 முதல் 100-க்குள் இருக்க வேண்டும் (Must be between 0 and 100).`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("தயவுசெய்து மாணவரின் பெயரை உள்ளிடவும் (Please enter student name).");
      return;
    }
    if (!rollNo.trim()) {
      setErrorMsg("தயவுசெய்து ரோல் நம்பரை உள்ளிடவும் (Please enter your Roll Number).");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      setErrorMsg("தயவுசெய்து சரியான போன் நம்பரை உள்ளிடவும் (Please enter a valid Phone Number).");
      return;
    }

    const finalSubject = subject === "__other__" ? customSubject.trim() : subject.trim();
    if (!finalSubject) {
      setErrorMsg("தயவுசெய்து பாடத்தைத் தேர்ந்தெடுக்கவும் (Please select a subject).");
      return;
    }

    if (!term1Marks.trim() && !term2Marks.trim() && !term3Marks.trim()) {
      setErrorMsg("குறைந்தது ஒரு தவணை மதிப்பெண்ணையாவது (குறிப்பாக 3-ஆம் தவணை) உள்ளிடவும்.");
      return;
    }

    const err1 = validateMarkField(term1Marks, "1-ஆம் தவணை மதிப்பெண்");
    if (err1) return setErrorMsg(err1);
    const err2 = validateMarkField(term2Marks, "2-ஆம் தவணை மதிப்பெண்");
    if (err2) return setErrorMsg(err2);
    const err3 = validateMarkField(term3Marks, "3-ஆம் தவணை மதிப்பெண்");
    if (err3) return setErrorMsg(err3);

    setSubmitting(true);
    try {
      // Refresh latest students & entries so we never overwrite or lose existing data
      const [latestStudents, existingEntries] = await Promise.all([
        getStudents(),
        getStudentTermMarkEntries()
      ]);

      const matchResult = findStudentByRollAndPhone(
        Array.isArray(latestStudents) && latestStudents.length > 0 ? latestStudents : students,
        rollNo,
        phone,
        name
      );

      const nowIso = new Date().toISOString();
      const matchedStudent = matchResult.student;
      const officialRoll = matchResult.officialRollNo || rollNo.trim().toUpperCase();
      const studentId = matchedStudent ? String(matchedStudent.id || matchedStudent.student_id || "") : "";
      const resolvedName = matchedStudent?.name ? String(matchedStudent.name).trim() : name.trim();
      const resolvedGrade =
        normalizeCanonicalGrade(grade) ||
        normalizeCanonicalGrade(matchedStudent?.grade) ||
        (matchedStudent?.grade ? String(matchedStudent.grade).trim() : "") ||
        grade.trim() ||
        "Unassigned";
      const officialPhone = matchedStudent?.phone || matchedStudent?.whatsapp || "";

      const normOfficialRoll = normalizeRollCore(officialRoll);
      const normSubj = finalSubject.toLowerCase();

      // Check if this exact student + subject already has a record -> merge non-destructively
      const existingIdx = existingEntries.findIndex((item) => {
        const sameSubject = String(item.subject || "").trim().toLowerCase() === normSubj;
        if (!sameSubject) return false;
        if (studentId && item.studentId && item.studentId === studentId) return true;
        if (normOfficialRoll && normalizeRollCore(item.officialRollNo) === normOfficialRoll) return true;
        return false;
      });

      const prev = existingIdx >= 0 ? existingEntries[existingIdx] : null;

      const entry: StudentTermMarkEntry = {
        id: prev?.id || `tmark_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        studentId,
        officialRollNo: officialRoll,
        submittedRollNo: rollNo.trim(),
        studentName: resolvedName,
        submittedName: name.trim(),
        phone: phone.trim(),
        officialPhone: officialPhone ? String(officialPhone) : prev?.officialPhone || "",
        grade: resolvedGrade,
        subject: finalSubject,
        term1Marks: term1Marks.trim() !== "" ? term1Marks.trim() : prev?.term1Marks || "",
        term2Marks: term2Marks.trim() !== "" ? term2Marks.trim() : prev?.term2Marks || "",
        term3Marks: term3Marks.trim() !== "" ? term3Marks.trim() : prev?.term3Marks || "",
        totalMarksPerTerm: 100,
        matched: matchResult.matched,
        matchMethod: matchResult.matchMethod,
        phoneVerified: matchResult.phoneVerified,
        submittedAt: prev?.submittedAt || nowIso,
        updatedAt: nowIso
      };

      const nextEntries = [...existingEntries];
      if (existingIdx >= 0) {
        nextEntries[existingIdx] = entry;
      } else {
        nextEntries.unshift(entry);
      }

      await saveStudentTermMarkEntries(nextEntries);
      // Immediately sync into examMarks so it appears inside the Student Panel
      await syncTermMarkEntryToExamMarks(entry);

      setSubmittedReceipt(entry);
    } catch (err) {
      console.error("Term marks submit error:", err);
      setErrorMsg("மதிப்பெண் பதிவில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnotherSubject = () => {
    setSubmittedReceipt(null);
    setTerm1Marks("");
    setTerm2Marks("");
    setTerm3Marks("");
    setErrorMsg("");
  };

  const handleFullReset = () => {
    setSubmittedReceipt(null);
    setName("");
    setRollNo("");
    setPhone("");
    setGrade("");
    setSubject("தமிழ்");
    setCustomSubject("");
    setTerm1Marks("");
    setTerm2Marks("");
    setTerm3Marks("");
    setErrorMsg("");
  };

  const receiptStats = useMemo(() => {
    if (!submittedReceipt) return null;
    const nums = [
      submittedReceipt.term1Marks,
      submittedReceipt.term2Marks,
      submittedReceipt.term3Marks
    ]
      .map((v) => (v !== "" && v !== undefined && v !== null ? Number(v) : NaN))
      .filter((n) => !isNaN(n));
    const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    return { avg: Math.round(avg * 10) / 10, gradeInfo: computeGradeLetter(avg), count: nums.length };
  }, [submittedReceipt]);

  const academyName = settings?.academyName || "நமது கல்வி நிறுவனம் (Academy)";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-emerald-50/40 py-6 px-4 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              {settings?.logo ? (
                <img src={settings.logo} alt={academyName} className="w-full h-full object-cover" />
              ) : (
                <Award size={28} className="text-emerald-300" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-1">
                {academyName}
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                மாணவர் தவணை மதிப்பெண் பதிவு
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-1">
                Student 1st, 2nd &amp; 3rd Term Marks Submission Portal
              </p>
            </div>
          </div>
        </div>

        {/* Success Receipt View */}
        {submittedReceipt ? (
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl overflow-hidden">
            <div className="bg-emerald-600 text-white px-6 py-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h2 className="text-lg font-black">மதிப்பெண் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!</h2>
                <p className="text-xs text-emerald-100">
                  Marks submitted &amp; synced to your Student Panel successfully.
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Verification Summary */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">மாணவர் பெயர் (Student)</div>
                  <div className="font-black text-slate-900 text-base">{submittedReceipt.studentName}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">உத்தியோகபூர்வ ரோல் நம்பர் (Official Roll No)</div>
                  <div className="font-mono font-black text-indigo-700 text-base">
                    {submittedReceipt.officialRollNo}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">தரம் &amp; பாடம் (Grade &amp; Subject)</div>
                  <div className="font-bold text-slate-800">
                    {submittedReceipt.grade} — {submittedReceipt.subject}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">நிலை (Verification Status)</div>
                  <div className="mt-0.5">
                    {submittedReceipt.matched ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck size={14} /> சரிபார்க்கப்பட்டது — Student Panel-ல் இணைக்கப்பட்டது
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        <Info size={14} /> பதிவு செய்யப்பட்டது (நிர்வாக சரிபார்ப்புக்காக)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Terms Score Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <div className="text-[11px] font-bold text-slate-500">1-ஆம் தவணை</div>
                  <div className="text-[10px] text-slate-400">1st Term</div>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {submittedReceipt.term1Marks !== "" ? `${submittedReceipt.term1Marks}` : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <div className="text-[11px] font-bold text-slate-500">2-ஆம் தவணை</div>
                  <div className="text-[10px] text-slate-400">2nd Term</div>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {submittedReceipt.term2Marks !== "" ? `${submittedReceipt.term2Marks}` : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-4 text-center shadow-sm">
                  <div className="text-[11px] font-black text-emerald-800">3-ஆம் தவணை</div>
                  <div className="text-[10px] font-semibold text-emerald-600">3rd Term</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {submittedReceipt.term3Marks !== "" ? `${submittedReceipt.term3Marks}` : "—"}
                  </div>
                </div>
              </div>

              {receiptStats && receiptStats.count > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-3.5">
                  <div>
                    <div className="text-xs font-bold text-indigo-900">சராசரி மதிப்பெண் (Average Score)</div>
                    <div className="text-[11px] text-indigo-600">உள்ளிடப்பட்ட தவணைகளின் அடிப்படையில்</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-indigo-900">{receiptStats.avg}%</span>
                    <span className={`px-3 py-1 rounded-xl text-sm font-black border ${receiptStats.gradeInfo.color}`}>
                      Grade {receiptStats.gradeInfo.letter}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForAnotherSubject}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <BookOpen size={16} /> மற்றொரு பாடத்தை பதிவு செய்க
                </button>
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw size={16} /> புதிய மாணவர்
                </button>
              </div>

              <div className="text-center pt-1">
                <Link
                  to="/"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
                >
                  மாணவர் உள்நுழைவு பக்கத்திற்குச் செல்லவும் (Go to Student Login)
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Main Submission Form Card */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6"
          >
            {errorMsg && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800 flex items-start gap-2.5">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Student Identification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <ClipboardCheck size={18} className="text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
                  1. மாணவர் விவரங்கள் (Student Details)
                </h2>
              </div>

              {/* 1. Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  மாணவரின் பெயர் (Student Name) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="உங்கள் முழுப் பெயரை உள்ளிடவும்..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* 2. Roll Number & 3. Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    ரோல் நம்பர் (Roll Number) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="எ.கா: 2026/SEM/B1/1901"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono font-semibold text-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Capital / small letters, &ldquo;/&rdquo;, &ldquo;-&rdquo;, space எது போட்டாலும் சரியான Roll Number தானாகவே கண்டறியப்படும்.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    போன் நம்பர் (Phone Number) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="எ.கா: 077 123 4567"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium text-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    அக்கடமியில் பதிவு செய்த தொலைபேசி இலக்கம்.
                  </p>
                </div>
              </div>

              {/* Live Verification Banner */}
              {!loadingInit && liveMatch && (
                liveMatch.matched && liveMatch.student ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-emerald-900 uppercase">
                          மாணவர் உறுதிப்படுத்தப்பட்டார் (Verified Student)
                        </span>
                        {liveMatch.phoneVerified && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            Roll No + Phone சரிபார்க்கப்பட்டது
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-800">
                        {liveMatch.student.name}{" "}
                        <span className="font-mono text-indigo-700 ml-1">({liveMatch.officialRollNo})</span>
                      </div>
                      <div className="text-xs text-emerald-800 mt-0.5">
                        தரம்: <strong>{liveMatch.student.grade || "Unassigned"}</strong> — உங்கள் மதிப்பெண்கள் நேரடியாக உங்கள் Student Panel-ல் காட்டப்படும்.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      தற்போது நேரடிப் பொருத்தம் இல்லை — உங்கள் சரியான <strong>Roll Number</strong> மற்றும் <strong>பதிவு செய்த Phone Number</strong>-ஐ சரிபார்க்கவும். இருப்பினும் நீங்கள் சமர்ப்பிக்கலாம்; நிர்வாகம் அதனைச் சரிபார்த்து இணைக்கும்.
                    </span>
                  </div>
                )
              )}

              {/* Grade & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    தரம் / வகுப்பு (Grade / Class)
                  </label>
                  <div className="relative">
                    <GraduationCap size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium text-slate-900"
                    >
                      <option value="">தரத்தைத் தேர்ந்தெடுக்கவும்...</option>
                      {CANONICAL_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    பாடம் (Subject) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <BookOpen size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium text-slate-900"
                    >
                      {availableSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value="__other__">வேறு பாடம் (Other Subject)...</option>
                    </select>
                  </div>
                </div>
              </div>

              {subject === "__other__" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    பாடத்தின் பெயரை உள்ளிடவும் (Custom Subject Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="எ.கா: கணிதம் / Science..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Term 1, Term 2, Term 3 Marks */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-600" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
                    2. தவணை மதிப்பெண்கள் (Term Marks — Out of 100)
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">0 – 100</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1st Term */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <label className="block text-xs font-black text-slate-700 mb-0.5">
                    1-ஆம் தவணை
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">1st Term Marks</p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={term1Marks}
                    onChange={(e) => setTerm1Marks(e.target.value)}
                    placeholder="0 - 100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-black text-center text-slate-800"
                  />
                </div>

                {/* 2nd Term */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <label className="block text-xs font-black text-slate-700 mb-0.5">
                    2-ஆம் தவணை
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">2nd Term Marks</p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={term2Marks}
                    onChange={(e) => setTerm2Marks(e.target.value)}
                    placeholder="0 - 100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-black text-center text-slate-800"
                  />
                </div>

                {/* 3rd Term (Prominently Highlighted) */}
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-4 shadow-sm">
                  <label className="block text-xs font-black text-emerald-900 mb-0.5">
                    3-ஆம் தவணை ★
                  </label>
                  <p className="text-[11px] font-semibold text-emerald-700 mb-2">3rd Term Marks</p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={term3Marks}
                    onChange={(e) => setTerm3Marks(e.target.value)}
                    placeholder="0 - 100"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-black text-center text-emerald-900"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 disabled:opacity-60 text-white font-black text-base shadow-lg shadow-indigo-200 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Send size={18} />
              {submitting ? "பதிவு செய்யப்படுகிறது..." : "மதிப்பெண்ணைச் சமர்ப்பிக்கவும் (Submit Term Marks)"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
