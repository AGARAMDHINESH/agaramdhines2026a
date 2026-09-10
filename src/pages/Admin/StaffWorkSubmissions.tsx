import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  Briefcase, 
  User, 
  File, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { 
  getDailyWorkUploads, 
  saveDailyWorkUploads, 
  deleteDailyWorkUpload,
  DailyWorkUpload, 
  getStaffs 
} from "../../lib/db";
import { downloadAnyWorkFile } from "../../lib/fileStorage";

export default function StaffWorkSubmissions() {
  const [uploads, setUploads] = useState<DailyWorkUpload[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffFilter, setSelectedStaffFilter] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");

  // Feedback modal
  const [feedbackModal, setFeedbackModal] = useState<{ show: boolean, item: DailyWorkUpload | null, notes: string }>({
    show: false,
    item: null,
    notes: ""
  });

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: any) => {
      if (['dailyWorkUploads', 'staffs'].includes(e.detail?.key)) {
        loadData();
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUploads, allStaffs] = await Promise.all([
        getDailyWorkUploads(),
        getStaffs()
      ]);
      setUploads(allUploads || []);
      setStaffs(allStaffs || []);
    } catch (err) {
      console.warn("Failed to load work submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Direct Multi-Device Download Handler for PDF, Word, JPG, PNG
  const handleDownloadFile = async (item: DailyWorkUpload) => {
    setDownloadingId(item.id);
    try {
      await downloadAnyWorkFile(item);
    } finally {
      setDownloadingId(null);
    }
  };

  // Status update
  const handleUpdateStatus = async (itemId: string, newStatus: 'Approved' | 'Needs Revision' | 'Pending', adminNotes?: string) => {
    try {
      const updated = uploads.map(u => {
        if (u.id === itemId) {
          return {
            ...u,
            status: newStatus,
            adminNotes: adminNotes !== undefined ? adminNotes : u.adminNotes
          };
        }
        return u;
      });

      await saveDailyWorkUploads(updated);
      setUploads(updated);
      if (feedbackModal.show) {
        setFeedbackModal({ show: false, item: null, notes: "" });
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Delete
  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this work submission?")) return;
    try {
      const updated = await deleteDailyWorkUpload(itemId);
      setUploads(updated);
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  // Helper for file badge
  const getFileBadge = (fileName: string, fileType?: string) => {
    const lower = (fileName || "").toLowerCase();
    if (lower.endsWith('.pdf') || fileType?.includes('pdf')) {
      return { label: 'PDF', bg: 'bg-red-100 text-red-700 border-red-200', icon: <FileText size={16} className="text-red-600" /> };
    }
    if (lower.endsWith('.doc') || lower.endsWith('.docx') || fileType?.includes('word')) {
      return { label: 'WORD', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: <File size={16} className="text-blue-600" /> };
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || fileType?.includes('image')) {
      return { label: 'IMAGE', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <ImageIcon size={16} className="text-emerald-600" /> };
    }
    return { label: 'FILE', bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileText size={16} className="text-gray-600" /> };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Filtered
  const filteredUploads = uploads.filter(u => {
    const matchesSearch = 
      (u.title && u.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.staffName && u.staffName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.fileName && u.fileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.notes && u.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStaff = selectedStaffFilter === "All" || u.staffId === selectedStaffFilter || u.staffName === selectedStaffFilter;
    const matchesCategory = selectedCategoryFilter === "All" || u.category === selectedCategoryFilter;
    const matchesStatus = selectedStatusFilter === "All" || u.status === selectedStatusFilter;
    const matchesDate = !selectedDate || u.date === selectedDate;

    return matchesSearch && matchesStaff && matchesCategory && matchesStatus && matchesDate;
  });

  // Metrics
  const totalFiles = uploads.length;
  const pendingFiles = uploads.filter(u => u.status === 'Pending').length;
  const approvedFiles = uploads.filter(u => u.status === 'Approved').length;
  const totalDeliverables = uploads.reduce((sum, u) => sum + (Number(u.workCount) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <FileText size={14} /> Employee Submissions
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            Daily Work Files & Submissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and download daily work submitted by typists, design workers, and staff (PDF, Word .doc/.docx, JPG, PNG).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 font-medium">Supported Download Formats</p>
            <p className="text-xs font-bold text-gray-800">PDF • Word (.doc/.docx) • JPG • PNG</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Uploaded Files</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{totalFiles}</p>
          <p className="text-xs text-gray-500 mt-1">Submitted across all staff</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Review</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{pendingFiles}</p>
          <p className="text-xs text-amber-700 font-semibold mt-1">Awaiting admin check</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approved Deliverables</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{approvedFiles}</p>
          <p className="text-xs text-emerald-700 font-semibold mt-1">Verified & checked</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Output Volume</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{totalDeliverables} <span className="text-sm font-bold text-gray-500">Items/Pages</span></p>
          <p className="text-xs text-blue-700 font-semibold mt-1">Pages, banners & question papers</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by title, staff name, or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Staff Filter */}
          <div>
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="All">All Staff Members</option>
              {staffs.map((s) => (
                <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              <option value="Typing & Data Entry">Typing & Data Entry</option>
              <option value="Question Paper">Question Paper</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Course Material">Course Material</option>
              <option value="Thumbnails & Media">Thumbnails & Media</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Needs Revision">Needs Revision</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Submissions with Direct Download Button */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Submissions List ({filteredUploads.length})
          </h2>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Clear Date Filter
            </button>
          )}
        </div>

        {filteredUploads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Work File & Details</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Category & Volume</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status & Notes</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Download & Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUploads.map((item) => {
                  const badge = getFileBadge(item.fileName, item.fileType);
                  const isApproved = item.status === 'Approved';

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                            {item.staffName ? item.staffName.charAt(0) : 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900">{item.staffName}</p>
                            <p className="text-[11px] text-gray-400">ID: {item.staffId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3 max-w-sm">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}>
                            {badge.icon}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 truncate max-w-xs">{item.title}</p>
                            <p className="text-xs text-gray-400 truncate max-w-xs">{item.fileName} • {formatFileSize(item.fileSize)}</p>
                            {item.notes && <p className="text-[11px] text-gray-500 italic mt-0.5">{item.notes}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.category}
                        </span>
                        <p className="text-xs font-bold text-gray-800 mt-1">
                          {item.workCount} {item.workUnit || 'Pages'}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <p className="font-bold text-gray-800">{item.date}</p>
                        <p className="text-[11px] text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isApproved 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}>
                          {isApproved ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          {item.status}
                        </span>
                        {item.adminNotes && (
                          <p className="text-[11px] text-gray-600 mt-1 italic max-w-[150px] truncate">
                            "{item.adminNotes}"
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                        {/* Instant Download Button */}
                        {(item.fileData || item.fileUrl || item.hasChunks || (item.fileName && item.fileName !== "Google Drive Link")) ? (
                          <button
                            onClick={() => handleDownloadFile(item)}
                            disabled={downloadingId === item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                            title="Download submitted file (PDF/Word/JPG/PNG)"
                          >
                            <Download size={14} className={downloadingId === item.id ? "animate-bounce" : ""} /> 
                            {downloadingId === item.id ? "Opening..." : "Download"}
                          </button>
                        ) : null}

                        {/* Google Drive Link if provided */}
                        {(item.driveLink || (item.fileUrl && item.fileUrl.startsWith('http'))) && (
                          <a
                            href={item.driveLink || item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                            title="Open Google Drive Link"
                          >
                            <ExternalLink size={13} /> Drive Link
                          </a>
                        )}

                        {/* Approve Button */}
                        {!isApproved && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'Approved', 'Verified by Admin')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                            title="Approve work"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                        )}

                        {/* Feedback / Note button */}
                        <button
                          onClick={() => setFeedbackModal({ show: true, item, notes: item.adminNotes || "" })}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors inline-flex items-center"
                          title="Add admin note / feedback"
                        >
                          <MessageSquare size={15} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-flex items-center"
                          title="Delete submission"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <FileText size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-base font-semibold text-gray-600">No work submissions match your filters.</p>
            <p className="text-xs text-gray-400 mt-1">Design workers and staff uploads will appear here in real-time.</p>
          </div>
        )}
      </div>

      {/* Admin Feedback Modal */}
      {feedbackModal.show && feedbackModal.item && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-black text-gray-900">
              Admin Feedback for {feedbackModal.item.staffName}
            </h3>
            <p className="text-xs text-gray-500">
              Work: <strong>{feedbackModal.item.title}</strong> ({feedbackModal.item.fileName})
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Feedback Notes
              </label>
              <textarea
                rows={3}
                value={feedbackModal.notes}
                onChange={(e) => setFeedbackModal({ ...feedbackModal, notes: e.target.value })}
                placeholder="e.g. Excellent formatting, ready for printing."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              ></textarea>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setFeedbackModal({ show: false, item: null, notes: "" })}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(feedbackModal.item!.id, 'Needs Revision', feedbackModal.notes)}
                  className="px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-xl text-xs font-bold"
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(feedbackModal.item!.id, 'Approved', feedbackModal.notes)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Approve & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
