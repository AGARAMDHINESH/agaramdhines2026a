import React, { useState, useEffect } from 'react';
import { Youtube as YoutubeIcon, PlayCircle, Trash2, ArrowLeft, Plus, ExternalLink, BookOpen, Folder, Globe, FileText, LayoutGrid, List, Share2, ChevronDown } from 'lucide-react';
import { getYoutubeLinks, saveYoutubeLinks, getWebPosts, saveWebPosts, addNotification, getSubjects, saveSubjects, deleteSubject, getClasses, saveClasses } from '../../lib/db';
import { getCanonicalSubjectCategory } from '../../components/RecordingSection';

export default function Youtube() {
  const [activeTab, setActiveTab] = useState<'youtube' | 'webposts'>('youtube');
  const [links, setLinks] = useState<any[]>([]);
  const [webPosts, setWebPosts] = useState<any[]>([]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [dbClasses, setDbClasses] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedAdminSubject, setSelectedAdminSubject] = useState<string>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [isNewSubject, setIsNewSubject] = useState(false);

  const getSubjectColorClasses = (subjectName: string) => {
    const themes: Record<string, { bg: string, text: string, border: string, dot: string, badge: string }> = {
      indigo: { bg: 'bg-indigo-50 hover:bg-indigo-100/80', text: 'text-indigo-900', border: 'border-indigo-200', dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
      blue: { bg: 'bg-blue-50 hover:bg-blue-100/80', text: 'text-blue-900', border: 'border-blue-200', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
      emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100/80', text: 'text-emerald-900', border: 'border-emerald-200', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
      rose: { bg: 'bg-rose-50 hover:bg-rose-100/80', text: 'text-rose-900', border: 'border-rose-200', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
      amber: { bg: 'bg-amber-50 hover:bg-amber-100/80', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
      violet: { bg: 'bg-violet-50 hover:bg-violet-100/80', text: 'text-violet-900', border: 'border-violet-200', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
      cyan: { bg: 'bg-cyan-50 hover:bg-cyan-100/80', text: 'text-cyan-900', border: 'border-cyan-200', dot: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
      pink: { bg: 'bg-pink-50 hover:bg-pink-100/80', text: 'text-pink-900', border: 'border-pink-200', dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700' },
    };
    
    const colors = ["indigo", "blue", "emerald", "rose", "amber", "violet", "cyan", "pink"];
    let hash = 0;
    for (let i = 0; i < (subjectName || "").length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    return themes[color];
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    if (activeTab === 'youtube') {
      const updatedLinks = links.map(l => l.id === editingId ? editFormData : l);
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      const updatedPosts = webPosts.map(p => p.id === editingId ? editFormData : p);
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }
    
    setEditingId(null);
    setEditFormData(null);
  };

  const togglePublicStatus = async (item: any) => {
    const updatedItem = { ...item, isPublic: !item.isPublic, grade: !item.isPublic ? "Public" : (selectedGrade === "Public (All Students)" ? "தரம் 01" : selectedGrade) };
    
    if (activeTab === 'youtube') {
      const updatedLinks = links.map(l => l.id === item.id ? updatedItem : l);
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      const updatedPosts = webPosts.map(p => p.id === item.id ? updatedItem : p);
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!window.confirm(`இந்த கோப்பை ("${folderName}") மற்றும் அதிலுள்ள அனைத்து விபரங்களையும் நிச்சயமாக நீக்க வேண்டுமா?`)) return;

    if (activeTab === 'youtube') {
      const updatedLinks = links.filter(l => {
        const isCurrentGrade = selectedGrade === "Public (All Students)" ? l.isPublic : l.grade === selectedGrade;
        return !(l.folder === folderName && isCurrentGrade);
      });
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      const updatedPosts = webPosts.filter(p => {
        const isCurrentGrade = selectedGrade === "Public (All Students)" ? p.isPublic : p.grade === selectedGrade;
        return !(p.folder === folderName && isCurrentGrade);
      });
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }
    alert("கோப்பு நீக்கப்பட்டது.");
  };

  const handleDeleteSubject = async (subjectName: string) => {
    if (!window.confirm(`இந்த பாடத்தை ("${subjectName}") மற்றும் அதிலுள்ள அனைத்து விபரங்களையும் நிச்சயமாக நீக்க வேண்டுமா?`)) return;

    if (activeTab === 'youtube') {
      const updatedLinks = links.filter(l => l.subject !== subjectName && (!Array.isArray(l.subjects) || !l.subjects.includes(subjectName)));
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      const updatedPosts = webPosts.filter(p => p.subject !== subjectName && (!Array.isArray(p.subjects) || !p.subjects.includes(subjectName)));
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }

    const cleanSubName = String(subjectName || "").trim().toLowerCase();
    const subjectItem = dbSubjects.find(s => String(s?.name || "").trim().toLowerCase() === cleanSubName);
    const updatedDbSubjects = await deleteSubject(subjectItem?.id || '', subjectName);
    setDbSubjects(updatedDbSubjects);

    setFormData(prev => ({ ...prev, subject: '', subjects: [] }));
    alert("பாடம் நீக்கப்பட்டது.");
  };

  const [formData, setFormData] = useState({
    subject: '',
    subjects: [] as string[],
    title: '',
    link: '',
    folder: '',
    isPublic: false,
    content: '', // for web posts
    imageUrl: '' // featured image
  });

  useEffect(() => {
    Promise.all([getYoutubeLinks(), getWebPosts(), getSubjects(), getClasses()]).then(([linksData, postsData, subjectsData, classesData]) => {
      setLinks(Array.isArray(linksData) ? linksData : []);
      setWebPosts(Array.isArray(postsData) ? postsData : []);
      setDbSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setDbClasses(Array.isArray(classesData) ? classesData : []);
    });
  }, []);

  const GRADES = [
    "Public (All Students)",
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const isSameGrade = (g1: any, g2: any) => {
    if (!g1 || !g2) return false;
    const s1 = String(g1).trim().toLowerCase();
    const s2 = String(g2).trim().toLowerCase();
    if (s1 === s2) return true;
    const num1 = s1.replace(/[^0-9]/g, '');
    const num2 = s2.replace(/[^0-9]/g, '');
    return !!(num1 && num2 && num1 === num2);
  };

  // Get unique subjects relative to active tab
  const tabSubjects = Array.from(new Set(
    (activeTab === 'youtube' ? links : webPosts).map(item => item.subject)
  )).filter((s): s is string => !!s).sort();

  // Get unique subjects registered specifically for the selected grade
  const getGradeSubjectOptions = () => {
    const allDbSubjects = dbSubjects
      .map(s => s && s.name && String(s.name).trim())
      .filter((s): s is string => !!s);

    if (!selectedGrade || selectedGrade === "Public (All Students)") {
      return Array.from(new Set(allDbSubjects)).sort();
    }

    // 1. Get subjects from registered classes matching selectedGrade
    const classSubjects = dbClasses
      .filter(c => c && isSameGrade(c.name, selectedGrade))
      .flatMap(c => Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []))
      .map(s => String(s).trim())
      .filter(Boolean);

    // 2. Get subjects already present in youtubeLinks for selectedGrade
    const linkSubjects = links
      .filter(l => l && isSameGrade(l.grade, selectedGrade))
      .flatMap(l => {
        const arr = [];
        if (l.subject) arr.push(String(l.subject).trim());
        if (Array.isArray(l.subjects)) l.subjects.forEach((s: any) => arr.push(String(s).trim()));
        return arr;
      })
      .filter(Boolean);

    // 3. Get subjects already present in webPosts for selectedGrade
    const postSubjects = webPosts
      .filter(p => p && isSameGrade(p.grade, selectedGrade))
      .flatMap(p => {
        const arr = [];
        if (p.subject) arr.push(String(p.subject).trim());
        if (Array.isArray(p.subjects)) p.subjects.forEach((s: any) => arr.push(String(s).trim()));
        return arr;
      })
      .filter(Boolean);

    // 4. Get subjects from dbSubjects that explicitly match selectedGrade
    const dbGradeSubjects = dbSubjects
      .filter(s => s && (isSameGrade(s.grade, selectedGrade) || (Array.isArray(s.grades) && s.grades.some((g: any) => isSameGrade(g, selectedGrade)))))
      .map(s => String(s.name).trim())
      .filter(Boolean);

    // Always merge allDbSubjects so any created or default subject (e.g. இலக்கிய நயம்) is available
    const combined = Array.from(new Set([
      ...classSubjects,
      ...linkSubjects,
      ...postSubjects,
      ...dbGradeSubjects,
      ...allDbSubjects
    ]));

    // Consolidate redundant literature variants into "தமிழ் இலக்கிய நயம்"
    const consolidated = Array.from(new Set(combined.map(s => {
      const lower = s.toLowerCase().trim();
      if (
        lower === "இலக்கிய நயம்" ||
        lower === "இலக்கிய நயம் (தரம் 11)" ||
        lower === "தமிழ் இலக்கிய நயம் (தரம் 11)" ||
        lower === "தமிழ் இலக்கிய நயம் 20 நாள் பாடநெறி" ||
        lower === "தமிழ் இலக்கிய நயம் 20 நாள்" ||
        lower === "இலக்கிய நயம் 20 நாள் பாடநெறி" ||
        lower === "இலக்கிய நயம் 20 நாள்" ||
        lower.includes("இலக்கிய நயம் 20 நாள்")
      ) {
        return "தமிழ் இலக்கிய நயம்";
      }
      return s;
    }))).sort();

    return consolidated;
  };

  const subjectOptions = getGradeSubjectOptions();

  // Get unique folders relative to active tab and selected grade
  const tabFolders = Array.from(new Set(
    (activeTab === 'youtube' ? links : webPosts)
      .filter(item => item.grade === selectedGrade || (selectedGrade === "Public (All Students)" && item.isPublic))
      .map(item => item.folder)
  )).filter((f): f is string => !!f).sort();

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSubject = formData.subject;
    let finalSubjects = formData.subjects && formData.subjects.length > 0 ? formData.subjects : [formData.subject];

    if (isNewSubject && formData.subject.trim()) {
      const newSubName = formData.subject.trim();
      finalSubject = newSubName;
      finalSubjects = [newSubName];
      if (!dbSubjects.some((s: any) => s && s.name && s.name.toLowerCase().trim() === newSubName.toLowerCase().trim())) {
        const newSubObj = {
          id: Date.now().toString(),
          name: newSubName,
          category: "Sub" as "Main" | "Sub",
          fee: "0"
        };
        const updatedSubjects = [...dbSubjects, newSubObj];
        await saveSubjects(updatedSubjects);
        setDbSubjects(updatedSubjects);
      }
    }
    
    if (activeTab === 'youtube') {
      if ((!finalSubject && (!finalSubjects || finalSubjects.length === 0)) || !formData.title || !formData.link || !formData.folder) {
        alert("Subject, Folder, Title, and Link are required!");
        return;
      }
      
      if (!formData.link.includes('youtube.com') && !formData.link.includes('youtu.be')) {
        alert("Please enter a valid YouTube URL.");
        return;
      }

      const activeSubjects = finalSubjects;
      const newLink = { 
        id: Date.now().toString(), 
        grade: selectedGrade === "Public (All Students)" ? "Public" : selectedGrade,
        isPublic: selectedGrade === "Public (All Students)",
        subject: activeSubjects[0] || "",
        subjects: activeSubjects,
        folder: formData.folder,
        title: formData.title,
        link: formData.link,
        date: new Date().toISOString()
      };
      
      const updatedLinks = [...links, newLink];
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);

      // Add Notification
      if (newLink.grade) {
        await addNotification({
          grade: newLink.grade,
          title: "புதிய வீடியோ பாடம்!",
          message: `${activeSubjects.join(', ')}: ${formData.title} வீடியோ சேர்க்கப்பட்டுள்ளது.`,
          type: 'youtube',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      if ((!finalSubject && (!finalSubjects || finalSubjects.length === 0)) || !formData.title || !formData.content) {
        alert("Subject, Title, and Content are required!");
        return;
      }

      const activeSubjects = finalSubjects;
      const newPost = {
        id: Date.now().toString(),
        grade: selectedGrade === "Public (All Students)" ? "Public" : selectedGrade,
        isPublic: selectedGrade === "Public (All Students)",
        subject: activeSubjects[0] || "",
        subjects: activeSubjects,
        folder: formData.folder,
        title: formData.title,
        content: formData.content,
        link: formData.link,
        imageUrl: formData.imageUrl,
        date: new Date().toISOString()
      };

      const updatedPosts = [...webPosts, newPost];
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);

      // Add Notification
      if (newPost.grade) {
        await addNotification({
          grade: newPost.grade,
          title: "புதிய பாடம் (Post)!",
          message: `${activeSubjects.join(', ')}: ${formData.title} பாடம் சேர்க்கப்பட்டுள்ளது.`,
          type: 'webpost',
          createdAt: new Date().toISOString()
        });
      }
    }
    
    setFormData({ subject: '', subjects: [], title: '', link: '', folder: '', isPublic: false, content: '', imageUrl: '' });
    setIsNewFolder(false);
    setIsNewSubject(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this ${activeTab === 'youtube' ? 'video' : 'post'}?`)) {
      if (activeTab === 'youtube') {
        const updatedLinks = links.filter(l => l.id !== id);
        setLinks(updatedLinks);
        await saveYoutubeLinks(updatedLinks);
      } else {
        const updatedPosts = webPosts.filter(p => p.id !== id);
        setWebPosts(updatedPosts);
        await saveWebPosts(updatedPosts);
      }
    }
  };

  const extractVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const getFolderColor = (folderName: string) => {
    const colors = [
      { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-600', border: 'border-red-100', shadow: 'shadow-red-100' },
      { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-100' },
      { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-600', border: 'border-green-100', shadow: 'shadow-green-100' },
      { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-600', border: 'border-purple-100', shadow: 'shadow-purple-100' },
      { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-600', border: 'border-orange-100', shadow: 'shadow-orange-100' },
      { bg: 'bg-pink-50', text: 'text-pink-600', icon: 'bg-pink-600', border: 'border-pink-100', shadow: 'shadow-pink-100' },
      { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-600', border: 'border-indigo-100', shadow: 'shadow-indigo-100' },
      { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-600', border: 'border-teal-100', shadow: 'shadow-teal-100' },
    ];
    let hash = 0;
    for (let i = 0; i < folderName.length; i++) {
        hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const parseSafeDate = (d: any): Date | null => {
    if (!d) return null;
    
    // Check if it's a Firestore Timestamp (has toDate method or seconds property)
    if (typeof d.toDate === "function") {
      try {
        return d.toDate();
      } catch (e) {
        // ignore
      }
    }
    
    if (d.seconds !== undefined) {
      return new Date(d.seconds * 1000);
    }
    
    if (typeof d === "string" || typeof d === "number") {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // In case it's already a Date object
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d;
    }
    
    return null;
  };

  const formatSafeDate = (d: any, options?: Intl.DateTimeFormatOptions, defaultValue = ""): string => {
    const parsed = parseSafeDate(d);
    if (!parsed) return defaultValue;
    try {
      return parsed.toLocaleDateString(undefined, options);
    } catch (e) {
      return defaultValue;
    }
  };

  const formatSafeTimeString = (d: any, options?: Intl.DateTimeFormatOptions, defaultValue = ""): string => {
    const parsed = parseSafeDate(d);
    if (!parsed) return defaultValue;
    try {
      return parsed.toLocaleTimeString([], options);
    } catch (e) {
      return defaultValue;
    }
  };

  const getElementTime = (el: any) => {
    if (!el || !el.date) return 0;
    const parsed = parseSafeDate(el.date);
    return parsed ? parsed.getTime() : 0;
  };

  const getMaxElementTime = (elements: any[]) => {
    if (!Array.isArray(elements) || elements.length === 0) return 0;
    let maxT = 0;
    for (let i = 0; i < elements.length; i++) {
      const t = getElementTime(elements[i]);
      if (t > maxT) maxT = t;
    }
    return maxT;
  };

  if (selectedGrade) {
    const isGradePublic = selectedGrade === "Public (All Students)";
    const rawGradeLinks = links.filter(l => l && (isGradePublic ? l.isPublic : l.grade === selectedGrade));
    const rawGradePosts = webPosts.filter(p => p && (isGradePublic ? p.isPublic : p.grade === selectedGrade));

    // Filter by selectedAdminSubject with category awareness
    const doesMatchSelectedAdminSubject = (item: any, targetSubject: string) => {
      if (targetSubject === "All") return true;
      const allSubs = [
        item.subject,
        ...(Array.isArray(item.subjects) ? item.subjects : [])
      ].filter(Boolean).map((s: any) => String(s).trim());

      return allSubs.some((s: string) => {
        if (s.toLowerCase() === targetSubject.toLowerCase()) return true;
        const sCat = getCanonicalSubjectCategory(s);
        const tCat = getCanonicalSubjectCategory(targetSubject);
        if (sCat && tCat && sCat === tCat) return true;
        return false;
      });
    };

    const gradeLinks = selectedAdminSubject === "All"
      ? rawGradeLinks
      : rawGradeLinks.filter(l => doesMatchSelectedAdminSubject(l, selectedAdminSubject));

    const gradePosts = selectedAdminSubject === "All"
      ? rawGradePosts
      : rawGradePosts.filter(p => doesMatchSelectedAdminSubject(p, selectedAdminSubject));
    
    // Group links by folder
    const folders: { [key: string]: any[] } = {};
    gradeLinks.forEach(link => {
      const f = link.folder || 'General';
      if (!folders[f]) folders[f] = [];
      folders[f].push(link);
    });

    return (
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedGrade(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {isGradePublic ? <Globe className="text-green-500" size={24} /> : null}
                {selectedGrade} - E-Learning
              </h2>
              <p className="text-sm text-gray-500">Manage videos and posts for this section</p>
            </div>
          </div>
          
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('youtube')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'youtube' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <YoutubeIcon size={18} /> YouTube
            </button>
            <button 
              onClick={() => setActiveTab('webposts')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'webposts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FileText size={18} /> Web Posts
            </button>
          </div>
        </div>

        {/* All Subjects Cards Display Bar (Purple Box, Orange Box, Blue Box Cards) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Registered Subjects for {selectedGrade}</h3>
            </div>
            {selectedAdminSubject !== "All" && (
              <button 
                onClick={() => setSelectedAdminSubject("All")}
                className="text-xs font-bold text-indigo-600 hover:underline bg-indigo-50 px-2.5 py-1 rounded-lg"
              >
                Clear Filter (Show All)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setSelectedAdminSubject("All")}
              className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                selectedAdminSubject === "All"
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-md font-bold"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-black">All Subjects</span>
              <span className="text-[10px] opacity-80 mt-1 font-medium">
                {rawGradeLinks.length} Videos · {rawGradePosts.length} Posts
              </span>
            </button>

            {(subjectOptions as string[]).map(subName => {
              const subTheme = getSubjectColorClasses(subName);
              const isSelected = selectedAdminSubject === subName;
              const subVideos = rawGradeLinks.filter(l => doesMatchSelectedAdminSubject(l, subName));
              const subPosts = rawGradePosts.filter(p => doesMatchSelectedAdminSubject(p, subName));

              return (
                <button
                  key={subName}
                  onClick={() => setSelectedAdminSubject(subName)}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md font-bold ring-2 ring-indigo-500/20"
                      : `${subTheme.bg} ${subTheme.border} ${subTheme.text}`
                  }`}
                >
                  <div>
                    <span className={`inline-block w-2 h-2 rounded-full ${isSelected ? "bg-white" : subTheme.dot} mr-1.5`}></span>
                    <span className="text-xs font-black line-clamp-2">{subName}</span>
                  </div>
                  <span className={`text-[10px] mt-2 font-bold ${isSelected ? "text-indigo-100" : "opacity-75"}`}>
                    {subVideos.length} Videos · {subPosts.length} Posts
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                Add {activeTab === 'youtube' ? 'Video' : 'Post'}
              </h3>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Subject Checkboxes</label>
                    <button 
                      type="button"
                      onClick={() => setIsNewSubject(!isNewSubject)}
                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                    >
                      {isNewSubject ? "Select Existing" : "+ Add New Subject"}
                    </button>
                  </div>
                  {!isNewSubject ? (
                    <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-60 overflow-y-auto">
                      {(subjectOptions as string[]).map(sub => {
                        const isChecked = formData.subjects ? formData.subjects.includes(sub) : (formData.subject === sub);
                        const subTheme = getSubjectColorClasses(sub);
                        return (
                          <label key={sub} className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let updatedSubjects = formData.subjects ? [...formData.subjects] : (formData.subject ? [formData.subject] : []);
                                  if (e.target.checked) {
                                    if (!updatedSubjects.includes(sub)) updatedSubjects.push(sub);
                                  } else {
                                    updatedSubjects = updatedSubjects.filter(item => item !== sub);
                                  }
                                  setFormData(prev => ({
                                    ...prev,
                                    subjects: updatedSubjects,
                                    subject: updatedSubjects[0] || ''
                                  }));
                                }}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span>{sub}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${subTheme.badge}`}>
                              Box
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : isNewSubject ? (
                    <input 
                      type="text" 
                      placeholder="Type new subject name..." 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                      autoFocus
                    />
                  ) : (
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white font-medium"
                    >
                      <option value="">Select a subject...</option>
                      {subjectOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                  {formData.subject && !isNewSubject && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(formData.subject)}
                      className="mt-2 text-[10px] text-red-600 hover:text-red-800 flex items-center gap-1 font-bold bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                    >
                      <Trash2 size={12} /> இந்த பாடத்தை (Subject) நீக்கு
                    </button>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Folder / Unit</label>
                    <button 
                      type="button"
                      onClick={() => setIsNewFolder(!isNewFolder)}
                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                    >
                      {isNewFolder ? "Select Existing" : "+ Add New Folder"}
                    </button>
                  </div>
                  {isNewFolder ? (
                    <input 
                      type="text" 
                      placeholder="Type new folder name..." 
                      value={formData.folder}
                      onChange={(e) => setFormData({...formData, folder: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                      autoFocus
                    />
                  ) : (
                    <select 
                      value={formData.folder}
                      onChange={(e) => setFormData({...formData, folder: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                    >
                      <option value="">Select a folder...</option>
                      {tabFolders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </div>
                {activeTab === 'webposts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">External Link (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="https://..." 
                        value={formData.link}
                        onChange={(e) => setFormData({...formData, link: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Featured Image URL (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="Image URL..." 
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium" 
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter descriptive title" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                  />
                </div>
                {activeTab === 'youtube' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">YouTube URL</label>
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Content (HTML/Text)</label>
                    <textarea 
                      rows={6}
                      placeholder="Write your post content here..." 
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                    />
                  </div>
                )}
                <button 
                  type="submit" 
                  className={`w-full py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${activeTab === 'youtube' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <Plus size={18} />
                  Save {activeTab === 'youtube' ? 'Video' : 'Post'}
                </button>
              </form>
            </div>
          </div>

          {/* Content List */}
          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'youtube' ? (
              Object.keys(folders).length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center text-center">
                   <YoutubeIcon size={48} className="text-gray-200 mb-4" />
                   <h3 className="text-lg font-bold text-gray-800">No folders yet</h3>
                   <p className="text-gray-500">Your categorized videos will appear here.</p>
                </div>
              ) : (
                Object.keys(folders).sort((a, b) => {
                  return getMaxElementTime(folders[b]) - getMaxElementTime(folders[a]);
                }).map(folderName => {
                  const isExpanded = expandedFolders[folderName];
                  const folderColor = getFolderColor(folderName);
                  return (
                    <div key={folderName} className={`bg-white border ${folderColor.border} rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md`}>
                      <button 
                        onClick={() => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
                        className={`w-full flex items-center justify-between p-6 hover:bg-white/50 transition-colors group ${folderColor.bg}`}
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isExpanded ? `${folderColor.icon} text-white shadow-lg ${folderColor.shadow}` : `${folderColor.bg} ${folderColor.text} border ${folderColor.border}`}`}>
                             <Folder size={24} />
                          </div>
                          <div>
                            {(() => {
                              const maxTime = getMaxElementTime(folders[folderName]);
                              return maxTime > 0 ? (
                                <p className="text-slate-500 text-[10px] font-bold mb-1 flex items-center gap-1">
                                  <span>கடைசியாக கூட்டப்பட்டது:</span>
                                  <span>{formatSafeDate(maxTime)} {formatSafeTimeString(maxTime, { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                              ) : null;
                            })()}
                            <h3 className={`font-black uppercase tracking-wider ${folderColor.text}`}>{folderName}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                               {folders[folderName].length} Videos included
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folderName);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100/50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Folder"
                          >
                            <Trash2 size={18} />
                          </span>
                          <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''} ${folderColor.text}`}>
                            <ChevronDown size={24} />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/30">
                          {[...folders[folderName]].sort((a, b) => {
                            return getElementTime(b) - getElementTime(a);
                          }).map(link => {
                            const videoId = extractVideoId(link.link);
                            const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';
                            return (
                              <div key={link.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all flex flex-col">
                                 <div className="relative aspect-video">
                                    <img src={thumbnailUrl} alt={link.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                       <a href={link.link} target="_blank" rel="noopener" className="p-3 bg-red-600 text-white rounded-full transition-transform hover:scale-110"><PlayCircle size={32} /></a>
                                    </div>
                                 </div>
                                 <div className="p-4 flex-1 flex flex-col">
                                    {editingId === link.id ? (
                                      <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                                      {(editFormData.grade === "தரம் 11" || editFormData.grade === "தரம் 10") ? (
                                        <div className="space-y-1.5 p-2 bg-white border rounded-lg max-h-32 overflow-y-auto">
                                          {subjectOptions.map(sub => {
                                            const isChecked = editFormData.subjects ? editFormData.subjects.includes(sub) : (editFormData.subject === sub);
                                            return (
                                              <label key={sub} className="flex items-center space-x-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                                                <input 
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(e) => {
                                                    let updatedSubjects = editFormData.subjects ? [...editFormData.subjects] : (editFormData.subject ? [editFormData.subject] : []);
                                                    if (e.target.checked) {
                                                      if (!updatedSubjects.includes(sub)) updatedSubjects.push(sub);
                                                    } else {
                                                      updatedSubjects = updatedSubjects.filter(item => item !== sub);
                                                    }
                                                    setEditFormData({
                                                      ...editFormData,
                                                      subjects: updatedSubjects,
                                                      subject: updatedSubjects[0] || ''
                                                    });
                                                  }}
                                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                                />
                                                <span>{sub}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <select 
                                          value={editFormData.subject}
                                          onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                                          className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white font-medium"
                                        >
                                          <option value="">Select Subject...</option>
                                          {subjectOptions.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder</label>
                                      <select 
                                        value={editFormData.folder}
                                        onChange={(e) => setEditFormData({...editFormData, folder: e.target.value})}
                                        className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white"
                                      >
                                        <option value="">Select Folder...</option>
                                        {tabFolders.map(f => (
                                          <option key={f} value={f}>{f}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Visibility</label>
                                      <select 
                                        value={editFormData.grade}
                                        onChange={(e) => setEditFormData({...editFormData, grade: e.target.value, isPublic: e.target.value === "Public"})}
                                        className="w-full text-[10px] border rounded-lg px-2 py-1.5 bg-white font-bold"
                                      >
                                        {GRADES.map(g => (
                                          <option key={g} value={g === "Public (All Students)" ? "Public" : g}>{g}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                      <button onClick={handleSaveEdit} className="flex-1 bg-indigo-600 text-white text-[10px] font-black uppercase py-2 rounded-lg shadow-sm">Save</button>
                                      <button onClick={() => setEditingId(null)} className="flex-1 bg-white text-slate-400 text-[10px] font-black uppercase py-2 rounded-lg border border-slate-200">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-widest">
                                        {link.subjects && link.subjects.length > 0 ? link.subjects.join(', ') : link.subject}
                                      </span>
                                      <button 
                                        onClick={() => togglePublicStatus(link)}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${link.isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                      >
                                        {link.isPublic ? 'Public' : 'Private'}
                                      </button>
                                    </div>
                                    {link.date && parseSafeDate(link.date) && (
                                      <div className="text-[10px] font-bold text-slate-500 mt-2">
                                        {formatSafeDate(link.date)} {formatSafeTimeString(link.date, { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    )}
                                    <h4 className="font-bold text-gray-900 mt-1 line-clamp-2">{link.title}</h4>
                                    <div className="mt-4 flex justify-between items-center">
                                       <div className="flex gap-1">
                                          <button onClick={() => startEdit(link)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg text-xs font-bold">Edit</button>
                                          <button onClick={() => handleDelete(link.id)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                       </div>
                                    </div>
                                  </>
                                )}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
              <div className="space-y-8">
                {(() => {
                  const postFolders: { [key: string]: any[] } = {};
                  gradePosts.forEach(post => {
                    const f = post.folder || 'General';
                    if (!postFolders[f]) postFolders[f] = [];
                    postFolders[f].push(post);
                  });

                  if (Object.keys(postFolders).length === 0) {
                    return (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                        No web posts created for this grade yet.
                      </div>
                    );
                  }

                  return Object.keys(postFolders).sort((a, b) => {
                    return getMaxElementTime(postFolders[b]) - getMaxElementTime(postFolders[a]);
                  }).map(folderName => {
                    const maxTime = getMaxElementTime(postFolders[folderName]);
                    return (
                      <div key={folderName} className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2 text-indigo-900">
                          <div className="flex items-center gap-2">
                            <Folder size={20} className="text-indigo-600" />
                            <div>
                              {maxTime > 0 && (
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                  கடைசியாக கூட்டப்பட்டது: {formatSafeDate(maxTime)} {formatSafeTimeString(maxTime, { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              <h3 className="text-lg font-black uppercase tracking-wider">{folderName}</h3>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folderName)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Folder"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...postFolders[folderName]].sort((a, b) => {
                          return getElementTime(b) - getElementTime(a);
                        }).map(post => (
                          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group">
                            {editingId === post.id ? (
                               <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                                        {(editFormData.grade === "தரம் 11" || editFormData.grade === "தரம் 10") ? (
                                          <div className="space-y-1.5 p-2 bg-white border rounded-lg max-h-32 overflow-y-auto">
                                            {subjectOptions.map(sub => {
                                              const isChecked = editFormData.subjects ? editFormData.subjects.includes(sub) : (editFormData.subject === sub);
                                              return (
                                                <label key={sub} className="flex items-center space-x-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                                                  <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      let updatedSubjects = editFormData.subjects ? [...editFormData.subjects] : (editFormData.subject ? [editFormData.subject] : []);
                                                      if (e.target.checked) {
                                                        if (!updatedSubjects.includes(sub)) updatedSubjects.push(sub);
                                                      } else {
                                                        updatedSubjects = updatedSubjects.filter(item => item !== sub);
                                                      }
                                                      setEditFormData({
                                                        ...editFormData,
                                                        subjects: updatedSubjects,
                                                        subject: updatedSubjects[0] || ''
                                                      });
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                                  />
                                                  <span>{sub}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <select 
                                            value={editFormData.subject}
                                            onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                                            className="w-full text-xs border rounded-xl px-3 py-2 bg-white font-medium"
                                          >
                                            <option value="">Select Subject...</option>
                                            {subjectOptions.map(s => (
                                              <option key={s} value={s}>{s}</option>
                                            ))}
                                          </select>
                                        )}
                                     </div>
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder</label>
                                        <select 
                                          value={editFormData.folder}
                                          onChange={(e) => setEditFormData({...editFormData, folder: e.target.value})}
                                          className="w-full text-xs border rounded-xl px-3 py-2 bg-white"
                                        >
                                          <option value="">Select Folder...</option>
                                          {tabFolders.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                          ))}
                                        </select>
                                     </div>
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Grade / Public</label>
                                        <select 
                                          value={editFormData.grade}
                                          onChange={(e) => setEditFormData({...editFormData, grade: e.target.value, isPublic: e.target.value === "Public"})}
                                          className="w-full text-xs border rounded-xl px-3 py-2 bg-white font-bold"
                                        >
                                          {GRADES.map(g => (
                                            <option key={g} value={g === "Public (All Students)" ? "Public" : g}>{g}</option>
                                          ))}
                                        </select>
                                     </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Featured Image URL</label>
                                    <input 
                                      type="url" 
                                      value={editFormData.imageUrl || ''}
                                      onChange={(e) => setEditFormData({...editFormData, imageUrl: e.target.value})}
                                      className="w-full text-sm border rounded-xl px-3 py-2"
                                      placeholder="https://image-url.com/poster.jpg"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Title</label>
                                    <input 
                                      type="text" 
                                      value={editFormData.title}
                                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                                      className="w-full text-sm border rounded-xl px-3 py-2 font-bold"
                                      placeholder="Title"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Content</label>
                                    <textarea 
                                      value={editFormData.content}
                                      onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                                      className="w-full text-sm border rounded-xl px-3 py-2"
                                      rows={4}
                                      placeholder="Content"
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveEdit} className="bg-indigo-600 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md">Save Changes</button>
                                    <button onClick={() => setEditingId(null)} className="bg-white text-slate-500 text-xs font-bold px-6 py-2.5 rounded-xl border border-slate-200">Cancel</button>
                                  </div>
                               </div>
                            ) : (
                               <>
                                 {post.date && parseSafeDate(post.date) && (
                                   <div className="text-[11px] font-bold text-slate-500 mb-2">
                                     {formatSafeDate(post.date)} {formatSafeTimeString(post.date, { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                 )}
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-widest">
                                        {post.subjects && post.subjects.length > 0 ? post.subjects.join(', ') : post.subject}
                                     </span>
                                     <button 
                                       onClick={() => togglePublicStatus(post)}
                                       className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${post.isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                     >
                                       {post.isPublic ? 'Public' : 'Private'}
                                     </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const shareUrl = post.link || window.location.href;
                                        if (navigator.share) {
                                          navigator.share({ title: post.title, text: post.content, url: shareUrl });
                                        } else {
                                          navigator.clipboard.writeText(shareUrl);
                                          alert("Link copied to clipboard!");
                                        }
                                      }}
                                      className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Share2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                  </div>
                                 </div>
                                 {post.imageUrl && (
                                   <div className="mb-4 aspect-video rounded-xl overflow-hidden border border-slate-100">
                                      <img src={post.imageUrl} alt="Featured" className="w-full h-full object-cover" />
                                   </div>
                                 )}
                                <h4 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h4>
                                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{post.content}</p>
                                {post.link && (
                                  <div className="mb-4">
                                    <a href={post.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                                      <ExternalLink size={12} /> Visit Link
                                    </a>
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-4 border-t border-gray-50">

                                  <div className="flex gap-3">
                                     <button onClick={() => startEdit(post)} className="text-indigo-600 font-bold text-xs hover:underline">Edit Post</button>
                                  </div>
                                </div>
                               </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-10">
      {/* Banner */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[300px] flex flex-col justify-end">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2000')] bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        <div className="relative p-8 md:p-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                  <YoutubeIcon size={24} className="text-white" />
                </div>
                <span className="font-black uppercase tracking-[0.2em] text-red-500 text-sm">Media Hub</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">E-Learning & YouTube</h1>
              <p className="text-slate-400 text-lg max-w-2xl font-medium">Manage units, video lessons, and interactive web posts categories by grade.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-red-500">{links.length}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Videos</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-indigo-500">{webPosts.length}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
             <LayoutGrid className="text-red-600" />
             Select Target Grade
           </h2>
           <div className="hidden md:flex gap-2">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewType('list')}
                className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <List size={20} />
              </button>
           </div>
        </div>

        <div className={viewType === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "space-y-2"}>
          {GRADES.map((grade) => {
            const isPublicBtn = grade === "Public (All Students)";
            const vCount = links.filter(l => l && (isPublicBtn ? l.isPublic : l.grade === grade)).length;
            const pCount = webPosts.filter(p => p && (isPublicBtn ? p.isPublic : p.grade === grade)).length;
            
            if (viewType === 'grid') {
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-red-500 hover:shadow-xl transition-all group text-left relative overflow-hidden flex flex-col justify-between h-[180px] ${isPublicBtn ? ' ring-2 ring-green-100' : ''}`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-125 ${isPublicBtn ? 'bg-green-50' : 'bg-red-50'}`}></div>
                  
                  <div className="relative flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${isPublicBtn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {isPublicBtn ? <Globe size={24} /> : <YoutubeIcon size={24} />}
                    </div>
                    {(vCount + pCount) > 0 && (
                      <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                        {vCount + pCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{grade}</h3>
                    <div className="flex gap-2">
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <YoutubeIcon size={10} /> {vCount}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <FileText size={10} /> {pCount}
                       </span>
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-red-50 group transition-all"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                     {isPublicBtn ? <Globe size={18} /> : <Folder size={18} />}
                   </div>
                   <span className="font-bold text-slate-800">{grade}</span>
                </div>
                <div className="flex gap-3 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1 group-hover:text-red-600"><YoutubeIcon size={14} /> {vCount}</span>
                  <span className="flex items-center gap-1 group-hover:text-indigo-600"><FileText size={14} /> {pCount}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
