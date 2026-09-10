import React, { useState, useEffect } from "react";
import { getTimeTable, saveTimeTable, getClasses, getStaffs, getZoomLinks, getSubjects } from "../../lib/db";
import { Plus, Trash2, Calendar as CalendarIcon, Clock, User, BookOpen, Sparkles, XCircle, Video } from "lucide-react";

export default function Timetable() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [zoomLinks, setZoomLinks] = useState<any[]>([]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  
  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const [formData, setFormData] = useState({
    grade: "தரம் 10",
    day: "Monday",
    subject: "",
    staffId: "",
    startTime: "",
    endTime: "",
    zoomLinkId: ""
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const availableSubjects = Array.from(new Set([
    ...(formData.grade ? (classes.find(c => c.name === formData.grade)?.subjects || []) : []),
    ...dbSubjects.map(s => s && s.name).filter((s): s is string => !!s)
  ])).sort();

  useEffect(() => {
    getTimeTable().then(setTimetable);
    getClasses().then(setClasses);
    getStaffs().then(setStaffs);
    getZoomLinks().then(setZoomLinks);
    getSubjects().then(setDbSubjects);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grade || !formData.subject || !formData.staffId || !formData.startTime || !formData.endTime) {
      alert("Please fill all fields");
      return;
    }

    const staff = staffs.find(s => s.id === formData.staffId);
    const zoomLink = zoomLinks.find(z => z.id === formData.zoomLinkId);
    
    if (editingId) {
      const updated = timetable.map(t => 
        t.id === editingId 
          ? { 
              ...t, 
              ...formData, 
              staffName: staff ? staff.name : "Unknown",
              zoomLinkUrl: zoomLink ? zoomLink.link : (t.zoomLinkUrl || "")
            } 
          : t
      );
      setTimetable(updated);
      await saveTimeTable(updated);
      alert("Schedule updated successfully!");
    } else {
      const newEntry = {
        id: Date.now().toString(),
        ...formData,
        staffName: staff ? staff.name : "Unknown",
        zoomLinkUrl: zoomLink ? zoomLink.link : ""
      };

      const updated = [...timetable, newEntry];
      setTimetable(updated);
      await saveTimeTable(updated);
      alert("Schedule added successfully!");
    }
    
    setFormData({
      ...formData,
      subject: "",
      staffId: "",
      startTime: "",
      endTime: "",
      zoomLinkId: ""
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (entry: any) => {
    setFormData({
      grade: entry.grade,
      day: entry.day,
      subject: entry.subject,
      staffId: entry.staffId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      zoomLinkId: zoomLinks.find(z => z.link === entry.zoomLinkUrl)?.id || ""
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this timetable entry?")) {
      const updated = timetable.filter(t => t.id !== id);
      setTimetable(updated);
      await saveTimeTable(updated);
    }
  };

  // Helper to get a color based on subject name
  const getSubjectColor = (subjectName: string) => {
    const colors = [
      "from-blue-400 to-cyan-300 shadow-blue-200",
      "from-green-400 to-emerald-300 shadow-green-200",
      "from-purple-400 to-pink-300 shadow-purple-200",
      "from-orange-400 to-yellow-300 shadow-orange-200",
      "from-rose-400 to-red-300 shadow-rose-200",
      "from-indigo-400 to-blue-300 shadow-indigo-200"
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-amber-50/40 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <span className="bg-yellow-400 text-white p-2 rounded-xl shadow-lg shadow-yellow-200 transform -rotate-6">
                <CalendarIcon size={28} />
              </span>
              Class Routine
            </h1>
            <p className="text-gray-500 font-medium mt-1 ml-1">Manage weekly schedules playfully!</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <select 
              value={formData.grade}
              onChange={e => {
                setFormData({...formData, grade: e.target.value, subject: ""});
                setFilterSubject("");
                setFilterTeacher("");
              }}
              className="border-2 border-yellow-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 bg-white font-bold text-gray-700 shadow-sm cursor-pointer"
            >
              <option value="">Select Class</option>
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))
              ) : (
                GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)
              )}
            </select>

            {formData.grade && (
              <>
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border-2 border-indigo-50 shadow-sm">
                  <BookOpen size={16} className="text-indigo-400" />
                  <select 
                    value={filterSubject}
                    onChange={e => setFilterSubject(e.target.value)}
                    className="border-none bg-transparent focus:ring-0 font-medium text-gray-700 cursor-pointer text-sm"
                  >
                    <option value="">All Subjects</option>
                    {Array.from(new Set(timetable.filter(t => t.grade === formData.grade).map(t => t.subject))).map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border-2 border-indigo-50 shadow-sm">
                  <User size={16} className="text-indigo-400" />
                  <select 
                    value={filterTeacher}
                    onChange={e => setFilterTeacher(e.target.value)}
                    className="border-none bg-transparent focus:ring-0 font-medium text-gray-700 cursor-pointer text-sm"
                  >
                    <option value="">All Teachers</option>
                    {Array.from(new Set(timetable.filter(t => t.grade === formData.grade).map(t => t.staffName))).map(teacher => (
                      <option key={teacher} value={teacher}>{teacher}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:scale-105 transition-all flex items-center gap-2"
            >
              {isAdding ? <XCircle size={20} /> : <Plus size={20} />}
              {isAdding ? "Cancel" : "Add Routine"}
            </button>
          </div>
        </div>

        {/* Add Entry Form Modal/Dropdown */}
        {isAdding && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-2 border-indigo-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
              <Sparkles className="text-indigo-400" size={20} />
              {editingId ? "Edit Schedule" : "Create New Schedule"}
            </h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Day</label>
                <select 
                  value={formData.day}
                  onChange={e => setFormData({...formData, day: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:ring-0 bg-gray-50 font-medium"
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Subject</label>
                <select 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:ring-0 bg-gray-50 font-medium"
                  required
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Teacher</label>
                <select 
                  value={formData.staffId}
                  onChange={e => setFormData({...formData, staffId: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:ring-0 bg-gray-50 font-medium"
                  required
                >
                  <option value="">Select Teacher</option>
                  {staffs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Time</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-2 py-2.5 focus:border-indigo-400 focus:ring-0 bg-gray-50 font-medium text-sm"
                    required
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-2 py-2.5 focus:border-indigo-400 focus:ring-0 bg-gray-50 font-medium text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Zoom Link (Optional)</label>
                <select 
                  value={formData.zoomLinkId}
                  onChange={e => setFormData({...formData, zoomLinkId: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:ring-0 bg-gray-50 font-medium"
                >
                  <option value="">No Zoom Link</option>
                  {zoomLinks
                    .filter(z => z.grade === formData.grade && z.subject === formData.subject)
                    .map(z => (
                      <option key={z.id} value={z.id}>
                        {z.title} ({new Date(z.datetime).toLocaleDateString()})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-md shadow-indigo-200 transition-colors">
                  {editingId ? "Update Schedule" : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Weekly Grid */}
        {!formData.grade ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen size={40} className="text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700">Select a class to view routine</h3>
            <p className="text-gray-500 mt-2">Choose a grade from the dropdown above to see the weekly timetable.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
            {days.map(day => {
              let dayClasses = timetable
                .filter(t => t.grade === formData.grade && t.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              if (filterSubject) {
                dayClasses = dayClasses.filter(t => t.subject === filterSubject);
              }
              if (filterTeacher) {
                dayClasses = dayClasses.filter(t => t.staffName === filterTeacher);
              }

              return (
                <div key={day} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                  {/* Day Header */}
                  <div className="bg-gray-50/80 p-4 border-b border-gray-100 text-center">
                    <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm">{day}</h3>
                  </div>
                  
                  {/* Classes List */}
                  <div className="p-4 flex-1 flex flex-col gap-4 bg-gray-50/30">
                    {dayClasses.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8">
                        <span className="text-2xl mb-2">😴</span>
                        <p className="text-xs font-medium uppercase tracking-wider">Free Day</p>
                      </div>
                    ) : (
                      dayClasses.map(entry => {
                        // Check if there's a zoom link for this subject and grade
                        const hasZoomLink = zoomLinks.some(z => z.grade === entry.grade && z.subject === entry.subject);
                        
                        return (
                        <div 
                          key={entry.id} 
                          className={`relative group bg-gradient-to-br ${getSubjectColor(entry.subject)} p-4 rounded-2xl text-white shadow-lg hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300`}
                        >
                          {/* Delete Button (shows on hover) */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                            <button 
                              onClick={() => handleEdit(entry)} 
                              className="w-6 h-6 bg-white/20 hover:bg-blue-500 rounded-full flex items-center justify-center backdrop-blur-sm"
                              title="Edit"
                            >
                              <Plus size={12} className="text-white" />
                            </button>
                            <button 
                              onClick={() => handleDelete(entry.id)} 
                              className="w-6 h-6 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center backdrop-blur-sm"
                              title="Delete"
                            >
                              <Trash2 size={12} className="text-white" />
                            </button>
                          </div>

                          {(entry.zoomLinkUrl || hasZoomLink) && (
                            <div className="absolute top-2 right-16 flex items-center gap-2">
                               {entry.zoomLinkUrl && (
                                 <a 
                                   href={entry.zoomLinkUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="bg-white/20 hover:bg-white/40 text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1 border border-white/30 transition-all"
                                 >
                                   <Video size={10} /> Join
                                 </a>
                               )}
                               {!entry.zoomLinkUrl && (
                                 <div className="bg-blue-500/80 backdrop-blur-sm p-1 rounded-full animate-pulse" title="Link Available in Zoom Section">
                                   <Video size={14} className="text-white" />
                                 </div>
                               )}
                            </div>
                          )}

                          <h4 className="font-extrabold text-lg leading-tight mb-1 drop-shadow-sm pr-12">{entry.subject}</h4>
                          
                          <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium mb-2 bg-black/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                            <Clock size={12} />
                            <span>{entry.startTime} - {entry.endTime}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold mt-auto pt-2 border-t border-white/20">
                            <User size={12} />
                            <span className="truncate">{entry.staffName}</span>
                          </div>
                        </div>
                      )})
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
