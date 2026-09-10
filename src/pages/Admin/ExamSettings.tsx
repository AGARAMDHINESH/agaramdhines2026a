import React, { useState, useEffect } from "react";
import { getExamSettings, saveExamSettings } from "../../lib/db";
import { Settings, Plus, Save, Trash2, Calendar } from "lucide-react";

export default function ExamSettings() {
  const [examPeriods, setExamPeriods] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newExam, setNewExam] = useState({ name: "", startDate: "", endDate: "" });

  useEffect(() => {
    getExamSettings().then(data => {
      if (data && data.length > 0) {
        setExamPeriods(data);
      } else {
        // Default periods if none exist
        const defaults = [
          { id: "1", name: "Term 1 Examination", startDate: "2026-04-01", endDate: "2026-04-15" },
          { id: "2", name: "Term 2 Examination", startDate: "2026-08-01", endDate: "2026-08-15" },
          { id: "3", name: "Final Examination", startDate: "2026-12-01", endDate: "2026-12-15" }
        ];
        setExamPeriods(defaults);
        saveExamSettings(defaults);
      }
    });
  }, []);

  const handleSave = async () => {
    await saveExamSettings(examPeriods);
    alert("Exam settings saved successfully!");
  };

  const handleAdd = () => {
    if (!newExam.name || !newExam.startDate || !newExam.endDate) {
      alert("Please fill all fields");
      return;
    }
    
    const updated = [...examPeriods, { ...newExam, id: Date.now().toString() }];
    setExamPeriods(updated);
    setNewExam({ name: "", startDate: "", endDate: "" });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this exam period?")) {
      const updated = examPeriods.filter(e => e.id !== id);
      setExamPeriods(updated);
    }
  };

  const handleChange = (id: string, field: string, value: string) => {
    const updated = examPeriods.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    );
    setExamPeriods(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
              <Settings size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Exam Settings</h1>
              <p className="text-gray-500 font-medium mt-1">Configure exam periods and schedules.</p>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Save size={20} /> Save Changes
          </button>
        </div>
      </div>

      {/* Exam Periods List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-indigo-500" size={20} />
            Exam Periods
          </h2>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Period
          </button>
        </div>

        <div className="p-6 space-y-4">
          {examPeriods.map((exam) => (
            <div key={exam.id} className="flex flex-col md:flex-row gap-4 items-center p-4 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors bg-white">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Exam Name</label>
                <input 
                  type="text" 
                  value={exam.name}
                  onChange={(e) => handleChange(exam.id, 'name', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={exam.startDate}
                  onChange={(e) => handleChange(exam.id, 'startDate', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                <input 
                  type="date" 
                  value={exam.endDate}
                  onChange={(e) => handleChange(exam.id, 'endDate', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                />
              </div>
              <div className="w-full md:w-auto flex justify-end md:mt-5">
                <button 
                  onClick={() => handleDelete(exam.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}

          {isAdding && (
            <div className="flex flex-col md:flex-row gap-4 items-center p-4 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50/50">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Exam Name</label>
                <input 
                  type="text" 
                  value={newExam.name}
                  onChange={(e) => setNewExam({...newExam, name: e.target.value})}
                  placeholder="e.g. Midterm Exam"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={newExam.startDate}
                  onChange={(e) => setNewExam({...newExam, startDate: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                <input 
                  type="date" 
                  value={newExam.endDate}
                  onChange={(e) => setNewExam({...newExam, endDate: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                />
              </div>
              <div className="w-full md:w-auto flex justify-end gap-2 md:mt-5">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          
          {examPeriods.length === 0 && !isAdding && (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700">No Exam Periods Defined</h3>
              <p className="text-gray-500 mt-1">Click "Add Period" to create your first exam schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
