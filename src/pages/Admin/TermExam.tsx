import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, Plus, Calendar, Clock, Link as LinkIcon, FileText, CheckCircle2, 
  AlertCircle, Search, Filter, Trash2, Edit, Eye, Download, ExternalLink, 
  Image as ImageIcon, Users, BookOpen, ChevronRight, X, Sparkles, Send, Check,
  ArrowLeft, RefreshCw, Layers, Share2, Copy, BarChart3
} from 'lucide-react';
import { 
  getClasses, getStudents, getTermExams, saveTermExams, TermExamItem, 
  getExamSubmissions, saveExamSubmissions, ExamSubmissionItem, 
  getWebPosts, addNotification, getExamMarks, saveExamMarks 
} from '../../lib/db';

export const GRADES_LIST = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

export const POPULAR_TERMS = [
  "முதலாம் தவணைப் பரீட்சை (1st Term)",
  "இரண்டாம் தவணைப் பரீட்சை (2nd Term)",
  "மூன்றாம் தவணைப் பரீட்சை (3rd Term)",
  "மாதாந்தப் பரீட்சை (Monthly Unit Test)",
  "மாதிரிப் பரீட்சை (Model Exam)",
  "சிறப்புப் பயிற்சிப் பரீட்சை (Special Test)"
];

export const formatEmbedUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Google Forms
  if (trimmed.includes('docs.google.com/forms')) {
    if (trimmed.includes('/viewform')) {
      return trimmed.includes('embedded=true') ? trimmed : `${trimmed}${trimmed.includes('?') ? '&' : '?'}embedded=true`;
    }
    return trimmed.replace(/\/edit.*$/, '/viewform?embedded=true');
  }

  // Google Drive
  if (trimmed.includes('drive.google.com/file/d/')) {
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }

  // YouTube
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return `https://www.youtube-nocookie.com/embed/${match[2]}`;
    }
  }

  return trimmed;
};

export default function TermExam() {
  const [view, setView] = useState<'list' | 'add' | 'submissions'>('list');
  const [exams, setExams] = useState<TermExamItem[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmissionItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [webPosts, setWebPosts] = useState<any[]>([]);
  
  // Filters & State
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedExamForSubmissions, setSelectedExamForSubmissions] = useState<TermExamItem | null>(null);
  const [previewExam, setPreviewExam] = useState<TermExamItem | null>(null);
  const [shareExamModal, setShareExamModal] = useState<TermExamItem | null>(null);
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [showWebPostModal, setShowWebPostModal] = useState<boolean>(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const getDirectExamUrl = (examId: string) => {
    return `${window.location.origin}/exam/${examId}`;
  };

  const handleCopyExamLink = (examId: string) => {
    const url = getDirectExamUrl(examId);
    navigator.clipboard.writeText(url);
    setCopiedExamId(examId);
    setTimeout(() => setCopiedExamId(null), 2500);
  };

  const handleShareToWhatsApp = (exam: TermExamItem) => {
    const url = getDirectExamUrl(exam.id);
    const msg = `🎓 *அகரம் தினைஸ் அகாடமி - புதிய பரீட்சை வினாத்தாள்!*
📝 பரீட்சை: ${exam.examName}
📚 பாடம்: ${exam.subject || 'பொது'}
🎯 தவணை: ${exam.termName}
🏫 வகுப்புகள்: ${exam.grades.join(', ')}
📅 திகதி: ${exam.examDate}
⏰ காலம்: ${exam.duration || 'நிர்ணயிக்கப்படவில்லை'}
💯 மொத்தப் புள்ளிகள்: ${exam.totalMarks || 100}

👇 *மாணவர்கள் கீழே உள்ள லிங்க்கை கிளிக் செய்து நேரடியாக பரீட்சை எழுதி உங்கள் புள்ளிகளைச் சமர்ப்பிக்கவும்:*
${url}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Manual mark entry modal for admin
  const [editingSubmission, setEditingSubmission] = useState<{
    student: any;
    exam: TermExamItem;
    obtained: string;
    total: string;
    remarks: string;
  } | null>(null);

  // Form State
  const initialFormState: Partial<TermExamItem> = {
    termName: POPULAR_TERMS[0],
    examName: '',
    subject: 'தமிழ்',
    grades: ['தரம் 10', 'தரம் 11'],
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    duration: '1 மணித்தியாலம் 30 நிமிடம்',
    totalMarks: 100,
    passMarks: 35,
    examLink: '',
    linkType: 'google_form',
    thumbnail: '',
    paperPdf: '',
    solutionPdf: '',
    instructions: 'அனைத்து வினாக்களுக்கும் கவனமாக விடையளிக்கவும். பரீட்சை முடிந்தவுடன் நீங்கள் பெற்ற புள்ளிகளை (Marks) கீழே உள்ள படிவத்தில் உள்ளீடு செய்யவும்.'
  };

  const [formData, setFormData] = useState<Partial<TermExamItem>>(initialFormState);
  const [customTerm, setCustomTerm] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedExams, loadedSubmissions, loadedStudents, loadedClasses, loadedWebPosts] = await Promise.all([
      getTermExams(),
      getExamSubmissions(),
      getStudents(),
      getClasses(),
      getWebPosts()
    ]);

    setExams(loadedExams || []);
    setSubmissions(loadedSubmissions || []);
    setStudents(loadedStudents || []);
    setClasses(loadedClasses || []);
    setWebPosts(loadedWebPosts || []);
  };

  // Grade selection helpers
  const handleGradeToggle = (grade: string) => {
    const current = formData.grades || [];
    if (current.includes(grade)) {
      setFormData(prev => ({
        ...prev,
        grades: current.filter(g => g !== grade)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        grades: [...current, grade]
      }));
    }
  };

  const handleSelectAllGrades = () => {
    if (formData.grades?.length === GRADES_LIST.length) {
      setFormData(prev => ({ ...prev, grades: [] }));
    } else {
      setFormData(prev => ({ ...prev, grades: [...GRADES_LIST] }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnail' | 'paperPdf' | 'solutionPdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB for storage safety)
    if (file.size > 5 * 1024 * 1024) {
      alert("கோப்பின் அளவு 5MB க்கும் குறைவாக இருக்க வேண்டும்.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        [field]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.examName?.trim()) {
      alert("தயவுசெய்து பரீட்சையின் பெயரை உள்ளிடவும் (Exam Name is required).");
      return;
    }

    if (!formData.grades || formData.grades.length === 0) {
      alert("குறைந்தது ஒரு வகுப்பையாவது தெரிவுசெய்யவும் (Select at least one Class/Grade).");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTermName = customTerm.trim() ? customTerm.trim() : (formData.termName || POPULAR_TERMS[0]);

      // Detect link type
      let detectedLinkType = formData.linkType || 'external';
      const link = formData.examLink || '';
      if (link.includes('docs.google.com/forms') || link.includes('forms.gle')) {
        detectedLinkType = 'google_form';
      } else if (link.includes('drive.google.com')) {
        detectedLinkType = 'google_drive';
      } else if (link.includes('youtube.com') || link.includes('youtu.be')) {
        detectedLinkType = 'youtube';
      }

      const examToSave: TermExamItem = {
        id: editingExamId || `exam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        termName: finalTermName,
        examName: formData.examName.trim(),
        subject: formData.subject || 'பொது',
        grades: formData.grades,
        examDate: formData.examDate || new Date().toISOString().split('T')[0],
        startTime: formData.startTime || '',
        endTime: formData.endTime || '',
        duration: formData.duration || '',
        totalMarks: Number(formData.totalMarks) || 100,
        passMarks: Number(formData.passMarks) || 35,
        examLink: formData.examLink || '',
        linkType: detectedLinkType,
        thumbnail: formData.thumbnail || '',
        paperPdf: formData.paperPdf || '',
        solutionPdf: formData.solutionPdf || '',
        instructions: formData.instructions || '',
        createdAt: new Date().toISOString()
      };

      let updatedExams: TermExamItem[];
      if (editingExamId) {
        updatedExams = exams.map(ex => ex.id === editingExamId ? examToSave : ex);
      } else {
        updatedExams = [examToSave, ...exams];
      }

      await saveTermExams(updatedExams);
      setExams(updatedExams);

      // Dispatch real-time targeted notification to all selected grades
      const directUrl = `${window.location.origin}/exam/${examToSave.id}`;
      const notificationPromises = formData.grades.map(grade => 
        addNotification({
          grade: grade,
          title: `📝 புதிய பரீட்சை: ${examToSave.examName}`,
          message: `${finalTermName} - ${examToSave.examName} பரீட்சை வினாத்தாள் சேர்க்கப்பட்டுள்ளது. நேரடி இணைப்பு: ${directUrl}`,
          type: 'exam',
          createdAt: new Date().toISOString()
        })
      );
      await Promise.all(notificationPromises);

      // Trigger DB update event
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'termExams' } }));

      // Automatically show the Share & Direct Link Modal
      setShareExamModal(examToSave);
      
      setFormData(initialFormState);
      setCustomTerm('');
      setEditingExamId(null);
      setView('list');
    } catch (err) {
      console.error("Error saving term exam:", err);
      alert("பரீட்சையைச் சேமிப்பதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExam = (exam: TermExamItem) => {
    setFormData({
      termName: exam.termName,
      examName: exam.examName,
      subject: exam.subject,
      grades: exam.grades,
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passMarks: exam.passMarks,
      examLink: exam.examLink,
      linkType: exam.linkType,
      thumbnail: exam.thumbnail,
      paperPdf: exam.paperPdf,
      solutionPdf: exam.solutionPdf,
      instructions: exam.instructions
    });
    if (!POPULAR_TERMS.includes(exam.termName)) {
      setCustomTerm(exam.termName);
    }
    setEditingExamId(exam.id);
    setView('add');
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm("இந்தப் பரீட்சையை நிச்சயமாக நீக்க விரும்புகிறீர்களா?")) return;
    const updated = exams.filter(e => e.id !== id);
    await saveTermExams(updated);
    setExams(updated);
    window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'termExams' } }));
    alert("பரீட்சை நீக்கப்பட்டது.");
  };

  // Filtered exams for list view
  const filteredExams = exams.filter(exam => {
    const matchesGrade = selectedGradeFilter === 'All' 
      ? true 
      : (exam.grades.includes(selectedGradeFilter) || exam.grades.includes('All'));
    const matchesSearch = !searchTerm || 
      exam.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.termName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.subject && exam.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesGrade && matchesSearch;
  });

  // Calculate grade letter from percentage
  const getGradeLetter = (obtained: number, total: number) => {
    const percent = (obtained / total) * 100;
    if (percent >= 75) return { text: 'A', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (percent >= 65) return { text: 'B', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (percent >= 50) return { text: 'C', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    if (percent >= 35) return { text: 'S', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { text: 'W', color: 'bg-rose-100 text-rose-800 border-rose-200' };
  };

  // Save or edit mark on behalf of student
  const handleSaveStudentMark = async () => {
    if (!editingSubmission) return;

    const obt = Number(editingSubmission.obtained) || 0;
    const tot = Number(editingSubmission.total) || 100;
    const gradeLetter = getGradeLetter(obt, tot).text;
    const percentage = (obt / tot) * 100;

    const newSub: ExamSubmissionItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      examId: editingSubmission.exam.id,
      examName: editingSubmission.exam.examName,
      termName: editingSubmission.exam.termName,
      subject: editingSubmission.exam.subject || 'பொது',
      studentId: editingSubmission.student.id,
      studentName: editingSubmission.student.name,
      rollNo: editingSubmission.student.rollNo || editingSubmission.student.id,
      grade: editingSubmission.student.grade,
      obtained: obt,
      total: tot,
      percentage: percentage,
      gradeLetter: gradeLetter,
      remarks: editingSubmission.remarks || 'Admin Updated',
      status: 'verified',
      submittedAt: new Date().toISOString()
    };

    // Filter out previous submission if existed
    const updatedSubmissions = [
      newSub,
      ...submissions.filter(s => !(s.examId === editingSubmission.exam.id && s.studentId === editingSubmission.student.id))
    ];

    await saveExamSubmissions(updatedSubmissions);
    setSubmissions(updatedSubmissions);

    // Also sync to global examMarks for report card generation!
    try {
      const allMarks = await getExamMarks();
      const updatedMarks = [
        {
          id: newSub.id,
          studentId: newSub.studentId,
          grade: newSub.grade,
          exam: newSub.examName,
          subject: newSub.subject,
          obtained: obt,
          total: tot,
          remarks: newSub.remarks,
          date: newSub.submittedAt.split('T')[0]
        },
        ...allMarks.filter((m: any) => !(m.studentId === newSub.studentId && m.exam === newSub.examName && m.subject === newSub.subject))
      ];
      await saveExamMarks(updatedMarks);
    } catch (e) {
      console.error("Error syncing to examMarks:", e);
    }

    window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'examSubmissions' } }));
    setEditingSubmission(null);
    alert("மாணவரின் மதிப்பெண் வெற்றிகரமாகப் பதிவுசெய்யப்பட்டது!");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 rounded-3xl text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/10 shadow-inner">
              <Award size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-indigo-300 uppercase">Examination System</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-indigo-950">Online & Term</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">பரீட்சைகள் மேலாண்மை (Term Exams)</h1>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                பரீட்சை வினாத்தாள்கள், கூகுள் ஃபார்ம்ஸ், வெப் போஸ்ட் மற்றும் முடிவுகள் ஒருங்கே.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => {
                setFormData(initialFormState);
                setEditingExamId(null);
                setView('add');
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                view === 'add'
                  ? 'bg-amber-400 text-indigo-950 shadow-amber-400/20'
                  : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-md'
              }`}
            >
              <Plus size={18} /> புதிய பரீட்சை (Add Exam)
            </button>
            <button 
              onClick={() => {
                setView('list');
                setSelectedExamForSubmissions(null);
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                view === 'list'
                  ? 'bg-amber-400 text-indigo-950 shadow-amber-400/20'
                  : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-md'
              }`}
            >
              <Layers size={18} /> பரீட்சைகள் பட்டியல் ({exams.length})
            </button>
            {selectedExamForSubmissions && (
              <button 
                onClick={() => setView('submissions')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                  view === 'submissions'
                    ? 'bg-amber-400 text-indigo-950 shadow-amber-400/20'
                    : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-md'
                }`}
              >
                <Users size={18} /> மாணவர் புள்ளிகள்
              </button>
            )}
            <Link
              to="/admin/grade-performance"
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95"
            >
              <BarChart3 size={18} /> வகுப்பு பகுப்பாய்வு (Grades 6-11)
            </Link>
          </div>
        </div>
      </div>

      {/* VIEW: ADD / EDIT EXAM */}
      {view === 'add' && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('list')}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                title="Back to list"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  {editingExamId ? "பரீட்சையைத் திருத்துக (Edit Exam)" : "புதிய பரீட்சை சேர்த்தல் (Add New Exam)"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  பல வகுப்புகளுக்கு ஒரே நேரத்தில் பரீட்சை இணைப்புகளையும், வினாத்தாள்களையும் சேர்க்கலாம்.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              Targeted Notifications Active
            </span>
          </div>

          <form onSubmit={handleSaveExam} className="p-6 sm:p-8 space-y-8">
            {/* 1. SELECT CLASSES / GRADES (MULTI-SELECT) */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-sm font-black text-slate-800 flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    வகுப்புகள் தெரிவு (Select Classes / Grades) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">
                    இப்பரீட்சை எந்தெந்த வகுப்பு மாணவர்களுக்குரியதோ அவற்றை தெரிவுசெய்யவும்.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllGrades}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 self-start sm:self-auto transition-colors"
                >
                  {formData.grades?.length === GRADES_LIST.length ? "அனைத்தையும் நீக்கு (Deselect All)" : "அனைத்து வகுப்புகளும் (Select All)"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 pt-2">
                {GRADES_LIST.map((grade) => {
                  const isChecked = formData.grades?.includes(grade);
                  return (
                    <button
                      type="button"
                      key={grade}
                      onClick={() => handleGradeToggle(grade)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{grade}</span>
                      {isChecked && <Check size={14} className="ml-1 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] font-bold text-indigo-700 pt-1">
                தெரிவுசெய்யப்பட்டவை: {formData.grades && formData.grades.length > 0 ? formData.grades.join(', ') : 'எதுவும் தெரிவுசெய்யப்படவில்லை'}
              </div>
            </div>

            {/* 2. TERM NAME & EXAM NAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  தவணைப் பெயர் (Term / Category) <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select 
                    value={formData.termName}
                    onChange={(e) => {
                      setFormData({ ...formData, termName: e.target.value });
                      if (e.target.value !== "Custom") setCustomTerm('');
                    }}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                  >
                    {POPULAR_TERMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Custom">வேறு தனிப்பயன் பெயர் (Custom Term Name)...</option>
                  </select>

                  {formData.termName === "Custom" && (
                    <input 
                      type="text"
                      placeholder="எ.கா: சிறப்பு மாதிரிப் பரீட்சை 2026"
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      className="w-full border-2 border-indigo-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  பரீட்சையின் பெயர் (Exam Title) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="எ.கா: தமிழ் மொழி முதலாம் தவணைப் பரீட்சை - 2026"
                  value={formData.examName}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 3. SUBJECT & TIMINGS & TOTAL MARKS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">பாடம் (Subject)</label>
                <input 
                  type="text"
                  placeholder="எ.கா: தமிழ் / விஞ்ஞானம்"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">பரீட்சைத் திகதி (Exam Date)</label>
                <input 
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">கால அளவு (Duration)</label>
                <input 
                  type="text"
                  placeholder="எ.கா: 1 மணி 30 நிமிடம்"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">மொத்தப் புள்ளிகள் (Total Marks)</label>
                <input 
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 4. EXAM LINK & THUMBNAIL POSTER */}
            <div className="bg-indigo-50/40 rounded-2xl p-6 border border-indigo-100 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <LinkIcon className="text-indigo-600" size={18} />
                  <h3 className="text-sm font-black text-slate-800">
                    பரீட்சை இணைப்பு & போஸ்டர் (Exam Links & Media)
                  </h3>
                </div>
                {webPosts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowWebPostModal(true)}
                    className="text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <BookOpen size={14} /> இணையப் பதிவிலிருந்து தெரிவுசெய் (Select from Web Posts)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exam URL */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    பரீட்சை இணைய முகவரி (Google Form / Drive / Web Post / YouTube / Online Test URL)
                  </label>
                  <input 
                    type="url"
                    placeholder="https://docs.google.com/forms/d/... அல்லது இணையதள இணைப்பு"
                    value={formData.examLink}
                    onChange={(e) => setFormData({ ...formData, examLink: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    💡 மாணவர்கள் செயலியில் இருந்து வெளியேறாமல் இன்-ஆப் (In-App) முறையில் நேரடியாகத் தேர்வு எழுதலாம்.
                  </p>
                </div>

                {/* Thumbnail Image URL & Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    போஸ்டர் / முகப்புப் படம் (Thumbnail / Poster Image)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="படத்தின் இணைய முகவரி (Image URL)"
                      value={formData.thumbnail}
                      onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                      className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                    />
                    <label className="cursor-pointer bg-white border-2 border-slate-200 hover:border-indigo-400 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0">
                      <ImageIcon size={14} /> படம் பதிவேற்று
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'thumbnail')} 
                      />
                    </label>
                  </div>
                  {formData.thumbnail && (
                    <div className="mt-2 relative w-32 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <img 
                        src={formData.thumbnail} 
                        alt="Thumbnail Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. PDF QUESTION PAPER & SOLUTION PAPER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-indigo-100/60">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-600" />
                    வினாத்தாள் PDF (Question Paper PDF / Link)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="PDF Drive Link அல்லது File Upload செய்யவும்"
                      value={formData.paperPdf?.startsWith('data:') ? 'கோப்பு பதிவேற்றப்பட்டது (Uploaded File)' : formData.paperPdf}
                      onChange={(e) => setFormData({ ...formData, paperPdf: e.target.value })}
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                    <label className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors">
                      PDF பதிவேற்று
                      <input 
                        type="file" 
                        accept="application/pdf,image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'paperPdf')} 
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-600" />
                    விடைத்தாள் / தீர்வுத்தாள் PDF (Solution Paper PDF / Link)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Solution Paper Link அல்லது File Upload செய்யவும்"
                      value={formData.solutionPdf?.startsWith('data:') ? 'கோப்பு பதிவேற்றப்பட்டது (Uploaded File)' : formData.solutionPdf}
                      onChange={(e) => setFormData({ ...formData, solutionPdf: e.target.value })}
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                    <label className="cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors">
                      PDF பதிவேற்று
                      <input 
                        type="file" 
                        accept="application/pdf,image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'solutionPdf')} 
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. INSTRUCTIONS */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                மாணவர்களுக்கான அறிவுறுத்தல்கள் (Instructions for Students)
              </label>
              <textarea 
                rows={3}
                placeholder="எ.கா: வினாக்களை முழுமையாக வாசித்து விடையளிக்கவும். பரீட்சை முடிந்தவுடன் நீங்கள் பெற்ற புள்ளிகளை இங்கே பதிவிடவும்."
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Send size={14} className="text-indigo-600" />
                <span>பரீட்சை சேர்க்கப்பட்டவுடன் மாணவர்களுக்கு உடனடி நோட்டிபிகேஷன் அனுப்பப்படும்.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                >
                  ரத்து செய் (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> சேமிக்கப்படுகிறது...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> {editingExamId ? "பரீட்சையைப் புதுப்பி (Update)" : "பரீட்சையைச் சேமித்து வெளியிடு (Publish Exam)"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: MANAGE EXAMS LIST */}
      {view === 'list' && (
        <div className="space-y-6">
          {/* Filters and Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="பரீட்சை அல்லது தவணைப் பெயரைத் தேடுக..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50"
              />
            </div>

            {/* Grade Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              <button
                onClick={() => setSelectedGradeFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGradeFilter === 'All'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Grades ({exams.length})
              </button>
              {GRADES_LIST.map(grade => {
                const count = exams.filter(e => e.grades.includes(grade) || e.grades.includes('All')).length;
                return (
                  <button
                    key={grade}
                    onClick={() => setSelectedGradeFilter(grade)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedGradeFilter === grade
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {grade} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exams Grid */}
          {filteredExams.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 border-dashed space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
                <Award size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">பரீட்சைகள் எதுவும் இல்லை</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  நீங்கள் தேர்ந்தெடுத்த வகுப்பிற்கு இதுவரை பரீட்சைகள் சேர்க்கப்படவில்லை. "புதிய பரீட்சை" பொத்தானைக் கிளிக் செய்து பரீட்சைகளைச் சேர்க்கவும்.
                </p>
              </div>
              <button
                onClick={() => {
                  setFormData(initialFormState);
                  setView('add');
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2"
              >
                <Plus size={16} /> புதிய பரீட்சை சேர்க்க
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const examSubmissions = submissions.filter(s => s.examId === exam.id);
                const hasSubmissions = examSubmissions.length > 0;

                return (
                  <div 
                    key={exam.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group"
                  >
                    {/* Poster Thumbnail or Header Banner */}
                    <div className="relative h-44 bg-gradient-to-br from-indigo-900 to-blue-900 overflow-hidden shrink-0">
                      {exam.thumbnail ? (
                        <img 
                          src={exam.thumbnail} 
                          alt={exam.examName} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white/90">
                          <Award size={48} className="text-amber-400 mb-2 opacity-80" />
                          <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">{exam.subject}</span>
                          <span className="text-sm font-black line-clamp-1 mt-1">{exam.termName}</span>
                        </div>
                      )}
                      
                      {/* Floating Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
                        <span className="bg-indigo-900/90 backdrop-blur-md text-amber-300 border border-amber-300/30 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                          {exam.termName}
                        </span>
                      </div>

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

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-black text-slate-800 text-base leading-snug line-clamp-2 hover:text-indigo-600 transition-colors">
                          {exam.examName}
                        </h3>

                        {/* Grade badges */}
                        <div className="flex flex-wrap gap-1 items-center">
                          {exam.grades.slice(0, 4).map(g => (
                            <span key={g} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                              {g}
                            </span>
                          ))}
                          {exam.grades.length > 4 && (
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                              +{exam.grades.length - 4} more
                            </span>
                          )}
                        </div>

                        {exam.instructions && (
                          <p className="text-xs text-slate-500 line-clamp-2 italic pt-1">
                            "{exam.instructions}"
                          </p>
                        )}
                      </div>

                      {/* Submissions & Actions */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setSelectedExamForSubmissions(exam);
                              setView('submissions');
                            }}
                            className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors"
                          >
                            <Users size={14} /> 
                            <span>{examSubmissions.length} மாணவர்கள் சமர்ப்பித்துள்ளனர்</span>
                          </button>

                          <span className="text-xs font-bold text-slate-500">
                            புள்ளிகள்: {exam.totalMarks || 100}
                          </span>
                        </div>

                        {/* Buttons Bar */}
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            onClick={() => setShareExamModal(exam)}
                            className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-200"
                            title="Share Direct Exam Link"
                          >
                            <Share2 size={13} /> லிங்க்
                          </button>
                          <button
                            onClick={() => setPreviewExam(exam)}
                            className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            title="Preview Exam"
                          >
                            <Eye size={13} /> முன்னோட்டம்
                          </button>
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            title="Edit Exam"
                          >
                            <Edit size={13} /> திருத்து
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            title="Delete Exam"
                          >
                            <Trash2 size={13} /> நீக்கு
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: STUDENT SUBMISSIONS & MARKS BREAKDOWN */}
      {view === 'submissions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('list')}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {selectedExamForSubmissions?.termName || "Term Exam"}
                  </span>
                  <h2 className="text-2xl font-black text-slate-800">
                    {selectedExamForSubmissions ? selectedExamForSubmissions.examName : "மாணவர்களின் தேர்வுப் புள்ளிகள் (Exam Submissions)"}
                  </h2>
                </div>
              </div>

              {/* Exam Selector if available */}
              <select 
                value={selectedExamForSubmissions?.id || ''}
                onChange={(e) => {
                  const found = exams.find(ex => ex.id === e.target.value);
                  if (found) setSelectedExamForSubmissions(found);
                }}
                className="border-2 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs sm:text-sm text-slate-800 bg-white"
              >
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.examName} ({ex.termName})</option>
                ))}
              </select>
            </div>

            {/* Grade Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setSelectedGradeFilter('All')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGradeFilter === 'All'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Selected Grades
              </button>
              {(selectedExamForSubmissions?.grades || GRADES_LIST).map(grade => (
                <button
                  key={grade}
                  onClick={() => setSelectedGradeFilter(grade)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedGradeFilter === grade
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>

            {/* Statistical summary */}
            {(() => {
              const currentExamId = selectedExamForSubmissions?.id;
              const currentGrade = selectedGradeFilter;
              
              // Eligible students
              const eligibleStudents = students.filter(s => {
                if (selectedExamForSubmissions) {
                  const inGrade = selectedExamForSubmissions.grades.includes(s.grade);
                  return currentGrade === 'All' ? inGrade : s.grade === currentGrade;
                }
                return currentGrade === 'All' ? true : s.grade === currentGrade;
              });

              // Submissions for this exam
              const examSubs = submissions.filter(s => {
                const matchesExam = currentExamId ? s.examId === currentExamId : true;
                const matchesG = currentGrade === 'All' ? true : s.grade === currentGrade;
                return matchesExam && matchesG;
              });

              const submittedStudentIds = new Set(examSubs.map(s => s.studentId));
              const avgMark = examSubs.length > 0 
                ? (examSubs.reduce((sum, s) => sum + Number(s.obtained), 0) / examSubs.length).toFixed(1)
                : '0';
              const maxMark = examSubs.length > 0
                ? Math.max(...examSubs.map(s => Number(s.obtained)))
                : 0;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-700">மொத்த மாணவர்கள்</p>
                      <p className="text-2xl font-black text-indigo-950 mt-1">{eligibleStudents.length}</p>
                    </div>
                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-700">புள்ளிகள் சமர்ப்பித்தோர்</p>
                      <p className="text-2xl font-black text-emerald-950 mt-1">{examSubs.length}</p>
                    </div>
                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-700">சராசரிப் புள்ளி (Average)</p>
                      <p className="text-2xl font-black text-amber-950 mt-1">{avgMark}</p>
                    </div>
                    <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
                      <p className="text-xs font-bold text-purple-700">உயர்ந்த புள்ளி (Highest)</p>
                      <p className="text-2xl font-black text-purple-950 mt-1">{maxMark}</p>
                    </div>
                  </div>

                  {/* Student Submission Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                          <th className="py-3.5 px-4">சுட்டெண் (Roll No)</th>
                          <th className="py-3.5 px-4">மாணவர் பெயர் (Name)</th>
                          <th className="py-3.5 px-4">வகுப்பு (Grade)</th>
                          <th className="py-3.5 px-4">பெற்ற புள்ளி (Mark)</th>
                          <th className="py-3.5 px-4">தரம் (Grade)</th>
                          <th className="py-3.5 px-4">நிலை (Status)</th>
                          <th className="py-3.5 px-4">திகதி (Date)</th>
                          <th className="py-3.5 px-4 text-right">நடவடிக்கை (Action)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {eligibleStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                              மாணவர்கள் எவரும் பதிவுசெய்யப்படவில்லை.
                            </td>
                          </tr>
                        ) : (
                          eligibleStudents.map((st) => {
                            const sub = examSubs.find(s => s.studentId === st.id);
                            const hasSubmitted = Boolean(sub);

                            const gl = sub ? getGradeLetter(sub.obtained, sub.total) : null;

                            return (
                              <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                                  {st.rollNo || st.id.substring(0, 6)}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  {st.name}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-indigo-700">
                                  {st.grade}
                                </td>
                                <td className="py-3.5 px-4">
                                  {hasSubmitted ? (
                                    <span className="text-base font-black text-indigo-600">
                                      {sub?.obtained} <span className="text-xs font-normal text-slate-400">/{sub?.total}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">சமர்ப்பிக்கவில்லை</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {gl ? (
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-black border ${gl.color}`}>
                                      {gl.text} ({sub?.percentage.toFixed(0)}%)
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {hasSubmitted ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                      <CheckCircle2 size={12} /> சமர்ப்பிக்கப்பட்டது
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                      <Clock size={12} /> நிலுவையில்
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 text-xs">
                                  {sub ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      if (!selectedExamForSubmissions) return;
                                      setEditingSubmission({
                                        student: st,
                                        exam: selectedExamForSubmissions,
                                        obtained: sub ? String(sub.obtained) : '',
                                        total: sub ? String(sub.total) : String(selectedExamForSubmissions.totalMarks || 100),
                                        remarks: sub?.remarks || ''
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors"
                                  >
                                    {hasSubmitted ? "புள்ளியை மாற்று" : "புள்ளி உள்ளிடு"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: SELECT WEB POST MODAL */}
      {showWebPostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                வெப் போஸ்ட்டைத் தெரிவுசெய் (Select Web Post)
              </h3>
              <button 
                onClick={() => setShowWebPostModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ஏற்கனவே வெளியிடப்பட்ட வெப் போஸ்ட்டைத் தெரிவுசெய்தால், அதன் இணைய முகவரி மற்றும் போஸ்டர் படம் தானாகவே இப்பரீட்சைக்கு நிரப்பப்படும்.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {webPosts.map((post) => (
                <div 
                  key={post.id}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      examName: prev.examName || post.title,
                      examLink: post.url || prev.examLink,
                      thumbnail: post.thumbnail || prev.thumbnail,
                      linkType: 'webpost',
                      subject: post.subject || prev.subject
                    }));
                    setShowWebPostModal(false);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer flex items-center gap-4"
                >
                  {post.thumbnail ? (
                    <img src={post.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <BookOpen size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{post.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{post.url || "இணையதளம் / Web View"}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                        {post.grade || "All Grades"}
                      </span>
                      {post.subject && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {post.subject}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shrink-0">
                    தேர்வுசெய்
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW EXAM IN-APP */}
      {previewExam && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg line-clamp-1">{previewExam.examName}</h3>
                  <p className="text-xs text-indigo-200">{previewExam.termName} • {previewExam.subject} • {previewExam.grades.join(', ')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewExam.examLink && (
                  <a 
                    href={previewExam.examLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={14} /> புதிய தாவலில் (New Tab)
                  </a>
                )}
                <button 
                  onClick={() => setPreviewExam(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Embedded In-App View */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {previewExam.examLink ? (
                <iframe 
                  src={formatEmbedUrl(previewExam.examLink)}
                  title={previewExam.examName}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewExam.paperPdf ? (
                <iframe 
                  src={previewExam.paperPdf}
                  title="Question Paper PDF"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle size={48} className="text-amber-500 mb-3" />
                  <p className="text-slate-700 font-bold">இணைப்பு எதுவும் சேர்க்கப்படவில்லை.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN EDIT STUDENT MARK */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-lg">புள்ளி உள்ளீடு / திருத்தம்</h3>
                <p className="text-xs text-slate-500">{editingSubmission.student.name} ({editingSubmission.student.grade})</p>
              </div>
              <button 
                onClick={() => setEditingSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">பெற்ற மதிப்பெண் (Obtained Marks)</label>
                <input 
                  type="number"
                  placeholder="85"
                  value={editingSubmission.obtained}
                  onChange={(e) => setEditingSubmission({ ...editingSubmission, obtained: e.target.value })}
                  className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 font-black text-indigo-700 text-xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">மொத்த மதிப்பெண் (Total Marks)</label>
                <input 
                  type="number"
                  value={editingSubmission.total}
                  onChange={(e) => setEditingSubmission({ ...editingSubmission, total: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">குறிப்புகள் (Remarks / Notes)</label>
                <input 
                  type="text"
                  placeholder="எ.கா: சிறப்புத் தேர்ச்சி"
                  value={editingSubmission.remarks}
                  onChange={(e) => setEditingSubmission({ ...editingSubmission, remarks: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setEditingSubmission(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                ரத்து செய்
              </button>
              <button 
                type="button"
                onClick={handleSaveStudentMark}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                சேமிக்க (Save Mark)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHARE DIRECT EXAM LINK */}
      {shareExamModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 relative">
              <button
                onClick={() => setShareExamModal(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-indigo-950 flex items-center justify-center mb-3 shadow-lg shadow-amber-400/20 font-black">
                <Share2 size={24} />
              </div>
              <h3 className="font-black text-xl text-white">பரீட்சை நேரடி இணைப்பு (Direct Exam Link)</h3>
              <p className="text-xs text-indigo-200 mt-1">
                மாணவர்கள் இந்த லிங்க்கை கிளிக் செய்தவுடன் நேரடியாக ஆப் அல்லது பிரவுசரில் தேர்வு எழுதலாம்.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Exam summary card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    {shareExamModal.termName}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    மொத்தப் புள்ளிகள்: {shareExamModal.totalMarks || 100}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-base">{shareExamModal.examName}</h4>
                <p className="text-xs text-slate-500">
                  பாடம்: <strong className="text-slate-700">{shareExamModal.subject}</strong> • வகுப்புகள்: <strong className="text-slate-700">{shareExamModal.grades.join(', ')}</strong>
                </p>
              </div>

              {/* Direct Link Input Box */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <LinkIcon size={14} className="text-indigo-600" />
                  மாணவர்களுக்கான நேரடி இணைய இணைப்பு:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getDirectExamUrl(shareExamModal.id)}
                    className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleCopyExamLink(shareExamModal.id)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  >
                    {copiedExamId === shareExamModal.id ? (
                      <>
                        <Check size={14} className="text-emerald-300" /> காப்பி ஆனது!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> காப்பி செய்
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleShareToWhatsApp(shareExamModal)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Share2 size={16} /> WhatsApp இல் மாணவர் குழுக்களுக்குப் பகிரவும்
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      window.open(getDirectExamUrl(shareExamModal.id), '_blank');
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={14} /> முன்னோட்டம் பார் (Open)
                  </button>
                  <button
                    onClick={() => setShareExamModal(null)}
                    className="py-2.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    மூடுக (Close)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
