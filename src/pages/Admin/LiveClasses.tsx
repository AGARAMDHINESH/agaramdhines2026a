import React, { useState, useEffect, useMemo } from 'react';
import {
  getZoomLinks,
  saveZoomLinks,
  deleteZoomLink,
  formatZoomLinkRemaining,
  getSubjects,
  saveSubjects,
  getClasses,
  getStudents,
  getCourses,
  getStaffs,
  addNotification,
  isGradeMatching,
  sanitizeSubjectList
} from '../../lib/db';
import {
  isSubjectValidForGrade,
  doesItemMatchStudentSubjects
} from '../../components/RecordingSection';
import {
  Video,
  Trash2,
  ArrowLeft,
  Plus,
  ExternalLink,
  BookOpen,
  Calendar,
  Clock,
  Key,
  ShieldCheck,
  Users,
  CheckCircle2
} from 'lucide-react';
import CountdownTimer from '../../components/CountdownTimer';

const GRADES = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05",
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10",
  "தரம் 11", "தரம் 12", "தரம் 13"
];

export default function LiveClasses() {
  const [links, setLinks] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    subjects: [] as string[],
    title: '',
    link: '',
    datetime: '',
    hostKey: '',
    meetingId: '',
    passcode: ''
  });

  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [showCustomSubjectInput, setShowCustomSubjectInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadAllData = async () => {
    const [linksData, subsData, clsData, stuData, crsData, stfData] = await Promise.all([
      getZoomLinks(),
      getSubjects(),
      getClasses(),
      getStudents(),
      getCourses(),
      getStaffs()
    ]);
    setLinks(Array.isArray(linksData) ? linksData : []);
    setSubjects(Array.isArray(subsData) ? subsData : []);
    setClasses(Array.isArray(clsData) ? clsData : []);
    setStudents(Array.isArray(stuData) ? stuData : []);
    setCourses(Array.isArray(crsData) ? crsData : []);
    setStaffs(Array.isArray(stfData) ? stfData : []);
  };

  useEffect(() => {
    loadAllData();

    const handleDbUpdate = (e: any) => {
      const key = e.detail?.key;
      if (!key || ['zoomLinks', 'subjects', 'classes', 'students', 'courses', 'staffs'].includes(key)) {
        loadAllData();
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);

    // Periodic auto-check every 30 seconds to clean up expired links (>24 hours)
    const interval = setInterval(() => {
      getZoomLinks().then(data => setLinks(Array.isArray(data) ? data : []));
    }, 30000);

    return () => {
      window.removeEventListener('db_updated', handleDbUpdate);
      clearInterval(interval);
    };
  }, []);

  // Reset selected subjects when switching grades
  useEffect(() => {
    setFormData(prev => ({ ...prev, subject: '', subjects: [] }));
    setShowCustomSubjectInput(false);
    setCustomSubjectInput('');
  }, [selectedGrade]);

  // All students in the currently selected grade
  const gradeStudents = useMemo(() => {
    if (!selectedGrade) return [];
    return students.filter(s => s && isGradeMatching(s.grade, selectedGrade));
  }, [students, selectedGrade]);

  // Class fallback subjects for selectedGrade
  const gradeClassDefaultSubjects = useMemo(() => {
    if (!selectedGrade) return [];
    return classes
      .filter(c => c && isGradeMatching(c.name, selectedGrade))
      .flatMap(c => Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []))
      .map(s => String(s || '').trim())
      .filter(Boolean);
  }, [classes, selectedGrade]);

  // Resolve ALL available subjects for the selected grade from every source
  const availableSubjectsForGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const seen = new Map<string, string>();
    const gradeNumStr = selectedGrade.replace(/[^0-9]/g, '');

    const addCandidate = (raw: any, enforceGradeCheck = false) => {
      if (!raw) return;
      let clean = String(typeof raw === 'string' ? raw : (raw.name || '')).replace(/\s+/g, ' ').trim();
      if (!clean) return;

      const lower = clean.toLowerCase();
      // Ignore raw grade strings mistakenly stored as subjects
      if (lower.startsWith('தரம்') || lower.startsWith('grade')) return;
      if (gradeNumStr && (lower === gradeNumStr || lower === `0${gradeNumStr}`)) return;

      // Normalize canonical names
      if (lower === 'tamil') clean = 'தமிழ்';
      const sanitizedList = sanitizeSubjectList([clean]);
      clean = sanitizedList[0] || clean;

      if (enforceGradeCheck && !isSubjectValidForGrade(clean, selectedGrade)) {
        return;
      }

      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, clean);
      }
    };

    // 1. Subjects explicitly assigned to matching Class(es)
    gradeClassDefaultSubjects.forEach(s => addCandidate(s, false));

    // 2. Subjects enrolled on any student in this grade
    gradeStudents.forEach(st => {
      const stuSubs = [
        ...(Array.isArray(st.subjects) ? st.subjects : []),
        ...(Array.isArray(st.enrolledClasses) ? st.enrolledClasses : [])
      ];
      stuSubs.forEach(s => addCandidate(s, false));
    });

    // 3. Subjects assigned to Staff for this grade
    staffs.forEach(stf => {
      if (Array.isArray(stf.assignedClasses)) {
        stf.assignedClasses.forEach((ac: any) => {
          if (ac && isGradeMatching(ac.grade, selectedGrade) && ac.subject) {
            addCandidate(ac.subject, false);
          }
        });
      }
    });

    // 4. Subjects present in Courses for this grade
    courses.forEach(c => {
      if (c && isGradeMatching(c.grade, selectedGrade)) {
        if (c.subject) addCandidate(c.subject, false);
        if (Array.isArray(c.subjects)) c.subjects.forEach((s: any) => addCandidate(s, false));
      }
    });

    // 5. Subjects already used in existing Zoom links for this grade
    links.forEach(l => {
      if (l && isGradeMatching(l.grade, selectedGrade)) {
        if (l.subject) addCandidate(l.subject, false);
        if (Array.isArray(l.subjects)) l.subjects.forEach((s: any) => addCandidate(s, false));
      }
    });

    // 6. All subjects from Academic -> Manage Subjects (filtered for grade appropriateness)
    subjects.forEach(s => {
      if (!s) return;
      const subName = typeof s === 'string' ? s : s.name;
      if (!subName) return;
      addCandidate(subName, true);
    });

    // 7. Also include any subject already selected in formData so it's never lost
    formData.subjects.forEach(s => addCandidate(s, false));

    // Sort cleanly with "தமிழ்" first
    return Array.from(seen.values()).sort((a, b) => {
      if (a === 'தமிழ்') return -1;
      if (b === 'தமிழ்') return 1;
      return a.localeCompare(b, 'ta');
    });
  }, [selectedGrade, gradeClassDefaultSubjects, gradeStudents, staffs, courses, links, subjects, formData.subjects]);

  // Resolve a student's effective subjects (matching Student Dashboard logic)
  const getStudentEffectiveSubjects = (st: any): string[] => {
    const raw = [
      ...(Array.isArray(st.subjects) ? st.subjects : []),
      ...(Array.isArray(st.enrolledClasses) ? st.enrolledClasses : [])
    ].map(s => String(s || '').trim()).filter(Boolean);

    if (raw.length > 0) return raw;
    return gradeClassDefaultSubjects;
  };

  // Count how many students in selectedGrade have each subject
  const studentCountBySubject = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!selectedGrade) return counts;

    availableSubjectsForGrade.forEach(sub => {
      const mockItem = { subject: sub, title: sub, grade: selectedGrade, date: '' } as any;
      counts[sub] = gradeStudents.filter(st => {
        const effSubs = getStudentEffectiveSubjects(st);
        return doesItemMatchStudentSubjects(mockItem, effSubs);
      }).length;
    });
    return counts;
  }, [availableSubjectsForGrade, gradeStudents, selectedGrade, gradeClassDefaultSubjects]);

  // Count unique students in selectedGrade matching ANY currently checked subject(s)
  const targetedStudentCount = useMemo(() => {
    if (!selectedGrade || formData.subjects.length === 0) return 0;
    const mockItem = {
      subject: formData.subjects[0],
      subjects: formData.subjects,
      title: formData.title || formData.subjects[0],
      grade: selectedGrade,
      date: ''
    } as any;

    return gradeStudents.filter(st => {
      const effSubs = getStudentEffectiveSubjects(st);
      return doesItemMatchStudentSubjects(mockItem, effSubs);
    }).length;
  }, [selectedGrade, formData.subjects, formData.title, gradeStudents, gradeClassDefaultSubjects]);

  const handleToggleSubject = (subName: string) => {
    setFormData(prev => {
      const exists = prev.subjects.includes(subName);
      const updatedSubjects = exists
        ? prev.subjects.filter(s => s !== subName)
        : [...prev.subjects, subName];
      return {
        ...prev,
        subjects: updatedSubjects,
        subject: updatedSubjects[0] || ''
      };
    });
  };

  const handleAddCustomSubject = async () => {
    const clean = customSubjectInput.trim();
    if (!clean) return;

    // Save into global subjects list if not already present so it's preserved everywhere
    const existsInDb = subjects.some(s => String(s?.name || '').trim().toLowerCase() === clean.toLowerCase());
    if (!existsInDb) {
      const newSubObj = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: clean,
        category: 'Sub',
        fee: '0',
        grade: selectedGrade || undefined
      };
      const updatedDbSubjects = [...subjects, newSubObj];
      setSubjects(updatedDbSubjects);
      await saveSubjects(updatedDbSubjects);
    }

    if (!formData.subjects.includes(clean)) {
      const updated = [...formData.subjects, clean];
      setFormData(prev => ({
        ...prev,
        subjects: updated,
        subject: updated[0] || clean
      }));
    }

    setCustomSubjectInput('');
    setShowCustomSubjectInput(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubjects = formData.subjects.length > 0
      ? formData.subjects
      : (formData.subject ? [formData.subject] : []);

    if (targetSubjects.length === 0 || !formData.title || !formData.link || !formData.datetime) {
      alert("தயவுசெய்து குறைந்தது ஒரு பாடம் (Subject), தலைப்பு (Title), Zoom Link மற்றும் தேதி/நேரத்தை உள்ளிடவும்!");
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const scheduledMs = formData.datetime ? new Date(formData.datetime).getTime() : Date.now();
      const refMs = Math.max(Date.now(), isNaN(scheduledMs) ? Date.now() : scheduledMs);
      const expiresAt = new Date(refMs + (24 * 60 * 60 * 1000)).toISOString();

      const newLink = {
        id: "zoom_" + Date.now().toString(),
        grade: selectedGrade,
        subject: targetSubjects[0],
        subjects: targetSubjects,
        title: formData.title,
        link: formData.link.trim(),
        datetime: formData.datetime,
        hostKey: formData.hostKey.trim(),
        meetingId: formData.meetingId.trim(),
        passcode: formData.passcode.trim(),
        createdAt: nowIso,
        dateAdded: nowIso,
        autoDeleteIn24h: true,
        expiresAt: expiresAt,
        updatedAt: nowIso
      };

      const currentLinks = await getZoomLinks();
      const updatedLinks = [newLink, ...currentLinks.filter(l => l.id !== newLink.id)];
      setLinks(updatedLinks);
      await saveZoomLinks(updatedLinks);

      // Add Subject-Targeted Notification for Students
      if (selectedGrade) {
        await addNotification({
          grade: selectedGrade,
          subject: targetSubjects[0],
          subjects: targetSubjects,
          title: "புதிய Zoom வகுப்பு!",
          message: `${targetSubjects.join(', ')}: ${formData.title} வகுப்பு நேரலைக்காக சேர்க்கப்பட்டுள்ளது. (24 மணி நேரத்தில் நீக்கப்படும்)`,
          type: 'zoom_class',
          createdAt: new Date().toISOString()
        });
      }

      setFormData({ subject: '', subjects: [], title: '', link: '', datetime: '', hostKey: '', meetingId: '', passcode: '' });
      setSaveSuccessMsg(`Zoom இணைப்பு வெற்றிகரமாக சேர்க்கப்பட்டது! (${targetSubjects.join(', ')} - ${targetedStudentCount} மாணவர்களுக்குப் பகிரப்பட்டது)`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Zoom இணைப்பை சேமிப்பதில் பிழை: " + err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("இந்த Zoom வகுப்பை நீக்க விரும்புகிறீர்களா? (Are you sure you want to delete this Zoom link?)")) {
      const updatedLinks = await deleteZoomLink(id);
      setLinks(updatedLinks);
    }
  };

  const formatDateTime = (datetimeStr: string) => {
    if (!datetimeStr) return "Not set";
    const date = new Date(datetimeStr);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  if (selectedGrade) {
    const gradeLinks = links
      .filter(l => l && isGradeMatching(l.grade, selectedGrade))
      .sort((a, b) => {
        const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
        const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
        return timeA - timeB;
      });

    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedGrade(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-800">{selectedGrade} - Live Classes</h2>
                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                  <Clock size={12} /> 24h Auto-Delete
                </span>
                <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
                  <Users size={12} /> {gradeStudents.length} மாணவர்கள்
                </span>
              </div>
              <p className="text-sm text-gray-500">
                நீங்கள் தேர்ந்தெடுக்கும் பாடத்தைச் (Subject) சேர்ந்த மாணவர்களுக்கு மட்டுமே இந்த Zoom லிங்க் பகிரப்படும்
              </p>
            </div>
          </div>
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0">
            <Video size={20} />
            {gradeLinks.length} Active Classes
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                Schedule Live Class
              </h3>
              <form onSubmit={handleAddLink} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-gray-700">
                      Subjects ({availableSubjectsForGrade.length})
                    </label>
                    <div className="flex items-center gap-2">
                      {availableSubjectsForGrade.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.subjects.length === availableSubjectsForGrade.length) {
                              setFormData(prev => ({ ...prev, subjects: [], subject: '' }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                subjects: [...availableSubjectsForGrade],
                                subject: availableSubjectsForGrade[0] || ''
                              }));
                            }
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {formData.subjects.length === availableSubjectsForGrade.length ? "நீக்கு (Clear)" : "அனைத்தும்"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCustomSubjectInput(!showCustomSubjectInput)}
                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                      >
                        {showCustomSubjectInput ? "✕ மூடு" : "+ புதிய பாடம்"}
                      </button>
                    </div>
                  </div>

                  {showCustomSubjectInput && (
                    <div className="flex gap-1.5 mb-2">
                      <input
                        type="text"
                        placeholder="புதிய பாடத்தின் பெயர்..."
                        value={customSubjectInput}
                        onChange={(e) => setCustomSubjectInput(e.target.value)}
                        className="flex-1 border border-emerald-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSubject}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        சேர்
                      </button>
                    </div>
                  )}

                  {/* Multi-select Subject List showing all subjects for this Grade */}
                  <div className="border border-gray-200 rounded-xl p-2.5 bg-slate-50 max-h-60 overflow-y-auto space-y-1.5">
                    {availableSubjectsForGrade.length === 0 ? (
                      <p className="text-xs text-red-500 p-2 text-center">
                        இந்த வகுப்பிற்கு பாடங்கள் எதுவும் சேர்க்கப்படவில்லை. (+ புதிய பாடம் மூலம் சேர்க்கலாம்)
                      </p>
                    ) : (
                      availableSubjectsForGrade.map((subName: string) => {
                        const isChecked = formData.subjects.includes(subName);
                        const stuCount = studentCountBySubject[subName] || 0;
                        return (
                          <label
                            key={subName}
                            className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer border transition-all select-none ${
                              isChecked
                                ? "bg-blue-50 border-blue-400 text-blue-950 shadow-xs"
                                : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSubject(subName)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 shrink-0 cursor-pointer"
                              />
                              <span className="text-xs font-bold leading-snug break-words">{subName}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                stuCount > 0
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {stuCount} மாணவர்
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Live Target Audience Indicator */}
                  {formData.subjects.length > 0 && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">பாடம் சார்ந்த பகிர்வு (Subject Isolation):</span>{" "}
                        <span className="font-semibold">{formData.subjects.join(", ")}</span> பாடத்தைத் தெரிவு செய்துள்ள{" "}
                        <strong className="text-blue-700">{targetedStudentCount} மாணவர்களுக்கு மட்டுமே</strong> இந்த Zoom லிங்க் காட்டப்படும்.
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Title</label>
                  <input
                    type="text"
                    placeholder="e.g., இலக்கிய நயம் - பகுதி 01"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zoom URL</label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting ID</label>
                    <input
                      type="text"
                      placeholder="e.g., 123 456 7890"
                      value={formData.meetingId}
                      onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passcode</label>
                    <input
                      type="text"
                      placeholder="e.g., 123456"
                      value={formData.passcode}
                      onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host Key (Admin/Staff Only)</label>
                  <input
                    type="text"
                    placeholder="e.g., 123456"
                    value={formData.hostKey}
                    onChange={(e) => setFormData({ ...formData, hostKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.datetime}
                    onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  />
                </div>

                {/* 24-Hour Auto-Delete Info Card */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">⏳ 24 மணி நேரத் தானியங்கி நீக்கம்:</span>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      இந்த ஈ-லேர்னிங் Live Zoom இணைப்பு சேர்க்கப்பட்ட / வகுப்பு முடிந்த <strong>24 மணி நேரத்தில்</strong> மாணவர் தளம் மற்றும் கணினியிலிருந்து தானாகவே நிரந்தரமாக நீக்கப்படும்.
                    </p>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-2">
                    <span>✓</span>
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Video size={18} />
                  {isSaving ? "டேட்டாபேஸில் சேமிக்கப்படுகிறது..." : "Save Zoom Link (சேமிக்கவும்)"}
                </button>
              </form>
            </div>
          </div>

          {/* Classes List */}
          <div className="lg:col-span-2 space-y-4">
            {gradeLinks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Video size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No live classes scheduled</h3>
                <p className="text-gray-500">Schedule your first Zoom class for {selectedGrade} using the form.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gradeLinks.map((link) => {
                  const linkSubjects: string[] = Array.from(new Set([
                    ...(Array.isArray(link.subjects) ? link.subjects : []),
                    ...(link.subject ? [link.subject] : [])
                  ].map(s => String(s || '').trim()).filter(Boolean)));

                  const linkMatchingStudentsCount = linkSubjects.length > 0
                    ? gradeStudents.filter(st => doesItemMatchStudentSubjects(link, getStudentEffectiveSubjects(st))).length
                    : gradeStudents.length;

                  return (
                    <div key={link.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {linkSubjects.length > 0 ? (
                              linkSubjects.map(sub => (
                                <div key={sub} className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <BookOpen size={12} />
                                  <span>{sub}</span>
                                </div>
                              ))
                            ) : (
                              <div className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <BookOpen size={12} />
                                <span>பொது (All)</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-md shrink-0 cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <h4 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2" title={link.title}>{link.title}</h4>

                        {/* Target Audience Badge + 24-Hour Expiry Pill */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users size={12} />
                            {linkMatchingStudentsCount} மாணவர்களுக்குப் பகிரப்பட்டது
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock size={12} className="text-amber-600 shrink-0" />
                            <span>ஆட்டோ டெலீட்: இன்னும் {formatZoomLinkRemaining(link)}</span>
                          </span>
                        </div>

                        <div className="space-y-2 mb-5">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} className="text-gray-400" />
                            <span>{formatDateTime(link.datetime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CountdownTimer targetDate={link.datetime} />
                          </div>
                          {link.meetingId && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Video size={16} className="text-gray-400" />
                              <span>Meeting ID: <span className="font-mono bg-gray-100 px-1 rounded">{link.meetingId}</span></span>
                            </div>
                          )}
                          {link.passcode && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Key size={16} className="text-gray-400" />
                              <span>Passcode: <span className="font-mono bg-gray-100 px-1 rounded">{link.passcode}</span></span>
                            </div>
                          )}
                          {link.hostKey && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Key size={16} className="text-gray-400" />
                              <span>Host Key: <span className="font-mono bg-gray-100 px-1 rounded">{link.hostKey}</span></span>
                            </div>
                          )}
                        </div>

                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          Join Meeting <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Live Classes Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white/20 shrink-0">
              <Video size={48} className="text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold">Live Classes</h1>
                <span className="bg-amber-400/90 text-amber-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Clock size={14} /> 24 மணி நேர ஆட்டோ டெலீட் (Auto-Delete)
                </span>
              </div>
              <p className="text-blue-100 text-lg mb-4">Manage Zoom Meetings & Virtual Classrooms</p>
              <div className="flex items-center gap-4 text-sm font-medium flex-wrap">
                <span className="bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">Interactive Learning</span>
                <span className="bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">All Grades & Subjects</span>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                  <ShieldCheck size={14} /> 24h Auto-Purge Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <span className="font-bold">ஈ-லேர்னிங் நேரலை வகுப்புகள் பாதுகாப்பு விதி:</span>
            <p className="text-xs text-amber-800 mt-0.5">
              நீங்கள் சேர்க்கும் ஈ-லேர்னிங் Live Zoom இணைப்புகள் அனைத்தும் 24 மணி நேரத்தில் தானாகவே கணினியிலிருந்தும் மாணவர் போர்ட்டலிலிருந்தும் நிரந்தரமாக நீக்கப்பட்டுவிடும். மேலும், குறிப்பிட்ட பாடத்தைத் தெரிவு செய்த மாணவர்களுக்கு மட்டுமே லிங்க் காண்பிக்கப்படும்.
            </p>
          </div>
        </div>
      </div>

      {/* Grades Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage by Class</h2>
          <p className="text-gray-500">Select a grade to schedule or manage Zoom links</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {GRADES.map((grade) => {
            const classCount = links.filter(l => l && isGradeMatching(l.grade, grade)).length;

            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group text-left relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                <div className="flex justify-between items-start mb-4 relative">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Video size={24} />
                  </div>
                  {classCount > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                      {classCount}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-1 relative">{grade}</h3>
                <p className="text-sm text-gray-500 relative">
                  {classCount === 0 ? 'No classes' : `${classCount} class${classCount > 1 ? 'es' : ''}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
