import React, { useState, useEffect } from "react";
import { getHomework, saveHomework, getClasses, addNotification } from "../../lib/db";
import { Book, Calculator, FlaskConical, Globe, Palette, Music, FileText, ArrowLeft, Plus, Calendar, Clock, ChevronRight, Trash2 } from "lucide-react";

export default function Homework() {
  const [view, setView] = useState<"menu" | "add" | "view">("menu");
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const availableSubjects = selectedGrade 
    ? classes.find(c => c.name === selectedGrade)?.subjects || []
    : [];

  useEffect(() => {
    getHomework().then(setHomeworkList);
    getClasses().then(setClasses);
  }, [view]);

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade || !selectedSubject || !title) return;

    let finalDueDate = dueDate;
    if (!finalDueDate) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      finalDueDate = d.toISOString().split('T')[0];
    } else {
      finalDueDate = new Date(finalDueDate).toISOString().split('T')[0];
    }

    const newHomework = {
      id: Date.now().toString(),
      grade: selectedGrade,
      subject: selectedSubject,
      title,
      description,
      date: new Date().toISOString().split('T')[0],
      dueDate: finalDueDate
    };

    const updatedList = [...homeworkList, newHomework];
    setHomeworkList(updatedList);
    await saveHomework(updatedList);
    
    // Add Notification
    await addNotification({
      grade: selectedGrade,
      title: "புதிய Homework!",
      message: `${selectedSubject}: ${title} - புதிய ஒப்படைப்பு வழங்கப்பட்டுள்ளது.`,
      type: 'homework',
      createdAt: new Date().toISOString()
    });
    
    alert("Homework added successfully!");
    setSelectedGrade("");
    setSelectedSubject("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setView("view");
  };

  const handleDelete = async (id: string) => {
    if(window.confirm("Delete this assignment?")) {
      const updatedList = homeworkList.filter(h => h.id !== id);
      setHomeworkList(updatedList);
      await saveHomework(updatedList);
    }
  };

  // Helper to get an icon based on subject name
  const getSubjectIcon = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('math')) return <Calculator size={24} />;
    if (name.includes('sci')) return <FlaskConical size={24} />;
    if (name.includes('his') || name.includes('geo')) return <Globe size={24} />;
    if (name.includes('art')) return <Palette size={24} />;
    if (name.includes('music')) return <Music size={24} />;
    if (name.includes('eng') || name.includes('lang')) return <Book size={24} />;
    return <FileText size={24} />;
  };

  // Helper to get a gradient based on subject name
  const getSubjectGradient = (subjectName: string) => {
    const colors = [
      "from-pink-400 to-rose-400",
      "from-purple-400 to-indigo-400",
      "from-blue-400 to-cyan-400",
      "from-emerald-400 to-teal-400",
      "from-amber-400 to-orange-400"
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (view === "menu") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-8 transform rotate-12">
            <Book size={48} className="text-purple-500" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-800 mb-4 tracking-tight">Assignments & Homework</h1>
          <p className="text-gray-500 font-medium mb-12 text-lg">Manage student tasks, projects, and daily homework in one place.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setView("add")}
              className="group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden text-left border-2 border-transparent hover:border-purple-200"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-purple-200"></div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-md text-white">
                <Plus size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Create New</h3>
              <p className="text-gray-500 font-medium">Assign new homework or projects to classes.</p>
            </button>
            
            <button
              onClick={() => setView("view")}
              className="group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden text-left border-2 border-transparent hover:border-pink-200"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-pink-200"></div>
              <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center mb-6 shadow-md text-white">
                <FileText size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">View All</h3>
              <p className="text-gray-500 font-medium">Check existing assignments and deadlines.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "add") {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <button
            onClick={() => setView("menu")}
            className="flex items-center gap-2 text-white/80 hover:text-white font-medium mb-6 transition-colors bg-white/10 px-4 py-2 rounded-full w-fit backdrop-blur-sm"
          >
            <ArrowLeft size={18} /> Back to Menu
          </button>
          <h2 className="text-3xl font-extrabold tracking-tight">Create Assignment</h2>
          <p className="text-purple-100 mt-2 font-medium">Fill in the details to assign new work.</p>
        </div>

        <form onSubmit={handleAddHomework} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Class / Grade</label>
              <select 
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSubject("");
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-gray-50 font-medium text-gray-800 transition-all cursor-pointer"
                required
              >
                <option value="">Select Class</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Subject</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-gray-50 font-medium text-gray-800 transition-all cursor-pointer"
                required
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Assignment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Algebra Exercises"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-gray-50 font-medium text-gray-800 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Description / Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed instructions for the students..."
              rows={4}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-gray-50 font-medium text-gray-800 transition-all resize-none"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Due Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar size={18} className="text-gray-400" />
                </div>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-gray-50 font-medium text-gray-800 transition-all cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Attachment (Optional)</label>
              <input
                type="file"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-gray-50 font-medium text-gray-600 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-10 py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 font-bold text-lg flex items-center gap-2 hover:-translate-y-1 active:scale-95"
            >
              <Plus size={20} /> Publish Assignment
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === "view") {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView("menu")}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Assignments Portal</h2>
              <p className="text-gray-500 font-medium mt-1">View and manage all active homework.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-white font-bold text-gray-700 shadow-sm cursor-pointer min-w-[160px]"
            >
              <option value="">All Classes</option>
              {GRADES.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
            <button
              onClick={() => setView("add")}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Plus size={18} /> New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {homeworkList
            .filter(h => !selectedGrade || h.grade === selectedGrade)
            .map(hw => (
              <div key={hw.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col h-full">
                {/* Card Header */}
                <div className={`h-24 bg-gradient-to-r ${getSubjectGradient(hw.subject)} p-6 relative`}>
                  <div className="absolute -bottom-6 left-6 w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-gray-800 transform group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                    {getSubjectIcon(hw.subject)}
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                    {hw.grade}
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-6 pt-10 flex-1 flex flex-col">
                  <h3 className="font-extrabold text-xl text-gray-800 mb-1 line-clamp-2">{hw.title}</h3>
                  <p className="text-sm font-bold text-purple-600 mb-3">{hw.subject}</p>
                  
                  <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed flex-1">
                    {hw.description || "No description provided."}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg">
                      <Calendar size={14} className="text-gray-400" />
                      <span>Issued: {hw.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded-lg">
                      <Clock size={14} className="text-orange-500" />
                      <span>Due: {hw.dueDate || "Not set"}</span>
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                    <button 
                      className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      View / Submit <ChevronRight size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(hw.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Assignment"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
          {homeworkList.filter(h => !selectedGrade || h.grade === selectedGrade).length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FileText size={40} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">No assignments found</h3>
              <p className="text-gray-500 mt-2 max-w-md">There are no active assignments for this class. Click 'New' to create one.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
