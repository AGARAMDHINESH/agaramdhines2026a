import React, { useState, useEffect } from "react";
import { getStaffs, saveStaffs, deleteStaff, getEmployeeTasks, saveEmployeeTasks, EmployeeTask } from "../../lib/db";
import { Plus, Edit, Trash2, Search, Eye, Download, QrCode, Briefcase, CheckCircle2, Clock, Calendar, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function Staffs() {
  const navigate = useNavigate();
  const [staffs, setStaffs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  
  const [showQrModal, setShowQrModal] = useState<{show: boolean, staff: any | null}>({show: false, staff: null});
  const [showTaskModal, setShowTaskModal] = useState<{show: boolean, staff: any | null}>({show: false, staff: null});
  
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    category: "Question Paper" as const,
    description: "",
    assignedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    priority: "High" as const,
    workCount: 1,
    workUnit: "Pages",
    driveLink: ""
  });

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: any) => {
      if (e.detail?.key === 'staffs' || e.detail?.key === 'employeeTasks') {
        loadData();
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const loadData = async () => {
    const staffData = await getStaffs();
    setStaffs(staffData || []);
    const taskData = await getEmployeeTasks();
    setTasks(taskData || []);
  };

  const handleEdit = (staff: any) => {
    navigate(`/admin/edit-employee/${staff.id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      const updated = await deleteStaff(id);
      setStaffs(updated || []);
    }
  };

  const handleDownloadQrImage = async (staffId: string, staffName: string) => {
    const qrElement = document.getElementById(`qr-staff-${staffId}`);
    if (qrElement) {
      try {
        const url = await toPng(qrElement, { pixelRatio: 3, backgroundColor: '#ffffff' });
        const link = document.createElement("a");
        link.download = `${staffName}-qr.png`;
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating QR code image:", error);
      }
    }
  };

  const handleDownloadQrPdf = async (staffId: string, staffName: string) => {
    const qrElement = document.getElementById(`qr-staff-${staffId}`);
    if (qrElement) {
      try {
        const imgData = await toPng(qrElement, { pixelRatio: 3, backgroundColor: '#ffffff' });
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 10, 10, 100, 150);
        pdf.save(`${staffName}-qr.pdf`);
      } catch (error) {
        console.error("Error generating QR code PDF:", error);
      }
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTaskModal.staff || !newTaskForm.title) return;

    const task: EmployeeTask = {
      id: `task_${Date.now()}`,
      staffId: showTaskModal.staff.id,
      staffName: showTaskModal.staff.name,
      title: newTaskForm.title,
      category: newTaskForm.category as any,
      description: newTaskForm.description,
      assignedDate: newTaskForm.assignedDate,
      dueDate: newTaskForm.dueDate,
      status: "In Progress",
      priority: newTaskForm.priority as any,
      workCount: Number(newTaskForm.workCount) || 1,
      workUnit: newTaskForm.workUnit || "Pages",
      driveLink: newTaskForm.driveLink
    };

    const allTasks = await getEmployeeTasks();
    const updated = [task, ...allTasks];
    await saveEmployeeTasks(updated);
    setTasks(updated);

    setNewTaskForm({
      title: "",
      category: "Question Paper",
      description: "",
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      workCount: 1,
      workUnit: "Pages",
      driveLink: ""
    });

    alert("Task assigned successfully to " + showTaskModal.staff.name);
  };

  const filteredStaffs = staffs.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (staff.role && staff.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (staff.specialization && staff.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = 
      selectedRoleFilter === "All" || 
      (selectedRoleFilter === "Design Worker" && (staff.role === "Design Worker" || String(staff.role).toLowerCase().includes("design") || String(staff.role).toLowerCase().includes("typist"))) ||
      (selectedRoleFilter === "Teacher" && staff.role === "Teacher") ||
      (selectedRoleFilter === "Management" && staff.role === "Management") ||
      (selectedRoleFilter === "Technical Staff" && staff.role === "Technical Staff") ||
      (selectedRoleFilter === "Admin" && staff.role === "Admin");

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Staff & Employee Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage teachers, design workers, typists, and management staff</p>
        </div>
        <button
          onClick={() => navigate('/admin/add-employee')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
        >
          <Plus size={18} /> Add New Employee
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, role, specialization..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <button 
            onClick={() => { setSearchQuery(""); setSelectedRoleFilter("All"); }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Reset Filters
          </button>
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-gray-500 whitespace-nowrap">Filter Roles:</span>
          {["All", "Design Worker", "Teacher", "Management", "Technical Staff", "Admin"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition-all ${
                selectedRoleFilter === role
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {role === "Design Worker" ? "🎨 Design Worker / Typist" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredStaffs.length === 0 ? (
          <div className="text-center text-gray-500 py-12 col-span-full bg-white rounded-2xl shadow-sm border border-gray-200">
            No employees found matching the selected filter.
          </div>
        ) : (
          filteredStaffs.map(staff => {
            const isDesign = staff.role === "Design Worker" || String(staff.role).toLowerCase().includes("design") || String(staff.role).toLowerCase().includes("typist");
            const staffTasks = tasks.filter(t => t.staffId === staff.id || t.staffName === staff.name);
            const completedCount = staffTasks.filter(t => t.status === "Completed").length;

            return (
              <div key={staff.id} className="border border-gray-200/80 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center relative group">
                {isDesign && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black tracking-wide border border-purple-200">
                    DESIGN / TYPING
                  </span>
                )}

                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 overflow-hidden border-2 border-blue-600/30 shadow-inner">
                  {staff.image ? (
                    <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-black text-2xl">{staff.name.charAt(0)}</span>
                  )}
                </div>

                <h3 className="font-black text-base text-gray-900 mb-0.5">{staff.name}</h3>
                <p className="text-blue-600 text-xs font-bold">{staff.role || "Teacher"}</p>
                
                {staff.specialization && (
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">{staff.specialization}</p>
                )}

                <div className="w-full my-3 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1 text-left bg-gray-50/70 p-2.5 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Salary:</span>
                    <span className="font-bold text-gray-800">Rs. {staff.salary || "0"}</span>
                  </div>
                  {isDesign && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed Works:</span>
                      <span className="font-bold text-emerald-600">{completedCount} Tasks</span>
                    </div>
                  )}
                </div>

                {isDesign && (
                  <button
                    onClick={() => setShowTaskModal({ show: true, staff })}
                    className="w-full mb-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Briefcase size={14} /> Assign & View Works
                  </button>
                )}
                
                <div className="flex justify-center gap-2 mt-auto w-full pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => handleEdit(staff)}
                    className="flex-1 py-1.5 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-600 text-xs font-bold transition-colors" 
                    title="Edit"
                  >
                    <Edit size={14} className="mr-1" /> Edit
                  </button>
                  <button 
                    onClick={() => setShowQrModal({show: true, staff})}
                    className="p-2 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-600 transition-colors" 
                    title="QR Code & Credentials"
                  >
                    <QrCode size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(staff.id)}
                    className="p-2 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-colors" 
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal.show && showQrModal.staff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center">
            <div className="flex justify-between w-full items-center mb-4">
              <h3 className="text-base font-bold text-gray-800">Staff Credentials & QR</h3>
              <button onClick={() => setShowQrModal({show: false, staff: null})} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div id={`qr-staff-${showQrModal.staff.id}`} className="bg-white p-5 rounded-2xl border-4 border-blue-800 flex-col items-center w-full shadow-lg mb-5 text-center">
              <h3 className="font-black text-xl text-blue-900 mb-0.5 tracking-wider">AGARAM</h3>
              <p className="text-xs font-bold text-gray-500 mb-3 tracking-widest uppercase">Academy</p>
              
              <div className="bg-white p-3 rounded-xl shadow-inner border border-gray-100 mb-4 flex justify-center">
                <QRCodeSVG value={showQrModal.staff.id} size={150} level={"H"} />
              </div>
              
              <div className="w-full bg-blue-50/80 rounded-xl p-3 border border-blue-100 text-left text-xs space-y-1">
                <h4 className="font-bold text-sm text-gray-900 text-center mb-2">{showQrModal.staff.name}</h4>
                <div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="font-bold text-gray-900">{showQrModal.staff.role || 'Staff'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Username:</span><span className="font-mono font-bold text-blue-700">{showQrModal.staff.username || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Password:</span><span className="font-mono font-bold text-blue-700">{showQrModal.staff.password || 'N/A'}</span></div>
              </div>
            </div>
            
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => handleDownloadQrImage(showQrModal.staff.id, showQrModal.staff.name)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold shadow-md"
              >
                <Download size={14} /> Image
              </button>
              <button 
                onClick={() => handleDownloadQrPdf(showQrModal.staff.id, showQrModal.staff.name)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-md"
              >
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment / View Modal */}
      {showTaskModal.show && showTaskModal.staff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Work Tasks for {showTaskModal.staff.name}
                </h3>
                <p className="text-xs text-gray-500">{showTaskModal.staff.role || "Design Worker"} • Assign new typing or design tasks</p>
              </div>
              <button
                onClick={() => setShowTaskModal({ show: false, staff: null })}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Assign Task Form */}
            <form onSubmit={handleAssignTask} className="mt-4 p-4 bg-blue-50/70 rounded-xl border border-blue-100 space-y-3">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
                <Plus size={14} /> Assign New Task / Typing Work
              </h4>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Task title (e.g. தரம் 11 மாதிரி வினாத்தாள் தட்டச்சு / YouTube Poster)"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value as any })}
                  className="px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                >
                  <option value="Question Paper">Question Paper</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Typing & Data Entry">Typing & Data Entry</option>
                  <option value="Course Material">Course Material</option>
                  <option value="Thumbnails & Media">Thumbnails & Media</option>
                  <option value="Other">Other</option>
                </select>

                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="Count"
                    value={newTaskForm.workCount}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, workCount: Number(e.target.value) })}
                    className="w-1/2 px-2 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Unit (Pages/Banners)"
                    value={newTaskForm.workUnit}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, workUnit: e.target.value })}
                    className="w-1/2 px-2 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                  />
                </div>

                <input
                  type="date"
                  placeholder="Due Date"
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                  className="px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                + Assign Task to Employee
              </button>
            </form>

            {/* List of Tasks for this employee */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                Current Assigned & Completed Tasks ({tasks.filter(t => t.staffId === showTaskModal.staff.id || t.staffName === showTaskModal.staff.name).length})
              </h4>

              {tasks.filter(t => t.staffId === showTaskModal.staff.id || t.staffName === showTaskModal.staff.name).length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No tasks currently logged for this staff.</p>
              ) : (
                tasks.filter(t => t.staffId === showTaskModal.staff.id || t.staffName === showTaskModal.staff.name).map(t => (
                  <div key={t.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{t.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">
                        Category: {t.category} • Output: {t.workCount || 1} {t.workUnit || 'items'} • Assigned: {t.assignedDate}
                      </p>
                      {t.completionNotes && (
                        <p className="text-emerald-700 mt-1"><strong>Notes:</strong> {t.completionNotes}</p>
                      )}
                    </div>

                    {t.driveLink && (
                      <a href={t.driveLink} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline shrink-0">
                        View Files ↗
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
