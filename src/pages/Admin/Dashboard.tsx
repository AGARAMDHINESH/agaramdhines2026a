import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { getAdminSettings } from "../../lib/db";
import { getUserSession, clearUserSession } from "../../lib/authSession";
import PopupAnnouncement from "../../components/PopupAnnouncement";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useHomeworkNotifications } from "../../hooks/useHomeworkNotifications";
import { useTimetableNotifications } from "../../hooks/useTimetableNotifications";
import {
  Menu,
  X,
  Home,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Bell,
  Briefcase,
  Settings,
  Clock,
  LogOut,
  Image as ImageIcon,
  Mic,
  Video,
  Search,
  Link,
  Video as VideoIcon,
  Award,
  Globe,
  Youtube as YoutubeIcon,
  Maximize,
  ChevronDown,
  MessageSquare,
  ChevronRight,
  MessageCircle
} from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import LiveChat from "../../components/LiveChat";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isChatOpen = location.pathname === "/admin/live-chat" || isChatModalOpen;
  const adminUser = React.useMemo(() => ({ id: "admin-1", name: "Admin", role: "Admin" }), []);
  const { unreadCount, markAsRead } = useChatNotifications(adminUser, isChatOpen);

  const { notifications } = useHomeworkNotifications('admin');
  const { reminders: timetableReminders } = useTimetableNotifications('admin');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const allNotifications = [
    ...timetableReminders.map(tr => ({
      id: tr.id,
      title: `Upcoming Class (${tr.grade})`,
      message: tr.message,
      date: tr.startTime,
      type: 'zoom_class' as const,
      isRead: false,
      zoomLinkUrl: tr.zoomLinkUrl
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

  useEffect(() => {
    const session = getUserSession();
    const role = (session?.role || '').toString().toLowerCase();
    if (!session || role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }

    getAdminSettings().then(data => {
      if (data) setAdminSettings(data);
    });
  }, [navigate]);

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: <Home size={18} /> },
    { 
      name: "Students", 
      icon: <Users size={18} />,
      subItems: [
        { name: "Manage Students", path: "/admin/students" },
        { name: "Bulk Documents", path: "/admin/bulk-documents" },
        { name: "Promote Students", path: "/admin/promote-students" },
        { name: "Attendance", path: "/admin/attendances" },
        { name: "Behaviour & Skills", path: "/admin/behaviour" },
      ]
    },
    { 
      name: "Employees", 
      icon: <Briefcase size={18} />,
      subItems: [
        { name: "All Employees", path: "/admin/staffs" },
        { name: "Add Employee", path: "/admin/add-employee" },
        { name: "Daily Work Submissions", path: "/admin/staff-submissions" },
        { name: "Manage Staff Login", path: "/admin/manage-staff-login" },
        { name: "Salary", path: "/admin/salary" },
      ]
    },
    { 
      name: "Academics", 
      icon: <BookOpen size={18} />,
      subItems: [
        { name: "All Classes", path: "/admin/classes" },
        { name: "New Class", path: "/admin/classes?tab=new" },
        { name: "Subjects", path: "/admin/subjects-grades" },
        { name: "Timetable", path: "/admin/timetable" },
        { name: "Homework", path: "/admin/homework" },
        { name: "Routine", path: "/admin/routine" },
        { name: "Exam Settings", path: "/admin/exam-settings" },
      ]
    },
    { 
      name: "Examinations", 
      icon: <Award size={18} />,
      subItems: [
        { name: "Exams", path: "/admin/term-exam" },
        { name: "Exam Marks", path: "/admin/exam-marks" },
        { name: "Grade Performance (6-11)", path: "/admin/grade-performance" },
        { name: "Class Tests", path: "/admin/test-results" },
        { name: "Question Paper", path: "/admin/question-paper" },
      ]
    },
    { 
      name: "Fees", 
      icon: <DollarSign size={18} />,
      subItems: [
        { name: "Manage Fees", path: "/admin/fees" },
        { name: "Collect Fee", path: "/admin/collect-fee" },
        { name: "Fee Defaulters", path: "/admin/fee-defaulters" },
        { name: "Fee Statement", path: "/admin/student-fee-statement" }
      ]
    },
    { 
      name: "Accounts", 
      icon: <FileText size={18} />,
      subItems: [
        { name: "Chart of Accounts", path: "/admin/accounts" },
        { name: "Add Income/Expense", path: "/admin/add-income-expense" },
        { name: "Account Statement", path: "/admin/account-statement" }
      ]
    },
    { 
      name: "E-Learning", 
      icon: <VideoIcon size={18} />,
      subItems: [
        { name: "Live Class", path: "/admin/live-classes" },
        { name: "Courses", path: "/admin/courses" },
        { name: "Course Materials", path: "/admin/course-materials" },
        { name: "YouTube", path: "/admin/youtube" },
      ]
    },
    { 
      name: "Communication", 
      icon: <WhatsAppIcon size={18} />,
      subItems: [
        { name: "Google Forms / படிவங்கள்", path: "/admin/forms" },
        { name: "WhatsApp", path: "/admin/whatsapp" },
        { name: "Messaging", path: "/admin/circulars" },
        { name: "SMS Services", path: "/admin/sms" },
        { name: "Announcements", path: "/admin/announcements" },
        { name: "Live Chat", path: "/admin/live-chat" },
        { name: "Chatbot Settings", path: "/admin/chatbot-settings" },
      ]
    },
    { name: "Home Page Settings", path: "/admin/home-settings", icon: <Globe size={18} /> },
    { name: "General Settings", path: "/admin/settings", icon: <Settings size={18} /> },
  ];

  // Automatically expand the menu that contains the active subitem
  useEffect(() => {
    const newExpandedState = { ...expandedMenus };
    let hasChanges = false;
    
    navItems.forEach(item => {
      if (item.subItems) {
        const isActive = item.subItems.some(sub => sub.path && location.pathname === sub.path.split('?')[0]);
        if (isActive && !newExpandedState[item.name]) {
          newExpandedState[item.name] = true;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setExpandedMenus(newExpandedState);
    }
  }, [location.pathname]);

  const toggleSubMenu = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleLogout = async () => {
    try {
      clearUserSession();
      try { await signOut(auth); } catch (_) {}
      // Redirect to home and replace history to prevent back navigation
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      clearUserSession();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f4f7] flex flex-col font-sans">
      <PopupAnnouncement userRole="Admin" />
      {/* Top Header */}
      <header className="bg-[#36c6a1] text-white h-14 flex items-center justify-between px-4 shadow-sm z-40 fixed w-full top-0">
        <div className="flex items-center">
          <div className="w-64 flex items-center justify-between pr-4">
            <div className="flex items-center gap-2 font-bold text-xl tracking-wide">
              <img src={adminSettings?.profileImage || "/logo.png"} alt="Logo" className="w-8 h-8 object-cover bg-white rounded-full p-0.5 shadow-sm" />
              {adminSettings?.instituteName || "Agaram"}
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:flex items-center ml-4 space-x-2 text-white/80">
            <button className="p-2 hover:bg-white/10 rounded-md transition-colors"><Search size={18} /></button>
            <button className="p-2 hover:bg-white/10 rounded-md transition-colors"><Maximize size={18} /></button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <button 
              onClick={() => navigate('/admin/manage-staff-login')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Staff / Stop Panel"
            >
              <Briefcase size={14} />
              <span>Staff Panel</span>
            </button>
            <button className="bg-[#4285f4] text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
              APP STORE
            </button>
            <button className="bg-[#a4c639] text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
              GOOGLE PLAY
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className="relative p-1 hover:bg-white/10 rounded-md transition-colors"
              onClick={() => {
                setIsChatModalOpen(true);
                markAsRead();
              }}
            >
              <WhatsAppIcon size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="relative" ref={notificationsRef}>
              <button 
                className="relative p-1 hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={18} />
                {allNotifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
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
                        {allNotifications.length} New
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {allNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <Bell className="mx-auto mb-2 text-gray-300" size={24} />
                          <p>No new notifications</p>
                        </div>
                      ) : (
                        allNotifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" 
                            onClick={() => { 
                              if (notif.type === 'zoom_class') {
                                navigate('/admin/live-classes');
                              } else {
                                navigate('/admin/homework'); 
                              }
                              setShowNotifications(false); 
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'zoom_class' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                {notif.type === 'zoom_class' ? <Clock size={16} /> : <BookOpen size={16} />}
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
            <div className="relative">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1 rounded-md transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                  <img src={adminSettings?.profileImage || "https://picsum.photos/seed/admin/100/100"} alt="Admin" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-medium hidden md:block uppercase">{adminSettings?.username || "AGARAM DHINES"}</span>
                <ChevronDown size={14} className="hidden md:block" />
              </div>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/admin/settings");
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Settings size={16} /> Edit Profile
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14 h-screen overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
          fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#2b3643] shadow-lg transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col h-full overflow-y-auto custom-scrollbar
        `}
        >
          <div className="px-4 py-2 text-xs font-semibold text-[#5c6e7d] uppercase tracking-wider bg-[#26303b]">
            Menu
          </div>

          <div className="flex-1 py-2">
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = item.path ? location.pathname === item.path : (item.subItems && item.subItems.some(sub => sub.path && location.pathname === sub.path.split('?')[0]));
                const isExpanded = expandedMenus[item.name];
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={(e) => {
                        if (item.subItems) {
                          toggleSubMenu(item.name, e);
                        } else if (item.path) {
                          navigate(item.path);
                          if (window.innerWidth < 768) setIsSidebarOpen(false);
                        }
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm transition-colors border-l-4
                        ${
                          isActive
                            ? "bg-[#ff6b6b] text-white border-[#ff6b6b]"
                            : "text-[#8a9fb0] border-transparent hover:bg-[#364150] hover:text-white"
                        }
                      `}
                    >
                      <span className={`mr-3 ${isActive ? "text-white" : "text-[#8a9fb0]"}`}>{item.icon}</span>
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.subItems && (
                        <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={16} />
                        </span>
                      )}
                    </button>
                    
                    {/* Sub Items */}
                    {item.subItems && isExpanded && (
                      <div className="bg-[#26303b] py-1">
                        {item.subItems.map(subItem => {
                          const isSubActive = subItem.path && location.pathname === subItem.path.split('?')[0] && location.search === (subItem.path.split('?')[1] ? `?${subItem.path.split('?')[1]}` : '');
                          return (
                            <button
                              key={subItem.name}
                              onClick={() => {
                                navigate(subItem.path);
                                if (subItem.path === "/admin/live-chat") {
                                  markAsRead();
                                }
                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                              }}
                              className={`
                                w-full flex items-center pl-12 pr-4 py-2 text-sm transition-colors justify-between
                                ${isSubActive ? "text-white font-medium" : "text-[#8a9fb0] hover:text-white"}
                              `}
                            >
                              <div className="flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-50"></span>
                                {subItem.name}
                              </div>
                              {subItem.name === "Live Chat" && unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="p-4 bg-[#26303b]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[#8a9fb0] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-red-500/20 group"
            >
              <LogOut size={18} className="group-hover:text-red-500 transition-colors" />
              <span className="group-hover:text-red-500 transition-colors">Logout</span>
            </button>
          </div>
        </div>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f1f4f7]">
          <Outlet />
        </main>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => {
          setIsChatModalOpen(true);
          markAsRead();
        }}
        className="fixed bottom-6 right-6 bg-[#ff6b6b] hover:bg-red-500 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-105 z-40 flex items-center justify-center"
      >
        <MessageCircle size={28} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Live Chat Modal */}
      {isChatModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
            <LiveChat 
              currentUser={{ id: "admin-1", name: "Admin", role: "Admin" }} 
              onClose={() => setIsChatModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
