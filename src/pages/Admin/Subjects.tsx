import React, { useState, useEffect } from "react";
import { getSubjects, saveSubjects, deleteSubject, syncSubjectsFromRecords, getClasses, saveClasses, getStudents } from "../../lib/db";
import { Plus, Trash2, BookOpen, Edit2, Check, X, IndianRupee, GraduationCap, Search, RefreshCw } from "lucide-react";

export default function SubjectsGrades() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [newSubject, setNewSubject] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newCategory, setNewCategory] = useState<"Main" | "Sub">("Main");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingFee, setEditingFee] = useState("");
  const [editingCategory, setEditingCategory] = useState<"Main" | "Sub">("Main");
  const [editingFees, setEditingFees] = useState<{[key: string]: string}>({});

  const loadData = async () => {
    const subs = await getSubjects();
    setSubjects(subs);
    const cls = await getClasses();
    setClasses(cls);
  };

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'subjects' || key === 'classes' || key === 'students') {
        loadData();
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const handleSyncSubjects = async () => {
    setIsSyncing(true);
    try {
      const updated = await syncSubjectsFromRecords();
      setSubjects(updated);
      alert(`அனைத்து பாடங்களும் வெற்றிகரமாக ஒருங்கிணைக்கப்பட்டன! / All subjects (${updated.length}) synced successfully!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    
    const cleanNewName = newSubject.trim().toLowerCase();
    if (subjects.some(s => String(s?.name || "").trim().toLowerCase() === cleanNewName)) {
      alert("இந்த பாடம் ஏற்கனவே சேர்க்கப்பட்டுள்ளது! / This subject already exists!");
      return;
    }

    const updated = [...subjects, { 
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
      name: newSubject.trim(),
      category: newCategory,
      fee: newFee || "0"
    }];
    setSubjects(updated);
    await saveSubjects(updated);
    setNewSubject("");
    setNewFee("");
    setNewCategory("Main");
  };

  const startEditing = (subject: any) => {
    setEditingId(subject.id);
    setEditingName(subject.name);
    setEditingFee(subject.fee || "0");
    setEditingCategory(subject.category || "Main");
  };

  const handleUpdateSubject = async () => {
    if (!editingName.trim() || !editingId) return;
    
    const updated = subjects.map(s => s.id === editingId ? { ...s, name: editingName.trim(), fee: editingFee, category: editingCategory } : s);
    setSubjects(updated);
    await saveSubjects(updated);
    setEditingId(null);
    setEditingFee("");
    setEditingCategory("Main");
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (window.confirm(`நீங்கள் "${name}" என்ற பாடத்தை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?\n(Are you sure you want to permanently delete "${name}"?)`)) {
      try {
        const updated = await deleteSubject(id, name);
        setSubjects(updated);
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete subject. Please try again.");
      }
    }
  };

  const handleFeeChange = (classId: string, fee: string) => {
    setEditingFees(prev => ({ ...prev, [classId]: fee }));
  };

  const handleSaveFees = async (classId: string) => {
    const fee = editingFees[classId];
    if (fee === undefined) return;

    const updatedClasses = classes.map(c => 
      c.id === classId ? { ...c, monthlyTuitionFees: fee } : c
    );
    setClasses(updatedClasses);
    await saveClasses(updatedClasses);
    
    // Clear editing state for this class
    const newEditingFees = { ...editingFees };
    delete newEditingFees[classId];
    setEditingFees(newEditingFees);
    
    alert("Class fee updated successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Subjects Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tighter">Manage Subjects</h2>
            <p className="text-gray-500 text-sm">Add, remove or edit subjects assigned to classes.</p>
          </div>
        </div>
        
        <form onSubmit={handleAddSubject} className="flex flex-col gap-4 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Science"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white"
              />
            </div>
            
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold bg-white"
              >
                <option value="Main">Main Subject (Included in Tuition)</option>
                <option value="Sub">Sub Subject (Extra Fee)</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Extra Fee (LKR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-sans">LKR</span>
                <input
                  type="number"
                  placeholder="0 (Optional)"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white"
                />
              </div>
            </div>

            <div className="lg:col-span-1 flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white px-8 py-3.5 rounded-lg hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest flex items-center justify-center shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap">
                <Plus size={18} className="mr-2" /> Add Subject
              </button>
            </div>
          </div>
        </form>

        {/* Search & Sync Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search subjects (e.g. தமிழ், tamil)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              Total: {subjects.length} Subjects
            </span>
            <button
              onClick={handleSyncSubjects}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              title="Sync subjects from all students, classes & courses"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing..." : "Sync All"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.filter(s => !searchQuery || String(s?.name || "").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                {searchQuery ? `No subjects found matching "${searchQuery}".` : "No subjects added yet."}
              </p>
            </div>
          ) : (
            subjects
              .filter(s => !searchQuery || String(s?.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
              .map(subject => (
              <div key={subject.id} className="group relative flex flex-col p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                {editingId === subject.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Name</label>
                      <input 
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full border border-blue-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Category</label>
                      <select 
                        value={editingCategory}
                        onChange={(e) => setEditingCategory(e.target.value as any)}
                        className="w-full border border-blue-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none bg-white"
                      >
                        <option value="Main">Main Subject</option>
                        <option value="Sub">Sub Subject</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Extra Fee (LKR)</label>
                      <input 
                        type="number"
                        value={editingFee}
                        onChange={(e) => setEditingFee(e.target.value)}
                        className="w-full border border-blue-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={handleUpdateSubject} className="flex-1 bg-green-500 text-white p-2 rounded-lg flex items-center justify-center shadow-sm hover:bg-green-600 transition-colors">
                        <Check size={16} className="mr-1" /> SAVE
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 text-gray-500 p-2 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <X size={16} className="mr-1" /> CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-gray-800 uppercase text-sm tracking-tight">{subject.name}</span>
                        <span className={`text-[9px] w-fit px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${subject.category === 'Sub' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          {subject.category === 'Sub' ? 'Sub Subject' : 'Main Subject'}
                        </span>
                      </div>
                      {subject.fee && subject.fee !== "0" && (
                        <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black">
                          LKR {subject.fee}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => startEditing(subject)} 
                        className="flex-1 text-blue-600 hover:bg-blue-50 p-2 rounded-lg border border-blue-100 transition-colors flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider"
                        title="Edit Subject"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteSubject(subject.id, subject.name)} 
                        className="flex-1 text-red-600 hover:bg-red-50 p-2 rounded-lg border border-red-100 transition-colors flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider"
                        title="Delete Subject"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Class Fees Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tighter">Manage Class Fees</h2>
            <p className="text-gray-500 text-sm">Set or update monthly tuition fees for each grade.</p>
          </div>
        </div>

        <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Class Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48 text-right">Current Monthly Fee</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-64 text-right">Update Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No classes added yet. <a href="/admin/classes" className="text-blue-600 underline">Add classes first</a>.
                  </td>
                </tr>
              ) : (
                classes.map(cls => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-gray-900 uppercase text-sm tracking-tight">{cls.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-700">LKR {cls.monthlyTuitionFees || "0"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-sans">LKR</span>
                          <input 
                            type="number"
                            placeholder="Amount"
                            value={editingFees[cls.id] !== undefined ? editingFees[cls.id] : (cls.monthlyTuitionFees || "")}
                            onChange={(e) => handleFeeChange(cls.id, e.target.value)}
                            className="w-32 border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          />
                        </div>
                        <button 
                          onClick={() => handleSaveFees(cls.id)}
                          disabled={editingFees[cls.id] === undefined}
                          className={`p-2 rounded-lg shadow-sm transition-all ${
                            editingFees[cls.id] !== undefined 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95' 
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
