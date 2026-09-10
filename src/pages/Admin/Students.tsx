import React, { useState, useEffect, useRef } from "react";
import { getStudents, saveStudents, deleteStudent, getClasses, getAdminSettings, sanitizeSubjectList, areSubjectsMatching } from "../../lib/db";
import { isSubjectValidForGrade, getCanonicalSubjectCategory } from "../../components/RecordingSection";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { secondaryAuth } from "../../lib/firebase";
import * as XLSX from "xlsx";
import { 
  Printer, X, QrCode, Download, FileText, Copy, Check, User, LayoutGrid, List, Search, Eye, Edit, Trash2, 
  ArrowLeft, BookOpen, ShieldCheck, ShieldAlert, RefreshCw, UserPlus, Users, Upload, Key, CheckCircle2, 
  AlertTriangle, AlertCircle, Sparkles, Phone, MapPin, Calendar, Lock, GraduationCap, School, Shield, Image as ImageIcon, 
  CheckSquare, Square, Info, ChevronRight, Hash, Trash, CheckCircle, Share2, MessageSquare
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

export default function Students() {
  const [view, setView] = useState<"menu" | "add" | "view" | "import" | "edit" | "view-id-pin">("menu");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkImportGrade, setBulkImportGrade] = useState("");
  const [docModal, setDocModal] = useState<{ type: "idcard" | "certificate" | "details" | null, student: any }>({ type: null, student: null });
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [copiedIdAdmin, setCopiedIdAdmin] = useState(false);
  const [studentViewMode, setStudentViewMode] = useState<'grid' | 'table'>('grid');
  const printRef = useRef<HTMLDivElement>(null);
  const liveCardRef = useRef<HTMLDivElement>(null);
  const [copiedImageToast, setCopiedImageToast] = useState(false);
  const [copiedTextToast, setCopiedTextToast] = useState(false);
  const [downloadingLiveCard, setDownloadingLiveCard] = useState(false);
  const [copyingLiveCard, setCopyingLiveCard] = useState(false);

  const checkStudentMatchesSearch = (s: any, queryStr: string) => {
    if (!queryStr || !queryStr.trim()) return true;
    if (!s) return false;

    const rawQuery = queryStr.trim().toLowerCase();
    const noSpaceQuery = rawQuery.replace(/[\s_\-\.]+/g, '');

    const sName = (s.name || '').toLowerCase();
    const sNameNoSpaces = sName.replace(/[\s_\-\.]+/g, '');
    const sUser = (s.username || '').toLowerCase();
    const sUserNoSpaces = sUser.replace(/[\s_\-\.]+/g, '');
    const sRoll = (s.rollNo || '').toString().toLowerCase().trim();
    const sId = (s.id || '').toString().toLowerCase().trim();
    const sPhone = (s.phone || '').toString().replace(/[^0-9]/g, '');
    const sGuardian = (s.guardianName || '').toLowerCase();

    // Exact matches first
    if (sRoll === rawQuery || sId === rawQuery || sUser === rawQuery) return true;

    // Normalized matching
    if (sUserNoSpaces === noSpaceQuery || sNameNoSpaces === noSpaceQuery) return true;
    if (sName.includes(rawQuery) || sNameNoSpaces.includes(noSpaceQuery)) return true;
    if (sUser.includes(rawQuery) || sUserNoSpaces.includes(noSpaceQuery)) return true;
    if (sRoll.includes(rawQuery)) return true;
    if (sId.includes(rawQuery)) return true;
    if (sPhone && sPhone.includes(rawQuery)) return true;
    if (sGuardian && sGuardian.includes(rawQuery)) return true;

    return false;
  };

  const handleSyncAndCleanData = async () => {
    setIsSyncing(true);
    try {
      const refreshed = await getStudents();
      setStudents(refreshed);
      alert(`Database successfully refreshed directly from server! (${refreshed.length} active students loaded)`);
    } catch (err: any) {
      alert("Error loading student data: " + (err?.message || err));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadDoc = async (format: 'png' | 'pdf') => {
    const element = printRef.current;
    if (!element) return;
    
    try {
      const isIdCard = docModal.type === 'idcard';
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${docModal.student.name}_${isIdCard ? 'ID_Card' : 'Certificate'}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: isIdCard ? [3.375, 2.125] : [11, 8.5]
        });
        const w = isIdCard ? 3.375 : 11;
        const h = isIdCard ? 2.125 : 8.5;
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        pdf.save(`${docModal.student.name}_${isIdCard ? 'ID_Card' : 'Certificate'}.pdf`);
      }
    } catch (error) {
      console.error("Error downloading doc:", error);
      alert("Failed to download doc. (பதிவிறக்கம் தோல்வியடைந்தது.)");
    }
  };

  const handleCopyDocImage = async () => {
    const element = printRef.current;
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      const response = await fetch(imgData);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopiedIdAdmin(true);
      setTimeout(() => setCopiedIdAdmin(false), 2000);
    } catch (error) {
      console.error("Error copying document image:", error);
      alert("Failed to copy image. Clipboard copy might be restricted in this browser session. Try downloading as PNG instead. (படம் நகலெடுக்க முடியவில்லை, PNG-ஆக பதிவிறக்கவும்.)");
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    let printIframe = document.getElementById('student-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'student-print-iframe';
      printIframe.style.position = 'absolute';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      document.body.appendChild(printIframe);
    }
    
    const printDoc = printIframe.contentWindow?.document;
    if (!printDoc) {
      alert('Unable to print document. Please check your browser security settings.');
      return;
    }
    
    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Print ${docModal.type}</title>
          <style>
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
            .print-container { background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            @media print {
              body { background: white; padding: 0; }
              .print-container { box-shadow: none; }
              @page { margin: 0; }
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div class="print-container">
            ${content.innerHTML}
          </div>
        </body>
      </html>
    `);
    printDoc.close();
    
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 1000);
  };

  const [showBulkSubjectModal, setShowBulkSubjectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkSubjectData, setBulkSubjectData] = useState<{
    grade: string;
    subject: string;
    action: 'add' | 'remove';
    studentIds: string[];
  }>({ grade: "", subject: "", action: 'add', studentIds: [] });
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");

  useEffect(() => {
    getStudents().then(setStudents);
    getClasses().then(setClasses);
    getAdminSettings().then(setAdminSettings);
    import('../../lib/db').then(({ getSubjects }) => getSubjects().then(setAllSubjects));

    const handleDbUpdate = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'students') {
        getStudents().then(setStudents);
      }
      if (!key || key === 'classes') {
        getClasses().then(setClasses);
      }
      if (!key || key === 'subjects') {
        import('../../lib/db').then(({ getSubjects }) => getSubjects().then(setAllSubjects));
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('db_updated', handleDbUpdate);
    };
  }, [view]);

  // Form state
  const [formData, setFormData] = useState({
    grade: "",
    name: "",
    username: "",
    password: "",
    rollNo: "",
    subjects: [] as string[],
    zoomBlocked: false,
    dob: "",
    gender: "",
    guardianName: "",
    address: "",
    phone: "",
    studentCode: "",
    admissionDate: "",
    image: ""
  });

  const [updateProgress, setUpdateProgress] = useState(-1);

  const resetForm = () => {
    setFormData({
      grade: "",
      name: "",
      username: "",
      password: "",
      rollNo: "",
      subjects: [],
      zoomBlocked: false,
      dob: "",
      gender: "",
      guardianName: "",
      address: "",
      phone: "",
      studentCode: "",
      admissionDate: "",
      image: ""
    });
  };

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const getGradeSortValue = (name: string) => {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0]) : 999;
  };

  const unifiedGrades = React.useMemo(() => {
    const map = new Map<string, string>(); // normKey -> displayName

    // 1. Existing classes from DB
    classes.forEach((c: any) => {
      if (c?.name) {
        const name = c.name.toString().trim();
        if (name) {
          const digits = name.replace(/[^0-9]/g, '');
          const key = digits ? `grade_${parseInt(digits, 10)}` : name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, name);
          }
        }
      }
    });

    // 2. Standard GRADES list
    GRADES.forEach((g) => {
      const name = g.trim();
      const digits = name.replace(/[^0-9]/g, '');
      const key = digits ? `grade_${parseInt(digits, 10)}` : name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, name);
      }
    });

    // 3. Grades present in student records
    students.forEach((s: any) => {
      if (s?.grade) {
        const name = s.grade.toString().trim();
        if (name) {
          const digits = name.replace(/[^0-9]/g, '');
          const key = digits ? `grade_${parseInt(digits, 10)}` : name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, name);
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => getGradeSortValue(a) - getGradeSortValue(b));
  }, [classes, students]);

  const getStudentCountForGrade = (gradeName: string) => {
    if (!gradeName) return 0;
    const targetNorm = gradeName.toString().trim();
    const targetDigits = targetNorm.replace(/[^0-9]/g, '');

    return students.filter(s => {
      if (!s.grade) return false;
      const sNorm = s.grade.toString().trim();
      if (sNorm === targetNorm || sNorm.toLowerCase() === targetNorm.toLowerCase()) return true;
      const sDigits = sNorm.replace(/[^0-9]/g, '');
      if (targetDigits !== '' && sDigits !== '' && parseInt(targetDigits, 10) === parseInt(sDigits, 10)) return true;
      return false;
    }).length;
  };

  const sortedClasses = [...classes].sort((a, b) => getGradeSortValue(a.name) - getGradeSortValue(b.name));

  const coreDefaultSubjects = ["தமிழ்", "கணிதம்", "விஞ்ஞானம்", "ஆங்கிலம்", "வரலாறு", "தமிழ் மொழி இலக்கியம்", "தமிழ் வினா விடை", "தமிழ் இலக்கிய நயம்", "தமிழ் மொழி வளம் (GAME)", "30 நாள் தமிழ் பாடநெறி (தரம் 11)", "30 நாள் (15 - 30) வது நாள்"];

  const rawAvailableSubjects = Array.from(new Set([
    ...coreDefaultSubjects,
    ...allSubjects.map(s => (typeof s === 'string' ? s : s?.name)).filter(Boolean),
    ...classes.flatMap(c => (Array.isArray(c?.subjects) ? c.subjects : (c?.subject ? [c.subject] : []))).filter(Boolean),
    ...(formData.subjects || []),
    ...students.flatMap(s => s.subjects || s.enrolledClasses || [])
  ])).map(s => String(s).trim()).filter(s => {
    if (!s) return false;
    return isSubjectValidForGrade(s, formData.grade || "");
  });

  const availableSubjectsMap = new Map<string, string>();
  rawAvailableSubjects.forEach(s => {
    const cat = getCanonicalSubjectCategory(s) || s.toLowerCase().trim();
    if (!availableSubjectsMap.has(cat)) {
      if (cat === "tamil") {
        availableSubjectsMap.set(cat, "தமிழ்");
      } else if (cat === "tamil_literature") {
        availableSubjectsMap.set(cat, "தமிழ் இலக்கிய நயம்");
      } else {
        availableSubjectsMap.set(cat, s.trim());
      }
    }
  });

  // Guarantee தமிழ் இலக்கிய நயம் is always available in subject options for eligible grades
  if (!availableSubjectsMap.has("tamil_literature") && isSubjectValidForGrade("தமிழ் இலக்கிய நயம்", formData.grade || "")) {
    availableSubjectsMap.set("tamil_literature", "தமிழ் இலக்கிய நயம்");
  }

  const availableSubjects = Array.from(availableSubjectsMap.values());

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => {
      const isChecked = prev.subjects.some(s => {
        if (s.trim().toLowerCase() === subject.trim().toLowerCase()) return true;
        const sCat = getCanonicalSubjectCategory(s);
        const subCat = getCanonicalSubjectCategory(subject);
        return Boolean(sCat && subCat && sCat === subCat);
      });
      let updatedSubjects: string[];
      if (isChecked) {
        updatedSubjects = prev.subjects.filter(s => {
          if (s.trim().toLowerCase() === subject.trim().toLowerCase()) return false;
          const sCat = getCanonicalSubjectCategory(s);
          const subCat = getCanonicalSubjectCategory(subject);
          if (sCat && subCat && sCat === subCat) return false;
          return true;
        });
      } else {
        updatedSubjects = [...prev.subjects, subject];
      }
      return { ...prev, subjects: sanitizeSubjectList(updatedSubjects) };
    });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert("Name, Username, and Password are required!");
      return;
    }
    
    const cleanRollNo = formData.rollNo ? formData.rollNo.toString().trim() : "";

    // Duplicate Username Check for NEW student
    const targetUser = formData.username.trim().toLowerCase();
    if (targetUser && targetUser !== 'student') {
      const duplicateStudentByUser = students.find((s: any) => {
        if (!s || !s.username) return false;
        return String(s.username).trim().toLowerCase() === targetUser;
      });

      if (duplicateStudentByUser) {
        alert(`பயனர்பெயர் (Username: "${formData.username}") ஏற்கனவே பயன்பாட்டில் உள்ளது! தயவுசெய்து வேறு பயனர்பெயரை உள்ளிடவும்.`);
        return;
      }
    }

    setUpdateProgress(30);
    
    try {
      const currentStudents = await getStudents();

      // Create new student with unique ID
      const generatedId = (formData as any).id || "STU" + Math.floor(100000 + Math.random() * 900000);
      const newStudent = {
        ...formData,
        rollNo: cleanRollNo,
        id: String(generatedId)
      };
      const updatedStudents = [newStudent, ...currentStudents.filter((s: any) => String(s.id) !== String(newStudent.id))];
      
      setUpdateProgress(70);
      
      await saveStudents(updatedStudents);
      const freshlySynced = await getStudents();
      setStudents(freshlySynced);
      
      setUpdateProgress(100);
      
      setTimeout(() => {
        alert("மாணவர் சேர்க்கை வெற்றிகரமாக சேர்க்கப்பட்டது! / Student saved successfully!");
        resetForm();
        setView("menu");
        setUpdateProgress(-1);
      }, 150);
    } catch (error: any) {
      console.error("Error saving student:", error);
      alert("Error saving student: " + (error.message || error));
      setUpdateProgress(-1);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      alert("Name and Username are required!");
      return;
    }
    
    const cleanRollNo = formData.rollNo ? formData.rollNo.toString().trim() : "";
    const targetId = editingStudentId ? String(editingStudentId).trim().toLowerCase() : "";

    setUpdateProgress(30);
    
    try {
      const currentStudents = await getStudents();
      const targetUser = formData.username ? formData.username.trim().toLowerCase() : "";

      let matched = false;
      const updatedStudents = currentStudents.map((s: any) => {
        const sId = s.id ? String(s.id).trim().toLowerCase() : "";
        if (targetId && sId === targetId) {
          matched = true;
          return { 
            ...s, 
            ...formData, 
            rollNo: cleanRollNo,
            id: s.id || targetId || "STU" + Math.floor(100000 + Math.random() * 900000)
          };
        }
        return s;
      });

      if (!matched) {
        updatedStudents.push({
          ...formData,
          rollNo: cleanRollNo,
          id: targetId || "STU" + Math.floor(100000 + Math.random() * 900000)
        });
      }
      
      setUpdateProgress(70);
      await saveStudents(updatedStudents);
      const freshlySynced = await getStudents();
      setStudents(freshlySynced);
      
      setUpdateProgress(100);

      setTimeout(() => {
        alert("மாணவர் விபரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன! / Student updated successfully!");
        resetForm();
        setEditingStudentId(null);
        setView("view");
        setUpdateProgress(-1);
      }, 150);
    } catch (error: any) {
      console.error("Error updating student:", error);
      alert("Error updating student: " + (error.message || error));
      setUpdateProgress(-1);
    }
  };

  const handleToggleZoomBlock = async (student: any) => {
    try {
      const updatedStudents = students.map(s => 
        s.id === student.id ? { ...s, zoomBlocked: !s.zoomBlocked } : s
      );
      setStudents(updatedStudents);
      await saveStudents(updatedStudents);
    } catch (error: any) {
      console.error("Error updating student:", error);
      alert("Error updating student: " + error.message);
    }
  };

  const handleBulkSubjectSubmit = async () => {
    if (!bulkSubjectData.subject || bulkSubjectData.studentIds.length === 0) {
      alert("Please select a subject and at least one student.");
      return;
    }
    
    setLoading(true);
    try {
      const allStudents = await getStudents();
      const updatedStudents = allStudents.map((s: any) => {
        if (bulkSubjectData.studentIds.includes(s.id)) {
          let updatedSubjects = [...(s.subjects || [])];
          if (bulkSubjectData.action === 'add') {
            if (!updatedSubjects.includes(bulkSubjectData.subject)) {
              updatedSubjects.push(bulkSubjectData.subject);
            }
          } else if (bulkSubjectData.action === 'remove') {
            updatedSubjects = updatedSubjects.filter(sub => sub !== bulkSubjectData.subject);
          }
          return { ...s, subjects: updatedSubjects };
        }
        return s;
      });

      await saveStudents(updatedStudents);
      setStudents(updatedStudents);
      alert(`Applied subject ${bulkSubjectData.action} to ${bulkSubjectData.studentIds.length} students.`);
      setShowBulkSubjectModal(false);
    } catch(err) {
      console.error(err);
      alert("Error applying bulk subject updates.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (student: any) => {
    setFormData({
      grade: student.grade || "",
      name: student.name || "",
      username: student.username || "",
      password: student.password || "",
      rollNo: student.rollNo || "",
      subjects: sanitizeSubjectList(student.subjects || student.enrolledClasses || []),
      zoomBlocked: student.zoomBlocked || false,
      dob: student.dob || "",
      gender: student.gender || "",
      guardianName: student.guardianName || "",
      address: student.address || "",
      phone: student.phone || "",
      studentCode: student.studentCode || "",
      admissionDate: student.admissionDate || "",
      image: student.image || ""
    });
    setEditingStudentId(String(student.id || ""));
    setView("edit");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            setFormData(prev => ({ ...prev, image: compressedBase64 }));
          } else {
            setFormData(prev => ({ ...prev, image: event.target?.result as string }));
          }
        };
        img.onerror = () => {
          setFormData(prev => ({ ...prev, image: event.target?.result as string }));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("இந்த மாணவரை நீக்க விரும்புகிறீர்களா? (Are you sure you want to delete this student? They will not be able to login.)")) {
      try {
        const updatedStudents = await deleteStudent(id);
        setStudents(updatedStudents);
        alert("மாணவர் வெற்றிகரமாக Database-லிருந்து நீக்கப்பட்டார் / Student deleted successfully from database.");
      } catch (err: any) {
        console.error("Error deleting student:", err);
        alert("Error deleting student: " + (err.message || err));
      }
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      alert("No students to export.");
      return;
    }

    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      return matchesClass && matchesSubject && checkStudentMatchesSearch(s, searchQuery);
    });

    const dataToExport = filteredStudents.map(s => ({
      "Roll No": s.rollNo || "",
      "Name": s.name,
      "Grade": s.grade || "",
      "Username": s.username,
      "Password": s.password,
      "Guardian Name": s.guardianName || "",
      "Address": s.address || "",
      "DOB": s.dob || "",
      "Gender": s.gender || "",
      "Admission Date": s.admissionDate || "",
      "Subjects": (s.subjects || []).join(", "),
      "Zoom Blocked": s.zoomBlocked ? "Yes" : "No"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, `Students_Export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = () => {
    if (students.length === 0) {
      alert("No students to export.");
      return;
    }

    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      return matchesClass && matchesSubject && checkStudentMatchesSearch(s, searchQuery);
    });

    const doc = new jsPDF();
    const tableColumn = ["Roll No", "Name", "Grade", "Username", "Password"];
    const tableRows = filteredStudents.map(s => [
      s.rollNo || "",
      s.name,
      s.grade || "",
      s.username,
      s.password
    ]);

    doc.text(`Student List - ${filterClass || "All Classes"}`, 14, 15);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save(`Students_Export_${filterClass || "All"}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
        
        if (jsonData.length === 0) {
          alert("The file is empty.");
          setImporting(false);
          return;
        }

        const normalizedData = jsonData.map(row => {
          const normalizedRow: any = {};
          for (const key in row) {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          }
          return normalizedRow;
        });

        const newStudents = [];
        let addedCount = 0;
        let errorCount = 0;

        for (const row of normalizedData) {
          const gradeKey = Object.keys(row).find(k => k.includes('grade') || k.includes('class') || k.includes('தரம்') || k.includes('வகுப்பு'));
          const nameKey = Object.keys(row).find(k => k.includes('name') || k.includes('பெயர்'));
          const usernameKey = Object.keys(row).find(k => k.includes('username') || k.includes('user') || k.includes('பயனர்'));
          const passwordKey = Object.keys(row).find(k => k.includes('password') || k.includes('pass') || k.includes('கடவுச்சொல்'));
          const rollNoKey = Object.keys(row).find(k => k.includes('roll') || k.includes('பதிவு'));
          const subjectsKey = Object.keys(row).find(k => k.includes('subject') || k.includes('பாடம்'));

          if (!nameKey || !usernameKey || !passwordKey) {
            alert("File must contain columns for Name, Username, and Password");
            setImporting(false);
            return;
          }

          const grade = gradeKey && String(row[gradeKey]).trim() ? String(row[gradeKey]).trim() : bulkImportGrade;
          
          const name = String(row[nameKey] || "").trim();
          if (!grade) {
            errorCount++;
            console.error("Skipping row, grade is missing for", name);
            continue;
          }
          const username = String(row[usernameKey] || "").trim();
          const password = String(row[passwordKey] || "").trim();
          const rollNo = rollNoKey ? String(row[rollNoKey] || "").trim() : "";
          
          // Check for duplicate roll number within existing students OR newStudents being imported
          if (rollNo) {
            const isDuplicateInExisting = students.some(s => s.rollNo && s.rollNo.toString().trim() === rollNo);
            const isDuplicateInNew = newStudents.some(s => s.rollNo === rollNo);
            
            if (isDuplicateInExisting || isDuplicateInNew) {
              console.error(`Skipping row, roll number ${rollNo} already exists for ${name}`);
              errorCount++;
              continue;
            }
          }
          
          const subjectsStr = subjectsKey ? String(row[subjectsKey] || "").trim() : "";
          
          let subjects = subjectsStr ? subjectsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
          
          // Auto-assign default subjects of the grade if no subjects provided in Excel
          if (subjects.length === 0 && grade) {
            const classObj = classes.find(c => c.name === grade);
            if (classObj && classObj.subjects) {
              subjects = classObj.subjects;
            }
          }

          if (!name || !username || !password) {
            errorCount++;
            continue;
          }

          try {
            const email = `${username}@agaram.com`;
            await createUserWithEmailAndPassword(secondaryAuth, email, password);
            
            newStudents.push({
              id: "STU" + Math.floor(10000 + Math.random() * 90000),
              grade,
              name,
              username,
              password,
              rollNo,
              subjects
            });
            addedCount++;
          } catch (error) {
            console.error(`Error adding student ${username}:`, error);
            errorCount++;
          }
        }

        if (newStudents.length > 0) {
          const updatedStudents = [...students, ...newStudents];
          setStudents(updatedStudents);
          await saveStudents(updatedStudents);
        }

        alert(`Import complete! Successfully added: ${addedCount}, Errors: ${errorCount}`);
      } catch (err) {
        console.error("Error parsing file:", err);
        alert("Error parsing file. Please ensure it's a valid CSV or Excel file.");
      } finally {
        setImporting(false);
        setView("menu");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadQrImage = async (studentId: string, studentName: string) => {
    const qrElement = document.getElementById(`qr-download-${studentId}`);
    if (qrElement) {
      try {
        const url = await toPng(qrElement, { pixelRatio: 3, backgroundColor: 'transparent' });
        const link = document.createElement("a");
        link.download = `${studentName}-qr.png`;
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating QR code image:", error);
      }
    }
  };

  const handleDownloadQrPdf = async (studentId: string, studentName: string) => {
    const qrElement = document.getElementById(`qr-download-${studentId}`);
    if (qrElement) {
      try {
        const imgData = await toPng(qrElement, { pixelRatio: 3, backgroundColor: 'transparent' });
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 10, 10, 100, 150);
        pdf.save(`${studentName}-qr.pdf`);
      } catch (error) {
        console.error("Error generating QR code PDF:", error);
      }
    }
  };

  const handleDownloadLiveCard = async () => {
    if (!liveCardRef.current) return;
    try {
      setDownloadingLiveCard(true);
      const dataUrl = await toPng(liveCardRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement("a");
      const safeName = (formData.name || formData.username || "student").trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
      link.download = `${safeName}-ID-Card.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error downloading live ID card:", error);
      alert("கார்டை பதிவிறக்குவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setDownloadingLiveCard(false);
    }
  };

  const handleCopyLiveCardImage = async () => {
    if (!liveCardRef.current) return;
    try {
      setCopyingLiveCard(true);
      const dataUrl = await toPng(liveCardRef.current, { pixelRatio: 3, cacheBust: true });
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedImageToast(true);
        setTimeout(() => setCopiedImageToast(false), 3500);
      } else {
        // Fallback to downloading image
        const link = document.createElement("a");
        const safeName = (formData.name || formData.username || "student").trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
        link.download = `${safeName}-ID-Card.png`;
        link.href = dataUrl;
        link.click();
        setCopiedImageToast(true);
        setTimeout(() => setCopiedImageToast(false), 3500);
      }
    } catch (error) {
      console.error("Error copying live ID card image:", error);
      // Fallback download if clipboard image fails
      try {
        const dataUrl = await toPng(liveCardRef.current, { pixelRatio: 3, cacheBust: true });
        const link = document.createElement("a");
        const safeName = (formData.name || formData.username || "student").trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
        link.download = `${safeName}-ID-Card.png`;
        link.href = dataUrl;
        link.click();
        setCopiedImageToast(true);
        setTimeout(() => setCopiedImageToast(false), 3500);
      } catch (_) {
        alert("கார்டை படமாக நகலெடுக்க முடியவில்லை. பதிவிறக்க பொத்தானைப் பயன்படுத்தவும்.");
      }
    } finally {
      setCopyingLiveCard(false);
    }
  };

  const handleCopyLiveCardText = async () => {
    const portalUrl = window.location.origin;
    const subsText = formData.subjects.length > 0 ? formData.subjects.join(", ") : "அனைத்துப் பாடங்கள்";
    const message = `🎓 *AGARAM DHINES ONLINE ACADEMY*
🆔 *மாணவர் அடையாள அட்டை விபரம் (Student ID Card)*

👤 *பெயர் (Name):* ${formData.name || "-"}
🏫 *வகுப்பு (Grade):* ${formData.grade || "-"}
🔢 *பதிவு எண் (Roll No):* ${formData.rollNo || "-"}
📚 *பாடங்கள் (Subjects):* ${subsText}

🔐 *உள்நுழைவு விபரம் (Login Credentials):*
• *Username:* ${formData.username || "-"}
• *Password/PIN:* ${formData.password || "-"}

🌐 *வலைத்தள முகவரி (Login Portal):*
${portalUrl}

📞 *தொடர்புகளுக்கு:* 778054232`;

    try {
      await navigator.clipboard.writeText(message);
      setCopiedTextToast(true);
      setTimeout(() => setCopiedTextToast(false), 3500);
    } catch (error) {
      console.error("Error copying live ID card text:", error);
    }
  };

  if (view === "menu") {
    const totalStudentsCount = students.length;
    const totalClassesCount = unifiedGrades.length;
    const zoomBlockedCount = students.filter(s => s.zoomBlocked).length;
    const zoomActiveCount = totalStudentsCount - zoomBlockedCount;

    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Top Header & Metrics Bar (Landscape Widescreen) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-amber-300">
                  <GraduationCap size={26} />
                </span>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                    மாணவர் நிர்வாகம்
                    <span className="text-sm sm:text-base font-semibold text-indigo-200">/ Student Management</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    மாணவர் சேர்க்கை, விபரங்கள், அடையாள அட்டை (ID Card), மற்றும் Zoom அணுகல் மேலாண்மை
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAndCleanData}
                disabled={isSyncing}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 backdrop-blur-md shadow-sm disabled:opacity-60"
              >
                <RefreshCw size={15} className={isSyncing ? "animate-spin text-amber-300" : ""} />
                {isSyncing ? "Syncing..." : "Sync Database"}
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300 block">மொத்த மாணவர்கள் (Total)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-white">{totalStudentsCount}</span>
                <span className="text-[11px] text-indigo-200 font-medium">Students</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300 block">வகுப்புகள் (Grades)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-amber-300">{totalClassesCount}</span>
                <span className="text-[11px] text-amber-200/80 font-medium">Classes</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300 block">செயலில் உள்ளோர் (Active)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-400">{zoomActiveCount}</span>
                <span className="text-[11px] text-emerald-200/80 font-medium">Zoom Active</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300 block">முடக்கப்பட்டோர் (Blocked)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-red-400">{zoomBlockedCount}</span>
                <span className="text-[11px] text-red-200/80 font-medium">Due Defaulters</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Main Action Hub Cards (Landscape Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Add Student */}
          <div 
            onClick={() => {
              resetForm();
              setEditingStudentId(null);
              setView("add");
            }}
            className="group bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50/50 rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform mb-4">
                <UserPlus size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                புதிய மாணவர் சேர்க்கை
              </h3>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">Add New Student</p>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                புதிய மாணவரை வகுப்பில் சேர்க்க, கடவுச்சொல், பாடங்கள் & புகைப்படத்துடன் பதிவு செய்யவும்.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
              <span>மாணவரைச் சேர் ➜</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Landscape Form</span>
            </div>
          </div>

          {/* Card 2: View Students */}
          <div 
            onClick={() => setView("view")}
            className="group bg-white hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50/50 rounded-2xl p-6 border-2 border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-13 h-13 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform mb-4">
                <Users size={26} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  மாணவர்கள் விபரம்
                </h3>
                <span className="bg-indigo-100 text-indigo-800 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                  {students.length}
                </span>
              </div>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">View & Manage Students</p>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                அனைத்து மாணவர்கள் பட்டியல், வகுப்பு வாரியாக தேடல், ID Card, சான்றிதழ் & Zoom கட்டுப்பாடு.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
              <span>பட்டியலை காண்க ➜</span>
              <span className="text-[10px] text-slate-400 font-medium">Table & Grid</span>
            </div>
          </div>

          {/* Card 3: Bulk Import */}
          <div 
            onClick={() => setView("import")}
            className="group bg-white hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50/50 rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform mb-4">
                <Upload size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Excel / CSV இறக்குமதி
              </h3>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Bulk Import Students</p>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                Excel அல்லது CSV கோப்பு மூலம் ஒரே நேரத்தில் பல மாணவர்களை விரைவாக சேர்க்கலாம்.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-emerald-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
              <span>கோப்பு பதிவேற்று ➜</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">XLSX / CSV</span>
            </div>
          </div>

          {/* Card 4: View ID & PIN */}
          <div 
            onClick={() => setView("view-id-pin")}
            className="group bg-white hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50/50 rounded-2xl p-6 border-2 border-slate-200 hover:border-amber-500 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-13 h-13 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform mb-4">
                <Key size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                அடையாள அட்டை & PIN
              </h3>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">View ID & PIN List</p>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                மாணவர்களின் பயனர் பெயர், கடவுச்சொல் & QR குறியீடுகளை ஒரே பார்வையில் பார்க்க/அச்சிட.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-amber-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
              <span>விபரம் காண்க ➜</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">QR & PIN</span>
            </div>
          </div>
        </div>

        {/* Quick Recent Students Landscape Preview */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">சமீபத்தில் சேர்க்கப்பட்ட மாணவர்கள் (Recent Students)</h3>
              <span className="text-xs text-slate-500">({students.slice(0, 6).length} loaded)</span>
            </div>
            <button
              onClick={() => setView("view")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
            >
              அனைத்தையும் பார்க்க (View All) ➜
            </button>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              மாணவர்கள் எவரும் இன்னும் சேர்க்கப்படவில்லை. புதிய மாணவரைச் சேர்க்க மேலே உள்ள பொத்தானைப் பயன்படுத்தவும்.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {students.slice(0, 6).map((st) => (
                <div 
                  key={st.id} 
                  onClick={() => handleEditClick(st)}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer flex flex-col items-center text-center group"
                >
                  <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center overflow-hidden mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                    {st.image ? (
                      <img src={st.image} alt={st.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{st.name ? st.name.charAt(0).toUpperCase() : 'S'}</span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 truncate w-full group-hover:text-indigo-700">{st.name}</h4>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-white border border-indigo-100 px-2 py-0.5 rounded-full mt-1">
                    {st.grade || 'No Grade'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Roll: {st.rollNo || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "import") {
    return (
      <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("menu")}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center"
              title="Back to Menu"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Bulk Import Students (மொத்த மாணவர்கள் இறக்குமதி)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Upload CSV or Excel spreadsheets to quickly register batches of students</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Instructions Left Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 space-y-3">
              <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                <Info size={16} className="text-indigo-600" />
                File Format Requirements (கோப்பு முறை விபரம்):
              </h3>
              <p className="text-xs text-indigo-800 leading-relaxed">
                உங்கள் Excel (.xlsx, .xls) அல்லது CSV கோப்பின் முதல் வரியில் கீழ்க்கண்ட தலைப்புகள் (Headers) இருக்க வேண்டும்:
              </p>
              <ul className="list-disc list-inside text-xs text-indigo-900/90 space-y-1.5 bg-white/70 p-3.5 rounded-xl border border-indigo-200/60">
                <li><strong>Name (பெயர்)</strong> <span className="text-red-500 font-bold">*கட்டாயம்</span></li>
                <li><strong>Username (பயனர் பெயர்)</strong> <span className="text-red-500 font-bold">*கட்டாயம்</span></li>
                <li><strong>Password (கடவுச்சொல்)</strong> <span className="text-red-500 font-bold">*கட்டாயம்</span></li>
                <li><strong>Grade / Class (வகுப்பு)</strong> (Optional if selected on the right)</li>
                <li><strong>Roll No (பதிவு எண்)</strong> (Optional - e.g. 101, 102)</li>
                <li><strong>Subjects (பாடங்கள்)</strong> (Optional - Comma separated, e.g. தமிழ், கணிதம்)</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-1">💡 குறிப்பு (Important Note):</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                கோப்பில் பாடம் (Subjects) குறிப்பிடப்படாவிட்டால், நீங்கள் தேர்ந்தெடுக்கும் வகுப்பின் இயல்புநிலை பாடங்கள் (Default Subjects) மாணவருக்கு தானாகவே ஒதுக்கப்படும்.
              </p>
            </div>
          </div>

          {/* Upload Form Right Column */}
          <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  இயல்புநிலை வகுப்பு / Default Class (If missing in Excel)
                </label>
                <select
                  value={bulkImportGrade}
                  onChange={(e) => setBulkImportGrade(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-slate-800"
                >
                  <option value="">-- வகுப்பைத் தேர்ந்தெடுக்கவும் (Select Class) --</option>
                  {unifiedGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Excel / CSV கோப்பைத் தேர்ந்தெடுக்கவும் (Upload File)
                </label>
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors rounded-2xl p-6 text-center cursor-pointer relative">
                  <Upload size={32} className="mx-auto text-indigo-500 mb-2" />
                  <span className="text-sm font-bold text-indigo-950 block">Click to select or drag and drop spreadsheet</span>
                  <span className="text-xs text-slate-500 mt-1 block">Supports .xlsx, .xls, .csv files</span>
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleBulkImport}
                    disabled={importing}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>

              {importing && (
                <div className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl p-4 text-center font-bold text-sm flex items-center justify-center gap-2 animate-pulse">
                  <RefreshCw size={18} className="animate-spin text-indigo-600" />
                  Importing students into database... Please wait.
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                ரத்து செய் (Cancel)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    // Helper when class changes - purely updates grade without auto-checking subjects
    const handleClassChange = (selectedGrade: string) => {
      setFormData(prev => ({ ...prev, grade: selectedGrade }));
    };

    // Helper to auto-suggest roll number if empty
    const handleSuggestRollNo = () => {
      const existingRollSet = new Set(
        students.map(s => String(s.rollNo || '').trim().toLowerCase())
      );
      if (formData.grade) {
        const gradeStudents = students.filter(s => s.grade === formData.grade && s.rollNo);
        let maxRoll = gradeStudents.reduce((max, s) => {
          const num = parseInt(s.rollNo, 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        let candidate = maxRoll > 0 ? maxRoll + 1 : 101;
        while (existingRollSet.has(candidate.toString().toLowerCase())) {
          candidate++;
        }
        setFormData(prev => ({ ...prev, rollNo: candidate.toString() }));
      } else {
        let candidate = 100 + students.length + 1;
        while (existingRollSet.has(candidate.toString().toLowerCase())) {
          candidate++;
        }
        setFormData(prev => ({ ...prev, rollNo: candidate.toString() }));
      }
    };

    // Helper to select all subjects
    const handleSelectAllSubjects = () => {
      setFormData(prev => ({ ...prev, subjects: sanitizeSubjectList(availableSubjects) }));
    };

    // Helper to clear all subjects
    const handleClearAllSubjects = () => {
      setFormData(prev => ({ ...prev, subjects: [] }));
    };

    return (
      <div className="w-full max-w-7xl mx-auto space-y-5">
        {/* Top Landscape Header Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView(view === "edit" ? "view" : "menu");
                resetForm();
                setEditingStudentId(null);
              }}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {view === "edit" ? "மாணவர் விபரம் திருத்தம் (Edit Student)" : "புதிய மாணவர் சேர்க்கை (Add Student)"}
                </h1>
                <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-100">
                  {formData.grade ? formData.grade : "வகுப்பு தேர்வு தேவை"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                கணினி மற்றும் கைபேசிக்கு ஏற்ற முழு அகல லேண்ட்ஸ்கேப் படிவம் (Responsive Landscape Form)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              படிவத்தை அழிக்க (Reset)
            </button>
            <button
              onClick={(e) => {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                if (view === "edit") {
                  handleEditStudent(fakeEvent);
                } else {
                  handleAddStudent(fakeEvent);
                }
              }}
              disabled={updateProgress >= 0}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {updateProgress >= 0 
                ? `Saving... ${updateProgress}%` 
                : (view === "edit" ? "விபரங்களை புதுப்பி (Update)" : "மாணவரைச் சேமி (Save)")}
            </button>
          </div>
        </div>

        {/* Main Landscape Multi-Column Form Grid */}
        <form onSubmit={view === "edit" ? handleEditStudent : handleAddStudent}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            
            {/* Column 1: கல்வி & தனிப்பட்ட விபரங்கள் (Academic & Identity Profile) - lg:col-span-4 */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <School size={18} />
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">1. கல்வி & தனிப்பட்ட விபரம் (Academic Profile)</h3>
                </div>

                {/* Class / Grade Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    வகுப்பு / தரம் (Class & Section) <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.grade}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 font-semibold text-slate-900"
                  >
                    <option value="">-- வகுப்பைத் தேர்ந்தெடுக்கவும் --</option>
                    {unifiedGrades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                    {formData.grade && !unifiedGrades.includes(formData.grade) && (
                      <option key={formData.grade} value={formData.grade}>
                        {formData.grade}
                      </option>
                    )}
                  </select>
                </div>

                {/* Student Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    மாணவர் முழுப் பெயர் (Student Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="எ.கா. க. தினேஷ் நிவாஸ் (Dhines Nivas)"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData(prev => {
                        // Auto-fill username if blank
                        let newUsername = prev.username;
                        if (!newUsername && newName.trim()) {
                          newUsername = newName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
                        }
                        return { ...prev, name: newName, username: newUsername };
                      });
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Roll Number with Suggestion Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      பதிவு எண் (Roll No)
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggestRollNo}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      + தானியங்கி எண் (Suggest)
                    </button>
                  </div>
                  <div className="relative">
                    <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="எ.கா. 101, 202401"
                      value={formData.rollNo}
                      onChange={(e) => setFormData({...formData, rollNo: e.target.value})}
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Student Code / Index (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    மாணவர் குறியீடு (Student Code - Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="எ.கா. AGA-2024-001"
                    value={formData.studentCode}
                    onChange={(e) => setFormData({...formData, studentCode: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Date of Admission */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    சேர்க்கை தேதி (Date Of Admission)
                  </label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* DOB & Gender Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      பிறந்த தேதி (DOB)
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      பாலினம் (Gender)
                    </label>
                    <select 
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="">தேர்வு செய்</option>
                      <option value="Male">ஆண் (Male)</option>
                      <option value="Female">பெண் (Female)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 mt-2">
                📌 மாணவர் பெயர் மற்றும் வகுப்பு கட்டாயமானது.
              </div>
            </div>

            {/* Column 2: தொடர்பு & பாதுகாப்பு கணக்கு (Contact & Security Credentials) - lg:col-span-4 */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Key size={18} />
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">2. தொடர்பு & உள்நுழைவு (Contact & Login)</h3>
                </div>

                {/* Guardian Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    பெற்றோர் / பாதுகாவலர் பெயர் (Guardian Name)
                  </label>
                  <input
                    type="text"
                    placeholder="பெற்றோர் பெயர்"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Contact No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    தொலைபேசி எண் (Contact Phone / WhatsApp)
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="எ.கா. 0771234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    முகவரி (Address)
                  </label>
                  <textarea
                    placeholder="மாணவர் வசிக்கும் முகவரி"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  ></textarea>
                </div>

                {/* Username & Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      பயனர் பெயர் (User) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        கடவுச்சொல் (PIN) <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const randPin = Math.floor(1000 + Math.random() * 9000).toString();
                          setFormData(prev => ({ ...prev, password: randPin }));
                        }}
                        className="text-[10px] font-bold text-amber-600 hover:underline"
                      >
                        + 4-Digit
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="password / PIN"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono font-bold text-indigo-700"
                    />
                  </div>
                </div>

                {/* Student Image Upload with Preview */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    மாணவர் புகைப்படம் (Student Photo)
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-indigo-200 shrink-0 flex items-center justify-center shadow-xs">
                      {formData.image ? (
                        <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                      {formData.image && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                          className="text-[11px] text-red-600 hover:underline mt-1 font-semibold flex items-center gap-1"
                        >
                          <Trash size={12} /> புகைப்படத்தை நீக்கு (Remove)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800">
                🔒 மாணவர் இணையத்தளத்தில் நுழைய Username & Password அவசியமாகும்.
              </div>
            </div>

            {/* Column 3: பாடங்கள், Zoom கட்டுப்பாடு & நேரலை அட்டை (Subjects, Access & Real-Time Card Preview) - lg:col-span-4 */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <BookOpen size={18} />
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">3. பாடங்கள் & அணுகல் (Subjects & Access)</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {formData.subjects.length} பாடங்கள்
                  </span>
                </div>

                {/* Subject Selector Header Controls */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      ஒதுக்கப்படும் பாடங்கள் (Assigned Subjects):
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllSubjects}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleClearAllSubjects}
                        className="text-[11px] font-bold text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Subjects Grid */}
                  <div className="max-h-40 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 custom-scrollbar">
                    {availableSubjects.length > 0 ? (
                      availableSubjects.map((subject: string) => {
                        const isChecked = formData.subjects.some(s => {
                          if (s.trim().toLowerCase() === subject.trim().toLowerCase()) return true;
                          const sCat = getCanonicalSubjectCategory(s);
                          const subCat = getCanonicalSubjectCategory(subject);
                          return Boolean(sCat && subCat && sCat === subCat);
                        });
                        return (
                          <label 
                            key={subject} 
                            className={`flex items-center space-x-2.5 text-xs p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-50/80 font-bold text-indigo-950 border border-indigo-200' : 'hover:bg-white text-slate-700'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleSubjectToggle(subject)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span className="truncate">{subject}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 p-2 text-center">
                        பாடங்கள் எதுவும் கிடைக்கவில்லை (No subjects found).
                      </p>
                    )}
                  </div>
                </div>

                {/* Zoom Access Block Toggle */}
                <div className="pt-1">
                  <label className={`flex items-start space-x-3 cursor-pointer p-3.5 rounded-xl border transition-colors ${
                    formData.zoomBlocked 
                      ? 'bg-red-50/90 border-red-300' 
                      : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.zoomBlocked}
                      onChange={(e) => setFormData({...formData, zoomBlocked: e.target.checked})}
                      className="w-5 h-5 mt-0.5 text-red-600 border-gray-300 rounded focus:ring-red-500 shrink-0"
                    />
                    <div>
                      <span className={`text-xs font-bold block ${formData.zoomBlocked ? 'text-red-700' : 'text-emerald-800'}`}>
                        {formData.zoomBlocked ? "⛔ Zoom Access Blocked (முடக்கப்பட்டது)" : "✅ Zoom Access Active (செயலில் உள்ளது)"}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        கட்டணம் செலுத்தாததால் மாணவரின் நேரலை Zoom வகுப்பை முடக்க இந்த தேர்வை இயக்கவும்.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Real-time Official ID Card Preview with Download & Copy Toolbar */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      நேரலை அடையாள அட்டை (Live Card Preview)
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">
                      {formData.rollNo ? `ROLL: ${formData.rollNo}` : 'LIVE PREVIEW'}
                    </span>
                  </div>

                  {/* Toast Notifications */}
                  {copiedImageToast && (
                    <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in">
                      <CheckCircle2 size={15} />
                      🎉 கார்டு படமாக நகலெடுக்கப்பட்டது (Ready to paste in WhatsApp)!
                    </div>
                  )}
                  {copiedTextToast && (
                    <div className="p-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in">
                      <CheckCircle2 size={15} />
                      📋 மாணவர் Login விபரம் நகலெடுக்கப்பட்டது (WhatsApp Text Copied)!
                    </div>
                  )}

                  {/* The Official Agaram Dhines ID Card Container */}
                  <div className="w-full flex justify-center bg-slate-900/5 p-2 rounded-2xl border border-slate-200">
                    <div 
                      ref={liveCardRef}
                      className="w-full max-w-[420px] bg-gradient-to-br from-[#2563eb] via-[#4338ca] to-[#7c3aed] text-white rounded-2xl p-3.5 sm:p-4 shadow-xl border border-white/20 relative overflow-hidden flex flex-col justify-between"
                      style={{ minHeight: "260px" }}
                    >
                      {/* Subtle ambient light orbs */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-28 h-28 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />

                      {/* Header Row: Academy Logo & Official Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2 z-10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-full p-0.5 shadow-md border border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
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
                          <div className="min-w-0">
                            <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs truncate">
                              {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                            </h3>
                            <p className="text-[9.5px] sm:text-[10.5px] font-extrabold text-amber-300 leading-tight drop-shadow-xs truncate">
                              அகரம் தினேஷ் ஆன்லைன் அகாடமி
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[8.5px] sm:text-[9px] font-black bg-[#f59e0b] text-indigo-950 px-2 py-0.5 rounded shadow-xs uppercase tracking-wider inline-block">
                            OFFICIAL ID
                          </span>
                          <span className="text-[9.5px] sm:text-[10px] font-extrabold text-sky-100 block mt-0.5 whitespace-nowrap">
                            📞 778054232
                          </span>
                        </div>
                      </div>

                      {/* Student Details Row */}
                      <div className="flex items-center gap-3 my-2 z-10">
                        <div className="w-12 h-12 rounded-full border-2 border-white/90 overflow-hidden shrink-0 bg-white/20 flex items-center justify-center shadow-md">
                          {formData.image ? (
                            <img src={formData.image} alt={formData.name || "Student"} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base sm:text-lg font-extrabold text-white truncate leading-tight drop-shadow-xs">
                            {formData.name || "MASafiya"}
                          </h2>
                          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-sky-100 mt-0.5 font-medium flex-wrap">
                            <span>Grade: <strong className="text-amber-300 font-bold">{formData.grade || "தரம் 11"}</strong></span>
                            <span className="text-white/40">•</span>
                            <span>Roll No: <strong className="text-white font-bold">{formData.rollNo || "2026/PAPER(B1)/1515"}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Enrolled Subjects Box */}
                      <div className="z-10 bg-black/30 backdrop-blur-xs p-2 rounded-xl border border-white/15 my-1 shadow-inner">
                        <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-sky-200 block mb-1">
                          SUBJECTS / பாடங்கள்:
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto custom-scrollbar">
                          {formData.subjects && formData.subjects.length > 0 ? (
                            formData.subjects.map((sub: string, idx: number) => (
                              <span 
                                key={idx} 
                                className="bg-[#eab308] text-indigo-950 font-black px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] shadow-xs whitespace-nowrap"
                              >
                                {sub}
                              </span>
                            ))
                          ) : (
                            <span className="bg-[#eab308] text-indigo-950 font-black px-2 py-0.5 rounded text-[9.5px] shadow-xs">
                              பாடங்கள் தேர்ந்தெடுக்கப்படவில்லை
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Credentials & QR Code Row */}
                      <div className="flex items-end justify-between gap-2 mt-1 z-10">
                        <div className="bg-black/35 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/20 text-[10.5px] font-mono leading-tight flex-1 flex flex-col justify-center">
                          <p className="text-white/80 flex justify-between">
                            <span>User:</span> 
                            <span className="text-white font-bold tracking-wide">{formData.username || "masafiya"}</span>
                          </p>
                          <p className="text-white/80 flex justify-between mt-0.5">
                            <span>Pass:</span> 
                            <span className="text-amber-300 font-bold tracking-wide">{formData.password || "773548509"}</span>
                          </p>
                        </div>
                        <div className="bg-white p-1 rounded-xl shrink-0 shadow-md flex items-center justify-center border border-white/30">
                          <QRCodeSVG 
                            value={formData.studentCode || formData.rollNo || formData.username || "agaram-student"} 
                            size={44} 
                            level="H" 
                            includeMargin={false} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pre-Submit Action Buttons: Download, Copy Image, Copy WhatsApp Info */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadLiveCard}
                      disabled={downloadingLiveCard}
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                      title="Download ID Card PNG"
                    >
                      <Download size={13} className={downloadingLiveCard ? "animate-bounce" : ""} />
                      <span>{downloadingLiveCard ? "பதிவிறக்குகிறது..." : "கார்டு Download"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLiveCardImage}
                      disabled={copyingLiveCard}
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                      title="Copy Card Image to Clipboard"
                    >
                      <Copy size={13} className={copyingLiveCard ? "animate-spin" : ""} />
                      <span>{copyingLiveCard ? "நகலெடுக்கிறது..." : "படம் Copy"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLiveCardText}
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm hover:shadow active:scale-95"
                      title="Copy WhatsApp Login Details & Portal Link"
                    >
                      <MessageSquare size={13} className="text-emerald-400" />
                      <span>WhatsApp விபரம்</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateProgress >= 0}
                  className={`w-full text-white py-3 px-6 rounded-xl transition-all duration-300 font-bold text-sm relative overflow-hidden flex justify-center items-center shadow-lg ${
                    updateProgress >= 0 
                      ? "bg-amber-500 shadow-amber-200" 
                      : (view === "edit" 
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-200" 
                          : "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-pink-200")
                  }`}
                >
                  {/* Progress Background */}
                  {updateProgress >= 0 && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-300"
                      style={{ width: `${updateProgress}%` }}
                    />
                  )}
                  
                  {/* Button Text */}
                  <span className="relative z-10 font-bold whitespace-nowrap flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    {updateProgress >= 0 
                      ? `Saving to Database... ${updateProgress}%`
                      : (view === "edit" ? "மாணவர் விபரங்களை சேமி (Update Student)" : "மாணவர் சேர்க்கையை உறுதி செய் (Save Student)")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (view === "view") {
    // Determine students matching class/grade first (for subject count calculations)
    const targetStudentsForClass = filterClass === "unassigned" 
      ? students.filter(s => !s.grade || s.grade === "")
      : (filterClass ? students.filter(s => s.grade === filterClass) : students);

    // Compute list of available subjects for the Subject Filter dropdown
    const availableSubjectsList = (() => {
      const subjectsSet = new Set<string>();
      targetStudentsForClass.forEach(s => {
        const subs = s.subjects || s.enrolledClasses || [];
        if (Array.isArray(subs)) {
          subs.forEach((sub: any) => {
            const clean = sub?.toString().trim();
            if (clean) subjectsSet.add(clean);
          });
        }
      });

      classes.forEach(c => {
        if (!filterClass || c.name === filterClass) {
          if (Array.isArray(c.subjects)) {
            c.subjects.forEach((sub: any) => {
              const clean = sub?.toString().trim();
              if (clean) subjectsSet.add(clean);
            });
          }
        }
      });

      if (!filterClass || subjectsSet.size === 0) {
        allSubjects.forEach(s => {
          const name = typeof s === 'string' ? s : s?.name;
          const clean = name?.toString().trim();
          if (clean) subjectsSet.add(clean);
        });
      }

      return Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));
    })();

    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      return matchesClass && matchesSubject && checkStudentMatchesSearch(s, searchQuery);
    });

    const studentCountByClass = students.reduce((acc, s) => {
      if (s.grade) {
        acc[s.grade] = (acc[s.grade] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const unassignedCount = students.filter(s => !s.grade || s.grade === "").length;

    return (
      <>
        <div className="w-full max-w-full mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("menu")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center"
                title="Back to Menu"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">View Students</h2>
                  <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-100">
                    {filteredStudents.length} Students
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Manage and search all registered student profiles</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Name, Roll No, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-all"
                />
              </div>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setFilterSubject("");
                }}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 font-medium"
              >
                <option value="">All Classes ({students.length})</option>
                <option value="unassigned" className="text-red-600 font-bold">Unassigned ({unassignedCount})</option>
                {unifiedGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} ({getStudentCountForGrade(grade)})
                  </option>
                ))}
              </select>

              {/* Subject Filter */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className={`py-2 px-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all ${
                  filterSubject 
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm shadow-indigo-200" 
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="" className="bg-white text-slate-800">All Subjects / பாடங்கள் ({availableSubjectsList.length})</option>
                {availableSubjectsList.map((subj) => {
                  const count = targetStudentsForClass.filter(s =>
                    (s.subjects || s.enrolledClasses || []).some((sub: any) => sub?.toString().trim().toLowerCase() === subj.toLowerCase())
                  ).length;
                  return (
                    <option key={subj} value={subj} className="bg-white text-slate-800">
                      {subj} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Sync & Clean Button */}
              <button
                onClick={handleSyncAndCleanData}
                disabled={isSyncing}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                title="Synchronize & Deduplicate Cache with Cloud Database"
              >
                <RefreshCw size={15} className={isSyncing ? "animate-spin text-indigo-600" : ""} />
                {isSyncing ? "Syncing..." : "Sync & Clean"}
              </button>

              {/* Bulk Assign Subjects Button */}
              <button
                onClick={() => {
                  setBulkSubjectData(prev => ({...prev, grade: filterClass}));
                  setShowBulkSubjectModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-100"
              >
                <BookOpen size={16} /> Bulk Assign Subjects
              </button>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={handleExportCSV}
                  className="bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                  title="Export CSV (Excel)"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-white hover:bg-red-50 text-red-700 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                  title="Export PDF"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>

              {/* View Mode Switcher (Grid vs Table) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setStudentViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    studentViewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setStudentViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    studentViewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        
          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <User size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-600 font-semibold">No students found matching your filter or search.</p>
              <p className="text-slate-400 text-xs mt-1">Try clearing the search box or changing class filter.</p>
            </div>
          ) : studentViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
              {filteredStudents.map(student => (
                <div 
                  key={student.id} 
                  className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center relative group"
                >
                  <div className="w-full flex flex-col items-center">
                    {/* Student Image / Avatar */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border-2 border-indigo-200 shadow-sm flex items-center justify-center mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                      {student.image ? (
                        <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-indigo-700 font-extrabold text-2xl uppercase">{student.name ? student.name.charAt(0) : 'S'}</span>
                      )}
                    </div>

                    {/* Student Name */}
                    <h3 className="font-bold text-slate-900 text-sm leading-tight uppercase line-clamp-2 title-case px-1" title={student.name}>
                      {student.name}
                    </h3>

                    {/* Roll No */}
                    <p className="text-xs font-semibold text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded-md">
                      Roll No: {student.rollNo || "N/A"}
                    </p>

                    {/* Class / Grade Badge */}
                    <span className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full inline-block">
                      {student.grade || "No Grade"}
                    </span>

                    {/* Username or Phone info if present */}
                    {(student.phone || student.username) && (
                      <p className="text-[11px] text-slate-400 mt-1 truncate max-w-full">
                        {student.phone ? `📱 ${student.phone}` : `@${student.username}`}
                      </p>
                    )}

                    {/* Subjects Badge */}
                    {student.subjects && sanitizeSubjectList(student.subjects).length > 0 && (
                      <div className="mt-2 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-full truncate" title={sanitizeSubjectList(student.subjects).join(", ")}>
                        📚 <span className="font-bold text-indigo-600">{sanitizeSubjectList(student.subjects).length}</span> Subjects
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-3 pt-3 border-t border-slate-100">
                    {/* Zoom Status Toggle */}
                    <button 
                      onClick={() => handleToggleZoomBlock(student)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg w-full transition-all flex items-center justify-center gap-1 ${
                        student.zoomBlocked 
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={student.zoomBlocked ? "Click to Unblock Zoom" : "Click to Block Zoom (Unpaid Fee)"}
                    >
                      {student.zoomBlocked ? (
                        <>
                          <ShieldAlert size={12} /> Zoom Blocked
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={12} /> Zoom Active
                        </>
                      )}
                    </button>

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-center gap-1 mt-2.5 pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => setDocModal({ type: "idcard", student })}
                        className="px-2 py-1 hover:bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100 transition-colors" 
                        title="Generate ID Card"
                      >
                        ID
                      </button>
                      <button 
                        onClick={() => setDocModal({ type: "certificate", student })}
                        className="px-2 py-1 hover:bg-purple-50 text-purple-700 rounded-md text-[11px] font-bold border border-purple-100 transition-colors" 
                        title="Generate Certificate"
                      >
                        Cert
                      </button>
                      <button 
                        onClick={() => setDocModal({ type: "details", student })}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" 
                        title="View Full Profile"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => handleEditClick(student)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors" 
                        title="Edit Student"
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors" 
                        title="Delete Student"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View Mode */
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Class / Grade</th>
                    <th className="px-4 py-3">Phone / Username</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Zoom Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                            {student.image ? (
                              <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 uppercase text-xs sm:text-sm">{student.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{student.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap">
                        {student.rollNo || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                          {student.grade || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {student.phone || `@${student.username}` || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={sanitizeSubjectList(student.subjects)?.join(", ")}>
                        {student.subjects && sanitizeSubjectList(student.subjects).length > 0 ? (
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                            {sanitizeSubjectList(student.subjects).length} subjects
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button 
                          onClick={() => handleToggleZoomBlock(student)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all inline-flex items-center gap-1 ${
                            student.zoomBlocked 
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {student.zoomBlocked ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                          {student.zoomBlocked ? "Blocked" : "Active"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button 
                            onClick={() => setDocModal({ type: "idcard", student })}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold border border-indigo-100 transition-colors"
                            title="ID Card"
                          >
                            ID
                          </button>
                          <button 
                            onClick={() => setDocModal({ type: "certificate", student })}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-bold border border-purple-100 transition-colors"
                            title="Certificate"
                          >
                            Cert
                          </button>
                          <button 
                            onClick={() => setDocModal({ type: "details", student })}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(student)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Modal */}
        {docModal.type && docModal.student && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <h3 className="font-bold text-gray-800 capitalize">
                  {docModal.type === 'idcard' ? 'Student ID Card' : docModal.type === 'certificate' ? 'Course Certificate' : 'Student Details'}
                </h3>
                <div className="flex gap-2 items-center flex-wrap">
                  {(docModal.type === 'idcard' || docModal.type === 'certificate') && (
                    <>
                      <button 
                        onClick={handleCopyDocImage} 
                        className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg transition-all text-xs font-semibold cursor-pointer
                          ${copiedIdAdmin ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                      >
                        {copiedIdAdmin ? (
                          <>
                            <Check size={14} /> Copied! (நகலெடுக்கப்பட்டது)
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy Image (படமாக நகலெடு)
                          </>
                        )}
                      </button>
                      <button onClick={() => handleDownloadDoc('png')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer shadow-sm">
                        <Download size={14} /> PNG (பதிவிறக்கு)
                      </button>
                      <button onClick={() => handleDownloadDoc('pdf')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer shadow-sm">
                        <FileText size={14} /> PDF
                      </button>
                    </>
                  )}
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold cursor-pointer shadow-sm">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => setDocModal({ type: null, student: null })} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 flex justify-center bg-gray-100 flex-1 overflow-auto">
                <div ref={printRef} className="bg-white shadow-lg">
                  {docModal.type === 'idcard' ? (
                    /* ID Card Template */
                    <div className="w-[480px] h-[300px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-4 relative overflow-hidden text-white shadow-2xl shrink-0 flex flex-col justify-between">
                      {/* Subtle background glow accents */}
                      <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-400/20 rounded-full blur-xl pointer-events-none"></div>

                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2 z-10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-12 h-12 bg-white rounded-full p-0.5 shadow-md border border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
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
                          <div className="min-w-0">
                            <h3 className="text-xs font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs truncate">
                              {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                            </h3>
                            <p className="text-[10px] font-extrabold text-amber-200 leading-tight drop-shadow-xs truncate">
                              அகரம் தினேஷ் ஆன்லைன் அகாடமி
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-black bg-amber-400 text-indigo-950 px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            OFFICIAL ID
                          </span>
                          <span className="text-[10px] font-extrabold text-sky-100 block mt-0.5 whitespace-nowrap">
                            📞 778054232
                          </span>
                        </div>
                      </div>

                      {/* Student Main Info Row */}
                      <div className="flex items-center gap-3 my-1 z-10">
                        <div className="w-13 h-13 rounded-full border-2 border-white/90 overflow-hidden shrink-0 bg-white/20 flex items-center justify-center shadow-md">
                          {docModal.student.image ? (
                            <img src={docModal.student.image} alt={docModal.student.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={26} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base font-extrabold text-white truncate leading-tight drop-shadow-xs">
                            {docModal.student.name}
                          </h2>
                          <div className="flex items-center gap-3 text-xs text-sky-100 mt-0.5">
                            <span>Grade: <strong className="text-amber-200">{docModal.student.grade}</strong></span>
                            <span className="text-white/40">•</span>
                            <span>Roll No: <strong className="text-white">{docModal.student.rollNo || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Enrolled Subjects List - Colorful Badges */}
                      <div className="z-10 bg-black/20 backdrop-blur-xs p-1.5 rounded-md border border-white/15">
                        <span className="text-[9px] font-black uppercase tracking-wider text-sky-200 block mb-1">
                          Subjects / பாடங்கள்:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[38px] overflow-hidden">
                          {(() => {
                            const subs = docModal.student.subjects || docModal.student.enrolledClasses;
                            const badgeColors = [
                              'bg-amber-400 text-indigo-950',
                              'bg-emerald-400 text-indigo-950',
                              'bg-sky-300 text-indigo-950',
                              'bg-pink-300 text-indigo-950',
                              'bg-purple-300 text-indigo-950',
                              'bg-yellow-300 text-indigo-950',
                            ];
                            if (Array.isArray(subs) && subs.length > 0) {
                              return subs.map((s: string, idx: number) => (
                                <span 
                                  key={idx} 
                                  className={`text-[9.5px] font-black px-2 py-0.5 rounded shadow-xs whitespace-nowrap ${badgeColors[idx % badgeColors.length]}`}
                                >
                                  {s}
                                </span>
                              ));
                            }
                            return (
                              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-amber-400 text-indigo-950">
                                All Registered Courses
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Footer Credentials & QR Code */}
                      <div className="flex items-end justify-between gap-2 mt-1 z-10">
                        <div className="bg-black/25 backdrop-blur-xs px-2 py-1 rounded border border-white/20 text-[10px] font-mono leading-tight flex-1">
                          <p className="text-white/80 flex justify-between"><span>User:</span> <span className="text-white font-bold">{docModal.student.username}</span></p>
                          <p className="text-white/80 flex justify-between"><span>Pass:</span> <span className="text-amber-200 font-bold">{docModal.student.password}</span></p>
                        </div>
                        <div className="bg-white p-1 rounded shrink-0 shadow-md">
                          <QRCodeSVG value={docModal.student.id} size={42} level="H" includeMargin={false} />
                        </div>
                      </div>
                    </div>
                  ) : docModal.type === 'certificate' ? (
                    /* Certificate Template */
                    <div className="w-[800px] h-[565px] bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-6 relative overflow-hidden flex flex-col justify-between items-center text-center shadow-2xl">
                      {/* Ornate Gold & Royal Blue Borders */}
                      <div className="absolute inset-3 border-[8px] border-double border-indigo-900 rounded-2xl pointer-events-none"></div>
                      <div className="absolute inset-5 border border-amber-400/80 rounded-xl pointer-events-none"></div>
                      
                      {/* Ornate Corner Accents */}
                      <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-amber-500 pointer-events-none"></div>
                      <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-amber-500 pointer-events-none"></div>
                      <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-amber-500 pointer-events-none"></div>
                      <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-amber-500 pointer-events-none"></div>

                      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-2 px-6">
                        {/* Top Academy Logo & Branding Header */}
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 bg-white rounded-full p-0.5 shadow-md border-2 border-amber-400 mb-1 overflow-hidden flex items-center justify-center">
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
                          <h3 className="text-lg font-black uppercase tracking-wider text-indigo-950 leading-tight">
                            {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                          </h3>
                          <p className="text-xs font-extrabold text-amber-600 tracking-wide mt-0.5">
                            அகரம் தினேஷ் ஆன்லைன் அகாடமி <span className="text-indigo-800 text-[11px] ml-1 font-bold">| 📞 778054232</span>
                          </p>
                        </div>

                        {/* Certificate Main Title */}
                        <div>
                          <h1 className="text-3xl font-serif font-black text-indigo-900 tracking-wide uppercase drop-shadow-xs">
                            Certificate of Excellence
                          </h1>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em]">
                            Official Academic Award
                          </p>
                        </div>

                        {/* Presentation Line & Name */}
                        <div className="w-full">
                          <p className="text-xs text-gray-500 font-medium tracking-widest uppercase mb-0.5">
                            This is proudly presented to
                          </p>
                          <h2 className="text-2xl font-extrabold text-indigo-950 border-b-2 border-amber-400 pb-1 px-8 inline-block font-serif drop-shadow-xs">
                            {docModal.student.name}
                          </h2>
                        </div>

                        {/* Citation */}
                        <p className="text-sm text-gray-700 max-w-xl leading-relaxed font-serif my-1">
                          For outstanding academic performance, dedication, and active participation in <span className="font-bold text-indigo-900">Grade {docModal.student.grade}</span> at AGARAM DHINES ONLINE ACADEMY.
                        </p>

                        {/* Footer with Signatures, Seal & Student Credentials + QR */}
                        <div className="flex justify-between items-end w-full mt-auto pt-2 px-4">
                          {/* Date */}
                          <div className="text-center w-32">
                            <p className="font-bold text-gray-900 text-xs mb-0.5">{new Date().toLocaleDateString()}</p>
                            <div className="w-full border-b border-indigo-900 mb-0.5"></div>
                            <p className="font-bold text-indigo-900 text-[10px] uppercase tracking-widest">Date / தேதி</p>
                          </div>

                          {/* Center Stamp & Credentials Badge */}
                          <div className="flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm backdrop-blur-sm">
                            <div className="bg-white p-0.5 rounded border border-indigo-100 shadow-2xs">
                              <QRCodeSVG value={docModal.student.id} size={48} level="H" includeMargin={false} />
                            </div>
                            <div className="text-left text-[10px] font-medium text-slate-800 space-y-0.5">
                              <p><span className="font-bold text-indigo-900 w-12 inline-block">Roll No:</span> <strong>{docModal.student.rollNo || 'N/A'}</strong></p>
                              <p><span className="font-bold text-indigo-900 w-12 inline-block">User:</span> <span className="font-mono font-bold text-indigo-700">{docModal.student.username}</span></p>
                              <p><span className="font-bold text-indigo-900 w-12 inline-block">Pass:</span> <span className="font-mono font-bold text-amber-600">{docModal.student.password}</span></p>
                            </div>
                          </div>

                          {/* Director Signature */}
                          <div className="text-center w-32">
                            <div className="font-serif italic text-base text-indigo-900 font-bold mb-0.5">Dhines Nivas</div>
                            <div className="w-full border-b border-indigo-900 mb-0.5"></div>
                            <p className="font-bold text-indigo-900 text-[10px] uppercase tracking-widest">Director / இயக்குனர்</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Details Template */
                    <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-indigo-600 p-6 flex items-center gap-6">
                        <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                          {docModal.student.image ? (
                            <img src={docModal.student.image} alt={docModal.student.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500">
                              {docModal.student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="text-white">
                          <h2 className="text-2xl font-bold">{docModal.student.name}</h2>
                          <p className="opacity-90">{docModal.student.grade}</p>
                        </div>
                      </div>
                      
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Personal Info</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500 font-medium">Roll No:</span>
                            <span className="text-gray-900 font-bold">{docModal.student.rollNo || 'N/A'}</span>
                            
                            <span className="text-gray-500 font-medium">Date of Birth:</span>
                            <span className="text-gray-900">{docModal.student.dob || 'N/A'}</span>
                            
                            <span className="text-gray-500 font-medium">Gender:</span>
                            <span className="text-gray-900 capitalize">{docModal.student.gender || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Account Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500 font-medium">Username:</span>
                            <span className="text-gray-900 font-mono font-bold">{docModal.student.username}</span>
                            
                            <span className="text-gray-500 font-medium">Password:</span>
                            <span className="text-gray-900 font-mono font-bold">{docModal.student.password}</span>
                            
                            <span className="text-gray-500 font-medium">Guardian:</span>
                            <span className="text-gray-900">{docModal.student.guardianName || 'N/A'}</span>
                            
                            <span className="text-gray-500 font-medium">Admission:</span>
                            <span className="text-gray-900">{docModal.student.admissionDate || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Address</h4>
                          <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100 italic">
                            {docModal.student.address || 'No address provided.'}
                          </p>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Subjects</h4>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {docModal.student.subjects && docModal.student.subjects.length > 0 ? (
                                docModal.student.subjects.map((sub: string, i: number) => (
                                  <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">
                                    {sub}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">No subjects assigned.</span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {showBulkSubjectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-800">Bulk Subject Assignment</h3>
              <button 
                onClick={() => setShowBulkSubjectModal(false)} 
                className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Grade / Class</label>
                  <select
                    value={bulkSubjectData.grade}
                    onChange={(e) => {
                      setBulkSubjectData(prev => ({ ...prev, grade: e.target.value, studentIds: [] }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Grade</option>
                    {unifiedGrades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                  <select
                    value={bulkSubjectData.subject}
                    onChange={(e) => setBulkSubjectData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a subject...</option>
                    {allSubjects.map(sub => (
                      <option key={sub.name} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Action to Perform</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex-1">
                    <input 
                      type="radio" 
                      name="bulkAction" 
                      value="add"
                      checked={bulkSubjectData.action === 'add'}
                      onChange={() => setBulkSubjectData(prev => ({ ...prev, action: 'add' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-emerald-800">Add Subject to Students</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md border-red-200 bg-red-50 hover:bg-red-100 flex-1">
                    <input 
                      type="radio" 
                      name="bulkAction" 
                      value="remove"
                      checked={bulkSubjectData.action === 'remove'}
                      onChange={() => setBulkSubjectData(prev => ({ ...prev, action: 'remove' }))}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-red-800">Remove Subject from Students</span>
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3">
                  <span className="font-medium text-sm text-gray-700">
                    Select Students {bulkSubjectData.grade && `in ${bulkSubjectData.grade}`}
                  </span>
                  
                  {bulkSubjectData.grade && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search By Name/RollNo/User..."
                        value={bulkSearchQuery}
                        onChange={(e) => setBulkSearchQuery(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 flex-1 sm:w-56"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const query = bulkSearchQuery.toLowerCase();
                          const gradeStudents = students.filter(s => {
                            if (s.grade !== bulkSubjectData.grade) return false;
                            if (!query) return true;
                            const isNumericSearch = /^\d+$/.test(query);
                            return (
                              s.name?.toLowerCase().includes(query) ||
                              s.rollNo?.toString().toLowerCase().includes(query) ||
                              (isNumericSearch && s.rollNo?.toString().endsWith(query)) ||
                              (isNumericSearch && s.id?.toString().endsWith(query)) ||
                              s.username?.toLowerCase().includes(query)
                            );
                          });
                          
                          const allFilteredSelected = gradeStudents.length > 0 && gradeStudents.every(s => bulkSubjectData.studentIds.includes(s.id));
                          
                          if (allFilteredSelected) {
                            // deselect all filtered
                            const filteredIds = gradeStudents.map(s => s.id);
                            setBulkSubjectData(prev => ({
                              ...prev, 
                              studentIds: prev.studentIds.filter(id => !filteredIds.includes(id))
                            }));
                          } else {
                            // select all filtered
                            const filteredIds = gradeStudents.map(s => s.id);
                            setBulkSubjectData(prev => {
                              const newIds = new Set([...prev.studentIds, ...filteredIds]);
                              return { ...prev, studentIds: Array.from(newIds) };
                            });
                          }
                        }}
                        className="text-sm text-indigo-600 font-semibold hover:underline whitespace-nowrap"
                      >
                        {(() => {
                           const query = bulkSearchQuery.toLowerCase();
                           const gradeStudents = students.filter(s => {
                             if (s.grade !== bulkSubjectData.grade) return false;
                             if (!query) return true;
                             return (
                               s.name?.toLowerCase().includes(query) ||
                               s.rollNo?.toLowerCase().includes(query) ||
                               s.username?.toLowerCase().includes(query)
                             );
                           });
                           const allFilteredSelected = gradeStudents.length > 0 && gradeStudents.every(s => bulkSubjectData.studentIds.includes(s.id));
                           return allFilteredSelected ? "Deselect All" : "Select All";
                        })()}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="max-h-[30vh] overflow-y-auto p-2">
                  {!bulkSubjectData.grade ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Please select a grade first.</div>
                  ) : (() => {
                      const query = bulkSearchQuery.toLowerCase();
                      const filteredInBulk = students.filter(s => {
                        if (s.grade !== bulkSubjectData.grade) return false;
                        if (!query) return true;
                        return (
                          s.name?.toLowerCase().includes(query) ||
                          s.rollNo?.toLowerCase().includes(query) ||
                          s.username?.toLowerCase().includes(query)
                        );
                      });
                      
                      if (filteredInBulk.length === 0) {
                        return <div className="p-4 text-center text-gray-500 text-sm">No students found matching your search.</div>;
                      }
                      
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredInBulk.map(student => {
                            const isSelected = bulkSubjectData.studentIds.includes(student.id);
                            const hasSubject = (student.subjects || []).includes(bulkSubjectData.subject);
                            
                            return (
                              <label 
                                key={student.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    setBulkSubjectData(prev => {
                                      const ids = new Set(prev.studentIds);
                                      if (e.target.checked) ids.add(student.id);
                                      else ids.delete(student.id);
                                      return { ...prev, studentIds: Array.from(ids) };
                                    });
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <div className="flex-1 truncate">
                                  <div className="text-sm font-semibold truncate">{student.name}</div>
                                  <div className="text-xs text-gray-500 flex gap-2">
                                    <span>{student.rollNo || student.id}</span>
                                    {bulkSubjectData.subject && (
                                      hasSubject ? (
                                        <span className="text-emerald-600 font-medium">· Has Subject</span>
                                      ) : (
                                        <span className="text-gray-400">· Pending</span>
                                      )
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                  })()}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl shrink-0">
              <button 
                onClick={() => setShowBulkSubjectModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubjectSubmit}
                disabled={loading || !bulkSubjectData.subject || bulkSubjectData.studentIds.length === 0}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Applying..." : "Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  if (view === "view-id-pin") {
    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      const searchLow = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(searchLow);

      const matchesSearch = searchQuery 
        ? s.name?.toLowerCase().includes(searchLow) || 
          s.id?.toString().toLowerCase().includes(searchLow) ||
          s.rollNo?.toString().toLowerCase().includes(searchLow) ||
          (isNumericSearch && s.rollNo?.toString().endsWith(searchLow)) ||
          (isNumericSearch && s.id?.toString().endsWith(searchLow)) ||
          s.username?.toString().toLowerCase().includes(searchLow) ||
          s.phone?.toString().includes(searchLow)
        : true;
      return matchesClass && matchesSubject && matchesSearch;
    });

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">Student IDs & PINs</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 text-white rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-emerald-700 flex items-center gap-2"
              title="Export CSV (Excel)"
            >
              <Download size={16} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-red-700 flex items-center gap-2"
              title="Export PDF"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIN/Password</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div id={`qr-${student.id}`} className="bg-white p-1 inline-block">
                        <QRCodeSVG value={student.id} size={40} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNo || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{student.password}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownloadQrImage(student.id, student.name)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                          title="Download Image"
                        >
                          <Download size={14} /> IMG
                        </button>
                        <button 
                          onClick={() => handleDownloadQrPdf(student.id, student.name)}
                          className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded"
                          title="Download PDF"
                        >
                          <Download size={14} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden QR Download Templates */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
        {students.map(student => (
          <div 
            key={`dl-${student.id}`} 
            id={`qr-download-${student.id}`} 
            className="bg-white p-6 rounded-2xl border-4 border-indigo-600 flex-col items-center w-80 shadow-2xl flex"
          >
            <h3 className="font-black text-2xl text-indigo-800 mb-1 tracking-wider text-center">AGARAM</h3>
            <p className="text-sm font-bold text-gray-500 mb-4 tracking-widest uppercase text-center">Academy</p>
            
            <div className="bg-white p-3 rounded-xl shadow-inner border-2 border-gray-100 mb-6 flex justify-center">
              <QRCodeSVG value={student.id} size={180} level="H" />
            </div>
            
            <div className="w-full bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <h4 className="font-bold text-lg text-gray-900 text-center mb-2">{student.name}</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-gray-500">Grade:</div>
                <div className="font-semibold text-gray-900 text-right">{student.grade}</div>
                
                <div className="text-gray-500">Roll No:</div>
                <div className="font-semibold text-gray-900 text-right">{student.rollNo || 'N/A'}</div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-indigo-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Username:</span>
                  <span className="font-mono font-bold text-indigo-700">{student.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Password:</span>
                  <span className="font-mono font-bold text-indigo-700">{student.password}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
