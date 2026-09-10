import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Download, 
  TrendingUp, 
  Sparkles, 
  Calendar,
  Layers,
  Award,
  AlertCircle,
  FileCheck,
  UploadCloud,
  File as FileIcon,
  Image as ImageIcon
} from "lucide-react";
import { getEmployeeTasks, saveEmployeeTasks, EmployeeTask } from "../../../lib/db";
import { jsPDF } from "jspdf";
import { processAndUploadWorkFile, downloadAnyWorkFile } from "../../../lib/fileStorage";

interface WorkViewProps {
  staff: any;
  adminSettings: any;
}

export default function WorkView({ staff, adminSettings }: WorkViewProps) {
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [modalFileError, setModalFileError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<EmployeeTask>>({
    title: "",
    category: "Typing & Data Entry",
    description: "",
    assignedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    completedDate: new Date().toISOString().slice(0, 10),
    status: "Completed",
    priority: "Medium",
    workCount: 1,
    workUnit: "Pages",
    driveLink: "",
    fileName: "",
    fileType: "",
    fileSize: 0,
    fileData: "",
    completionNotes: ""
  });

  useEffect(() => {
    loadTasks();

    const handleDbUpdate = (e: any) => {
      if (e.detail?.key === 'employeeTasks') {
        if (Array.isArray(e.detail?.data)) {
          const myTasks = e.detail.data.filter((t: any) => t.staffId === staff.id || t.staffName === staff.name || t.staffId === 'general');
          setTasks(myTasks);
        } else {
          loadTasks();
        }
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [staff.id]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const allTasks = await getEmployeeTasks();
      // Filter tasks assigned to this staff member or general staff ID
      const myTasks = allTasks.filter(t => t.staffId === staff.id || t.staffName === staff.name || t.staffId === 'general');
      setTasks(myTasks);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (task?: EmployeeTask) => {
    setModalFileError(null);
    if (task) {
      setEditingTask(task);
      setFormData({ ...task });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        category: "Typing & Data Entry",
        description: "",
        assignedDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        completedDate: new Date().toISOString().slice(0, 10),
        status: "Completed",
        priority: "Medium",
        workCount: 1,
        workUnit: "Pages",
        driveLink: "",
        fileName: "",
        fileType: "",
        fileSize: 0,
        fileData: "",
        completionNotes: ""
      });
    }
    setShowAddModal(true);
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per upload

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      
      // Video check
      if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v', '.3gp'].includes(ext) || file.type.startsWith('video/')) {
        setModalFileError("⚠️ Large video files cannot be uploaded directly. Direct upload is supported for Documents (Word .doc, .docx), PDFs (.pdf), and Images (JPG, JPEG, PNG). For video files, please paste your Google Drive link in the Google Drive link field below.");
        return;
      }

      // File size check (> 5MB)
      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setModalFileError(`⚠️ கோப்பின் அளவு 5 MB-ஐ விட அதிகமாக உள்ளது (${sizeMb} MB). ஒரு முறை பதிவேற்றத்திற்கு 5 MB-க்கு உட்பட்ட கோப்புகளை மட்டுமே நேரடியாகப் பதிவேற்ற முடியும் (எத்தனை முறை வேண்டுமானாலும் பதிவேற்றலாம்). 5 MB-க்கு மேற்பட்ட கோப்புகளுக்கு Google Drive இணைப்பைப் பயன்படுத்தவும்.`);
        return;
      }

      // Valid extensions
      const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      if (!allowedExts.includes(ext)) {
        setModalFileError("Only PDF documents, Microsoft Word (.doc, .docx), JPG, and PNG files (Max 5 MB) are supported for direct upload.");
        return;
      }

      try {
        const tempTaskId = editingTask ? editingTask.id : `task_${Date.now()}`;
        const { fileUrl, base64Data, chunkCount, hasChunks } = await processAndUploadWorkFile(file, tempTaskId, staff.id);

        setFormData(prev => ({
          ...prev,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          fileData: file.size < 60000 ? base64Data : undefined,
          driveLink: fileUrl || prev.driveLink,
          title: prev.title || file.name.replace(/\.[^/.]+$/, "")
        }));
      } catch (err) {
        console.error("Error reading file:", err);
        setModalFileError("Failed to read file.");
      }
    }
  };

  const handleDownloadTaskFile = async (task: EmployeeTask) => {
    await downloadAnyWorkFile(task as any);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const allTasks = await getEmployeeTasks();
      let updatedAll: EmployeeTask[] = [];

      if (editingTask) {
        updatedAll = allTasks.map(t => t.id === editingTask.id ? {
          ...t,
          ...formData,
          staffId: staff.id,
          staffName: staff.name
        } as EmployeeTask : t);
      } else {
        const newTask: EmployeeTask = {
          id: `task_${Date.now()}`,
          staffId: staff.id,
          staffName: staff.name,
          title: formData.title || "Untitled Task",
          category: (formData.category || "Typing & Data Entry") as any,
          description: formData.description || "",
          assignedDate: formData.assignedDate || new Date().toISOString().slice(0, 10),
          dueDate: formData.dueDate,
          completedDate: formData.status === "Completed" ? (formData.completedDate || new Date().toISOString().slice(0, 10)) : undefined,
          status: (formData.status || "Completed") as any,
          priority: (formData.priority || "Medium") as any,
          workCount: Number(formData.workCount) || 1,
          workUnit: formData.workUnit || "Items",
          driveLink: formData.driveLink,
          fileName: formData.fileName,
          fileType: formData.fileType,
          fileSize: formData.fileSize,
          fileData: formData.fileData,
          completionNotes: formData.completionNotes
        };
        updatedAll = [newTask, ...allTasks];
      }

      await saveEmployeeTasks(updatedAll);
      setShowAddModal(false);
      loadTasks();
    } catch (err) {
      console.error("Error saving task:", err);
      alert("Failed to save task. Please try again.");
    }
  };

  const handleToggleStatus = async (task: EmployeeTask) => {
    const nextStatus = task.status === "Completed" ? "In Progress" : "Completed";
    const nextCompletedDate = nextStatus === "Completed" ? new Date().toISOString().slice(0, 10) : undefined;

    const allTasks = await getEmployeeTasks();
    const updated = allTasks.map(t => t.id === task.id ? { 
      ...t, 
      status: nextStatus,
      completedDate: nextCompletedDate 
    } as EmployeeTask : t);

    await saveEmployeeTasks(updated);
    loadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task record?")) return;
    const allTasks = await getEmployeeTasks();
    const updated = allTasks.filter(t => t.id !== taskId);
    await saveEmployeeTasks(updated);
    loadTasks();
  };

  // Metrics calculation
  const thisMonthTasks = tasks.filter(t => {
    const d = t.completedDate || t.assignedDate || "";
    return d.startsWith(selectedMonth);
  });

  const completedThisMonth = thisMonthTasks.filter(t => t.status === "Completed");
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;
  const pendingCount = tasks.filter(t => t.status === "Pending" || t.status === "Under Review").length;
  const allTimeCompleted = tasks.filter(t => t.status === "Completed").length;

  const totalPagesOrItemsThisMonth = completedThisMonth.reduce((acc, curr) => acc + (Number(curr.workCount) || 0), 0);

  const targetMonthly = Number(staff.monthlyTarget) || 20;
  const completionPercentage = Math.min(100, Math.round((completedThisMonth.length / targetMonthly) * 100));

  // Filtered list
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.completionNotes && t.completionNotes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    
    let matchesMonth = true;
    if (selectedMonth !== "ALL") {
      const taskDate = t.completedDate || t.assignedDate || "";
      matchesMonth = taskDate.startsWith(selectedMonth);
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesMonth;
  });

  // Export PDF Work Report
  const handleExportWorkReport = () => {
    const doc = new jsPDF();
    const instName = adminSettings?.instituteName || "AGARAM DHINES ACADEMY";

    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text(instName, 105, 18, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(75, 85, 99);
    doc.text(`STAFF WORK COMPLETION REPORT - ${selectedMonth === "ALL" ? "ALL TIME" : selectedMonth}`, 105, 26, { align: "center" });

    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 30, 196, 30);

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Employee Name: ${staff.name}`, 14, 38);
    doc.text(`Role: ${staff.role || "Design Worker"}`, 14, 44);
    doc.text(`Specialization: ${staff.specialization || "Typing & Design"}`, 14, 50);

    doc.text(`Completed Tasks (${selectedMonth}): ${completedThisMonth.length}`, 130, 38);
    doc.text(`Total Deliverable Items: ${totalPagesOrItemsThisMonth}`, 130, 44);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 130, 50);

    doc.line(14, 55, 196, 55);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Completed & Assigned Works:", 14, 63);

    let y = 72;
    doc.setFontSize(9);

    if (filteredTasks.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("No tasks logged for this period.", 14, y);
    } else {
      filteredTasks.forEach((task, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. [${task.status}] ${task.title}`, 14, y);
        doc.setFont("helvetica", "normal");
        y += 5;

        const info = `Category: ${task.category} | Output: ${task.workCount || 1} ${task.workUnit || 'items'} | Date: ${task.completedDate || task.assignedDate}`;
        doc.text(info, 18, y);
        y += 5;

        if (task.completionNotes) {
          doc.setTextColor(100, 100, 100);
          doc.text(`Notes: ${task.completionNotes.slice(0, 90)}`, 18, y);
          doc.setTextColor(30, 41, 59);
          y += 5;
        }

        y += 3;
      });
    }

    doc.save(`Work_Report_${staff.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Question Paper": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Graphic Design": return "bg-pink-100 text-pink-700 border-pink-200";
      case "Course Material": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Thumbnails & Media": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-indigo-100 text-indigo-700 border-indigo-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 size={13} /> Completed</span>;
      case "In Progress":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><Clock size={13} /> In Progress</span>;
      case "Under Review":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200"><FileCheck size={13} /> Under Review</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><AlertCircle size={13} /> Pending</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles size={14} className="text-yellow-400" />
              Creative & Design Workstation
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{staff.name}</h1>
            <p className="text-blue-200 text-sm mt-1 flex items-center gap-2">
              <span>Role: <strong className="text-white">{staff.role || "Design Worker"}</strong></span>
              {staff.specialization && (
                <>
                  <span>•</span>
                  <span>Specialization: <strong className="text-yellow-300">{staff.specialization}</strong></span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              <span>Log Completed Work</span>
            </button>
            <button
              onClick={handleExportWorkReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 rounded-xl font-medium text-sm transition-all"
            >
              <Download size={16} />
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {/* Progress Toward Monthly Target */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-200 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" />
              Monthly Output Progress ({selectedMonth === "ALL" ? "All Time" : selectedMonth})
            </span>
            <span className="text-white">{completedThisMonth.length} of {targetMonthly} Completed ({completionPercentage}%)</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed This Month</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{completedThisMonth.length} <span className="text-xs font-medium text-gray-500">Tasks</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pages / Deliverables</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{totalPagesOrItemsThisMonth} <span className="text-xs font-medium text-gray-500">Items</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{inProgressCount} <span className="text-xs font-medium text-gray-500">Active</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Completed</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{allTimeCompleted} <span className="text-xs font-medium text-gray-500">All-time</span></p>
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, typing works, designs, question papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-500" />
            <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value={currentYearMonth}>This Month ({currentYearMonth})</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-05">May 2026</option>
              <option value="ALL">All Months</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-gray-500 whitespace-nowrap">Categories:</span>
          {["All", "Typing & Data Entry", "Graphic Design", "Question Paper", "Course Material", "Thumbnails & Media", "Other"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold transition-all ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">
            Loading tasks and work records...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-500">
              <Briefcase size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No work records found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No tasks matched your current search and filters. Click below to add a new completed or assigned task.
            </p>
            <button
              onClick={() => handleOpenAddModal()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
            >
              <Plus size={14} /> Log Work Now
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getCategoryColor(task.category)}`}>
                    {task.category}
                  </span>
                  {getStatusBadge(task.status)}
                  {task.workCount && (
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      📦 {task.workCount} {task.workUnit || "Items"}
                    </span>
                  )}
                  {task.priority === "High" || task.priority === "Urgent" ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700">
                      ⚡ {task.priority}
                    </span>
                  ) : null}
                </div>

                <h3 className="font-bold text-base text-gray-900">{task.title}</h3>

                {task.description && (
                  <p className="text-xs text-gray-600 leading-relaxed">{task.description}</p>
                )}

                {task.completionNotes && (
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-900">
                    <strong>Submission Notes:</strong> {task.completionNotes}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                  <span>Assigned: <strong>{task.assignedDate}</strong></span>
                  {task.completedDate && (
                    <span className="text-emerald-700">Completed: <strong>{task.completedDate}</strong></span>
                  )}
                  {task.fileName && (
                    <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      <FileIcon size={12} className="text-blue-600" />
                      {task.fileName}
                    </span>
                  )}
                  {task.driveLink && (
                    <a
                      href={task.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                    >
                      <ExternalLink size={12} /> Open Drive / Files
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {task.fileData && (
                  <button
                    onClick={() => handleDownloadTaskFile(task)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors inline-flex items-center gap-1"
                    title="Download attached file"
                  >
                    <Download size={14} /> Download
                  </button>
                )}
                <button
                  onClick={() => handleToggleStatus(task)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    task.status === "Completed"
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  }`}
                >
                  {task.status === "Completed" ? "Mark In Progress" : "✓ Mark Done"}
                </button>
                <button
                  onClick={() => handleOpenAddModal(task)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  title="Edit task"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {editingTask ? "Edit Work Record" : "Log Completed Work / Task"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 mt-4">
              {modalFileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{modalFileError}</span>
                </div>
              )}

              {/* Direct File Attachment Zone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Attach Work File (PDF, Word, JPG, PNG)
                </label>
                <div className="relative border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 text-center bg-gray-50/50 hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                    onChange={handleModalFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-700">
                    <UploadCloud size={18} className="text-blue-600" />
                    <span>
                      {formData.fileName ? `Selected: ${formData.fileName}` : "Click or drag to attach PDF, Word (.doc/.docx), or JPG/PNG"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Direct instant download for admin. (For large video files, paste Google Drive link below)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Work / Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. தரம் 10 மாதிரி வினாத்தாள் தட்டச்சு அல்லது YouTube பதாகை"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Typing & Data Entry">Typing & Data Entry (தட்டச்சு)</option>
                    <option value="Graphic Design">Graphic Design (வடிவமைப்பு & பதாகை)</option>
                    <option value="Question Paper">Question Paper Preparation (வினாத்தாள்)</option>
                    <option value="Course Material">Course Material Layout (பாடக்குறிப்பு)</option>
                    <option value="Thumbnails & Media">Thumbnails & Media (தம்பனைல்)</option>
                    <option value="Other">Other Responsibility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Completed">Completed (முடிக்கப்பட்டது)</option>
                    <option value="In Progress">In Progress (செயலில் உள்ளது)</option>
                    <option value="Pending">Pending (நிலுவை)</option>
                    <option value="Under Review">Under Review (சரிபார்ப்பில்)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Output Count (எ.கா: பக்கங்கள் / பதாகைகள்)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Count"
                      value={formData.workCount || 1}
                      onChange={(e) => setFormData({ ...formData, workCount: Number(e.target.value) })}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={formData.workUnit || "Pages"}
                      onChange={(e) => setFormData({ ...formData, workUnit: e.target.value })}
                      className="w-1/2 px-2.5 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="Pages">Pages (பக்கங்கள்)</option>
                      <option value="Thumbnails">Thumbnails</option>
                      <option value="Posters">Posters (பதாகைகள்)</option>
                      <option value="Papers">Exam Papers</option>
                      <option value="Videos">Videos / Clips</option>
                      <option value="Files">Files</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={formData.completedDate || ""}
                    onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Google Drive / Output Link (Optional / விருப்பத்திற்கேற்ப)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.driveLink || ""}
                  onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Description / Work Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter details of what was completed, corrections made, etc."
                  value={formData.completionNotes || formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {editingTask ? "Save Changes" : "Log Work Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
