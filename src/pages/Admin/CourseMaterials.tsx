import React, { useState, useEffect } from 'react';
import { getCourseMaterials, saveCourseMaterials, getClasses, getStaffs, getSubjects, saveSubjects, mergeArraysById } from '../../lib/db';
import { 
  GRADES_LIST, GRADE_COLOR_CONFIG, normalizeGradeString, doesItemMatchGrade 
} from '../../components/RecordingSection';
import { BookOpen, Plus, Trash2, ArrowLeft, ExternalLink, ChevronDown, LayoutGrid, Folder, Globe, Save, Edit3, FileText, Download, Check, RefreshCw, Search, Star, Sparkles, Filter, Layers } from 'lucide-react';

const GRADES = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

// Helper to determine if a material belongs to a grade (including Grade 11 course materials)
export const isItemInGrade = (m: any, targetGrade: string): boolean => {
  if (!m || !targetGrade) return false;
  if (doesItemMatchGrade(m, targetGrade)) return true;
  
  const normTarget = targetGrade.trim().toLowerCase();
  // If targetGrade is "தரம் 11" or contains 11
  if (normTarget.includes("11")) {
    const s = String(m.subject || "").toLowerCase();
    const t = String(m.title || "").toLowerCase();
    const g = String(m.grade || "").toLowerCase();
    const gs = Array.isArray(m.grades) ? m.grades.map((x: any) => String(x).toLowerCase()) : [];
    if (s.includes("30 நாள்") || g.includes("30 day") || t.includes("30 நாள்") || s.includes("11") || t.includes("11") || g.includes("11") || gs.some(x => x.includes("11") || x.includes("30 day"))) {
      return true;
    }
  }

  // Exact or contains match in grade or grades array
  if (m.grade && String(m.grade).trim().toLowerCase() === normTarget) return true;
  if (Array.isArray(m.grades) && m.grades.some((g: any) => String(g).trim().toLowerCase() === normTarget)) return true;
  return false;
};

// Helper to categorize course materials cleanly (e.g. 30 Days Course, Q&A / Papers, General Tamil, etc.)
export const categorizeMaterial = (m: any): { id: string; name: string; shortName: string; color: string; badgeColor: string; icon: string } => {
  const s = (m.subject || '').toString().toLowerCase();
  const t = (m.title || '').toString().toLowerCase();
  const subs = Array.isArray(m.subjects) ? m.subjects.map((x: any) => String(x).toLowerCase()) : [];
  const g = (m.grade || '').toString().toLowerCase();
  const allText = `${s} ${t} ${g} ${subs.join(' ')}`;

  if (allText.includes('30 நாள்') || allText.includes('30 day') || allText.includes('30day') || allText.includes('30days')) {
    return {
      id: 'course_30_days',
      name: '30 நாள் தமிழ் பாடநெறி (30 Days Tamil Course)',
      shortName: '🌟 30 நாள் பாடநெறி',
      color: 'amber',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: 'star'
    };
  }
  if (allText.includes('வினா') || allText.includes('விடை') || allText.includes('vina') || allText.includes('q&a') || allText.includes('paper') || allText.includes('வினாத்தாள்')) {
    return {
      id: 'course_qna',
      name: 'தமிழ் வினா விடை / வினாத்தாள் (Q&A & Past Papers)',
      shortName: '📝 வினா விடை / வினாத்தாள்',
      color: 'purple',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      icon: 'file-text'
    };
  }
  // Language & Literature combinations (e.g., தமிழ் மொழி இலக்கியம்) -> General Tamil
  if ((allText.includes('மொழி') || allText.includes('மொழியும்')) && allText.includes('இலக்கிய') && !allText.includes('நயம்') && !allText.includes('nayam')) {
    // Handled by general Tamil below
  } else if (
    allText.includes('இலக்கிய நயம்') || 
    allText.includes('நயம்') || 
    allText.includes('nayam') || 
    allText.includes('literature') || 
    (allText.includes('இலக்கிய') && !allText.includes('மொழி'))
  ) {
    return {
      id: 'course_literature',
      name: 'தமிழ் இலக்கிய நயம் (Literature)',
      shortName: '📖 இலக்கிய நயம்',
      color: 'emerald',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: 'book-open'
    };
  }
  if (s === 'தமிழ்' || s === 'tamil' || allText.includes('தமிழ்') || allText.includes('tamil')) {
    return {
      id: 'subject_tamil',
      name: 'தமிழ் (பொது / General Tamil)',
      shortName: '📕 தமிழ் (பொது)',
      color: 'rose',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      icon: 'book'
    };
  }
  if (m.subject && m.subject.trim()) {
    const clean = m.subject.trim();
    return {
      id: `custom_${clean.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`,
      name: clean,
      shortName: clean,
      color: 'blue',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      icon: 'folder'
    };
  }
  return {
    id: 'general',
    name: 'பொதுவானவை (General)',
    shortName: '📁 பொதுவானவை',
    color: 'slate',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: 'folder'
  };
};

export default function CourseMaterials() {
  const [view, setView] = useState<'menu' | 'add' | 'view'>('menu');
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [selectedLibraryGrade, setSelectedLibraryGrade] = useState<string | null>(null);
  const [selectedCourseCategory, setSelectedCourseCategory] = useState<string>('all');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');

  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    title: '',
    link: ''
  });

  const loadData = async () => {
    const [fetchedMaterials, fetchedClasses, fetchedStaffs, fetchedSubjects] = await Promise.all([
      getCourseMaterials(),
      getClasses(),
      getStaffs(),
      getSubjects()
    ]);
    setMaterials(fetchedMaterials);
    setClasses(fetchedClasses);
    setStaffs(fetchedStaffs);
    setAllSubjects(fetchedSubjects);
  };

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: CustomEvent) => {
      if (e.detail?.key === 'courseMaterials' && Array.isArray(e.detail?.data)) {
        setMaterials(e.detail.data);
      }
    };
    window.addEventListener('db_updated', handleDbUpdate as EventListener);
    return () => window.removeEventListener('db_updated', handleDbUpdate as EventListener);
  }, []);

  const ALL_AVAILABLE_GRADES = Array.from(new Set([
    "30 DAY'S TAMIL COURSE",
    ...GRADES,
    ...classes.map(c => c.name)
  ])).filter(Boolean);

  const availableSubjectsList = Array.from(new Set([
    "30 நாள் தமிழ் பாடநெறி (தரம் 11)",
    "தமிழ் வினா விடை",
    "தமிழ் இலக்கிய நயம்",
    "தமிழ்",
    ...classes.flatMap(c => c.subjects || []),
    ...staffs.flatMap(s => s.assignedClasses?.map((c: any) => c.subject) || []),
    ...allSubjects.map(s => s.name)
  ])).filter(Boolean);

  const toggleGrade = (gradeName: string) => {
    if (selectedGrades.includes(gradeName)) {
      setSelectedGrades(selectedGrades.filter(g => g !== gradeName));
    } else {
      setSelectedGrades([...selectedGrades, gradeName]);
    }
  };

  const selectAllGrades = () => {
    setSelectedGrades([...ALL_AVAILABLE_GRADES]);
  };

  const clearGrades = () => {
    setSelectedGrades([]);
  };

  const toggleSubject = (subjectName: string) => {
    if (selectedSubjects.includes(subjectName)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subjectName));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectName]);
    }
  };

  const selectAllSubjects = () => {
    setSelectedSubjects([...availableSubjectsList]);
  };

  const clearSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleAddCustomSubject = () => {
    if (!customSubjectInput.trim()) return;
    const newSubName = customSubjectInput.trim();
    if (!selectedSubjects.includes(newSubName)) {
      setSelectedSubjects([...selectedSubjects, newSubName]);
    }
    setCustomSubjectInput('');
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGrades.length === 0) {
      alert("Please select at least one Grade!");
      return;
    }
    if (selectedSubjects.length === 0) {
      alert("Please select at least one Subject!");
      return;
    }
    if (!formData.title || !formData.link) {
      alert("Title and Link are required!");
      return;
    }

    setIsSaving(true);
    try {
      // Save custom subjects to allSubjects if needed
      const updatedAllSubjects = [...allSubjects];
      for (const subj of selectedSubjects) {
        if (!updatedAllSubjects.some(s => s.name.toLowerCase() === subj.toLowerCase())) {
          const newSub = { id: Date.now().toString() + Math.random().toString().slice(2, 6), name: subj };
          updatedAllSubjects.push(newSub);
        }
      }
      if (updatedAllSubjects.length > allSubjects.length) {
        setAllSubjects(updatedAllSubjects);
        await saveSubjects(updatedAllSubjects);
      }

      // Fetch freshest materials from DB to ensure no data is lost
      const freshDbMaterials = await getCourseMaterials();
      let baseMaterials = mergeArraysById(freshDbMaterials, materials);
      let updatedMaterials = [...baseMaterials];

      if (editingId) {
        let isFirst = true;
        for (const g of selectedGrades) {
          for (const s of selectedSubjects) {
            if (isFirst) {
              updatedMaterials = updatedMaterials.map(m => 
                m.id === editingId ? { ...m, grade: g, subject: s, title: formData.title, link: formData.link } : m
              );
              isFirst = false;
            } else {
              updatedMaterials.push({
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                grade: g,
                subject: s,
                title: formData.title,
                link: formData.link,
                createdAt: Date.now()
              });
            }
          }
        }
        setEditingId(null);
      } else {
        let count = 0;
        const newItems: any[] = [];
        for (const g of selectedGrades) {
          for (const s of selectedSubjects) {
            newItems.push({
              id: (Date.now() + count++).toString() + Math.random().toString().slice(2, 5),
              grade: g,
              subject: s,
              title: formData.title,
              link: formData.link,
              createdAt: Date.now()
            });
          }
        }
        updatedMaterials = [...newItems, ...updatedMaterials];
      }

      setMaterials(updatedMaterials);
      await saveCourseMaterials(updatedMaterials);

      const totalCreated = selectedGrades.length * selectedSubjects.length;
      alert(
        totalCreated === 1 
          ? 'Course Material Saved Successfully to Database!' 
          : `${totalCreated} Course Materials Added Successfully across ${selectedGrades.length} Grades and ${selectedSubjects.length} Subjects!`
      );

      setSelectedGrades([]);
      setSelectedSubjects([]);
      setFormData({ grade: '', subject: '', title: '', link: '' });
      setView('view');
    } catch (err: any) {
      alert("Error saving course material: " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this course material?")) {
      const freshDbMaterials = await getCourseMaterials();
      const base = mergeArraysById(freshDbMaterials, materials);
      const updatedMaterials = base.filter(m => m.id !== id);
      setMaterials(updatedMaterials);
      await saveCourseMaterials(updatedMaterials);
      alert("Deleted Successfully from Database");
    }
  };

  const handleEdit = (material: any) => {
    setSelectedGrades([material.grade]);
    setSelectedSubjects([material.subject]);
    setFormData({
      grade: material.grade,
      subject: material.subject,
      title: material.title,
      link: material.link
    });
    setEditingId(material.id);
    setView('add');
  };

  const getSubjectColorClasses = (subjectName: string) => {
    const colors = [
      { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
      { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
      { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
      { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
      { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
      { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
      { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' }
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          {view !== 'menu' && (
            <button
              onClick={() => {
                if (view === 'view' && selectedLibraryGrade) {
                  setSelectedLibraryGrade(null);
                } else {
                  setView('menu');
                  setSelectedLibraryGrade(null);
                  setEditingId(null);
                  setSelectedGrades([]);
                  setSelectedSubjects([]);
                  setFormData({ grade: '', subject: '', title: '', link: '' });
                }
              }}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-red-600 transition-all shadow-sm"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                <FileText size={24} />
              </span>
              {view === 'view' 
                ? (selectedLibraryGrade ? `${selectedLibraryGrade} Materials` : 'Manage Course Materials')
                : 'Course Materials (பாடக்குறிப்புகள்)'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {view === 'view'
                ? (selectedLibraryGrade ? `Manage all PDF materials for ${selectedLibraryGrade}` : 'GRADES 1 TO 13 COLORFUL GRADE HUBS')
                : 'Manage downloadable PDF materials for students by Grade and Subject'}
            </p>
          </div>
        </div>

        {view === 'view' && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh from Database"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
            >
              <RefreshCw size={14} /> Refresh
            </button>

            <button
              onClick={() => {
                setEditingId(null);
                setSelectedGrades(selectedLibraryGrade ? [selectedLibraryGrade] : []);
                setSelectedSubjects([]);
                setFormData({ grade: '', subject: '', title: '', link: '' });
                setView('add');
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-200 transition-all"
            >
              <Plus size={16} /> Add Course Material
            </button>
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      {view === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
          <button
            onClick={() => {
              setView('add');
              setEditingId(null);
              setSelectedGrades([]);
              setSelectedSubjects([]);
              setFormData({ grade: '', subject: '', title: '', link: '' });
            }}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-red-400 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors shadow-inner">
              <Plus size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Add Course Material</h2>
            <p className="text-slate-400 text-sm font-medium">Upload a new PDF drive link for multiple subjects and grades</p>
          </button>

          <button
            onClick={() => setView('view')}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors shadow-inner">
              <LayoutGrid size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">View Materials</h2>
            <p className="text-slate-400 text-sm font-medium">List, search, and manage existing course materials</p>
          </button>
        </div>
      )}

      {view === 'add' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            {editingId ? "Edit Course Material" : "Add New Course Material"}
          </h2>

          <form onSubmit={handleAddMaterial} className="space-y-6">
            {/* Multi Grade Selection */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Target Grades / Classes (வகுப்புகள் - பல தேர்வு செய்யலாம்) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Click to select one or multiple grades</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllGrades}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearGrades}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                  <span className="text-xs font-extrabold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                    {selectedGrades.length} selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {ALL_AVAILABLE_GRADES.map(g => {
                  const isSelected = selectedGrades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(g)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md shadow-red-200 border border-red-600'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check size={14} className="stroke-[3]" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi Subject Selection */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Target Subjects (பாடம் - பல தேர்வு செய்யலாம்) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Click to select one or multiple subjects</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllSubjects}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearSubjects}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                  <span className="text-xs font-extrabold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                    {selectedSubjects.length} selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto mb-3">
                {availableSubjectsList.map(s => {
                  const isSelected = selectedSubjects.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-600'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check size={14} className="stroke-[3]" />}
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* Custom Subject Addition */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Or type custom subject name..."
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSubject();
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSubject}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                >
                  <Plus size={14} /> Add Subject
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Material Title (தலைப்பு)</label>
              <input
                type="text"
                required
                placeholder="E.g., Unit 1 Notes PDF"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Google Drive Link / PDF URL</label>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/..."
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
              />
            </div>

            {/* Total Combinations Summary */}
            {selectedGrades.length > 0 && selectedSubjects.length > 0 && (
              <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 flex items-center justify-between text-xs font-bold text-red-900">
                <span>Total Materials to be created:</span>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-sm">
                  {selectedGrades.length * selectedSubjects.length} Items ({selectedGrades.length} Grades × {selectedSubjects.length} Subjects)
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-red-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save size={18} />
              {editingId ? "Update Material" : "Save Material"}
            </button>
          </form>
        </div>
      )}

      {view === 'view' && (
        <div className="space-y-6 animate-fade-in">
          {/* 1. GRADE SQUARES (If no grade selected) */}
          {!selectedLibraryGrade ? (
            <div className="space-y-6">
              {/* Highlight Card for 30 Day's Tamil Course (Grade 11) */}
              <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/5 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                    <Star size={28} className="fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-200">
                        தரம் 11 சிறப்பு பாடநெறி
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        Grade 11 Special Course
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                      30 நாள் தமிழ் பாடநெறி (30 Days Tamil Course)
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      தரம் 11 மாணவர்களுக்கான 30 நாள் பாடநெறிக்குரிய அனைத்து PDF ஆவணங்களையும் நேரடியாகக் காண்க.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedLibraryGrade("தரம் 11");
                    setSelectedCourseCategory("course_30_days");
                    setLibrarySearch('');
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs rounded-2xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer self-stretch md:self-auto justify-center"
                >
                  <Star size={16} className="fill-white" />
                  <span>30 நாள் பாடநெறியைத் திறக்க (Open Course)</span>
                </button>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Select Grade to View & Manage Materials (தரம் தெரிவு செய்க):
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      Click any grade to view and download PDF course materials
                    </p>
                  </div>
                  <span className="text-xs font-black text-red-700 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-100 self-start sm:self-auto">
                    Total: {materials.length} Materials
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                  {GRADES_LIST.map((gradeName) => {
                    const cfg = GRADE_COLOR_CONFIG[gradeName] || GRADE_COLOR_CONFIG["தரம் 10"];
                    const count = materials.filter(m => isItemInGrade(m, gradeName)).length;

                    return (
                      <button
                        key={gradeName}
                        onClick={() => {
                          setSelectedLibraryGrade(gradeName);
                          setSelectedCourseCategory('all');
                          setLibrarySearch('');
                        }}
                        className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-between text-center aspect-square shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer ${cfg.bg} ${cfg.border} ${cfg.shadow}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cfg.bgGradient} text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          {cfg.gradeNum < 10 ? `0${cfg.gradeNum}` : cfg.gradeNum}
                        </div>

                        <div>
                          <h4 className={`font-black text-base ${cfg.text}`}>
                            {gradeName}
                          </h4>
                          <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full mt-1 border ${cfg.badge} border-white/60`}>
                            {count} Materials
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Special / Custom Courses like 30 Day's Tamil Course if present */}
                {materials.some(m => !GRADES_LIST.some(g => isItemInGrade(m, g))) && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                      Special & Other Courses:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {Array.from(new Set(materials.map(m => m.grade)))
                        .filter((g): g is string => Boolean(g) && !GRADES_LIST.some(gl => isItemInGrade({ grade: g } as any, gl)))
                        .map((customGrade: string) => {
                          const count = materials.filter(m => m.grade === customGrade).length;
                          return (
                            <button
                              key={customGrade}
                              onClick={() => {
                                setSelectedLibraryGrade(customGrade);
                                setSelectedCourseCategory('all');
                                setLibrarySearch('');
                              }}
                              className="p-5 rounded-3xl border-2 border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-between text-left group shadow-sm hover:shadow-md cursor-pointer"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-orange-600 text-white font-black text-sm flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                  <FileText size={20} />
                                </div>
                                <div>
                                  <h4 className="font-black text-sm text-slate-800 group-hover:text-red-700 transition-colors">
                                    {customGrade}
                                  </h4>
                                  <span className="text-[11px] font-bold text-red-600">
                                    {count} Materials
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2. DEDICATED GRADE MATERIALS HUB */
            (() => {
              const allGradeMaterials = materials.filter(m => isItemInGrade(m, selectedLibraryGrade));

              // Categorize items in this grade
              const categoryMap = new Map<string, { id: string; name: string; shortName: string; color: string; badgeColor: string; icon: string; count: number }>();
              allGradeMaterials.forEach(m => {
                const cat = categorizeMaterial(m);
                if (!categoryMap.has(cat.id)) {
                  categoryMap.set(cat.id, { ...cat, count: 0 });
                }
                categoryMap.get(cat.id)!.count += 1;
              });

              const categoriesList = [
                {
                  id: 'all',
                  name: 'அனைத்துப் பாடநெறிகள் (All Courses)',
                  shortName: 'அனைத்தும் (All)',
                  count: allGradeMaterials.length,
                  color: 'red',
                  badgeColor: 'bg-red-100 text-red-900 border-red-200',
                  icon: 'layers'
                },
                ...Array.from(categoryMap.values()).sort((a, b) => {
                  const priority = ['course_30_days', 'course_qna', 'course_literature', 'subject_tamil'];
                  const pA = priority.indexOf(a.id);
                  const pB = priority.indexOf(b.id);
                  if (pA !== -1 && pB !== -1) return pA - pB;
                  if (pA !== -1) return -1;
                  if (pB !== -1) return 1;
                  return 0;
                })
              ];

              // Filter by category
              const filteredByCat = allGradeMaterials.filter(m => {
                if (selectedCourseCategory === 'all') return true;
                return categorizeMaterial(m).id === selectedCourseCategory;
              });

              // Search query filtering
              const gradeMaterials = filteredByCat.filter(m => {
                if (!librarySearch.trim()) return true;
                const q = librarySearch.toLowerCase();
                return m.title?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q);
              });

              const activeCategoryObj = categoriesList.find(c => c.id === selectedCourseCategory);

              return (
                <div className="space-y-6">
                  {/* Top Bar: Grade Title, Back button, Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedLibraryGrade(null);
                          setSelectedCourseCategory('all');
                          setLibrarySearch('');
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      >
                        ← All Grades
                      </button>
                      <span className="text-xs font-black text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                        {allGradeMaterials.length} Materials in {selectedLibraryGrade}
                      </span>
                      {selectedCourseCategory !== 'all' && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1">
                          <Filter size={12} />
                          Filtered: {activeCategoryObj?.shortName} ({gradeMaterials.length})
                        </span>
                      )}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search materials in this grade..."
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                  </div>

                  {/* COURSE / CATEGORY SELECTION BAR */}
                  {categoriesList.length > 2 && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Filter size={15} className="text-red-600" />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            பாடநெறி தெரிவு (Course Categories):
                          </span>
                        </div>
                        {selectedCourseCategory !== 'all' && (
                          <button
                            onClick={() => setSelectedCourseCategory('all')}
                            className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                          >
                            அனைத்தையும் காட்டு (Clear Filter)
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {categoriesList.map((cat) => {
                          const isActive = selectedCourseCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCourseCategory(cat.id)}
                              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                                isActive
                                  ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-500/25 scale-[1.02]'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span>{cat.shortName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {cat.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Highlight Banner when a specific course (e.g. 30 Days Course) is selected */}
                  {selectedCourseCategory !== 'all' && (
                    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-2 border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black flex items-center justify-center shadow-md">
                          <Star size={24} className="fill-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                              {selectedLibraryGrade} தனிப் பாடநெறி
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {gradeMaterials.length} ஆவணங்கள்
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                            {activeCategoryObj?.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-stretch sm:self-auto">
                        <button
                          onClick={() => setSelectedCourseCategory('all')}
                          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
                        >
                          ← அனைத்து பாடநெறிகளையும் காட்டு
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setSelectedGrades([selectedLibraryGrade]);
                            setSelectedSubjects([activeCategoryObj?.shortName.replace(/^[^\w\u0B80-\u0BFF]+/g, '').trim() || '']);
                            setFormData({
                              grade: selectedLibraryGrade,
                              subject: activeCategoryObj?.name || '',
                              title: '',
                              link: ''
                            });
                            setView('add');
                          }}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
                        >
                          <Plus size={14} /> புதிய PDF சேர்
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Materials list for this Grade */}
                  {gradeMaterials.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-inner">
                        <FileText size={28} />
                      </div>
                      <h4 className="text-xl font-black text-slate-800">
                        {selectedCourseCategory !== 'all'
                          ? `No Materials found in ${activeCategoryObj?.shortName}`
                          : `No Course Materials in ${selectedLibraryGrade}`}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {selectedCourseCategory !== 'all'
                          ? 'There are currently no PDF materials uploaded for this specific course in this grade.'
                          : `There are currently no PDF materials uploaded for ${selectedLibraryGrade}. Click below to add the first course material.`}
                      </p>
                      <div className="flex justify-center gap-2 pt-2">
                        {selectedCourseCategory !== 'all' && (
                          <button
                            onClick={() => setSelectedCourseCategory('all')}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer"
                          >
                            ← View All Categories
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setSelectedGrades([selectedLibraryGrade]);
                            setSelectedSubjects([]);
                            setFormData({ grade: selectedLibraryGrade, subject: '', title: '', link: '' });
                            setView('add');
                          }}
                          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-200 transition-all inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Plus size={16} /> Add Material to {selectedLibraryGrade}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display grouped sections if 'all' is selected and multiple categories exist */
                    selectedCourseCategory === 'all' && !librarySearch.trim() && categoryMap.size > 1 ? (
                      <div className="space-y-8">
                        {Array.from(categoryMap.values()).map((cat) => {
                          const itemsInCat = allGradeMaterials.filter(m => categorizeMaterial(m).id === cat.id);
                          if (itemsInCat.length === 0) return null;

                          return (
                            <div key={cat.id} className="space-y-3">
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-2xl">
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-3 h-3 rounded-full ${
                                    cat.id === 'course_30_days' ? 'bg-amber-500 ring-4 ring-amber-200' :
                                    cat.id === 'course_qna' ? 'bg-purple-500 ring-4 ring-purple-200' : 'bg-red-500'
                                  }`} />
                                  <h4 className="text-sm font-black text-slate-800">
                                    {cat.name}
                                  </h4>
                                  <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    {itemsInCat.length} ஆவணங்கள்
                                  </span>
                                </div>
                                <button
                                  onClick={() => setSelectedCourseCategory(cat.id)}
                                  className="text-xs font-black text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  இதை மட்டும் காண்க (View only) →
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {itemsInCat.map((material, idx) => {
                                  const badge = getSubjectColorClasses(material.subject || 'General');
                                  const is30Day = categorizeMaterial(material).id === 'course_30_days';

                                  return (
                                    <div
                                      key={material.id || idx}
                                      className={`p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md group relative overflow-hidden bg-white ${
                                        is30Day ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/20' : 'border-slate-100 hover:border-red-200 hover:bg-red-50/20'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                            is30Day ? 'bg-amber-100 text-amber-900 border-amber-300' : `${badge.bg} ${badge.text} ${badge.border}`
                                          }`}>
                                            {is30Day ? '🌟 30 நாள் பாடநெறி' : (material.subject || 'Subject Unit')}
                                          </span>
                                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                            {material.grade || selectedLibraryGrade}
                                          </span>
                                        </div>

                                        <h3 className="text-base font-black text-slate-800 group-hover:text-red-700 transition-colors mb-2 leading-snug">
                                          {material.title}
                                        </h3>

                                        {/* Saved Link / URL */}
                                        <div className="my-3">
                                          {material.link ? (
                                            <a
                                              href={material.link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold text-xs rounded-xl border border-red-200 hover:border-red-600 transition-all duration-200 shadow-sm group/btn"
                                            >
                                              <ExternalLink size={13} className="text-red-500 group-hover/btn:text-white transition-colors" />
                                              <span>Open PDF / Drive Link</span>
                                            </a>
                                          ) : (
                                            <span className="text-xs text-slate-400 italic">No link attached</span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleEdit(material)}
                                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                                          >
                                            <Edit3 size={13} /> Edit
                                          </button>
                                          <button
                                            onClick={() => handleDelete(material.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                            title="Delete"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>

                                        <span className="text-[10px] font-mono text-slate-400">
                                          ID: {material.id?.slice(-6) || 'Item'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Flat Grid (for filtered course or search results) */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gradeMaterials.map((material, idx) => {
                          const badge = getSubjectColorClasses(material.subject || 'General');
                          const is30Day = categorizeMaterial(material).id === 'course_30_days';

                          return (
                            <div
                              key={material.id || idx}
                              className={`p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md group relative overflow-hidden bg-white ${
                                is30Day ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/20' : 'border-slate-100 hover:border-red-200 hover:bg-red-50/20'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                    is30Day ? 'bg-amber-100 text-amber-900 border-amber-300' : `${badge.bg} ${badge.text} ${badge.border}`
                                  }`}>
                                    {is30Day ? '🌟 30 நாள் பாடநெறி' : (material.subject || 'Subject Unit')}
                                  </span>
                                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    {material.grade || selectedLibraryGrade}
                                  </span>
                                </div>

                                <h3 className="text-base font-black text-slate-800 group-hover:text-red-700 transition-colors mb-2 leading-snug">
                                  {material.title}
                                </h3>

                                {/* Saved Link / URL */}
                                <div className="my-3">
                                  {material.link ? (
                                    <a
                                      href={material.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold text-xs rounded-xl border border-red-200 hover:border-red-600 transition-all duration-200 shadow-sm group/btn"
                                    >
                                      <ExternalLink size={13} className="text-red-500 group-hover/btn:text-white transition-colors" />
                                      <span>Open PDF / Drive Link</span>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">No link attached</span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(material)}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Edit3 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(material.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                <span className="text-[10px] font-mono text-slate-400">
                                  ID: {material.id?.slice(-6) || 'Item'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

