import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  DollarSign, 
  FileText, 
  Bell, 
  Briefcase, 
  ShieldCheck, 
  TrendingUp, 
  ChevronRight,
  Sparkles,
  Award
} from "lucide-react";
import { 
  getStudents, 
  getStaffs, 
  getFees, 
  getDailyWorkUploads, 
  getAnnouncements,
  getStaffAttendance 
} from "../../../lib/db";

interface ManagementStaffHomeProps {
  staff: any;
  adminSettings: any;
  onNavigateTab: (tabId: string) => void;
}

export default function ManagementStaffHome({ staff, adminSettings, onNavigateTab }: ManagementStaffHomeProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [workUploads, setWorkUploads] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    loadManagementData();

    const handleDbUpdate = () => {
      loadManagementData();
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const loadManagementData = async () => {
    try {
      const [allStd, allStf, allFee, allUploads, allAnn, allAtt] = await Promise.all([
        getStudents(),
        getStaffs(),
        getFees(),
        getDailyWorkUploads(),
        getAnnouncements(),
        getStaffAttendance()
      ]);

      setStudents(allStd || []);
      setStaffs(allStf || []);
      setFees(allFee || []);
      setWorkUploads(allUploads || []);
      setAnnouncements(allAnn || []);
      setAttendance(allAtt || []);
    } catch (err) {
      console.warn("Failed to load management overview:", err);
    }
  };

  const pendingWorkSubmissions = workUploads.filter(u => u.status === 'Pending');
  const pendingPasswordRequests = students.filter(s => s.passwordResetRequested);
  const totalEmployees = staffs.length;
  const totalStudents = students.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 md:p-8 shadow-xl border border-blue-800/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-emerald-400" />
              Management & Operations Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              வணக்கம், {staff.name}!
            </h1>
            <p className="text-blue-200 text-sm max-w-xl">
              Overview of academy administrative actions to be taken, staff deliverables, verification queues, and operational metrics.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[160px]">
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Total Enrolled</p>
            <p className="text-3xl font-black text-white mt-0.5">{totalStudents}</p>
            <p className="text-[11px] text-blue-300 font-semibold mt-0.5">{totalEmployees} Staff Members</p>
          </div>
        </div>
      </div>

      {/* 2. Urgent Actions to be Taken Section */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <AlertCircle size={22} className="text-amber-500" />
              Management Actions to be Taken (செயல்கள்)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Tasks, approvals, and reviews pending management action</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {pendingWorkSubmissions.length + pendingPasswordRequests.length} Pending
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1: Staff Daily Work Submissions Review */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Staff Submissions
                </span>
                <span className="text-xs text-gray-500 font-semibold">{pendingWorkSubmissions.length} Pending</span>
              </div>
              <h3 className="font-bold text-base text-gray-900">Review Daily Work Files</h3>
              <p className="text-xs text-gray-600">
                Design workers and typists have uploaded {pendingWorkSubmissions.length} work files (PDF, Word, Images) requiring admin download and verification.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-blue-600">
                {pendingWorkSubmissions.length > 0 ? "Review Required" : "All Caught Up ✓"}
              </span>
              <button
                onClick={() => onNavigateTab("work")}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Open Work Portal <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Action 2: Staff Salary & Monthly Attendance Disbursals */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Payroll & Disbursals
                </span>
                <span className="text-xs text-gray-500 font-semibold">{staffs.length} Staff</span>
              </div>
              <h3 className="font-bold text-base text-gray-900">Monthly Salary Status</h3>
              <p className="text-xs text-gray-600">
                Ensure monthly salaries, attendance logs, and staff performance allowances are reviewed and disbursed on schedule.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-700">Salary Management</span>
              <button
                onClick={() => onNavigateTab("salary")}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View Salary <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
