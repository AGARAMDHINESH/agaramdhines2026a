import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getClasses, saveClasses, getStudents, getStaffs, getSubjects, saveSubjects } from '../../lib/db';
import { Edit2, Trash2, Plus, GraduationCap, Check } from 'lucide-react';

const GRADES = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

export default function Classes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'all' | 'new'>(searchParams.get('tab') === 'new' ? 'new' : 'all');
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    monthlyTuitionFees: '',
    classTeacherId: '',
    subjects: [] as string[]
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'new') {
      setActiveTab('new');
    } else {
      setActiveTab('all');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'all' | 'new') => {
    setActiveTab(tab);
    if (tab === 'new') {
      setSearchParams({ tab: 'new' });
    } else {
      setSearchParams({});
      setEditingClassId(null);
      setFormData({ name: '', monthlyTuitionFees: '', classTeacherId: '', subjects: [] });
    }
  };

  const handleEditClick = (cls: any) => {
    setEditingClassId(cls.id);
    setFormData({
      name: cls.name,
      monthlyTuitionFees: cls.monthlyTuitionFees || '',
      classTeacherId: cls.classTeacherId || '',
      subjects: cls.subjects || []
    });
    handleTabChange('new');
  };

  const [customSubjectInput, setCustomSubjectInput] = useState('');

  useEffect(() => {
    const loadData = () => {
      getClasses().then(setClasses);
      getStudents().then(setStudents);
      getStaffs().then(setStaffs);
      getSubjects().then(subs => {
        const cleaned = (subs || []).map(s => {
          if ((s?.name || '').trim().toLowerCase() === 'tamil') {
            return { ...s, name: 'தமிழ்' };
          }
          return s;
        }).filter((s, idx, arr) => arr.findIndex(x => x?.name === s?.name) === idx);
        setAvailableSubjects(cleaned);
      });
    };

    loadData();

    const handleDbUpdate = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'classes' || key === 'subjects' || key === 'students') {
        loadData();
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [activeTab]);

  const handleAddCustomSubject = async () => {
    if (!customSubjectInput.trim()) return;
    const cleanName = customSubjectInput.trim();
    
    // Check if already in available subjects
    const existing = availableSubjects.find(s => s?.name?.toLowerCase() === cleanName.toLowerCase());
    if (!existing) {
      const newSub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        category: 'Main' as const,
        fee: '0',
        grade: formData.name || 'தரம் 11'
      };
      const updated = [...availableSubjects, newSub];
      setAvailableSubjects(updated);
      await saveSubjects(updated);
    }

    if (!formData.subjects.includes(cleanName)) {
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, cleanName] }));
    }
    setCustomSubjectInput('');
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.monthlyTuitionFees || !formData.classTeacherId || formData.subjects.length === 0) {
      setToast({ message: "Please fill all required fields and select at least one subject.", type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    let updatedClasses;
    const normName = formData.name.trim();
    if (editingClassId) {
      updatedClasses = classes.map(c => 
        (c.id === editingClassId || c.name?.trim() === normName) ? { ...c, ...formData } : c
      );
      setToast({ message: "Class updated successfully!", type: 'success' });
    } else {
      const existingIdx = classes.findIndex(c => c.name?.trim() === normName);
      if (existingIdx >= 0) {
        updatedClasses = classes.map((c, idx) => idx === existingIdx ? { ...c, ...formData } : c);
      } else {
        const newClass = {
          id: Date.now().toString(),
          ...formData
        };
        updatedClasses = [...classes, newClass];
      }
      setToast({ message: "Class added successfully!", type: 'success' });
    }
    
    setClasses(updatedClasses);
    await saveClasses(updatedClasses);
    
    setTimeout(() => setToast(null), 3000);
    setFormData({ name: '', monthlyTuitionFees: '', classTeacherId: '', subjects: [] });
    setEditingClassId(null);
    handleTabChange('all');
  };

  const handleSubjectToggle = (subjectName: string) => {
    setFormData(prev => {
      const isSelected = prev.subjects.includes(subjectName);
      if (isSelected) {
        return { ...prev, subjects: prev.subjects.filter(s => s !== subjectName) };
      } else {
        return { ...prev, subjects: [...prev.subjects, subjectName] };
      }
    });
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      const targetClass = classes.find(c => c.id === deleteConfirm);
      const targetName = targetClass?.name?.toString().trim().toLowerCase();

      const updatedClasses = classes.filter(c => {
        if (c.id === deleteConfirm) return false;
        if (targetName && c.name && c.name.toString().trim().toLowerCase() === targetName) return false;
        return true;
      });

      setClasses(updatedClasses);
      await saveClasses(updatedClasses);
      setDeleteConfirm(null);
      setToast({ message: "Class deleted successfully!", type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Calculate student stats for a class
  const getClassStats = (className: string) => {
    // Assume students are linked to classes by 'grade' matching 'className'
    const classStudents = students.filter(s => s.grade === className || s.className === className);
    const total = classStudents.length;
    
    const boys = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
    const girls = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
    const na = total - boys - girls;
    
    return {
      total,
      boys,
      girls,
      na
    };
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white font-medium transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Class</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this class? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Tabs */}
      <div className="flex items-center text-sm text-gray-500 mb-6 bg-white p-3 rounded-md shadow-sm border border-gray-100">
        <span className="font-medium text-gray-700 mr-2">Classes</span>
        <span className="mx-2">|</span>
        <button 
          onClick={() => handleTabChange('all')}
          className={`flex items-center ${activeTab === 'all' ? 'text-gray-800 font-medium' : 'hover:text-gray-700'}`}
        >
          <span className="mr-1">🏠</span> - All Classes
        </button>
        {activeTab === 'new' && (
          <>
            <span className="mx-2">|</span>
            <span className="text-gray-800 font-medium">{editingClassId ? "Edit Class" : "Add New Class"}</span>
          </>
        )}
      </div>
      
      {activeTab === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const stats = getClassStats(cls.name);
            return (
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-gray-800 text-sm pr-12">{cls.name}</h3>
                    {cls.subjects && cls.subjects.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={cls.subjects.map((s: string) => s.toLowerCase() === 'tamil' ? 'தமிழ்' : s).join(", ")}>
                        {cls.subjects.map((s: string) => s.toLowerCase() === 'tamil' ? 'தமிழ்' : s).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 absolute top-4 right-4">
                    <button onClick={() => handleEditClick(cls)} className="text-blue-500 hover:text-blue-700">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(cls.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="text-3xl font-bold text-gray-800">{stats.total}</span>
                    <span className="text-xs text-gray-500 ml-1 font-medium uppercase tracking-wider">Students</span>
                  </div>
                  <GraduationCap size={32} className="text-blue-600 opacity-80" />
                </div>
                
                <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                  {/* Boys Circle */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-100"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-500"
                          strokeWidth="3"
                          strokeDasharray={`${stats.total ? (stats.boys/stats.total)*100 : 0}, 100`}
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-gray-700">{stats.total ? Math.round((stats.boys/stats.total)*100) : 0}%</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                      <span className="text-[10px] text-gray-500 font-medium uppercase">Boys</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{stats.boys}</span>
                  </div>
                  
                  {/* Girls Circle */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-100"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-pink-500"
                          strokeWidth="3"
                          strokeDasharray={`${stats.total ? (stats.girls/stats.total)*100 : 0}, 100`}
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-gray-700">{stats.total ? Math.round((stats.girls/stats.total)*100) : 0}%</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-pink-500 mr-1"></div>
                      <span className="text-[10px] text-gray-500 font-medium uppercase">Girls</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{stats.girls}</span>
                  </div>
                  
                  {/* N/A Circle */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-100"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-700"
                          strokeWidth="3"
                          strokeDasharray={`${stats.total ? (stats.na/stats.total)*100 : 0}, 100`}
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-gray-700">{stats.total ? Math.round((stats.na/stats.total)*100) : 0}%</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-blue-700 mr-1"></div>
                      <span className="text-[10px] text-gray-500 font-medium uppercase">N/A</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{stats.na}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Add New Card */}
          <div 
            onClick={() => handleTabChange('new')}
            className="bg-white rounded-xl shadow-sm border border-dashed border-blue-300 p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Plus size={24} />
            </div>
            <span className="text-blue-600 font-medium">Add New</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800">{editingClassId ? "Edit Class Details" : "Add New Class"}</h2>
            <div className="flex items-center justify-center text-xs mt-2 space-x-4">
              <div className="flex items-center text-blue-600">
                <div className="w-4 h-1.5 bg-blue-600 rounded-full mr-1"></div>
                Required*
              </div>
              <div className="flex items-center text-gray-400">
                <div className="w-4 h-1.5 bg-gray-300 rounded-full mr-1"></div>
                Optional
              </div>
            </div>
          </div>
          
          <form onSubmit={handleAddClass} className="space-y-6">
            <div className="relative">
              <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-blue-600">
                Class Name (Grade)*
              </label>
              <select
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-blue-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
                required
              >
                <option value="" disabled>Select Grade*</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-blue-600">
                  Select Subjects* ({formData.subjects.length} selected)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, subjects: availableSubjects.map(s => s.name) }))}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, subjects: [] }))}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="w-full border border-blue-200 rounded-2xl p-4 text-sm bg-white space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {availableSubjects.map(subject => {
                    const isChecked = formData.subjects.includes(subject.name);
                    return (
                      <label 
                        key={subject.id || subject.name} 
                        className={`flex items-center space-x-2 p-2 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' 
                            : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleSubjectToggle(subject.name)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-xs">{subject.name}</span>
                      </label>
                    );
                  })}
                  {availableSubjects.length === 0 && (
                    <p className="text-gray-500 col-span-full text-xs">No subjects available yet. Use the field below to add one.</p>
                  )}
                </div>

                {/* Quick Add Subject inline */}
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter new subject name (e.g. தமிழ் வினா விடை)..."
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSubject();
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={14} /> Add Subject
                  </button>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-blue-600">
                Monthly Tuition Fees*
              </label>
              <input
                type="text"
                placeholder="Monthly Tuition Fees"
                value={formData.monthlyTuitionFees}
                onChange={(e) => setFormData({...formData, monthlyTuitionFees: e.target.value})}
                className="w-full border border-blue-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="relative">
              <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-blue-600">
                Select Class Teacher*
              </label>
              <select
                value={formData.classTeacherId}
                onChange={(e) => setFormData({...formData, classTeacherId: e.target.value})}
                className="w-full border border-blue-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
                required
              >
                <option value="" disabled>Select*</option>
                {staffs.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className="mr-3 px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-sm font-medium shadow-sm"
              >
                Save Class
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
