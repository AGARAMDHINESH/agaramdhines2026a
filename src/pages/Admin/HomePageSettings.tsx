import React, { useState, useEffect } from "react";
import { 
  getHomePageContent, 
  saveHomePageContent, 
  addNotification 
} from "../../lib/db";
import { 
  Globe, 
  Layout, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Save, 
  Link as LinkIcon, 
  Navigation, 
  Bell, 
  Phone, 
  Eye, 
  Sparkles,
  ArrowUpRight,
  Pin,
  Megaphone,
  FileText,
  Share2,
  Download
} from "lucide-react";

export default function HomePageSettings() {
  const [content, setContent] = useState<any>({
    heroTagText: "New Version 2.0 Released",
    heroTitle: "WELCOME TO AGARAM DHINES ONLINE ACADEMY",
    button1Text: "வகுப்புகள் பற்றி அறிந்து கொள்ள",
    button1Url: "https://www.agaramdhines.lk/courses/",
    button2Text: "Visit agaramdhines.lk",
    button2Url: "https://www.agaramdhines.lk",
    button3Text: "Login Portal",
    slides: [],
    navItems: [],
    noticeBanner: "",
    showNoticeBanner: false,
    noticeBoardTitle: "புதிய அறிவிப்புகள் / Notice Board",
    notices: [],
    footerDescription: "The ultimate education management ERP with all advance features to run your institution smoothly.",
    facebookUrl: "https://facebook.com",
    twitterUrl: "https://twitter.com",
    instagramUrl: "https://instagram.com",
    playStoreUrl: "https://play.google.com",
    appStoreUrl: "https://apple.com",
    contactPhone: "0778054232",
    contactWhatsapp: "94778054232",
    contactEmail: "Ddhinesnivas111@gmail.com"
  });

  const [activeTab, setActiveTab] = useState<'hero' | 'slides' | 'noticeboard' | 'nav' | 'notice' | 'footer'>('hero');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal State for Slide Editing
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [slideForm, setSlideForm] = useState({
    id: "",
    title: "",
    subtitle: "",
    image: "",
    link: "",
    isActive: true
  });

  // Modal State for Navigation Item Editing
  const [showNavModal, setShowNavModal] = useState(false);
  const [editingNavIndex, setEditingNavIndex] = useState<number | null>(null);
  const [navForm, setNavForm] = useState({
    id: "",
    name: "",
    link: ""
  });

  // Modal State for Notice Board Item Editing
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [noticeForm, setNoticeForm] = useState({
    id: "",
    title: "",
    content: "",
    date: new Date().toISOString().split('T')[0],
    type: "Important",
    link: "",
    isPinned: false
  });

  useEffect(() => {
    loadHomePageContent();
  }, []);

  const loadHomePageContent = async () => {
    const data = await getHomePageContent();
    if (data) {
      setContent(data);
    }
  };

  const handleSaveAll = async () => {
    await saveHomePageContent(content);
    await addNotification({
      grade: "all",
      title: "Home Page Updated",
      message: "The Home page content has been saved successfully.",
      type: "announcement",
      createdAt: new Date().toISOString()
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Image Upload helper for Slides
  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlideForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save / Update Slide
  const handleSaveSlide = () => {
    if (!slideForm.image && !slideForm.title) {
      alert("Please provide at least a Title or Image for the slide banner.");
      return;
    }

    let updatedSlides = [...(content.slides || [])];
    if (editingSlide) {
      updatedSlides = updatedSlides.map(s => s.id === editingSlide.id ? { ...slideForm, id: editingSlide.id } : s);
    } else {
      const newSlide = {
        ...slideForm,
        id: `slide-${Date.now()}`
      };
      updatedSlides.unshift(newSlide);
    }

    const updatedContent = { ...content, slides: updatedSlides };
    setContent(updatedContent);
    setShowSlideModal(false);
    setEditingSlide(null);
    setSlideForm({ id: "", title: "", subtitle: "", image: "", link: "", isActive: true });
  };

  // Delete Slide
  const handleDeleteSlide = (slideId: string) => {
    if (window.confirm("Are you sure you want to delete this slide? / இந்த பேனரை நீக்க விரும்புகிறீர்களா?")) {
      const updatedSlides = (content.slides || []).filter((s: any) => s.id !== slideId);
      setContent({ ...content, slides: updatedSlides });
    }
  };

  // Toggle Slide Active State
  const handleToggleSlideActive = (slideId: string) => {
    const updatedSlides = (content.slides || []).map((s: any) => 
      s.id === slideId ? { ...s, isActive: s.isActive !== false ? false : true } : s
    );
    setContent({ ...content, slides: updatedSlides });
  };

  // Save / Update Nav Item
  const handleSaveNavItem = () => {
    if (!navForm.name) {
      alert("Please enter a item name / பெயர் உள்ளிடவும்");
      return;
    }

    let updatedNav = [...(content.navItems || [])];
    if (editingNavIndex !== null) {
      updatedNav[editingNavIndex] = { ...navForm, id: navForm.id || `nav-${Date.now()}` };
    } else {
      updatedNav.push({
        ...navForm,
        id: `nav-${Date.now()}`
      });
    }

    setContent({ ...content, navItems: updatedNav });
    setShowNavModal(false);
    setEditingNavIndex(null);
    setNavForm({ id: "", name: "", link: "" });
  };

  // Delete Nav Item
  const handleDeleteNavItem = (index: number) => {
    if (window.confirm("Delete this menu item?")) {
      const updatedNav = [...(content.navItems || [])];
      updatedNav.splice(index, 1);
      setContent({ ...content, navItems: updatedNav });
    }
  };

  // Notice Board Operations
  const handleSaveNotice = () => {
    if (!noticeForm.title) {
      alert("Please enter a title for the notice / அறிவிப்பு தலைப்பை உள்ளிடவும்");
      return;
    }

    let updatedNotices = [...(content.notices || [])];
    if (editingNotice) {
      updatedNotices = updatedNotices.map(n => n.id === editingNotice.id ? { ...noticeForm, id: editingNotice.id } : n);
    } else {
      const newNotice = {
        ...noticeForm,
        id: `notice-${Date.now()}`
      };
      updatedNotices.unshift(newNotice);
    }

    setContent({ ...content, notices: updatedNotices });
    setShowNoticeModal(false);
    setEditingNotice(null);
    setNoticeForm({
      id: "",
      title: "",
      content: "",
      date: new Date().toISOString().split('T')[0],
      type: "Important",
      link: "",
      isPinned: false
    });
  };

  const handleDeleteNotice = (noticeId: string) => {
    if (window.confirm("Are you sure you want to delete this notice? / இந்த அறிவிப்பை நீக்க விரும்புகிறீர்களா?")) {
      const updatedNotices = (content.notices || []).filter((n: any) => n.id !== noticeId);
      setContent({ ...content, notices: updatedNotices });
    }
  };

  const handleTogglePinNotice = (noticeId: string) => {
    const updatedNotices = (content.notices || []).map((n: any) => 
      n.id === noticeId ? { ...n, isPinned: !n.isPinned } : n
    );
    setContent({ ...content, notices: updatedNotices });
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
              <Globe size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Home Page Content Manager</h1>
              <p className="text-sm text-slate-500">முகப்புப் பக்கப் பகுதிகளை மாற்றம் செய்தல் & புதிய தகவல்கள் சேர்த்தல்</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href="/" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
          >
            <Eye size={18} /> Preview Home Page <ArrowUpRight size={16} />
          </a>
          
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 size={22} className="text-emerald-600" />
          <span>Home page content successfully updated and saved live!</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'hero' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layout size={18} /> Title & Action Buttons
        </button>

        <button
          onClick={() => setActiveTab('noticeboard')}
          className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'noticeboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Megaphone size={18} /> Notice Board ({content.notices?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('slides')}
          className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'slides' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ImageIcon size={18} /> Slideshow Banners ({content.slides?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('nav')}
          className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'nav' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Navigation size={18} /> Navigation Menu
        </button>

        <button
          onClick={() => setActiveTab('notice')}
          className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'notice' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell size={18} /> Top Alert Bar & Contacts
        </button>

        <button
          onClick={() => setActiveTab('footer')}
          className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'footer' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Share2 size={18} /> Footer & Social Links
        </button>
      </div>

      {/* TAB 1: HERO TITLE & ACTION BUTTONS */}
      {activeTab === 'hero' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-indigo-600" size={20} /> Main Hero Header & Buttons
            </h2>
            <p className="text-sm text-slate-500">Edit main greeting text, tagline, and home page button links.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Hero Tagline / Badge Text</label>
              <input
                type="text"
                value={content.heroTagText || ""}
                onChange={(e) => setContent({ ...content, heroTagText: e.target.value })}
                placeholder="e.g. New Version 2.0 Released"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Main Title (தலைப்பு)</label>
              <input
                type="text"
                value={content.heroTitle || ""}
                onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
                placeholder="e.g. WELCOME TO AGARAM DHINES ONLINE ACADEMY"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Action Buttons Settings */}
          <div className="pt-4 border-t border-slate-100 space-y-6">
            <h3 className="text-lg font-bold text-slate-800">Action Button 1 (Pink/Red Button)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Button Text</label>
                <input
                  type="text"
                  value={content.button1Text || ""}
                  onChange={(e) => setContent({ ...content, button1Text: e.target.value })}
                  placeholder="e.g. வகுப்புகள் பற்றி அறிந்து கொள்ள"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Target URL Link</label>
                <input
                  type="text"
                  value={content.button1Url || ""}
                  onChange={(e) => setContent({ ...content, button1Url: e.target.value })}
                  placeholder="https://www.agaramdhines.lk/courses/"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600"
                />
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800">Action Button 2 (Blue Button)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Button Text</label>
                <input
                  type="text"
                  value={content.button2Text || ""}
                  onChange={(e) => setContent({ ...content, button2Text: e.target.value })}
                  placeholder="e.g. Visit agaramdhines.lk"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Target URL Link</label>
                <input
                  type="text"
                  value={content.button2Url || ""}
                  onChange={(e) => setContent({ ...content, button2Url: e.target.value })}
                  placeholder="https://www.agaramdhines.lk"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600"
                />
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800">Action Button 3 (Login Portal Button)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Button Text</label>
                <input
                  type="text"
                  value={content.button3Text || ""}
                  onChange={(e) => setContent({ ...content, button3Text: e.target.value })}
                  placeholder="e.g. Login Portal"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOTICE BOARD (அறிவிப்புப் பலகை) */}
      {activeTab === 'noticeboard' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Megaphone className="text-amber-500" size={22} /> Notice Board (புதிய அறிவிப்புகள்)
              </h2>
              <p className="text-sm text-slate-500">வகுப்புகள் மற்றும் புதிய செய்திகளுக்கான பிரத்யேக அறிவிப்புப் பலகை.</p>
            </div>

            <button
              onClick={() => {
                setEditingNotice(null);
                setNoticeForm({
                  id: "",
                  title: "",
                  content: "",
                  date: new Date().toISOString().split('T')[0],
                  type: "Important",
                  link: "",
                  isPinned: false
                });
                setShowNoticeModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              <Plus size={18} /> Add New Notice / புதிய அறிவிப்பு
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600">Notice Board Section Title (தலைப்பு)</label>
            <input
              type="text"
              value={content.noticeBoardTitle || ""}
              onChange={(e) => setContent({ ...content, noticeBoardTitle: e.target.value })}
              placeholder="e.g. புதிய அறிவிப்புகள் / Notice Board"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(content.notices || []).map((notice: any) => (
              <div 
                key={notice.id} 
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative ${
                  notice.isPinned ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      notice.type === 'Important' ? 'bg-rose-100 text-rose-700' :
                      notice.type === 'Event' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {notice.type || 'Notice'}
                    </span>

                    <span className="text-xs text-slate-400 font-medium">{notice.date}</span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mb-1 flex items-start gap-2">
                    {notice.isPinned && <Pin size={16} className="text-amber-600 shrink-0 fill-amber-500 mt-1" />}
                    <span>{notice.title}</span>
                  </h3>

                  {notice.content && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">{notice.content}</p>
                  )}

                  {notice.link && (
                    <a href={notice.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-3">
                      <LinkIcon size={12} /> {notice.link}
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/80">
                  <button
                    onClick={() => handleTogglePinNotice(notice.id)}
                    className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                      notice.isPinned ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <Pin size={12} /> {notice.isPinned ? 'Pinned ★' : 'Pin to top'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingNotice(notice);
                        setNoticeForm({
                          id: notice.id,
                          title: notice.title || "",
                          content: notice.content || "",
                          date: notice.date || new Date().toISOString().split('T')[0],
                          type: notice.type || "Important",
                          link: notice.link || "",
                          isPinned: !!notice.isPinned
                        });
                        setShowNoticeModal(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      <Edit2 size={14} /> Edit
                    </button>

                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SLIDESHOW BANNERS */}
      {activeTab === 'slides' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="text-indigo-600" size={20} /> Home Page 3D Slideshow Banners & Posters
              </h2>
              <p className="text-sm text-slate-500">Add poster images, banners, announcements to display on the Home carousel.</p>
            </div>

            <button
              onClick={() => {
                setEditingSlide(null);
                setSlideForm({ id: "", title: "", subtitle: "", image: "", link: "", isActive: true });
                setShowSlideModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              <Plus size={18} /> Add New Slide Banner
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(content.slides || []).map((slide: any) => (
              <div key={slide.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col group">
                <div className="relative h-48 bg-slate-200 overflow-hidden">
                  {slide.image ? (
                    <img src={slide.image} alt={slide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon size={40} />
                    </div>
                  )}
                  <button
                    onClick={() => handleToggleSlideActive(slide.id)}
                    className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${
                      slide.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  >
                    {slide.isActive !== false ? 'Active ✓' : 'Hidden'}
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base line-clamp-1">{slide.title || "Untitled Slide"}</h3>
                    {slide.subtitle && <p className="text-xs text-slate-500 line-clamp-2 mt-1">{slide.subtitle}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setEditingSlide(slide);
                        setSlideForm({
                          id: slide.id,
                          title: slide.title || "",
                          subtitle: slide.subtitle || "",
                          image: slide.image || "",
                          link: slide.link || "",
                          isActive: slide.isActive !== false
                        });
                        setShowSlideModal(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Edit2 size={14} /> Edit
                    </button>

                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: NAVIGATION MENU ITEMS */}
      {activeTab === 'nav' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Navigation className="text-indigo-600" size={20} /> Navigation Header Menu Links
              </h2>
              <p className="text-sm text-slate-500">Manage top bar links displayed on the main menu.</p>
            </div>

            <button
              onClick={() => {
                setEditingNavIndex(null);
                setNavForm({ id: "", name: "", link: "#" });
                setShowNavModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              <Plus size={18} /> Add Menu Link
            </button>
          </div>

          <div className="space-y-3">
            {(content.navItems || []).map((nav: any, index: number) => (
              <div key={nav.id || index} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 text-base">{nav.name}</span>
                    <p className="text-xs text-slate-500">{nav.link}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingNavIndex(index);
                      setNavForm({ id: nav.id || "", name: nav.name || "", link: nav.link || "" });
                      setShowNavModal(true);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteNavItem(index)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: NOTICE BANNER & CONTACT INFO */}
      {activeTab === 'notice' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Bell className="text-indigo-600" size={20} /> Top Alert Bar & Contact Settings
            </h2>
            <p className="text-sm text-slate-500">Configure top marquee banner message and contact details.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <input
                type="checkbox"
                id="showNotice"
                checked={!!content.showNoticeBanner}
                onChange={(e) => setContent({ ...content, showNoticeBanner: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="showNotice" className="font-bold text-slate-800 text-sm cursor-pointer">
                Show Top Alert Announcement Bar on Home Page Header
              </label>
            </div>

            {content.showNoticeBanner && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Notice Announcement Bar Message</label>
                <textarea
                  rows={2}
                  value={content.noticeBanner || ""}
                  onChange={(e) => setContent({ ...content, noticeBanner: e.target.value })}
                  placeholder="e.g. 🚨 New Batch Registrations Open for Grade 6-11 Tamil Classes!"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Contact Phone</label>
              <input
                type="text"
                value={content.contactPhone || ""}
                onChange={(e) => setContent({ ...content, contactPhone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">WhatsApp Number</label>
              <input
                type="text"
                value={content.contactWhatsapp || ""}
                onChange={(e) => setContent({ ...content, contactWhatsapp: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Email Address</label>
              <input
                type="text"
                value={content.contactEmail || ""}
                onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FOOTER & SOCIAL LINKS */}
      {activeTab === 'footer' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Share2 className="text-indigo-600" size={20} /> Footer & Social Links Settings
            </h2>
            <p className="text-sm text-slate-500">Edit lower footer description, social media links, and mobile app download links.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Footer Tagline / Description</label>
              <textarea
                rows={2}
                value={content.footerDescription || ""}
                onChange={(e) => setContent({ ...content, footerDescription: e.target.value })}
                placeholder="The ultimate education management ERP with all advance features..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Facebook URL</label>
                <input
                  type="text"
                  value={content.facebookUrl || ""}
                  onChange={(e) => setContent({ ...content, facebookUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Twitter / X URL</label>
                <input
                  type="text"
                  value={content.twitterUrl || ""}
                  onChange={(e) => setContent({ ...content, twitterUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Instagram URL</label>
                <input
                  type="text"
                  value={content.instagramUrl || ""}
                  onChange={(e) => setContent({ ...content, instagramUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Google Play App Link</label>
                <input
                  type="text"
                  value={content.playStoreUrl || ""}
                  onChange={(e) => setContent({ ...content, playStoreUrl: e.target.value })}
                  placeholder="https://play.google.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Apple App Store Link</label>
                <input
                  type="text"
                  value={content.appStoreUrl || ""}
                  onChange={(e) => setContent({ ...content, appStoreUrl: e.target.value })}
                  placeholder="https://apple.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {showNoticeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-slate-800">
                {editingNotice ? "Edit Notice Item" : "Add New Notice Item"}
              </h3>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Notice Title / தலைப்பு</label>
                <input
                  type="text"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="e.g. புதிய தமிழ் Zoom வகுப்புகள் ஆரம்பம்"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Badge Type / வகை</label>
                  <select
                    value={noticeForm.type}
                    onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  >
                    <option value="Important font-bold text-rose-600">Important (முக்கியமானது)</option>
                    <option value="Event">Event (நிகழ்வு)</option>
                    <option value="General">General (பொது)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date / திகதி</label>
                  <input
                    type="date"
                    value={noticeForm.date}
                    onChange={(e) => setNoticeForm({ ...noticeForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Details / விபரம்</label>
                <textarea
                  rows={3}
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  placeholder="Enter notice description details here..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">External Link / URL (Optional)</label>
                <input
                  type="text"
                  value={noticeForm.link}
                  onChange={(e) => setNoticeForm({ ...noticeForm, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={noticeForm.isPinned}
                  onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
                <label htmlFor="pinNotice" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Pin this notice to top of Notice Board ★
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNoticeModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotice}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md"
              >
                Save Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE MODAL */}
      {showSlideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-slate-800">
                {editingSlide ? "Edit Slide Banner" : "Add New Slide Banner"}
              </h3>
              <button onClick={() => setShowSlideModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Banner Title / தலைப்பு</label>
                <input
                  type="text"
                  value={slideForm.title}
                  onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                  placeholder="e.g. New Classes Starting Soon!"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Subtitle / விபரம்</label>
                <input
                  type="text"
                  value={slideForm.subtitle}
                  onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                  placeholder="e.g. Enroll now for the upcoming semester."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Banner Image (Upload or Image URL)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSlideImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <input
                  type="text"
                  value={slideForm.image}
                  onChange={(e) => setSlideForm({ ...slideForm, image: e.target.value })}
                  placeholder="Or paste Image URL here"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono mt-2"
                />
              </div>

              {slideForm.image && (
                <div className="h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={slideForm.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Click Link (Optional)</label>
                <input
                  type="text"
                  value={slideForm.link}
                  onChange={(e) => setSlideForm({ ...slideForm, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSlideModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSlide}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md"
              >
                Save Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV MODAL */}
      {showNavModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-slate-800">
                {editingNavIndex !== null ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button onClick={() => setShowNavModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Item Name (பெயர்)</label>
                <input
                  type="text"
                  value={navForm.name}
                  onChange={(e) => setNavForm({ ...navForm, name: e.target.value })}
                  placeholder="e.g. COURSES, YOUTUBE, Home"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Link URL</label>
                <input
                  type="text"
                  value={navForm.link}
                  onChange={(e) => setNavForm({ ...navForm, link: e.target.value })}
                  placeholder="e.g. https://... or #login"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNavModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNavItem}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
