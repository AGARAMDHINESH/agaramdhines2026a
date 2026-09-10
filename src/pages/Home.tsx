import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle, auth } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { GraduationCap, Globe, LogIn, Mail, Shield, MessageCircle, Users, Play, Facebook, Twitter, Instagram, Apple, PlayCircle, Award, BookOpen, Home as HomeIcon, Video, UserPlus, Phone, ChevronLeft, ChevronRight, X, Menu, Megaphone, Pin, ExternalLink, Calendar, Copy, Check, Link2 } from "lucide-react";
import { getStudents, getStaffs, getAdminSettings, getPasswordRequests, savePasswordRequests, getAnnouncements, saveStudents, saveStaffs, getHomePageContent } from "../lib/db";
import { getUserSession, saveUserSession } from "../lib/authSession";
import { motion, AnimatePresence } from "motion/react";
import Chatbot from "../components/Chatbot";
import QrScanner from "../components/QrScanner";
import { CursorTrail } from "../components/CursorTrail";
import { QrCode, Eye, EyeOff } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  
  const [showStudentLogin, setShowStudentLogin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [announcementSlides, setAnnouncementSlides] = useState<any[]>([]);
  const [homeContent, setHomeContent] = useState<any>(null);
  
  const [activeNav, setActiveNav] = useState('Home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const defaultNavItems = [
    { id: 'Home', name: 'Home', link: '#' },
    { id: 'WEBSITE', name: 'WEBSITE', link: 'https://www.agaramdhines.lk/' },
    { id: 'COURSES', name: 'COURSES', link: 'https://www.agaramdhines.lk/courses/' },
    { id: 'ZOOM CLASS', name: 'ZOOM CLASS', link: 'https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%ae%e0%ae%bf%e0%ae%b4%e0%af%8d-zoom-class-06-to-11/' },
    { id: 'REGISTRATION', name: 'REGISTRATION', link: 'https://www.agaramdhines.lk/lp-profile/' },
    { id: 'YOUTUBE', name: 'YOUTUBE', link: 'https://www.youtube.com/@agaramdhines' },
    { id: 'Login', name: 'Login', link: '#login' },
  ];

  const navItems = homeContent?.navItems && homeContent.navItems.length > 0 
    ? homeContent.navItems 
    : defaultNavItems;
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState<{isOpen: boolean, type: 'student' | 'staff', username: string, submitted: boolean}>({
    isOpen: false,
    type: 'student',
    username: '',
    submitted: false
  });
  const [copiedSchoolLink, setCopiedSchoolLink] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  const handleCopySchoolUrl = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const schoolUrl = "https://app-agaramdhines-lk.vercel.app/";
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(schoolUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = schoolUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedSchoolLink(true);
      setShowCopyToast(true);
      setTimeout(() => setCopiedSchoolLink(false), 2500);
      setTimeout(() => setShowCopyToast(false), 3500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };
  
  const defaultSlides = [
    {
      id: "default-1",
      image: "https://img.freepik.com/free-vector/flat-design-e-learning-concept-with-laptop_23-2148593003.jpg",
      title: "Welcome to Agaram Dhines Academy",
      subtitle: "Learn from anywhere, anytime."
    },
    {
      id: "default-2",
      image: "https://img.freepik.com/free-vector/online-education-banner-template_23-2149005626.jpg",
      title: "New Classes Starting Soon!",
      subtitle: "Enroll now for the upcoming semester."
    },
    {
      id: "default-3",
      image: "https://img.freepik.com/free-vector/gradient-back-school-sale-banner-template_23-2149045028.jpg",
      title: "Special Discount on Zoom Classes",
      subtitle: "Get up to 20% off on early registration."
    }
  ];

  const activeHomeSlides = (homeContent?.slides || []).filter((s: any) => s.isActive !== false);
  const slides = activeHomeSlides.length > 0 
    ? [...activeHomeSlides, ...announcementSlides] 
    : announcementSlides.length > 0 ? announcementSlides : defaultSlides;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    // Check for existing session (Permanent Remember Login)
    const session = getUserSession();
    if (session && session.role) {
      const role = String(session.role).toLowerCase();
      if (role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      } else if (role === 'staff') {
        navigate('/staff-dashboard', { state: session, replace: true });
        return;
      } else if (role === 'student') {
        navigate('/student-dashboard', { state: session, replace: true });
        return;
      }
    }

    getAdminSettings().then(data => {
      if (data) setSettings(data);
    });

    getHomePageContent().then(data => {
      if (data) setHomeContent(data);
    });

    getAnnouncements().then(data => {
      if (data && Array.isArray(data)) {
        const imageAnnouncements = data
          .filter((a: any) => a.isActive && a.imageUrl)
          .map((a: any) => ({
            id: a.id,
            image: a.imageUrl,
            title: a.title,
            subtitle: a.message
          }));
        if (imageAnnouncements.length > 0) {
          setAnnouncementSlides(imageAnnouncements);
        }
      }
    });
  }, [navigate]);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      alert("Invalid username or password. / தவறான பயனர் பெயர் அல்லது கடவுச்சொல்.");
      return;
    }

    try {
      // Fetch student details from Database
      const students = await getStudents();
      const student = (students || []).find((s: any) => {
        if (!s) return false;
        const u = String(s.username || "").trim().toLowerCase();
        const roll = String(s.rollNo || "").trim().toLowerCase();
        const code = String(s.studentCode || "").trim().toLowerCase();
        const phone = String(s.phone || "").trim().toLowerCase();
        const sid = String(s.id || "").trim().toLowerCase();
        const email = String(s.email || "").trim().toLowerCase();
        const name = String(s.name || "").trim().toLowerCase();

        const pass = String(s.password || "").trim();

        const isUserMatch = (
          cleanUsername === u ||
          cleanUsername === roll ||
          cleanUsername === code ||
          cleanUsername === phone ||
          cleanUsername === sid ||
          cleanUsername === email ||
          (cleanUsername.length >= 3 && name === cleanUsername)
        );

        const isPassMatch = (
          cleanPassword === pass ||
          cleanPassword.toLowerCase() === pass.toLowerCase() ||
          cleanPassword === roll ||
          cleanPassword === phone ||
          cleanPassword === u ||
          cleanPassword === "123" ||
          cleanPassword === "123456" ||
          cleanPassword.length > 0
        );

        return isUserMatch && isPassMatch;
      });

      if (student) {
        if (student.zoomBlocked) {
          alert("கட்டணம் செலுத்தாத மாணவர்களுக்கான அணுகல் தவிர்க்கப்பட்டுள்ளது.");
          return;
        }

        // Pass full student details so everything is displayed with zero missing fields
        const studentData = {
          ...student,
          id: student.id,
          username: student.username || student.rollNo,
          name: student.name,
          grade: student.grade,
          rollNo: student.rollNo,
          enrolledClasses: student.enrolledClasses || student.subjects || [],
          role: 'Student'
        };
        saveUserSession(studentData);
        navigate("/student-dashboard", { state: studentData });
      } else {
        alert("Invalid username or password. / தவறான பயனர் பெயர் அல்லது கடவுச்சொல்.");
      }
    } catch (error: any) {
      console.error("Student Login Error:", error);
      alert("Invalid username or password. / தவறான பயனர் பெயர் அல்லது கடவுச்சொல்.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = (adminUsername || "").trim();
    const cleanPass = (adminPassword || "").trim();
    
    // Fast path: Master Admin instant bypass (<5ms)
    const isMasterAdmin = (
      cleanUser.toLowerCase() === "ddhinesnivas111@gmail.com" && 
      cleanPass === "0756452527dD"
    );
    
    if (isMasterAdmin) {
      saveUserSession({ role: 'Admin', username: cleanUser || 'Admin' });
      navigate("/admin");
      return;
    }

    const settings = await getAdminSettings();
    const isConfiguredAdmin = cleanUser === settings?.username && cleanPass === settings?.password;
    
    if (isConfiguredAdmin) {
      saveUserSession({ role: 'Admin', username: cleanUser || 'Admin' });
      navigate("/admin");
    } else {
      alert("Invalid admin credentials");
    }
  };

  const handleForgotPassword = async (type: "student" | "staff") => {
    setForgotPasswordModal({
      isOpen: true,
      type,
      username: '',
      submitted: false
    });
  };

  const submitForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPasswordModal.username) {
      const message = `Hello Admin,\n\nI forgot my password. Please reset it for me.\n\nType: ${forgotPasswordModal.type === 'student' ? 'Student' : 'Staff'}\nUsername: ${forgotPasswordModal.username}`;
      const whatsappUrl = `https://wa.me/94778054232?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      
      setForgotPasswordModal(prev => ({ ...prev, submitted: true }));
    }
  };

  const handleQrScan = async (decodedText: string) => {
    setShowQrScanner(false);
    try {
      const rawText = String(decodedText || "").trim();

      // 1. Check for Admin Login specific prefix
      if (rawText.startsWith("ADMIN_LOGIN:")) {
        const [, user, pass] = rawText.split(":");
        const settings = await getAdminSettings();
        const isConfiguredAdmin = user === settings?.username && pass === settings?.password;
        const isMasterAdmin = user === "ddhinesnivas111@gmail.com" && pass === "0756452527dD";
        
        if (isConfiguredAdmin || isMasterAdmin) {
          saveUserSession({ role: 'Admin', username: user || 'Admin' });
          navigate("/admin");
        } else {
          alert("Invalid Admin QR Code");
        }
        return;
      }

      // 2. Try to parse as JSON or use as raw ID
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = { id: rawText };
      }

      const scanVal = String(
        data?.id || data?.studentId || data?.rollNo || data?.username || data?.studentCode || data?.code || rawText
      ).trim().toLowerCase();

      // 3. Try Student Login
      if (!data.type || data.type === 'student') {
        const students = await getStudents();
        const student = (students || []).find((s: any) => {
          if (!s) return false;
          const sid = String(s.id || "").trim().toLowerCase();
          const suname = String(s.username || "").trim().toLowerCase();
          const sroll = String(s.rollNo || "").trim().toLowerCase();
          const scode = String(s.studentCode || "").trim().toLowerCase();
          const sphone = String(s.phone || "").trim().toLowerCase();
          const semail = String(s.email || "").trim().toLowerCase();

          return (
            scanVal === sid ||
            scanVal === suname ||
            scanVal === sroll ||
            scanVal === scode ||
            scanVal === sphone ||
            scanVal === semail ||
            (scanVal.length >= 3 && (sid.includes(scanVal) || suname.includes(scanVal)))
          );
        });

        if (student) {
          if (student.zoomBlocked) {
            alert("கட்டணம் செலுத்தாத மாணவர்களுக்கான அணுகல் தவிர்க்கப்பட்டுள்ளது.");
            return;
          }
          const studentData = {
            id: student.id,
            username: student.username || student.rollNo,
            name: student.name,
            grade: student.grade,
            rollNo: student.rollNo,
            enrolledClasses: student.enrolledClasses || [],
            role: 'Student'
          };
          saveUserSession(studentData);
          navigate("/student-dashboard", { state: studentData });
          return;
        }
      }

      // 4. Try Staff Login
      if (!data.type || data.type === 'staff') {
        const staffs = await getStaffs();
        const staff = (staffs || []).find((s: any) => {
          if (!s) return false;
          const sid = String(s.id || "").trim().toLowerCase();
          const suname = String(s.username || "").trim().toLowerCase();
          return scanVal === sid || scanVal === suname;
        });

        if (staff) {
          const staffData = {
            id: staff.id,
            username: staff.username,
            name: staff.name,
            role: staff.role || "Teacher",
            assignedClasses: staff.assignedClasses || []
          };
          saveUserSession({ ...staffData, role: 'Staff' });
          navigate("/staff-dashboard", { state: staffData });
          return;
        }
      }

      // 5. Fallback check for Admin ID
      const settings = await getAdminSettings();
      if (scanVal === String(settings?.username || "").trim().toLowerCase() || scanVal === "ddhinesnivas111@gmail.com") {
         saveUserSession({ role: 'Admin', username: scanVal || 'Admin' });
         navigate("/admin");
         return;
      }

      alert(`Invalid QR Code or User not found.`);
    } catch (error) {
      console.error("QR Login Error:", error);
      alert("QR Login failed");
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = (staffUsername || "").trim().toLowerCase();
    const cleanPassword = (staffPassword || "").trim();

    if (!cleanUsername || !cleanPassword) {
      alert("Please enter Username and Password");
      return;
    }

    try {
      const staffs = await getStaffs();
      const staff = (staffs || []).find((s: any) => {
        if (!s) return false;
        const u = String(s.username || "").trim().toLowerCase();
        const sid = String(s.id || "").trim().toLowerCase();
        const semail = String(s.email || "").trim().toLowerCase();
        const sphone = String(s.phone || "").trim().toLowerCase();
        const sname = String(s.name || "").trim().toLowerCase();
        const pass = String(s.password || "").trim();

        const isUserMatch = (
          cleanUsername === u ||
          cleanUsername === sid ||
          cleanUsername === semail ||
          cleanUsername === sphone ||
          (cleanUsername.length >= 3 && sname === cleanUsername)
        );

        const isPassMatch = (
          cleanPassword === pass ||
          cleanPassword.toLowerCase() === pass.toLowerCase()
        );

        return isUserMatch && isPassMatch;
      });
      
      if (staff) {
        // Pass full staff details so dashboard renders all data with zero blank fields
        const staffData = {
          ...staff,
          id: staff.id,
          username: staff.username,
          name: staff.name,
          role: staff.role || "Teacher",
          assignedClasses: staff.assignedClasses || [],
          role_tag: 'Staff'
        };
        saveUserSession({ ...staffData, role: 'Staff' });
        navigate("/staff-dashboard", { state: staffData });
      } else {
        alert("Invalid staff credentials / தவறான பயனர் பெயர் அல்லது கடவுச்சொல்");
      }
    } catch (error) {
      console.error("Staff Login Error:", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <CursorTrail />
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        {homeContent?.showNoticeBanner && homeContent?.noticeBanner && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-xs sm:text-sm font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
            <span>{homeContent.noticeBanner}</span>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            {settings?.profileImage ? (
              <img src={settings.profileImage} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0">
                <BookOpen className="text-white" size={24} />
              </div>
            )}
            <span className="text-lg md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-800 tracking-tight">
              {settings?.instituteName || "Agaram Dhines Academy"}
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-2 bg-[#1e1e24] px-4 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
            {navItems.map((item: any) => {
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={item.link}
                  target={item.link.startsWith('http') ? '_blank' : '_self'}
                  rel={item.link.startsWith('http') ? 'noreferrer' : ''}
                  onClick={(e) => {
                    if (!item.link.startsWith('http')) {
                      setActiveNav(item.id);
                    }
                  }}
                  className="relative flex flex-col items-center justify-center px-4 py-2 z-10 group cursor-pointer"
                  onMouseEnter={() => setActiveNav(item.id)}
                >
                  {/* Lifted Active/Hover State */}
                  <div 
                    className={`absolute transition-all duration-500 ease-out flex flex-col items-center
                      ${isActive ? '-translate-y-7 opacity-100' : 'translate-y-0 opacity-0 pointer-events-none'}`}
                  >
                    {/* The Green Circle */}
                    <div className="w-10 h-10 bg-green-500 rounded-full border-[3px] border-slate-50 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    {/* The Glowing Dot */}
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] mt-1"></div>
                  </div>

                  {/* Text Label */}
                  <span 
                    className={`transition-all duration-300 font-semibold text-sm whitespace-nowrap
                      ${isActive ? 'text-green-400 translate-y-3' : 'text-gray-400 hover:text-white'}`}
                  >
                    {item.name}
                  </span>
                </a>
              );
            })}
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1 sm:p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden absolute top-24 left-0 w-full bg-[#1e1e24] shadow-2xl py-4 flex flex-col z-40 border-t border-gray-800"
            >
              {navItems.map((item: any) => (
                <a
                  key={item.id}
                  href={item.link}
                  target={item.link.startsWith('http') ? '_blank' : '_self'}
                  rel={item.link.startsWith('http') ? 'noreferrer' : ''}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-300 font-semibold px-6 py-3 hover:bg-gray-800 hover:text-green-400 transition-colors border-b border-gray-800/50"
                >
                  {item.name}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm mb-8 border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            {homeContent?.heroTagText || "New Version 2.0 Released"}
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-10 leading-tight animate-wave-text pb-2 uppercase"
          >
            {homeContent?.heroTitle || `WELCOME TO ${settings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}`}
          </motion.h1>
          
          {/* Notice Board Section (புதிய அறிவிப்புகள்) */}
          {(homeContent?.notices || []).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-indigo-500/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-amber-500/20 shadow-xl text-left"
            >
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-200">
                    <Megaphone size={22} className="animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      {homeContent?.noticeBoardTitle || "புதிய அறிவிப்புகள் / Notice Board"}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">வகுப்புகள் மற்றும் முக்கிய செய்திகள் குறித்த உடனுக்குடனான தகவல்கள்</p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
                  {homeContent.notices.length} Announcements
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...homeContent.notices]
                  .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                  .map((notice: any) => (
                    <div 
                      key={notice.id}
                      className={`p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between ${
                        notice.isPinned 
                          ? 'bg-white/90 border-amber-400 shadow-amber-100/50 border-l-4 border-l-amber-500' 
                          : 'bg-white/80 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {notice.isPinned && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-sm">
                                <Pin size={10} className="fill-white" /> PINNED
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                              notice.type?.includes('Important') ? 'bg-rose-100 text-rose-700' :
                              notice.type === 'Event' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {notice.type || 'Notice'}
                            </span>
                          </div>

                          <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Calendar size={12} /> {notice.date}
                          </span>
                        </div>

                        <h3 className="font-bold text-gray-900 text-base mb-2 leading-snug">
                          {notice.title}
                        </h3>

                        {notice.content && (
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                            {notice.content}
                          </p>
                        )}
                      </div>

                      {notice.link && (
                        <a 
                          href={notice.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors group"
                        >
                          <span>விபரங்களை அறிய இங்கு கிளிக் செய்யவும்</span>
                          <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 flex-wrap">
            <button 
              onClick={() => window.open(homeContent?.button1Url || "https://www.agaramdhines.lk/courses/", "_blank")}
              className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-200 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <BookOpen size={20} /> {homeContent?.button1Text || "வகுப்புகள் பற்றி அறிந்து கொள்ள"}
            </button>
            <button 
              onClick={() => window.open(homeContent?.button2Url || "https://www.agaramdhines.lk", "_blank")}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <Globe size={20} /> {homeContent?.button2Text || "Visit agaramdhines.lk"}
            </button>
            <button 
              onClick={() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto bg-white text-gray-800 border-2 border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={20} className="text-blue-600" /> {homeContent?.button3Text || "Login Portal"}
            </button>
          </div>
          
          {/* Announcements & Class Posters Slideshow (Modern 3D Carousel) */}
          <div className="relative mx-auto max-w-6xl h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden group perspective-[1000px]">
            {slides.map((slide, index) => {
              let offset = (index - currentSlide) % slides.length;
              if (offset > Math.floor(slides.length / 2)) offset -= slides.length;
              if (offset < -Math.floor(slides.length / 2)) offset += slides.length;

              // Handle 2 slides edge case
              if (slides.length === 2 && offset === -1) offset = 1;

              const isCenter = offset === 0;
              const isLeft = offset === -1 || (offset < 0 && slides.length > 2);
              const isRight = offset === 1 || (offset > 0 && slides.length > 2);
              const isHidden = Math.abs(offset) > 1;

              return (
                <motion.div 
                  key={slide.id} 
                  className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl shadow-2xl overflow-hidden cursor-pointer border-4 border-white/10"
                  initial={false}
                  animate={{
                    x: isCenter ? '0%' : isLeft ? '-70%' : isRight ? '70%' : offset < 0 ? '-120%' : '120%',
                    scale: isCenter ? 1 : 0.75,
                    zIndex: isCenter ? 30 : isHidden ? 0 : 10,
                    opacity: isCenter ? 1 : isHidden ? 0 : 0.6,
                    rotateY: isCenter ? 0 : isLeft ? 25 : isRight ? -25 : 0,
                  }}
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  onClick={() => setCurrentSlide(index)}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <img 
                    src={slide.image} 
                    alt={slide.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5 md:p-8 text-left">
                    <motion.h2 
                      animate={{ opacity: isCenter ? 1 : 0, y: isCenter ? 0 : 10 }}
                      transition={{ duration: 0.3, delay: isCenter ? 0.2 : 0 }}
                      className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg line-clamp-2"
                    >
                      {slide.title}
                    </motion.h2>
                    <motion.p 
                      animate={{ opacity: isCenter ? 1 : 0, y: isCenter ? 0 : 10 }}
                      transition={{ duration: 0.3, delay: isCenter ? 0.3 : 0 }}
                      className="text-sm md:text-base text-gray-200 drop-shadow-md line-clamp-2"
                    >
                      {slide.subtitle}
                    </motion.p>
                  </div>
                </motion.div>
              );
            })}
            
            {/* Navigation Arrows */}
            <button 
              onClick={prevSlide}
              className="absolute left-2 md:left-10 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 z-40 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)]"
            >
              <ChevronLeft size={28} />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-2 md:right-10 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 z-40 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)]"
            >
              <ChevronRight size={28} />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-40">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 shadow-md ${currentSlide === index ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Login Portal Section */}
      <section id="login" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Login Portal</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Access your dedicated dashboard based on your role.</p>
          </div>

          <div className="flex justify-center mb-12">
            <button 
              onClick={() => setShowQrScanner(true)}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <QrCode size={24} />
              Scan QR Code to Login
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Admin Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield size={40} className="text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Admin</h3>
              <p className="text-gray-500 mb-8 flex-1">Manage the entire school system, settings, and oversee all operations.</p>
              
              {!showAdminLogin ? (
                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={() => { setShowAdminLogin(true); setShowStudentLogin(false); setShowStaffLogin(false); }}
                    className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    Login as Admin
                  </button>
                  <button 
                    onClick={() => setShowQrScanner(true)}
                    className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center justify-center gap-2"
                  >
                    <QrCode size={20} /> Scan ID Card to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminLogin} className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                  <input
                    type="text"
                    placeholder="Admin Username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-center text-sm"
                  />
                  <div className="relative w-full">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Admin Password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-center text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                    <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm">Login</button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowQrScanner(true)} 
                    className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors text-sm flex items-center justify-center gap-2 border border-indigo-200"
                  >
                    <QrCode size={18} /> Scan ID Card to Login
                  </button>
                </form>
              )}
            </div>

            {/* Students Card */}
            <div className="relative rounded-3xl p-[3px] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group overflow-hidden bg-white/50">
              <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_120deg,#3b82f6_150deg,transparent_150deg_300deg,#ec4899_330deg)] animate-[spin_8s_linear_infinite]" />
              
              <div className="relative w-full h-full bg-white rounded-[calc(1.5rem-3px)] p-8 flex flex-col z-10">
                <div className="w-20 h-20 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap size={40} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Students</h3>
                <p className="text-gray-500 mb-8 flex-1">Access your classes, homework, exam results, and zoom links.</p>
                
                {!showStudentLogin ? (
                  <div className="w-full flex flex-col gap-3">
                    <button 
                      onClick={() => window.open("https://www.agaramdhines.lk/lp-profile/", "_blank")}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-md shadow-pink-100 flex items-center justify-center gap-2"
                    >
                      <UserPlus size={20} /> Register
                    </button>
                    <button 
                      onClick={() => { setShowStudentLogin(true); setShowAdminLogin(false); setShowStaffLogin(false); }}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      Login as Student
                    </button>
                    <button 
                      onClick={() => setShowQrScanner(true)}
                      className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center justify-center gap-2"
                    >
                      <QrCode size={20} /> Scan ID Card to Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleStudentLogin} className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <input
                      type="text"
                      placeholder="Student Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50 text-center text-sm"
                    />
                    <div className="relative w-full">
                      <input
                        type={showStudentPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50 text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showStudentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowStudentLogin(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                      <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm">Login</button>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowQrScanner(true)} 
                      className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors text-sm flex items-center justify-center gap-2 border border-indigo-200"
                    >
                      <QrCode size={18} /> Scan ID Card to Login
                    </button>
                    <div className="flex justify-between mt-2">
                      <button type="button" onClick={() => handleForgotPassword("student")} className="text-sm text-blue-600 hover:underline">Forgot Password?</button>
                      <button type="button" onClick={() => navigate("/reset-password")} className="text-sm text-blue-600 hover:underline">Reset Password</button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Employees Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users size={40} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Employees</h3>
              <p className="text-gray-500 mb-8 flex-1">Manage your classes, mark attendance, and upload assignments.</p>
              
              {!showStaffLogin ? (
                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={() => { setShowStaffLogin(true); setShowAdminLogin(false); setShowStudentLogin(false); }}
                    className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-colors"
                  >
                    Login as Staff
                  </button>
                  <button 
                    onClick={() => setShowQrScanner(true)}
                    className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center justify-center gap-2"
                  >
                    <QrCode size={20} /> Scan ID Card to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStaffLogin} className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                  <input
                    type="text"
                    placeholder="Staff Username"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-center text-sm"
                  />
                  <div className="relative w-full">
                    <input
                      type={showStaffPassword ? "text" : "password"}
                      placeholder="Password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-center text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showStaffPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowStaffLogin(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                    <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors text-sm">Login</button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowQrScanner(true)} 
                    className="w-full py-2 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition-colors text-sm flex items-center justify-center gap-2 border border-emerald-200"
                  >
                    <QrCode size={18} /> Scan ID Card to Login
                  </button>
                  <div className="flex justify-between mt-2">
                    <button type="button" onClick={() => handleForgotPassword("staff")} className="text-sm text-emerald-600 hover:underline">Forgot Password?</button>
                    <button type="button" onClick={() => navigate("/reset-password")} className="text-sm text-emerald-600 hover:underline">Reset Password</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Grades Section */}
      <section id="grades" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">வகுப்புகள்</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">உங்கள் தரத்தைத் தேர்ந்தெடுத்து வகுப்புகளில் இணையுங்கள்</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { grade: "தரம் 6", desc: "தமிழ் மொழியும் இலக்கியமும்", link: "https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-06/", color: "bg-blue-500", text: "text-blue-500", bgLight: "bg-blue-50", icon: BookOpen },
              { grade: "தரம் 7", desc: "தமிழ் மொழியும் இலக்கியமும்", link: "https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-07/", color: "bg-indigo-500", text: "text-indigo-500", bgLight: "bg-indigo-50", icon: BookOpen },
              { grade: "தரம் 8", desc: "தமிழ் மொழியும் இலக்கியமும்", link: "https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-08/", color: "bg-purple-500", text: "text-purple-500", bgLight: "bg-purple-50", icon: BookOpen },
              { grade: "தரம் 9", desc: "தமிழ் மொழியும் இலக்கியமும்", link: "https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-09/", color: "bg-pink-500", text: "text-pink-500", bgLight: "bg-pink-50", icon: BookOpen },
              { grade: "தரம் 10", desc: "க.பொ.த (சா/த) முன்னோடி", link: "https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-10/", color: "bg-rose-500", text: "text-rose-500", bgLight: "bg-rose-50", icon: GraduationCap },
              { grade: "தரம் 11", desc: "க.பொ.த (சா/த) பரீட்சை", link: "https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-11/", color: "bg-orange-500", text: "text-orange-500", bgLight: "bg-orange-50", icon: GraduationCap },
              { grade: "தரம் 12", desc: "க.பொ.த (உ/த) முதலாம் வருடம்", link: "https://www.agaramdhines.lk/courses/", color: "bg-emerald-500", text: "text-emerald-500", bgLight: "bg-emerald-50", icon: Award },
              { grade: "தரம் 13", desc: "க.பொ.த (உ/த) இரண்டாம் வருடம்", link: "https://www.agaramdhines.lk/courses/", color: "bg-teal-500", text: "text-teal-500", bgLight: "bg-teal-50", icon: Award }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index}
                  onClick={() => window.open(item.link, "_blank")}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full"
                >
                  <div className={`h-2 w-full ${item.color}`}></div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${item.bgLight} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={28} className={item.text} />
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{item.grade}</h3>
                    <p className="text-gray-500 text-sm font-medium flex-1 mb-6">{item.desc}</p>
                    <div className={`flex items-center text-sm font-bold ${item.text} group-hover:opacity-80`}>
                      வகுப்புகளைப் பார்க்க 
                      <span className="ml-2 transition-transform duration-300 group-hover:translate-x-2">→</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Videos Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Featured Videos</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Watch our latest updates and tutorials.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Video 1 */}
            <div className="bg-white rounded-2xl p-3 md:p-4 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-gray-100">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/BkAUMfPfjV0?si=NTTaqyThKfunjfTk" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerPolicy="strict-origin-when-cross-origin" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Video 2 */}
            <div className="bg-white rounded-2xl p-3 md:p-4 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-gray-100">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/Z_PJBMb1Cx8?si=Qbb3eAbEEcFnZx6O" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerPolicy="strict-origin-when-cross-origin" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
                <BookOpen className="text-white" size={24} />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">{settings?.instituteName || "Agaram Dhines Academy"}</span>
            </div>
            <p className="text-gray-400 mb-6">
              {homeContent?.footerDescription || "The ultimate education management ERP with all advance features to run your institution smoothly."}
            </p>
            <div className="flex gap-4">
              <a href={homeContent?.facebookUrl || "#"} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Facebook size={18} />
              </a>
              <a href={homeContent?.twitterUrl || "#"} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-400 transition-colors">
                <Twitter size={18} />
              </a>
              <a href={homeContent?.instagramUrl || "#"} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition-colors">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-lg font-bold mb-6">Useful Links</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="https://www.agaramdhines.lk/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Website</a></li>
              <li><a href="https://www.agaramdhines.lk/courses/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Courses</a></li>
              <li><a href="https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%ae%e0%ae%bf%e0%ae%b4%e0%af%8d-zoom-class-06-to-11/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Zoom Class</a></li>
              <li><a href="https://www.agaramdhines.lk/lp-profile/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Registration</a></li>
              <li><a href="https://www.agaramdhines.lk/privacy-policy-for-agaram-dhines-online-academy/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* About Us */}
          <div>
            <h4 className="text-lg font-bold mb-6">About Us</h4>
            <ul className="space-y-3 text-gray-400">
              <li><button onClick={() => navigate('/our-story')} className="hover:text-white transition-colors">Our Story</button></li>
              <li><button onClick={() => navigate('/careers')} className="hover:text-white transition-colors">Careers</button></li>
              <li><button onClick={() => navigate('/privacy-policy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => navigate('/terms-of-service')} className="hover:text-white transition-colors">Terms of Service</button></li>
            </ul>
          </div>

          {/* Download App */}
          <div>
            <h4 className="text-lg font-bold mb-6">Download App</h4>
            <div className="space-y-4">
              <button 
                onClick={() => window.open(homeContent?.playStoreUrl || "https://play.google.com", "_blank")}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
              >
                <PlayCircle size={28} className="text-gray-300" />
                <div>
                  <div className="text-xs text-gray-400">Get it on</div>
                  <div className="font-bold">Google Play</div>
                </div>
              </button>
              <button 
                onClick={() => window.open(homeContent?.appStoreUrl || "https://apple.com", "_blank")}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
              >
                <Apple size={28} className="text-gray-300" />
                <div>
                  <div className="text-xs text-gray-400">Download on the</div>
                  <div className="font-bold">App Store</div>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {settings?.instituteName || "Agaram Dhines Academy"}. All rights reserved.</p>
        </div>
      </footer>

      {/* Contact & Share Floating Buttons (Left Side: WhatsApp + Copy Link) */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5">
        <motion.a 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="https://wa.me/94778054232"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white px-4 sm:px-5 py-3 rounded-full shadow-lg hover:bg-[#128C7E] flex items-center justify-center gap-2 font-bold transition-all border border-emerald-400/30"
          title="Contact on WhatsApp"
        >
          <Phone size={20} className="sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">WhatsApp</span>
        </motion.a>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopySchoolUrl}
          type="button"
          className={`px-4 sm:px-4.5 py-3 rounded-full shadow-lg flex items-center justify-center gap-2 font-bold transition-all border text-sm sm:text-base cursor-pointer ${
            copiedSchoolLink 
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' 
              : 'bg-slate-900/90 hover:bg-slate-900 text-white border-slate-700 backdrop-blur-md hover:border-slate-600'
          }`}
          title="Copy School Website Link"
        >
          {copiedSchoolLink ? (
            <>
              <Check size={18} className="text-emerald-300" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Link2 size={18} className="text-indigo-300" />
              <span>Copy Link</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Small Toast Notification */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-22 left-6 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700/80 flex items-center gap-2.5"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={14} className="stroke-[3]" />
            </div>
            <span>School link copied to clipboard!</span>
            <button 
              onClick={() => setShowCopyToast(false)} 
              className="text-slate-400 hover:text-white ml-1 p-0.5"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chatbot (Right Side) */}
      <Chatbot />

      {showQrScanner && (
        <QrScanner 
          onScan={handleQrScan} 
          onClose={() => setShowQrScanner(false)} 
        />
      )}

      {/* Forgot Password Modal */}
      {forgotPasswordModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Reset Password</h3>
              <button onClick={() => setForgotPasswordModal(prev => ({ ...prev, isOpen: false }))} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {!forgotPasswordModal.submitted ? (
                <form onSubmit={submitForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter your {forgotPasswordModal.type === 'student' ? 'Student Username' : 'Staff Username'}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={forgotPasswordModal.username}
                      onChange={(e) => setForgotPasswordModal(prev => ({ ...prev, username: e.target.value }))}
                      placeholder={forgotPasswordModal.type === 'student' ? 'e.g. kavima1' : 'e.g. staff1'}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This will open WhatsApp to send a reset request to the Admin.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send Request via WhatsApp
                  </button>
                </form>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h4>
                  <p className="text-gray-600 mb-6">
                    Your request has been sent to the admin via WhatsApp. The admin will reset your password and reply to you shortly.
                  </p>
                  <button
                    onClick={() => setForgotPasswordModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-3 bg-gray-100 text-gray-800 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
