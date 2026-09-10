import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Globe, 
  Video, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  Menu, 
  X,
  DollarSign,
  Download,
  FileText,
  Bell,
  User,
  Award,
  Briefcase,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Clock,
  Home
} from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getAttendance, getZoomLinks, saveZoomLinks, getHomework, saveHomework, getStaffAttendance, saveStaffAttendance, getTimeTable, saveTimeTable, getStudents, getAdminSettings, getStaffs } from "../../lib/db";
import { getUserSession, saveUserSession, clearUserSession } from "../../lib/authSession";
import CountdownTimer from "../../components/CountdownTimer";
import PopupAnnouncement from "../../components/PopupAnnouncement";
import LiveChat from "../../components/LiveChat";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useHomeworkNotifications } from "../../hooks/useHomeworkNotifications";
import { useTimetableNotifications } from "../../hooks/useTimetableNotifications";
import { motion, AnimatePresence } from "motion/react";

import WorkView from "./components/WorkView";
import EnhancedSalaryView from "./components/EnhancedSalaryView";
import StaffIdCardView from "./components/StaffIdCardView";
import StaffCertificateView from "./components/StaffCertificateView";
import DesignWorkerHome from "./components/DesignWorkerHome";
import TeacherHome from "./components/TeacherHome";
import ManagementStaffHome from "./components/ManagementStaffHome";

export default function StaffDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  
  const [staff, setStaff] = useState<any>(location.state);

  const roleLower = String(staff?.role || "").toLowerCase();

  const isDesignWorker = 
    staff?.role === "Design Worker" || 
    staff?.role === "Technical Staff" || 
    roleLower.includes("design") || 
    roleLower.includes("typist") || 
    roleLower.includes("worker") ||
    roleLower.includes("வடிவமைப்பு") ||
    roleLower.includes("தட்டச்சு");

  const isManagement = 
    staff?.role === "Management" || 
    staff?.role === "Admin Staff" || 
    staff?.role === "Principal" || 
    staff?.role === "Director" ||
    roleLower.includes("management") ||
    roleLower.includes("admin");

  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (staff) {
      const isDesign = 
        staff.role === "Design Worker" || 
        staff.role === "Technical Staff" || 
        String(staff.role || "").toLowerCase().includes("design") || 
        String(staff.role || "").toLowerCase().includes("typist") || 
        String(staff.role || "").toLowerCase().includes("worker") ||
        String(staff.role || "").toLowerCase().includes("வடிவமைப்பு") ||
        String(staff.role || "").toLowerCase().includes("தட்டச்சு");
      
      if (isDesign && activeTab === "website") {
        setActiveTab("work");
      }
    }
  }, [staff]);

  const isChatOpen = activeTab === "chat";
  const { unreadCount, markAsRead } = useChatNotifications(staff ? { id: staff.id, name: staff.name, role: "Staff" } : null, isChatOpen);

  const { notifications } = useHomeworkNotifications('staff');
  const { reminders: staffTimetableReminders } = useTimetableNotifications('staff', undefined, staff?.name);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const allStaffNotifications = [
    ...staffTimetableReminders.map(tr => ({
      id: tr.id,
      title: `Upcoming Class (${tr.grade})`,
      message: tr.message,
      date: tr.startTime,
      type: 'zoom_class' as const,
      isRead: false
    })),
    ...notifications
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshStaffData = async () => {
    try {
      const allStaffs = await getStaffs();
      if (allStaffs && Array.isArray(allStaffs)) {
        const currentId = staff?.id || location.state?.id || getUserSession()?.id;
        const currentUsername = staff?.username || location.state?.username || getUserSession()?.username;
        const currentName = staff?.name || location.state?.name || getUserSession()?.name;
        
        const freshStaff = allStaffs.find((s: any) => 
          (currentId && s.id === currentId) || 
          (currentUsername && s.username === currentUsername) ||
          (currentName && s.name === currentName)
        );

        if (freshStaff) {
          setStaff(freshStaff);
          saveUserSession({ ...freshStaff, role: 'Staff' });
        }
      }
    } catch (err) {
      console.warn("Failed to sync staff data:", err);
    }
  };

  useEffect(() => {
    let data = staff || location.state;
    if (!data) {
      const session = getUserSession();
      if (session && session.role === 'Staff') {
        data = session;
        setStaff(session);
      }
    }

    if (!data) {
      navigate("/", { replace: true });
      return;
    }

    // Refresh staff data from database immediately on load
    refreshStaffData();

    getAdminSettings().then(settingsData => {
      if (settingsData) setAdminSettings(settingsData);
    });

    // Listen for real-time db updates
    const handleDbUpdate = (e: any) => {
      if (e.detail?.key === 'staffs' || e.detail?.key === 'adminSettings') {
        refreshStaffData();
        if (e.detail?.key === 'adminSettings') {
          setAdminSettings(e.detail.data);
        }
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    const interval = setInterval(refreshStaffData, 5000);

    return () => {
      window.removeEventListener('db_updated', handleDbUpdate);
      clearInterval(interval);
    };
  }, [navigate, location.state]);

  if (!staff) return null;

  const handleLogout = () => {
    clearUserSession();
    navigate("/", { replace: true });
  };

  const navItems = isDesignWorker ? [
    { id: "home", name: "Homepage", icon: <Home size={20} /> },
    { id: "work", name: "My Work & Tasks", icon: <Briefcase size={20} /> },
    { id: "salary", name: "Salary Details", icon: <DollarSign size={20} /> },
    { id: "my-attendance", name: "Attendance Log", icon: <Calendar size={20} /> },
    { id: "idcard", name: "Staff ID Card", icon: <CreditCard size={20} /> },
    { id: "certificate", name: "My Certificate", icon: <Award size={20} /> },
    { id: "chat", name: "Live Chat", icon: <WhatsAppIcon size={20} /> },
    { id: "profile", name: "Profile", icon: <User size={20} /> },
  ] : isManagement ? [
    { id: "home", name: "Homepage", icon: <Home size={20} /> },
    { id: "work", name: "Daily Work Submissions", icon: <Briefcase size={20} /> },
    { id: "salary", name: "Salary Details", icon: <DollarSign size={20} /> },
    { id: "my-attendance", name: "Attendance Log", icon: <Calendar size={20} /> },
    { id: "idcard", name: "Staff ID Card", icon: <CreditCard size={20} /> },
    { id: "certificate", name: "My Certificate", icon: <Award size={20} /> },
    { id: "chat", name: "Live Chat", icon: <WhatsAppIcon size={20} /> },
    { id: "profile", name: "Profile", icon: <User size={20} /> },
  ] : [
    { id: "home", name: "Homepage", icon: <Home size={20} /> },
    { id: "timetable", name: "My Timetable", icon: <Calendar size={20} /> },
    { id: "zoom", name: "Add Zoom Links", icon: <Video size={20} /> },
    { id: "homework", name: "Assign Homework", icon: <BookOpen size={20} /> },
    { id: "student-attendance", name: "Student Attendance", icon: <UserCheck size={20} /> },
    { id: "my-attendance", name: "My Classes (Attendance)", icon: <Calendar size={20} /> },
    { id: "salary", name: "Salary Details", icon: <DollarSign size={20} /> },
    { id: "idcard", name: "Staff ID Card", icon: <CreditCard size={20} /> },
    { id: "certificate", name: "My Certificate", icon: <Award size={20} /> },
    { id: "chat", name: "Live Chat", icon: <WhatsAppIcon size={20} /> },
    { id: "profile", name: "Profile", icon: <User size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      <PopupAnnouncement userRole="Staff" />
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-semibold">Staff Panel</h1>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-blue-900 text-white flex flex-col shadow-xl`}>
        <div className="p-6 flex items-center justify-between bg-blue-950">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {adminSettings?.profileImage ? (
                <img src={adminSettings.profileImage} alt="Logo" className="w-8 h-8 object-cover rounded-lg shadow-inner" />
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-inner transform -rotate-3">
                  <BookOpen size={18} className="text-white" />
                </div>
              )}
              <h2 className="text-xl font-bold text-white">{adminSettings?.instituteName || "Staff Panel"}</h2>
            </div>
            <p className="text-blue-300 text-sm mt-1">Welcome, {staff.name}</p>
            <p className="text-blue-400 text-xs mt-0.5">{staff.role}</p>
          </div>
          <button className="md:hidden text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { 
                setActiveTab(item.id); 
                if (item.id === "chat") markAsRead();
                setIsSidebarOpen(false); 
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id ? "bg-blue-600 text-white shadow-md" : "text-blue-100 hover:bg-blue-800 hover:text-white"
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </div>
              {item.id === "chat" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-blue-100 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200">
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white shadow-sm px-8 py-4 hidden md:flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {navItems.find(i => i.id === activeTab)?.name}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationsRef}>
              <button 
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {allStaffNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-gray-800"
                  >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">Notifications</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {allStaffNotifications.length} New
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {allStaffNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <Bell className="mx-auto mb-2 text-gray-300" size={24} />
                          <p>No new notifications</p>
                        </div>
                      ) : (
                        allStaffNotifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" 
                            onClick={() => { 
                              if (notif.type === 'zoom_class') {
                                setActiveTab('timetable');
                              } else {
                                setActiveTab('homework'); 
                              }
                              setShowNotifications(false); 
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'zoom_class' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                {notif.type === 'zoom_class' ? <Calendar size={16} /> : <BookOpen size={16} />}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-gray-800">{notif.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                                <span className="text-[10px] text-gray-400 mt-2 block">{notif.date}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
              <span>{staff.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span className="text-blue-600">{staff.role}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === "home" && (
            isDesignWorker ? (
              <DesignWorkerHome 
                staff={staff} 
                adminSettings={adminSettings} 
                onNavigateTab={setActiveTab} 
                onRefreshStaff={refreshStaffData} 
              />
            ) : isManagement ? (
              <ManagementStaffHome 
                staff={staff} 
                adminSettings={adminSettings} 
                onNavigateTab={setActiveTab} 
              />
            ) : (
              <TeacherHome 
                staff={staff} 
                adminSettings={adminSettings} 
                onNavigateTab={setActiveTab} 
              />
            )
          )}
          {activeTab === "work" && <WorkView staff={staff} adminSettings={adminSettings} />}
          {activeTab === "timetable" && <TimetableManager staff={staff} />}
          {activeTab === "zoom" && <ZoomManager staff={staff} />}
          {activeTab === "homework" && <HomeworkManager staff={staff} />}
          {activeTab === "student-attendance" && <StudentAttendanceView staff={staff} />}
          {activeTab === "my-attendance" && <StaffAttendanceView staff={staff} />}
          {activeTab === "salary" && <EnhancedSalaryView staff={staff} adminSettings={adminSettings} onRefresh={refreshStaffData} />}
          {activeTab === "idcard" && <StaffIdCardView staff={staff} adminSettings={adminSettings} />}
          {activeTab === "certificate" && <StaffCertificateView staff={staff} adminSettings={adminSettings} />}
          {activeTab === "profile" && <ProfileView staff={staff} adminSettings={adminSettings} />}
          {activeTab === "chat" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center shrink-0">
                <WhatsAppIcon className="mr-3 text-purple-500" size={28} />
                Live Chat
              </h2>
              <div className="flex-1 overflow-hidden">
                <LiveChat currentUser={{ id: staff.id, name: staff.name, role: "Staff" }} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileView({ staff, adminSettings }: { staff: any, adminSettings: any }) {
  const handleDownloadIdCard = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('staff-id-card-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${staff.name}_ID_Card.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [3.375, 2.125]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 3.375, 2.125);
        pdf.save(`${staff.name}_ID_Card.pdf`);
      }
    } catch (error) {
      console.error("Error generating ID card:", error);
      alert("Failed to generate ID card. Please try again.");
    }
  };

  const handleDownloadCertificate = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('staff-certificate-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${staff.name}_Certificate.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [11, 8.5]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5);
        pdf.save(`${staff.name}_Certificate.pdf`);
      }
    } catch (error) {
      console.error("Error generating Certificate:", error);
      alert("Failed to generate Certificate. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Account Details</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Name</span>
            <span className="font-bold text-gray-800">{staff.name}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Username</span>
            <span className="font-bold text-gray-800">{staff.username}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Role</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{staff.role}</span>
          </div>
          <div className="flex justify-between items-center pb-1">
            <span className="text-gray-500 font-medium">Staff ID</span>
            <span className="font-bold text-gray-800 font-mono bg-gray-100 px-2 py-0.5 rounded">{staff.id}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 mt-6">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Download size={18} /> Downloads
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Staff ID Card</h4>
              <p className="text-xs text-gray-500 mt-1">Download your official ID card</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={() => handleDownloadIdCard('pdf')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">PDF</button>
              <button onClick={() => handleDownloadIdCard('png')} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors">PNG</button>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
              <Award size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Certificate</h4>
              <p className="text-xs text-gray-500 mt-1">Download your certificate</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={() => handleDownloadCertificate('pdf')} className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">PDF</button>
              <button onClick={() => handleDownloadCertificate('png')} className="flex-1 bg-amber-100 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">PNG</button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Templates for Download */}
      <div className="fixed top-0 left-0 z-[-50] pointer-events-none opacity-0">
        {/* ID Card Template */}
        <div 
          id="staff-id-card-template" 
          className="w-[3.375in] h-[2.125in] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-xl p-0 relative overflow-hidden text-white shadow-lg shrink-0 flex"
        >
          {/* Background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>

          <div className="flex h-full w-full">
            {/* Left side - Photo & QR */}
            <div className="w-[35%] bg-white/10 backdrop-blur-sm p-2 flex flex-col items-center justify-center border-r border-white/20">
              <div className="w-14 h-14 bg-white rounded-full mb-2 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                <User size={28} className="text-blue-600" />
              </div>
              <div className="bg-white p-1 rounded shadow-sm">
                <QRCodeSVG value={staff.id} size={55} level="H" includeMargin={false} />
              </div>
            </div>

            {/* Right side - Details */}
            <div className="w-[65%] p-3 flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1 border-b border-white/20 pb-1">{adminSettings?.instituteName || "Agaram Academy"}</h3>
                <h2 className="text-sm font-bold leading-tight mb-1 truncate">{staff.name}</h2>
                <div className="text-[9px] space-y-0.5 opacity-90">
                  <p>Role: <span className="font-semibold">{staff.role}</span></p>
                  <p>Staff ID: <span className="font-semibold">{staff.id}</span></p>
                </div>
              </div>
              
              <div className="mt-auto bg-black/25 p-1.5 rounded text-[8px] font-mono leading-tight">
                <p className="flex justify-between"><span>User:</span> <span className="font-bold">{staff.username}</span></p>
                <p className="flex justify-between"><span>Pass:</span> <span className="font-bold">{staff.password}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Template */}
        <div 
          id="staff-certificate-template" 
          className="w-[11in] h-[8.5in] bg-gradient-to-br from-amber-50/60 via-white to-blue-50/40 p-10 relative shrink-0 flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          {/* Ornate Gold & Royal Blue Borders */}
          <div className="absolute inset-4 border-[10px] border-double border-blue-900 rounded-3xl pointer-events-none"></div>
          <div className="absolute inset-7 border-2 border-amber-400/80 rounded-2xl pointer-events-none"></div>
          
          {/* Ornate Corner Accents */}
          <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-amber-500 pointer-events-none"></div>
          <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-amber-500 pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-amber-500 pointer-events-none"></div>
          <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-amber-500 pointer-events-none"></div>

          {/* Background Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
            <Award size={520} className="text-blue-900" />
          </div>

          <div className="relative z-10 h-full w-full flex flex-col items-center justify-between text-center px-12 py-4">
            
            {/* Top Academy Logo & Branding Header */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg border-2 border-amber-400 mb-2 overflow-hidden flex items-center justify-center">
                <img 
                  src={adminSettings?.profileImage || "/logo.png"} 
                  alt="AGARAM DHINES ONLINE ACADEMY" 
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wider text-blue-950 leading-tight">
                {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
              </h3>
              <p className="text-base font-extrabold text-amber-600 mt-0.5 tracking-wide">
                அகரம் தினேஷ் ஆன்லைன் அகாடமி <span className="text-blue-800 text-sm ml-2 font-bold">| 📞 778054232</span>
              </p>
            </div>

            {/* Certificate Main Title */}
            <div className="my-2">
              <h1 className="text-5xl font-serif font-black text-blue-900 tracking-wide uppercase drop-shadow-xs">
                Certificate of Appreciation
              </h1>
              <p className="text-sm font-black text-amber-600 uppercase tracking-[0.3em] mt-1">
                Official Staff Recognition Award
              </p>
            </div>

            {/* Presentation Line & Name */}
            <div className="w-full max-w-3xl">
              <p className="text-base text-gray-600 font-medium tracking-widest uppercase mb-1">
                This is proudly presented to
              </p>
              <h2 className="text-4xl font-extrabold text-blue-950 border-b-4 border-amber-400 pb-2 px-10 inline-block font-serif drop-shadow-xs">
                {staff.name}
              </h2>
            </div>

            {/* Citation */}
            <p className="text-lg text-gray-700 max-w-3xl leading-relaxed font-serif my-2">
              For outstanding dedication, leadership, and invaluable service as <span className="font-bold text-blue-900">{staff.role || 'Staff Member'}</span> at AGARAM DHINES ONLINE ACADEMY.
            </p>

            {/* Footer with Signatures, Seal & Staff Credentials + QR */}
            <div className="flex justify-between items-end w-full mt-auto pt-4">
              {/* Date */}
              <div className="text-center w-48">
                <p className="font-bold text-gray-900 text-sm mb-1">{new Date().toLocaleDateString()}</p>
                <div className="w-full border-b-2 border-blue-900 mb-1"></div>
                <p className="font-bold text-blue-900 text-xs uppercase tracking-widest">Date / தேதி</p>
              </div>

              {/* Center Stamp & Credentials Badge */}
              <div className="flex items-center gap-4 bg-white/90 p-3 rounded-2xl border-2 border-amber-300 shadow-md backdrop-blur-sm">
                <div className="bg-white p-1 rounded-lg border border-blue-100 shadow-xs">
                  <QRCodeSVG value={staff.id} size={70} level="H" includeMargin={false} />
                </div>
                <div className="text-left text-xs font-medium text-slate-800 space-y-0.5">
                  <p><span className="font-bold text-blue-900 w-16 inline-block">Staff ID:</span> <strong className="text-slate-900">{staff.id}</strong></p>
                  <p><span className="font-bold text-blue-900 w-16 inline-block">Username:</span> <span className="font-mono font-bold text-blue-700">{staff.username}</span></p>
                  <p><span className="font-bold text-blue-900 w-16 inline-block">Password:</span> <span className="font-mono font-bold text-amber-600">{staff.password}</span></p>
                </div>
              </div>

              {/* Director Signature */}
              <div className="text-center w-48">
                <div className="font-serif italic text-xl text-blue-900 font-bold mb-1">Dhines Nivas</div>
                <div className="w-full border-b-2 border-blue-900 mb-1"></div>
                <p className="font-bold text-blue-900 text-xs uppercase tracking-widest">Director / இயக்குனர்</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteView() {
  return (
    <div className="h-full w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">Agaram Dhines Academy Website</h3>
        <a href="https://www.agaramdhines.lk" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">Open in new tab</a>
      </div>
      <iframe src="https://www.agaramdhines.lk" className="w-full flex-1 border-0" title="Agaram Website" />
    </div>
  );
}

function ZoomManager({ staff }: { staff: any }) {
  const [links, setLinks] = useState<any[]>([]);
  const [formData, setFormData] = useState({ grade: "", subject: "", title: "", link: "", datetime: "", hostKey: "", meetingId: "", passcode: "" });

  useEffect(() => {
    getZoomLinks().then(setLinks);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newLink = { ...formData, id: Date.now().toString(), staffId: staff.id, staffName: staff.name };
    const updated = [...links, newLink];
    await saveZoomLinks(updated);
    setLinks(updated);
    setFormData({ grade: "", subject: "", title: "", link: "", datetime: "", hostKey: "", meetingId: "", passcode: "" });
    
    // Also log this as a class conducted by the staff
    const staffAtt = await getStaffAttendance() || [];
    await saveStaffAttendance([...staffAtt, {
      id: Date.now().toString(),
      staffId: staff.id,
      staffName: staff.name,
      type: "Zoom Class Added",
      date: new Date().toISOString(),
      details: `${formData.title} (${formData.grade} - ${formData.subject})`
    }]);
    
    alert("Zoom link added successfully!");
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staff.assignedClasses?.[parseInt(e.target.value)];
    if (selected) {
      setFormData({ ...formData, grade: selected.grade, subject: selected.subject });
    } else {
      setFormData({ ...formData, grade: "", subject: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Zoom Link</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select 
            required 
            onChange={handleClassSelect} 
            className="border p-2 rounded"
            defaultValue=""
          >
            <option value="" disabled>Select Assigned Class</option>
            {staff.assignedClasses?.map((cls: any, idx: number) => (
              <option key={idx} value={idx}>{cls.grade} - {cls.subject}</option>
            ))}
            {(!staff.assignedClasses || staff.assignedClasses.length === 0) && (
              <option value="" disabled>No classes assigned to you.</option>
            )}
          </select>
          <input required placeholder="Topic / Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="border p-2 rounded" />
          <input required placeholder="Zoom Link" type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Meeting ID" value={formData.meetingId} onChange={e => setFormData({...formData, meetingId: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Passcode" value={formData.passcode} onChange={e => setFormData({...formData, passcode: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Host Key" value={formData.hostKey} onChange={e => setFormData({...formData, hostKey: e.target.value})} className="border p-2 rounded" />
          <input required type="datetime-local" value={formData.datetime} onChange={e => setFormData({...formData, datetime: e.target.value})} className="border p-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium" disabled={!formData.grade}>Add Link</button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Recent Zoom Links</h3>
        <div className="space-y-3">
          {links.filter(l => l.staffId === staff.id).map(link => (
            <div key={link.id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold">{link.title} <span className="text-sm text-gray-500 font-normal">({link.grade} - {link.subject})</span></p>
                <div className="flex items-center gap-3 mt-1 mb-1">
                  <p className="text-sm text-gray-600">Time: {new Date(link.datetime).toLocaleString()}</p>
                  <CountdownTimer targetDate={link.datetime} />
                </div>
                <p className="text-sm text-gray-600">Host Key: <span className="font-mono bg-gray-100 px-1 rounded">{link.hostKey || 'N/A'}</span></p>
                {link.meetingId && <p className="text-sm text-gray-600">Meeting ID: <span className="font-mono bg-gray-100 px-1 rounded">{link.meetingId}</span></p>}
                {link.passcode && <p className="text-sm text-gray-600">Passcode: <span className="font-mono bg-gray-100 px-1 rounded">{link.passcode}</span></p>}
              </div>
              <a href={link.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Join</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimetableManager({ staff }: { staff: any }) {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [formData, setFormData] = useState({ grade: "", subject: "", day: "Monday", startTime: "", endTime: "" });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    getTimeTable().then(setTimetable);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = { 
      ...formData, 
      id: Date.now().toString(), 
      staffId: staff.id, 
      staffName: staff.name 
    };
    const updated = [...timetable, newEntry];
    await saveTimeTable(updated);
    setTimetable(updated);
    setFormData({ ...formData, startTime: "", endTime: "" });
    alert("Timetable entry added successfully!");
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staff.assignedClasses?.[parseInt(e.target.value)];
    if (selected) {
      setFormData({ ...formData, grade: selected.grade, subject: selected.subject });
    } else {
      setFormData({ ...formData, grade: "", subject: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add Timetable Entry</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class & Subject</label>
            <select 
              required 
              onChange={handleClassSelect} 
              className="border p-2 rounded w-full"
              defaultValue=""
            >
              <option value="" disabled>Select Assigned Class</option>
              {staff.assignedClasses?.map((cls: any, idx: number) => (
                <option key={idx} value={idx}>{cls.grade} - {cls.subject}</option>
              ))}
              {(!staff.assignedClasses || staff.assignedClasses.length === 0) && (
                <option value="" disabled>No classes assigned to you.</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
            <select 
              required 
              value={formData.day} 
              onChange={e => setFormData({...formData, day: e.target.value})} 
              className="border p-2 rounded w-full"
            >
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="border p-2 rounded w-full" />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium md:col-span-2" disabled={!formData.grade}>Add to Timetable</button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Timetable</h3>
        <div className="space-y-3">
          {timetable.filter(t => t.staffId === staff.id).sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day)).map(entry => (
            <div key={entry.id} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-gray-800">{entry.subject} <span className="text-sm text-gray-500 font-normal">({entry.grade})</span></p>
                <p className="text-sm text-blue-600 font-medium">{entry.day}: {entry.startTime} - {entry.endTime}</p>
              </div>
              <button onClick={async () => {
                if(window.confirm("Delete this entry?")) {
                  const updated = timetable.filter(t => t.id !== entry.id);
                  setTimetable(updated);
                  await saveTimeTable(updated);
                }
              }} className="text-red-500 hover:text-red-700 p-2">
                <X size={18} />
              </button>
            </div>
          ))}
          {timetable.filter(t => t.staffId === staff.id).length === 0 && (
            <p className="text-gray-500 italic">No timetable entries found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeworkManager({ staff }: { staff: any }) {
  const [homework, setHomework] = useState<any[]>([]);
  const [formData, setFormData] = useState({ grade: "", subject: "", title: "", description: "", date: "" });

  useEffect(() => {
    getHomework().then(setHomework);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newHw = { ...formData, id: Date.now().toString(), staffId: staff.id, staffName: staff.name };
    const updated = [...homework, newHw];
    await saveHomework(updated);
    setHomework(updated);
    setFormData({ grade: "", subject: "", title: "", description: "", date: "" });
    alert("Homework assigned successfully!");
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staff.assignedClasses?.[parseInt(e.target.value)];
    if (selected) {
      setFormData({ ...formData, grade: selected.grade, subject: selected.subject });
    } else {
      setFormData({ ...formData, grade: "", subject: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Assign Homework</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select 
              required 
              onChange={handleClassSelect} 
              className="border p-2 rounded"
              defaultValue=""
            >
              <option value="" disabled>Select Assigned Class</option>
              {staff.assignedClasses?.map((cls: any, idx: number) => (
                <option key={idx} value={idx}>{cls.grade} - {cls.subject}</option>
              ))}
              {(!staff.assignedClasses || staff.assignedClasses.length === 0) && (
                <option value="" disabled>No classes assigned to you.</option>
              )}
            </select>
            <input required placeholder="Topic / Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="border p-2 rounded" />
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="border p-2 rounded md:col-span-2" />
          </div>
          <textarea required placeholder="Homework Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="border p-2 rounded h-24" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium w-full md:w-auto md:px-8" disabled={!formData.grade}>Assign</button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Recent Homework</h3>
        <div className="space-y-3">
          {homework.filter(h => h.staffId === staff.id).map(hw => (
            <div key={hw.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800">{hw.title} <span className="text-sm font-normal text-gray-500">({hw.grade} - {hw.subject})</span></h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Due: {hw.date}</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{hw.description}</p>
            </div>
          ))}
          {homework.filter(h => h.staffId === staff.id).length === 0 && (
            <p className="text-gray-500 italic">No homework assigned yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentAttendanceView({ staff }: { staff: any }) {
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const allAttendance = await getAttendance();
      const allStudents = await getStudents();
      
      const assignedGrades = staff.assignedClasses?.map((c: any) => c.grade) || [];
      
      // Map student data to attendance records
      const enrichedAttendance = allAttendance.map((record: any) => {
        const student = allStudents.find((s: any) => s.id === record.studentId);
        return {
          ...record,
          studentName: student?.name || 'Unknown',
          grade: student?.grade || 'Unknown'
        };
      });

      // Filter attendance to only show records for students in the staff's assigned classes
      const filtered = enrichedAttendance.filter((record: any) => assignedGrades.includes(record.grade));
      setAttendance(filtered);
    };
    loadData();
  }, [staff]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Student Attendance Records</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.map((record: any) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(record.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.studentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.grade}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                    record.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                    record.status === 'Leave' ? 'bg-yellow-100 text-yellow-800' : 
                    record.status === 'Late' ? 'bg-orange-100 text-orange-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No attendance records found for your assigned classes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffAttendanceView({ staff }: { staff: any }) {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    getStaffAttendance().then(data => {
      const myRecords = (data || []).filter((r: any) => r.staffId === staff.id);
      setRecords(myRecords);
    });
  }, [staff.id]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const classesThisMonth = records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Classes This Month</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{classesThisMonth}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Classes</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{records.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Activity Log</h3>
        <div className="space-y-3">
          {records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
            <div key={record.id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-800">{record.type}</p>
                <p className="text-sm text-gray-600">{record.details}</p>
              </div>
              <p className="text-sm text-gray-500">{new Date(record.date).toLocaleString()}</p>
            </div>
          ))}
          {records.length === 0 && <p className="text-gray-500 text-center py-4">No activity recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
