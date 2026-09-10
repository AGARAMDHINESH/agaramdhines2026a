import React, { useState, useEffect } from "react";
import { 
  Video, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  DollarSign, 
  Clock, 
  Plus, 
  CheckCircle2, 
  ExternalLink, 
  Award, 
  Users, 
  Sparkles,
  ChevronRight,
  Download
} from "lucide-react";
import { 
  getZoomLinks, 
  getTimeTable, 
  getHomework, 
  getAttendance, 
  getStaffAttendance, 
  saveStaffAttendance,
  getStudents
} from "../../../lib/db";
import CountdownTimer from "../../../components/CountdownTimer";

interface TeacherHomeProps {
  staff: any;
  adminSettings: any;
  onNavigateTab: (tabId: string) => void;
}

export default function TeacherHome({ staff, adminSettings, onNavigateTab }: TeacherHomeProps) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const [zoomLinks, setZoomLinks] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    loadTeacherData();

    const handleDbUpdate = () => {
      loadTeacherData();
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [staff.id]);

  const loadTeacherData = async () => {
    try {
      const [allZoom, allTt, allHw, allAtt, allStd] = await Promise.all([
        getZoomLinks(),
        getTimeTable(),
        getHomework(),
        getStaffAttendance(),
        getStudents()
      ]);

      setZoomLinks((allZoom || []).filter(z => z.staffId === staff.id || z.staffName === staff.name));
      setTimetable((allTt || []).filter(t => t.staffId === staff.id || t.staffName === staff.name || t.day === todayDayName));
      setHomeworkList((allHw || []).filter(h => h.staffId === staff.id || h.staffName === staff.name));
      setStaffAttendance((allAtt || []).filter((a: any) => a.staffId === staff.id || a.staffName === staff.name));
      setStudents(allStd || []);
    } catch (err) {
      console.warn("Failed to load teacher data:", err);
    }
  };

  // Salary & Attendance
  const baseSalary = Number(staff.salary) || 0;
  const payments = staff.payments || [];
  const isPaidThisMonth = payments.some((p: any) => p && (p.month === currentMonthStr || p.month === currentMonthName));

  const thisMonthAtt = staffAttendance.filter((a: any) => a.date?.startsWith(currentMonthStr));
  const isCheckedInToday = staffAttendance.some((a: any) => a.date?.startsWith(todayStr));

  const handleToggleAttendanceToday = async () => {
    try {
      const now = new Date();
      const allAtt = await getStaffAttendance() || [];

      if (!isCheckedInToday) {
        const newRecord = {
          id: `att_${Date.now()}`,
          staffId: staff.id,
          staffName: staff.name,
          date: todayStr,
          checkInTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Present',
          type: 'Teacher Check-in',
          createdAt: now.toISOString()
        };
        const updated = [newRecord, ...allAtt];
        await saveStaffAttendance(updated);
        setStaffAttendance(updated.filter((a: any) => a.staffId === staff.id || a.staffName === staff.name));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upcoming Zoom classes
  const upcomingZoomClasses = zoomLinks
    .filter(z => z.datetime)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 5);

  // Today's Timetable classes
  const todayClasses = timetable.filter(t => t.day === todayDayName);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Hero Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-blue-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-yellow-300" />
              Teacher & Faculty Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              வணக்கம், {staff.name}!
            </h1>
            <p className="text-blue-200 text-sm max-w-xl">
              Manage your live Zoom classes, timetable, student attendance, homework evaluations, and check your salary details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleAttendanceToday}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md ${
                isCheckedInToday 
                  ? "bg-emerald-500 text-white" 
                  : "bg-white hover:bg-blue-50 text-blue-900"
              }`}
            >
              <CheckCircle2 size={16} />
              <span>{isCheckedInToday ? "Checked-in Today ✓" : "Mark Today Check-in"}</span>
            </button>

            <button
              onClick={() => onNavigateTab("zoom")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
            >
              <Plus size={16} />
              <span>Create Zoom Class</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Classes */}
        <div 
          onClick={() => onNavigateTab("timetable")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Calendar size={22} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {todayDayName}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Classes</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {todayClasses.length} <span className="text-xs font-bold text-gray-500">Sessions</span>
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              View full timetable <ChevronRight size={14} />
            </p>
          </div>
        </div>

        {/* Metric 2: Live Zoom Classes */}
        <div 
          onClick={() => onNavigateTab("zoom")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <Video size={22} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Zoom
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Links</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {zoomLinks.length} <span className="text-xs font-bold text-gray-500">Links</span>
            </p>
            <p className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
              Manage zoom sessions <ChevronRight size={14} />
            </p>
          </div>
        </div>

        {/* Metric 3: Active Homework */}
        <div 
          onClick={() => onNavigateTab("homework")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
              <BookOpen size={22} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Tasks
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Homework</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {homeworkList.length} <span className="text-xs font-bold text-gray-500">Tasks</span>
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
              Assign new homework <ChevronRight size={14} />
            </p>
          </div>
        </div>

        {/* Metric 4: Monthly Salary */}
        <div 
          onClick={() => onNavigateTab("salary")}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <DollarSign size={22} />
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isPaidThisMonth ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"
            }`}>
              {isPaidThisMonth ? "Paid ✓" : "Pending"}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Salary</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              Rs. {baseSalary.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              View salary slip <ChevronRight size={14} />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Action Hub: Upcoming Zoom Classes & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upcoming Zoom Live Classes */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Video size={20} className="text-blue-600" />
                Upcoming Live Zoom Classes
              </h2>
              <p className="text-xs text-gray-500">Live online class schedule for your assigned subjects</p>
            </div>
            <button
              onClick={() => onNavigateTab("zoom")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Add New <Plus size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingZoomClasses.length > 0 ? (
              upcomingZoomClasses.map((z) => (
                <div key={z.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{z.title}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      <span className="font-bold text-blue-700">{z.grade}</span> • {z.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {new Date(z.datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <CountdownTimer targetDate={z.datetime} />
                    </div>
                  </div>

                  <a
                    href={z.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    <Video size={14} /> Start / Join Class
                  </a>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Video size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold">No Zoom links added yet.</p>
                <button
                  onClick={() => onNavigateTab("zoom")}
                  className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block"
                >
                  Click here to create a Zoom link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Timetable & Student Shortcuts */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-600" />
                Today's Timetable ({todayDayName})
              </h2>
              <p className="text-xs text-gray-500">Your scheduled periods for today</p>
            </div>
            <button
              onClick={() => onNavigateTab("timetable")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {todayClasses.length > 0 ? (
              todayClasses.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{item.subject}</p>
                      <p className="text-xs text-gray-500 font-medium">{item.grade}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                      {item.startTime || "N/A"} - {item.endTime || "N/A"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Calendar size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold">No classes scheduled for today ({todayDayName}).</p>
                <button
                  onClick={() => onNavigateTab("timetable")}
                  className="text-xs text-indigo-600 font-bold hover:underline mt-1 inline-block"
                >
                  Manage Timetable
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateTab("student-attendance")}
              className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <UserCheck size={16} />
              <span>Mark Student Attendance</span>
            </button>

            <button
              onClick={() => onNavigateTab("homework")}
              className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen size={16} />
              <span>Assign Homework</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
