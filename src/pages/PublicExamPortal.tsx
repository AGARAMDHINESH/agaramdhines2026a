import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getTermExams, 
  getExamSubmissions, 
  saveExamSubmissions, 
  getExamMarks, 
  saveExamMarks, 
  getAdminSettings,
  getClasses,
  getStudents
} from '../lib/db';
import { formatEmbedUrl } from './Admin/TermExam';
import { getUserSession } from '../lib/authSession';
import { updateAppBadge } from '../lib/badgeManager';
import { 
  Award, 
  Calendar, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  Share2, 
  BookOpen, 
  Smartphone, 
  AlertCircle, 
  Check, 
  Copy, 
  ArrowLeft,
  GraduationCap,
  Send,
  User,
  ShieldCheck
} from 'lucide-react';

export default function PublicExamPortal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Student Profile State
  const [studentInfo, setStudentInfo] = useState<{
    id: string;
    name: string;
    rollNo: string;
    grade: string;
    isLoggedIn: boolean;
  }>({
    id: '',
    name: '',
    rollNo: '',
    grade: '',
    isLoggedIn: false
  });

  // Marks Input State
  const [marksInput, setMarksInput] = useState<{
    obtained: string;
    total: string;
    remarks: string;
  }>({
    obtained: '',
    total: '100',
    remarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    async function loadPortalData() {
      setLoading(true);
      try {
        const [loadedExams, settings, classes, students] = await Promise.all([
          getTermExams(),
          getAdminSettings(),
          getClasses(),
          getStudents()
        ]);

        setAdminSettings(settings);
        setClassesList(classes || []);
        setAllStudents(students || []);

        const foundExam = (loadedExams || []).find((e: any) => e.id === id);
        setExam(foundExam || null);

        if (foundExam) {
          setMarksInput(prev => ({
            ...prev,
            total: String(foundExam.totalMarks || 100)
          }));
        }

        // Check if student is logged in
        const session = getUserSession();
        let activeStudent = null;
        if (session && session.userType === 'student') {
          activeStudent = session.userData;
        } else {
          try {
            const raw = localStorage.getItem('student_user') || localStorage.getItem('agaram_student_data');
            if (raw) activeStudent = JSON.parse(raw);
          } catch (_) {}
        }

        if (activeStudent) {
          setStudentInfo({
            id: activeStudent.id || activeStudent.student_id || '',
            name: activeStudent.name || '',
            rollNo: activeStudent.rollNo || activeStudent.roll_number || activeStudent.id || '',
            grade: activeStudent.grade || (foundExam?.grades?.[0] || ''),
            isLoggedIn: true
          });

          // Check if already submitted
          const allSubs = await getExamSubmissions();
          const existingSub = allSubs.find((s: any) => 
            s.examId === id && (s.studentId === activeStudent.id || s.studentName === activeStudent.name)
          );
          if (existingSub) {
            setHasSubmitted(true);
            setSubmissionResult(existingSub);
          }
        } else if (foundExam?.grades && foundExam.grades.length > 0 && !foundExam.grades.includes('All')) {
          // Default grade to the first grade of exam
          setStudentInfo(prev => ({ ...prev, grade: foundExam.grades[0] }));
        }
      } catch (err) {
        console.error("Error loading exam portal data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [id]);

  const handleStudentSelectFromName = (selectedName: string) => {
    const student = allStudents.find(s => s.name === selectedName);
    if (student) {
      setStudentInfo(prev => ({
        ...prev,
        id: student.id || student.student_id || '',
        name: student.name,
        rollNo: student.rollNo || student.roll_number || student.id || '',
        grade: student.grade || prev.grade
      }));
    } else {
      setStudentInfo(prev => ({ ...prev, name: selectedName }));
    }
  };

  const handleMarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentInfo.name.trim()) {
      alert("தயவுசெய்து உங்கள் பெயரை உள்ளிடவும் (Please enter Student Name).");
      return;
    }

    if (!studentInfo.grade) {
      alert("தயவுசெய்து உங்கள் வகுப்பைத் (Grade) தெரிவுசெய்யவும்.");
      return;
    }

    if (!marksInput.obtained || isNaN(Number(marksInput.obtained))) {
      alert("தயவுசெய்து நீங்கள் பெற்ற புள்ளிகளை (Marks Obtained) உள்ளிடவும்.");
      return;
    }

    const obt = Number(marksInput.obtained);
    const tot = Number(marksInput.total) || Number(exam?.totalMarks) || 100;

    if (obt < 0 || obt > tot) {
      alert(`மதிப்பெண் 0 மற்றும் ${tot} க்குள் இருக்க வேண்டும்.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const percent = (obt / tot) * 100;
      const gl = percent >= 75 ? 'A' : percent >= 65 ? 'B' : percent >= 50 ? 'C' : percent >= 35 ? 'S' : 'W';
      const studentId = studentInfo.id || `ext_${Date.now()}`;

      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newSubmission = {
        id: submissionId,
        examId: exam.id,
        examName: exam.examName,
        termName: exam.termName,
        subject: exam.subject || 'பொது',
        studentId: studentId,
        studentName: studentInfo.name.trim(),
        rollNo: studentInfo.rollNo.trim() || studentId,
        grade: studentInfo.grade,
        obtained: obt,
        total: tot,
        percentage: percent,
        gradeLetter: gl,
        remarks: marksInput.remarks || 'நேரடி இணையவழி இணைப்பு மூலம் சமர்ப்பிக்கப்பட்டது (Direct Link Submission)',
        status: 'submitted' as const,
        submittedAt: new Date().toISOString()
      };

      const currentSubs = await getExamSubmissions();
      const updatedSubs = [
        newSubmission,
        ...currentSubs.filter((s: any) => !(s.examId === exam.id && s.studentName === studentInfo.name.trim()))
      ];
      await saveExamSubmissions(updatedSubs);

      // Sync into examMarks so it immediately reflects in the Report Card & Admin Results
      const allMarks = await getExamMarks();
      const updatedMarks = [
        {
          id: submissionId,
          studentId: studentId,
          grade: studentInfo.grade,
          exam: exam.examName,
          subject: exam.subject || 'பொது',
          obtained: obt,
          total: tot,
          remarks: marksInput.remarks || 'நேரடி வினாத்தாள் சமர்ப்பிப்பு',
          date: new Date().toISOString().split('T')[0]
        },
        ...allMarks.filter((m: any) => !(m.studentId === studentId && m.exam === exam.examName && m.subject === (exam.subject || 'பொது')))
      ];
      await saveExamMarks(updatedMarks);

      // Dispatch DB updated events
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'examSubmissions' } }));
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'examMarks' } }));

      setSubmissionResult(newSubmission);
      setHasSubmitted(true);
    } catch (err) {
      console.error("Error submitting marks:", err);
      alert("மதிப்பெண்களைச் சேமிப்பதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareResultOnWhatsApp = () => {
    if (!submissionResult) return;
    const msg = `🎓 *அகரம் தினைஸ் அகாடமி - பரீட்சை முடிவுகள்*
👤 மாணவர்: ${submissionResult.studentName}
🏫 வகுப்பு: ${submissionResult.grade}
📝 பரீட்சை: ${submissionResult.examName} (${submissionResult.termName})
📚 பாடம்: ${submissionResult.subject}
🎯 பெற்ற புள்ளிகள்: ${submissionResult.obtained} / ${submissionResult.total}
📊 சதவீதம்: ${submissionResult.percentage.toFixed(1)}% (தரம்: ${submissionResult.gradeLetter})
📅 தேதி: ${new Date(submissionResult.submittedAt).toLocaleDateString()}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <h3 className="text-lg font-black text-amber-300">பரீட்சை வினாத்தாள் தயாராகிறது...</h3>
        <p className="text-xs text-slate-400">தயவுசெய்து ஒரு கணம் காத்திருக்கவும்.</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">பரீட்சை வினாத்தாள் கிடைக்கவில்லை</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            இந்த இணைப்பு தவறாக இருக்கலாம் அல்லது பரீட்சை நீக்கப்பட்டிருக்கலாம்.
          </p>
          <div className="pt-2">
            <Link
              to="/student-dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Smartphone size={16} />
              மாணவர் ஆப்-க்குள் செல் (Go to Dashboard)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Academy Navbar */}
      <header className="bg-indigo-950/80 backdrop-blur-md border-b border-indigo-900/50 sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {adminSettings?.logoUrl ? (
              <img 
                src={adminSettings.logoUrl} 
                alt="Logo" 
                className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/10" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center font-black text-indigo-950 text-base shadow-sm">
                🎓
              </div>
            )}
            <div>
              <h1 className="font-black text-sm sm:text-base text-white tracking-tight leading-tight">
                {adminSettings?.academyName || "அகரம் தினைஸ் அகாடமி"}
              </h1>
              <p className="text-[10px] sm:text-xs text-amber-300 font-bold">
                இணையவழித் தேர்வு போர்டல் (Online Exam Portal)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPortalLink}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
              title="Copy Link"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copiedLink ? "காப்பி செய்யப்பட்டது!" : "லிங்க் காப்பி"}</span>
            </button>

            <Link
              to={`/student-dashboard?examId=${exam.id}&tab=marks&subTab=exams`}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-indigo-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">ஆப் மூலம் திற (Open in App)</span>
              <span className="sm:hidden">App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 flex flex-col space-y-4">
        
        {/* Exam Title & Metadata Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 border border-indigo-800/40 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-400 text-indigo-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {exam.termName}
                </span>
                <span className="bg-indigo-800/60 text-indigo-200 border border-indigo-700/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {exam.subject || "பொது"}
                </span>
                {exam.grades && exam.grades.map((g: string) => (
                  <span key={g} className="bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {g}
                  </span>
                ))}
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                {exam.examName}
              </h2>

              {exam.instructions && (
                <p className="text-xs sm:text-sm text-indigo-200/90 italic bg-white/5 border border-white/5 rounded-2xl p-3">
                  "{exam.instructions}"
                </p>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap md:flex-col items-center md:items-end gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-2 rounded-2xl">
                <Calendar size={15} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-300">தேதி: {exam.examDate}</span>
              </div>
              {exam.duration && (
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-2 rounded-2xl">
                  <Clock size={15} className="text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">நேரம்: {exam.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 px-3.5 py-2 rounded-2xl">
                <Award size={15} className="text-amber-400" />
                <span className="text-xs font-black text-amber-300">மொத்தப் புள்ளிகள்: {exam.totalMarks || 100}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Student Identification Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-white">மாணவர் விபரம் (Student Profile)</h4>
                {studentInfo.isLoggedIn && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} />
                    Logged In
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                மதிப்பெண்களைச் சேமிக்க உங்கள் பெயர் மற்றும் வகுப்பை உறுதிப்படுத்தவும்.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
            {/* Student Name */}
            <div>
              <input
                type="text"
                placeholder="மாணவர் பெயர் (Name)*"
                value={studentInfo.name}
                onChange={(e) => handleStudentSelectFromName(e.target.value)}
                className="w-full sm:w-44 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Student Grade */}
            <div>
              <select
                value={studentInfo.grade}
                onChange={(e) => setStudentInfo({ ...studentInfo, grade: e.target.value })}
                className="w-full sm:w-36 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">வகுப்பு (Grade)*</option>
                {classesList.length > 0 ? (
                  classesList.map((c: any) => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))
                ) : (
                  [...Array(13)].map((_, i) => (
                    <option key={i + 1} value={`தரம் ${i + 1}`}>தரம் {i + 1}</option>
                  ))
                )}
              </select>
            </div>

            {/* Roll No / Phone */}
            <div>
              <input
                type="text"
                placeholder="பதிவிலக்கம் / Phone"
                value={studentInfo.rollNo}
                onChange={(e) => setStudentInfo({ ...studentInfo, rollNo: e.target.value })}
                className="w-full sm:w-36 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Exam Viewer Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl min-h-[600px] h-[70vh]">
          {/* Top Bar for Embed */}
          <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">நேரடி வினாத்தாள் (Live Examination Paper)</span>
            </div>
            {exam.examLink && (
              <a
                href={exam.examLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-1 font-bold text-indigo-300 transition-colors"
              >
                <ExternalLink size={13} />
                புதிய தாவலில் திற (Full Screen)
              </a>
            )}
          </div>

          {/* Iframe View */}
          <div className="flex-1 bg-white relative">
            {exam.examLink ? (
              <iframe
                src={formatEmbedUrl(exam.examLink)}
                title={exam.examName}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : exam.paperPdf ? (
              <iframe
                src={exam.paperPdf}
                title="Question Paper PDF"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 text-slate-800">
                <Award size={54} className="text-indigo-600" />
                <h3 className="text-xl font-black text-slate-800">{exam.examName}</h3>
                <p className="text-sm text-slate-600 max-w-md">
                  {exam.instructions || "பரீட்சை வினாத்தாள் கீழே கொடுக்கப்பட்டுள்ள அறிவுறுத்தல்களின்படி செய்து முடித்து உங்கள் மதிப்பெண்களைச் சமர்ப்பிக்கவும்."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Post-Exam Marks Submission Dock */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
          {hasSubmitted && submissionResult ? (
            <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  🎉 பரீட்சை முடிவுகள் வெற்றிகரமாகப் பதிவுசெய்யப்பட்டது!
                </h3>
                <p className="text-xs sm:text-sm text-emerald-300 mt-1">
                  உங்கள் முடிவுகள் அகரம் அகாடமியின் ஆசிரியர் மதிப்பீட்டு அட்டவணையில் சேர்க்கப்பட்டுள்ளன.
                </p>
              </div>

              {/* Score summary pill */}
              <div className="inline-flex items-center justify-center gap-6 bg-black/40 border border-white/10 px-8 py-3 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">பெற்ற புள்ளிகள்</span>
                  <span className="text-2xl font-black text-amber-400">
                    {submissionResult.obtained} <span className="text-sm text-slate-400 font-normal">/ {submissionResult.total}</span>
                  </span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">தரம் (Grade)</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {submissionResult.gradeLetter} ({submissionResult.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={shareResultOnWhatsApp}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Share2 size={16} />
                  முடிவை WhatsApp இல் பகிரவும்
                </button>

                <Link
                  to={`/student-dashboard?examId=${exam.id}&tab=marks&subTab=results`}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Smartphone size={16} />
                  அறிக்கை அட்டையைப் பார்க்கவும் (Student Dashboard)
                </Link>

                <button
                  onClick={() => setHasSubmitted(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  மீண்டும் மதிப்பெண் திருத்த
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Award size={20} className="text-amber-400" />
                    பரீட்சை முடிவுகளைச் சமர்ப்பிக்கவும் (Submit Exam Result)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    வினாத்தாளைச் செய்து முடித்த பிறகு நீங்கள் பெற்ற புள்ளிகளை இங்கே பதிவிடவும்.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-xl w-fit">
                  மொத்தப் புள்ளிகள்: {exam.totalMarks || 100}
                </span>
              </div>

              <form onSubmit={handleMarksSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      பெற்ற புள்ளிகள் (Marks Obtained)*
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={exam.totalMarks || 100}
                        required
                        placeholder="எ.கா: 85"
                        value={marksInput.obtained}
                        onChange={(e) => setMarksInput({ ...marksInput, obtained: e.target.value })}
                        className="w-full bg-slate-950 border-2 border-indigo-500/50 focus:border-amber-400 rounded-xl px-4 py-2.5 text-lg font-black text-amber-400 placeholder-slate-600 focus:outline-none"
                      />
                      <span className="text-sm font-bold text-slate-500">
                        / {exam.totalMarks || 100}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      குறிப்புகள் (Remarks / Notes - விருப்பத்தேர்வு)
                    </label>
                    <input
                      type="text"
                      placeholder="எ.கா: Online Google Form வழியாக செய்தேன்"
                      value={marksInput.remarks}
                      onChange={(e) => setMarksInput({ ...marksInput, remarks: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send size={16} />
                          மதிப்பெண்களைப் பதிவு செய் (Submit)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
