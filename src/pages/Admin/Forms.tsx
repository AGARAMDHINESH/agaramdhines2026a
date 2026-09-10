import React, { useState, useEffect, useMemo } from 'react';
import { 
  getForms, 
  saveForms, 
  deleteForm, 
  getFormSubmissions, 
  deleteFormSubmission, 
  deleteAllFormSubmissions,
  purgeDatabaseCache,
  saveFormSubmissions,
  CustomForm, 
  FormField, 
  FormSubmission, 
  SRI_LANKA_DISTRICTS, 
  getStudents, 
  saveStudents,
  getAdminSettings,
  syncDatabaseWithCloud,
  extractSubmissionFields
} from '../../lib/db';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Share2, 
  QrCode, 
  Check, 
  ExternalLink, 
  Users, 
  MapPin, 
  FileText, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Search, 
  UserPlus, 
  Settings, 
  Layers, 
  Calendar,
  Phone,
  Mail,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminForms() {
  const [activeTab, setActiveTab] = useState<'forms' | 'submissions' | 'create'>('forms');
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Filters for Submissions
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>('all');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [qrModalForm, setQrModalForm] = useState<CustomForm | null>(null);
  const [viewSubmissionModal, setViewSubmissionModal] = useState<FormSubmission | null>(null);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [enrollingSubmission, setEnrollingSubmission] = useState<FormSubmission | null>(null);
  const [createdFormSuccessModal, setCreatedFormSuccessModal] = useState<CustomForm | null>(null);

  // Create/Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHeaderImage, setFormHeaderImage] = useState<string>('');
  const [formInstituteSubtitle, setFormInstituteSubtitle] = useState<string>('agrandinesh online academy');
  const [formDescriptionPoint1, setFormDescriptionPoint1] = useState<string>('');
  const [formDescriptionPoint2, setFormDescriptionPoint2] = useState<string>('');
  const [formDescriptionPoint3, setFormDescriptionPoint3] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formCategory, setFormCategory] = useState<'admission' | 'exam' | 'contact' | 'feedback' | 'general'>('admission');
  const [formStatus, setFormStatus] = useState<'active' | 'closed'>('active');
  const [formThemeColor, setFormThemeColor] = useState('#1e3a8a');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formMaxSubmissionsPerPhone, setFormMaxSubmissionsPerPhone] = useState<number>(1);
  const [formPreventDuplicatePhone, setFormPreventDuplicatePhone] = useState<boolean>(true);
  const [formPhoneFieldId, setFormPhoneFieldId] = useState<string>('');

  // Load Data
  const loadAllData = async (force: boolean = false) => {
    setLoading(true);
    try {
      if (force) {
        await syncDatabaseWithCloud(true);
      }
      const [fetchedForms, fetchedSubmissions, settings] = await Promise.all([
        getForms(),
        getFormSubmissions(),
        getAdminSettings()
      ]);
      setForms(fetchedForms || []);
      setSubmissions(fetchedSubmissions || []);
      setAdminSettings(settings);
    } catch (err) {
      console.error("Error loading forms data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Listen to realtime db updates
  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (e?.detail?.key === 'forms' || e?.detail?.key === 'formSubmissions') {
        getForms().then(setForms);
        getFormSubmissions().then(setSubmissions);
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  // Sync Database Handler
  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    try {
      await syncDatabaseWithCloud(true);
      const [freshForms, freshSubmissions] = await Promise.all([
        getForms(),
        getFormSubmissions()
      ]);
      setForms(freshForms || []);
      setSubmissions(freshSubmissions || []);
      setSyncSuccessMessage("டேட்டாபேஸ் மற்றும் கேச் (Cache) ஒத்திசைக்கப்பட்டது! தரவு இழப்பு தடுக்கப்பட்டுள்ளது.");
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    } catch (err: any) {
      alert("ஒத்திசைவு தோல்வியடைந்தது: " + err?.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy Public Link
  const handleCopyLink = (formId: string) => {
    const fullUrl = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // WhatsApp Share with 3 Points & Clean Preview Formatting
  const handleShareWhatsApp = (formItem: CustomForm) => {
    const fullUrl = `${window.location.origin}/form/${formItem.id}`;
    const subtitle = formItem.instituteSubtitle || "agrandinesh online academy";
    
    let pointsText = '';
    if (formItem.descriptionPoints && formItem.descriptionPoints.length > 0) {
      const validPoints = formItem.descriptionPoints.filter(p => p && p.trim().length > 0);
      if (validPoints.length > 0) {
        pointsText = '\n' + validPoints.map(p => `• ${p.trim()}`).join('\n') + '\n';
      }
    }

    const message = `*${formItem.title}*\n_${subtitle}_\n\n${formItem.description || "படிவத்தை பூர்த்தி செய்து சமர்ப்பிக்கவும்."}${pointsText}\n👉 *படிவ இணைப்பு (Form Link):*\n${fullUrl}\n\n🎓 *${adminSettings?.instituteName || "Agaram Dhines Online Academy"}*`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Image Upload Handler with High Clarity Canvas Optimization (< 3MB input -> crisp 40-70KB WebP/JPEG)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("படத்தின் அளவு அதிகபட்சம் 3MB வரை மட்டுமே அனுமதிக்கப்படும். (Maximum image size is 3MB)");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          setFormHeaderImage(compressedDataUrl);
        } else {
          setFormHeaderImage(event.target?.result as string);
        }
        setIsUploadingImage(false);
      };
      img.onerror = () => {
        setFormHeaderImage(event.target?.result as string);
        setIsUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Delete Form
  const handleDeleteForm = async (formId: string) => {
    if (!window.confirm("இந்த படிவத்தையும் அதன் அனைத்து சமர்ப்பிப்புகளையும் நிச்சயமாக நீக்க வேண்டுமா? இந்த செயல் கேச் மற்றும் டேட்டாபேஸ் இரண்டிலிருந்தும் நிரந்தரமாக நீக்கும்.")) {
      return;
    }
    try {
      const updated = await deleteForm(formId);
      setForms(updated);
      const updatedSubs = await getFormSubmissions();
      setSubmissions(updatedSubs);
      alert("படிவம் வெற்றிகரமாக நீக்கப்பட்டது.");
    } catch (err: any) {
      alert("பிழை: " + err?.message);
    }
  };

  // Delete Individual Submission
  const handleDeleteSubmission = async (submissionId: string) => {
    if (!window.confirm("இந்த மாணவர் சமர்ப்பிப்பை நிச்சயமாக நீக்க வேண்டுமா? இது டேட்டாபேஸ், கிளவுட் மற்றும் கணினி கேச்சிலிருந்து முற்றிலும் நிரந்தரமாக நீக்கப்படும்.")) {
      return;
    }
    try {
      const updated = await deleteFormSubmission(submissionId);
      setSubmissions(updated);
      if (viewSubmissionModal?.id === submissionId) {
        setViewSubmissionModal(null);
      }
      alert("சமர்ப்பிப்பு நிரந்தரமாக நீக்கப்பட்டது (Successfully Deleted).");
    } catch (err: any) {
      alert("பிழை: " + err?.message);
    }
  };

  // Clear All Submissions (or for Selected Form)
  const handleClearAllSubmissions = async () => {
    const isFormSpecific = selectedFormFilter !== 'all';
    const msg = isFormSpecific
      ? "இந்த குறிப்பிட்ட படிவத்தின் அனைத்து சமர்ப்பிப்புகளையும் டேட்டாபேஸ் மற்றும் கேச்சிலிருந்து நிரந்தரமாக நீக்க வேண்டுமா?"
      : "அனைத்துப் படிவங்களின் அனைத்து சமர்ப்பிப்புகளையும் டேட்டாபேஸ் மற்றும் கேச்சிலிருந்து நிரந்தரமாக நீக்க வேண்டுமா?";
    
    if (!window.confirm(msg)) {
      return;
    }

    try {
      const remaining = await deleteAllFormSubmissions(selectedFormFilter);
      setSubmissions(remaining);
      alert("அனைத்து சமர்ப்பிப்புகளும் நிரந்தரமாக அழிக்கப்பட்டன.");
    } catch (err: any) {
      alert("பிழை: " + err?.message);
    }
  };

  // Refresh & Purge Cache
  const handleRefreshAndPurge = async () => {
    try {
      setIsSyncing(true);
      await purgeDatabaseCache();
      const [freshForms, freshSubs] = await Promise.all([
        getForms(),
        getFormSubmissions()
      ]);
      setForms(freshForms || []);
      setSubmissions(freshSubs || []);
      alert("டேட்டாபேஸ் மற்றும் கேச் வெற்றிகரமாக புதுப்பிக்கப்பட்டது (Refreshed & Synced).");
    } catch (err: any) {
      alert("புதுப்பிப்பதில் பிழை: " + err?.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Form Status
  const handleToggleStatus = async (formItem: CustomForm) => {
    const updatedStatus = formItem.status === 'active' ? 'closed' : 'active';
    const updatedList = forms.map(f => f.id === formItem.id ? { ...f, status: updatedStatus, updatedAt: new Date().toISOString() } : f);
    await saveForms(updatedList);
    setForms(updatedList);
  };

  // Helper to extract clean display values for any submission (past or new)
  const getSubmissionDisplay = (sub: FormSubmission) => {
    const parentForm = forms.find(f => f.id === sub.formId);
    const extracted = extractSubmissionFields(parentForm, sub.data || {}, sub);
    return {
      studentName: sub.studentName || extracted.studentName || '',
      rollNo: sub.rollNo || extracted.rollNo || '',
      district: sub.district || extracted.district || '',
      grade: sub.grade || extracted.grade || '',
      phone: sub.phone || extracted.phone || '',
      email: sub.email || extracted.email || ''
    };
  };

  // Enroll Submission into Academy Students Database
  const handleEnrollStudent = async (sub: FormSubmission) => {
    try {
      const disp = getSubmissionDisplay(sub);
      const allStudents = await getStudents();
      const cleanPhone = disp.phone ? disp.phone.replace(/[^0-9]/g, '') : '';
      const cleanName = disp.studentName ? disp.studentName.trim().toLowerCase().replace(/[\s_\-\.]+/g, '') : '';

      const existing = allStudents.find((s: any) => {
        if (!s) return false;
        const sPhone = s.phone ? String(s.phone).replace(/[^0-9]/g, '') : '';
        const sRoll = s.rollNo ? String(s.rollNo).trim().toLowerCase() : '';
        const sName = s.name ? String(s.name).trim().toLowerCase().replace(/[\s_\-\.]+/g, '') : '';
        const sUser = s.username ? String(s.username).trim().toLowerCase().replace(/[\s_\-\.]+/g, '') : '';

        if (cleanPhone && sPhone && cleanPhone === sPhone) return true;
        if (disp.rollNo && sRoll && sRoll === disp.rollNo.trim().toLowerCase()) return true;
        if (cleanName && sName && cleanName === sName && (cleanPhone || sRoll || s.grade === disp.grade)) return true;
        if (cleanName && sUser && cleanName === sUser) return true;
        return false;
      });

      if (existing) {
        // Update existing student with new data rather than creating a duplicate record
        const updatedStudents = allStudents.map((s: any) => {
          if (s.id === existing.id) {
            return {
              ...s,
              phone: disp.phone || s.phone,
              email: disp.email || s.email,
              grade: disp.grade || s.grade,
              district: disp.district || s.district,
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });

        await saveStudents(updatedStudents);

        // Update submission status
        const updatedSubs = submissions.map(s => s.id === sub.id ? { ...s, status: 'enrolled' as const } : s);
        await saveFormSubmissions(updatedSubs);
        setSubmissions(updatedSubs);

        alert(`மாணவர் "${existing.name}" ஏற்கனவே பதிவு செய்யப்பட்டுள்ளார் (Roll No: ${existing.rollNo || existing.id}). விபரங்கள் வெற்றிகரமாக இணைக்கப்பட்டு புதுப்பிக்கப்பட்டது!`);
        setEnrollingSubmission(null);
        return;
      }

      const newRollNo = disp.rollNo || String(Math.floor(1000 + Math.random() * 9000));
      const newStudent = {
        id: "STU" + Math.floor(100000 + Math.random() * 900000),
        name: disp.studentName || "New Student",
        rollNo: newRollNo,
        username: newRollNo,
        password: disp.phone ? disp.phone.slice(-4) : "1234",
        grade: disp.grade || "தரம் 10",
        phone: disp.phone || "",
        email: disp.email || "",
        district: disp.district || "",
        enrolledClasses: ["தமிழ்"],
        subjects: ["தமிழ்"],
        createdAt: new Date().toISOString(),
        admissionDate: new Date().toISOString().split('T')[0],
        status: "Active",
        zoomBlocked: false
      };

      const updatedStudents = [newStudent, ...allStudents];
      await saveStudents(updatedStudents);

      // Update submission status
      const updatedSubs = submissions.map(s => s.id === sub.id ? { ...s, status: 'enrolled' as const } : s);
      await saveFormSubmissions(updatedSubs);
      setSubmissions(updatedSubs);

      alert(`மாணவர் "${newStudent.name}" வெற்றிகரமாக Academy மாணவர் பட்டியலில் சேர்க்கப்பட்டார்!\n\nபதிவு எண் (Roll No): ${newStudent.rollNo}\nவகுப்பு: ${newStudent.grade}`);
      setEnrollingSubmission(null);
    } catch (err: any) {
      alert("மாணவரை சேர்ப்பதில் பிழை: " + err?.message);
    }
  };

  // Start Form Editor
  const startEditForm = (formItem: CustomForm) => {
    setEditingForm(formItem);
    setFormTitle(formItem.title);
    setFormDescription(formItem.description);
    setFormHeaderImage(formItem.headerImage || '');
    setFormInstituteSubtitle(formItem.instituteSubtitle || 'agrandinesh online academy');
    setFormDescriptionPoint1(formItem.descriptionPoints?.[0] || '');
    setFormDescriptionPoint2(formItem.descriptionPoints?.[1] || '');
    setFormDescriptionPoint3(formItem.descriptionPoints?.[2] || '');
    setFormCategory(formItem.category);
    setFormStatus(formItem.status);
    setFormThemeColor(formItem.themeColor || '#1e3a8a');
    setFormSuccessMessage(formItem.successMessage || '');
    setFormMaxSubmissionsPerPhone(formItem.maxSubmissionsPerPhone !== undefined ? formItem.maxSubmissionsPerPhone : 1);
    setFormPreventDuplicatePhone(formItem.preventDuplicatePhone !== false);
    setFormPhoneFieldId(formItem.phoneFieldId || '');
    setFormFields([...formItem.fields]);
    setActiveTab('create');
  };

  // Start Blank Create Form
  const startCreateNew = () => {
    setEditingForm(null);
    setFormTitle('');
    setFormDescription('');
    setFormHeaderImage('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop');
    setFormInstituteSubtitle('agrandinesh online academy');
    setFormDescriptionPoint1('இலங்கையின் 25 மாவட்ட மாணவர்களுக்கான நேரடி தமிழ் இணையவழி வகுப்புகள்.');
    setFormDescriptionPoint2('தவணைப் பரீட்சை வினாத்தாள் பயிற்சிகள் மற்றும் உடனடி Zoom இணைப்புகள்.');
    setFormDescriptionPoint3('ஒரு மாணவருக்கு ஒரு பதிவு மட்டுமே அனுமதிக்கப்படும் (Single Verified Entry).');
    setFormCategory('admission');
    setFormStatus('active');
    setFormThemeColor('#1e3a8a');
    setFormSuccessMessage('உங்கள் பதிவு வெற்றிகரமாக பெறப்பட்டது! நன்றி.');
    setFormMaxSubmissionsPerPhone(1);
    setFormPreventDuplicatePhone(true);
    setFormPhoneFieldId('');
    setFormFields([
      { id: "f_" + Date.now() + "_1", label: "மாணவரின் முழுப் பெயர் (Student Full Name)", type: "text", required: true, placeholder: "பெயரை உள்ளிடவும்" },
      { id: "f_" + Date.now() + "_2", label: "WhatsApp / தொடர்பு இலக்கம்", type: "phone", required: true, placeholder: "07xxxxxxxx" },
      { id: "f_" + Date.now() + "_3", label: "மாவட்டம் (District)", type: "district", required: true },
      { id: "f_" + Date.now() + "_4", label: "தரம் / வகுப்பு (Grade)", type: "grade", required: true }
    ]);
    setActiveTab('create');
  };

  // Add Field to Form Editor
  const handleAddField = () => {
    const newField: FormField = {
      id: "f_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      label: "புதிய கேள்வி (New Question)",
      type: "text",
      required: false,
      placeholder: ""
    };
    setFormFields([...formFields, newField]);
  };

  // Save Form (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("தயவுசெய்து படிவத்தின் தலைப்பை உள்ளிடவும்.");
      return;
    }
    if (formFields.length === 0) {
      alert("குறைந்தது ஒரு கேள்வியையாவது சேர்க்கவும்.");
      return;
    }

    setIsSavingForm(true);

    try {
      const now = new Date().toISOString();
      const formId = editingForm ? editingForm.id : "form_" + Date.now();

      // 3 points description array
      const points = [formDescriptionPoint1, formDescriptionPoint2, formDescriptionPoint3]
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const newFormObj: CustomForm = {
        id: formId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        headerImage: formHeaderImage ? formHeaderImage.trim() : undefined,
        instituteSubtitle: formInstituteSubtitle.trim() || 'agrandinesh online academy',
        descriptionPoints: points.length > 0 ? points : undefined,
        category: formCategory,
        status: formStatus,
        themeColor: formThemeColor,
        successMessage: formSuccessMessage.trim(),
        maxSubmissionsPerPhone: Number(formMaxSubmissionsPerPhone),
        preventDuplicatePhone: Boolean(formPreventDuplicatePhone),
        phoneFieldId: formPhoneFieldId || undefined,
        fields: formFields,
        createdAt: editingForm ? editingForm.createdAt : now,
        updatedAt: now
      };

      let updatedForms: CustomForm[];
      if (editingForm) {
        updatedForms = forms.map(f => f.id === editingForm.id ? newFormObj : f);
      } else {
        updatedForms = [newFormObj, ...forms];
      }

      await saveForms(updatedForms);
      setForms(updatedForms);
      setEditingForm(null);
      setActiveTab('forms');
      setCreatedFormSuccessModal(newFormObj);
    } catch (err: any) {
      alert("படிவத்தை சேமிப்பதில் பிழை ஏற்பட்டது: " + (err?.message || err));
    } finally {
      setIsSavingForm(false);
    }
  };

  // District Breakdown Calculation
  const districtAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(sub => {
      if (selectedFormFilter !== 'all' && sub.formId !== selectedFormFilter) return;
      const disp = getSubmissionDisplay(sub);
      const dist = disp.district ? disp.district.trim() : 'குறிப்பிடப்படவில்லை (Not specified)';
      counts[dist] = (counts[dist] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count);
  }, [submissions, forms, selectedFormFilter]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      // Form filter
      if (selectedFormFilter !== 'all' && sub.formId !== selectedFormFilter) return false;

      const disp = getSubmissionDisplay(sub);

      // District filter
      if (selectedDistrictFilter !== 'all') {
        const subDist = (disp.district || '').toLowerCase();
        const selDist = selectedDistrictFilter.toLowerCase();
        if (!subDist.includes(selDist) && !selDist.includes(subDist)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (disp.studentName || '').toLowerCase().includes(q);
        const matchRoll = (disp.rollNo || '').toLowerCase().includes(q);
        const matchPhone = (disp.phone || '').toLowerCase().includes(q);
        const matchDist = (disp.district || '').toLowerCase().includes(q);
        const matchGrade = (disp.grade || '').toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchPhone && !matchDist && !matchGrade) return false;
      }

      return true;
    });
  }, [submissions, forms, selectedFormFilter, selectedDistrictFilter, searchQuery]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredSubmissions.length === 0) {
      alert("ஏற்றுமதி செய்வதற்கு தரவுகள் எதுவும் இல்லை.");
      return;
    }

    const exportRows = filteredSubmissions.map((sub, idx) => {
      const disp = getSubmissionDisplay(sub);
      const row: Record<string, any> = {
        "வ.எண் (No)": idx + 1,
        "படிவத்தின் தலைப்பு (Form Title)": sub.formTitle || sub.formId,
        "மாணவர் பெயர் (Student Name)": disp.studentName || "-",
        "பதிவு எண் (Roll No)": disp.rollNo || "-",
        "மாவட்டம் (District)": disp.district || "-",
        "தரம் / வகுப்பு (Grade)": disp.grade || "-",
        "தொலைபேசி / WhatsApp": disp.phone || "-",
        "மின்னஞ்சல் (Email)": disp.email || "-",
        "சமர்ப்பிக்கப்பட்ட திகதி (Date)": new Date(sub.submittedAt).toLocaleString(),
        "நிலை (Status)": sub.status === 'enrolled' ? 'இணைக்கப்பட்டார் (Enrolled)' : 'புதியது (New)'
      };

      // Add custom field values
      if (sub.data) {
        const parentForm = forms.find(f => f.id === sub.formId);
        Object.entries(sub.data).forEach(([k, v]) => {
          const matchedField = parentForm?.fields?.find(f => f.id === k);
          const colName = matchedField ? matchedField.label : k;
          row[colName] = Array.isArray(v) ? v.join(', ') : String(v || '');
        });
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    XLSX.writeFile(workbook, `Form_Responses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredSubmissions.length === 0) {
      alert("அச்சிட தரவுகள் எதுவும் இல்லை.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY", 14, 15);
    doc.setFontSize(11);
    doc.text(`Google Forms Submissions Report • Date: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = filteredSubmissions.map((s, idx) => {
      const disp = getSubmissionDisplay(s);
      return [
        idx + 1,
        disp.studentName || "-",
        disp.district || "-",
        disp.grade || "-",
        disp.phone || "-",
        s.formTitle || "-",
        new Date(s.submittedAt).toLocaleDateString()
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Student Name', 'District', 'Grade', 'Phone', 'Form Name', 'Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 9 }
    });

    doc.save(`Form_Submissions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Google Forms / படிவங்கள் மேலாண்மை
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                மாணவர் சேர்க்கை, பரீட்சை, மற்றும் தொடர்புப் படிவங்களை உருவாக்கி பகிர்ந்தளிக்கவும்.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <button
            onClick={handleSyncDatabase}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="கணினி கேச் மற்றும் டேட்டாபேஸை ஒத்திசைக்க"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin text-blue-600" : ""} />
            <span>{isSyncing ? "Syncing..." : "Sync / Clear Cache"}</span>
          </button>

          <button
            onClick={startCreateNew}
            className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs active:scale-98"
          >
            <Plus size={16} />
            <span>புதிய படிவம் உருவாக்க</span>
          </button>
        </div>
      </div>

      {/* Sync Success Alert */}
      {syncSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs sm:text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
          <button onClick={() => setSyncSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{forms.length}</div>
            <div className="text-xs text-slate-500 font-medium">செயலில் உள்ள படிவங்கள்</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{submissions.length}</div>
            <div className="text-xs text-slate-500 font-medium">மொத்த சமர்ப்பிப்புகள் (Responses)</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{districtAnalytics.length}</div>
            <div className="text-xs text-slate-500 font-medium">பங்கேற்ற மாவட்டங்கள்</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <UserPlus size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {submissions.filter(s => s.status === 'enrolled').length}
            </div>
            <div className="text-xs text-slate-500 font-medium">இணைக்கப்பட்ட மாணவர்கள்</div>
          </div>
        </div>
      </div>

      {/* Interactive District Analytics Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-700" />
            <h3 className="font-bold text-slate-800 text-sm">
              மாவட்ட வாரியான மாணவர் விபரம் (District Breakdown)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            மாவட்டத்தை கிளிக் செய்து சமர்ப்பிப்புகளை வடிகட்டலாம்
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => { setSelectedDistrictFilter('all'); setActiveTab('submissions'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDistrictFilter === 'all'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            அனைத்து மாவட்டங்களும் ({submissions.length})
          </button>
          {districtAnalytics.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { setSelectedDistrictFilter(item.district); setActiveTab('submissions'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedDistrictFilter === item.district
                  ? 'bg-blue-800 text-white font-bold shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span>{item.district}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-10px font-bold ${
                selectedDistrictFilter === item.district ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('forms')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'forms'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} />
          <span>படிவங்கள் (All Forms)</span>
          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {forms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} />
          <span>சமர்ப்பிப்புகள் / பதில்கள் (Responses)</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
            {filteredSubmissions.length}
          </span>
        </button>

        <button
          onClick={startCreateNew}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'create'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus size={16} />
          <span>{editingForm ? "படிவத்தை திருத்து (Edit)" : "புதிய படிவம் (New Form)"}</span>
        </button>
      </div>

      {/* TAB 1: ALL FORMS */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          {forms.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
              <FileText size={48} className="text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">படிவங்கள் எதுவும் உருவாக்கப்படவில்லை</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                மாணவர்களுடன் இணைப்பைப் பகிர்ந்து தரவுகளைப் பெற புதிய கூகிள் ஃபார்ம் போன்ற படிவத்தை உருவாக்கவும்.
              </p>
              <button
                onClick={startCreateNew}
                className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-all shadow-xs"
              >
                + புதிய படிவம் உருவாக்க
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {forms.map((item) => {
                const subCount = submissions.filter(s => s.formId === item.id).length;
                const shareUrl = `${window.location.origin}/form/${item.id}`;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Color strip */}
                      <div className="h-2.5 w-full" style={{ backgroundColor: item.themeColor || '#1e3a8a' }} />

                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.status === 'active' ? '● Active' : '● Closed'}
                          </span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900 text-base line-clamp-2 leading-snug">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                          <span>{item.fields.length} கேள்விகள்</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              item.maxSubmissionsPerPhone === 1
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : item.maxSubmissionsPerPhone === 2
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.maxSubmissionsPerPhone === 1 ? '1 Entry/Phone' : item.maxSubmissionsPerPhone === 2 ? 'Max 2/Phone' : 'Unlimited'}
                            </span>
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              {subCount} சமர்ப்பிப்புகள்
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Action Controls */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
                      {/* Share Buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleCopyLink(item.id)}
                          className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all shadow-2xs"
                          title="இணைப்பை நகலெடுக்க (Copy Public Link)"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} className="text-slate-600" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(item)}
                          className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-medium text-emerald-800 transition-all shadow-2xs"
                          title="WhatsApp ஊடாக பகிர"
                        >
                          <Share2 size={13} />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => setQrModalForm(item)}
                          className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all shadow-2xs"
                          title="QR Code உருவாக்க"
                        >
                          <QrCode size={13} />
                          <span>QR Code</span>
                        </button>
                      </div>

                      {/* Management Buttons */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`font-semibold underline ${
                            item.status === 'active' ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'
                          }`}
                        >
                          {item.status === 'active' ? 'படிவத்தை மூடு (Close)' : 'திறக்க (Reopen)'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => window.open(shareUrl, '_blank')}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-md"
                            title="நேரலையில் பார்க்க (Open Preview)"
                          >
                            <ExternalLink size={15} />
                          </button>
                          <button
                            onClick={() => startEditForm(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-md"
                            title="திருத்து (Edit / Rename)"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteForm(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            title="நீக்கு (Delete Form)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMISSIONS & RESPONSES */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Form Filter */}
              <div className="relative min-w-[180px]">
                <select
                  value={selectedFormFilter}
                  onChange={(e) => setSelectedFormFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">அனைத்துப் படிவங்களும் ({submissions.length})</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* District Filter */}
              <div className="relative min-w-[180px]">
                <select
                  value={selectedDistrictFilter}
                  onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">அனைத்து மாவட்டங்களும் (All Districts)</option>
                  {SRI_LANKA_DISTRICTS.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="பெயர், தொலைபேசி, பதிவு எண் தேட..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Export & Management Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleRefreshAndPurge}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors border border-blue-200"
                title="டேட்டாபேஸ் மற்றும் கேச்சை முழுமையாக புதுப்பிக்க (Refresh & Sync Cloud)"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                <span>Sync / புதுப்பி</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                title="Excel கோப்பாக பதிவிறக்க"
              >
                <Download size={14} />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors shadow-2xs"
                title="PDF அறிக்கையாக அச்சிட"
              >
                <Printer size={14} />
                <span>Print PDF</span>
              </button>

              {filteredSubmissions.length > 0 && (
                <button
                  onClick={handleClearAllSubmissions}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors border border-rose-200"
                  title="அனைத்து சமர்ப்பிப்புகளையும் அழிக்க"
                >
                  <Trash2 size={14} />
                  <span>அனைத்தும் நீக்கு (Clear All)</span>
                </button>
              )}
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users size={40} className="text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">சமர்ப்பிப்புகள் எதுவும் கிடைக்கவில்லை</p>
                <p className="text-xs text-slate-400">தெரிவு செய்யப்பட்ட வடிப்பான்களுக்கு ஏற்ப பதிவுகள் இல்லை.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-10px tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">#</th>
                      <th className="px-4 py-3.5">மாணவர் பெயர் (Name)</th>
                      <th className="px-4 py-3.5">மாவட்டம் (District)</th>
                      <th className="px-4 py-3.5">வகுப்பு (Grade)</th>
                      <th className="px-4 py-3.5">தொடர்பு இலக்கம் (Phone)</th>
                      <th className="px-4 py-3.5">படிவம் (Form)</th>
                      <th className="px-4 py-3.5">திகதி (Date)</th>
                      <th className="px-4 py-3.5 text-right">நடவடிக்கைகள் (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredSubmissions.map((sub, index) => {
                      const disp = getSubmissionDisplay(sub);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-slate-400">{index + 1}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {disp.studentName || "-"}
                            {disp.rollNo && (
                              <span className="block font-mono text-10px text-slate-400 font-normal">
                                Roll: {disp.rollNo}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                              <MapPin size={11} className="text-slate-400" />
                              {disp.district || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{disp.grade || "-"}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-700">
                            {disp.phone ? (
                              <a
                                href={`https://wa.me/${disp.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <Phone size={12} />
                                {disp.phone}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[150px] truncate" title={sub.formTitle}>
                            {sub.formTitle || sub.formId}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewSubmissionModal(sub)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors"
                                title="முழு விபரங்களைப் பார்க்க"
                              >
                                View
                              </button>

                              <button
                                onClick={() => handleEnrollStudent(sub)}
                                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 ${
                                  sub.status === 'enrolled'
                                    ? 'bg-emerald-50 text-emerald-700 cursor-default'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                                title="அகாடமி மாணவர் பட்டியலில் சேர்க்க"
                              >
                                <UserPlus size={12} />
                                <span>{sub.status === 'enrolled' ? 'Enrolled' : '+ Student'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSubmission(sub.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="பதிவை நிரந்தரமாக நீக்க"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CREATE / EDIT FORM BUILDER */}
      {activeTab === 'create' && (
        <form onSubmit={handleSaveForm} className="space-y-6 max-w-4xl mx-auto">
          
          {/* TAB 3: CREATE / EDIT FORM BUILDER */}
          {/* Header Banner & Branding Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="text-blue-600" size={20} />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    படிவத்தின் தலைப்புப் படம் & அகாடமி அடையாளம் (Banner & Branding)
                  </h2>
                  <p className="text-xs text-slate-500">
                    படிவத்தின் மேல் தோன்றும் படம் மற்றும் WhatsApp பகிர்தலுக்கான படம் (Max 3MB).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('forms')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                ரத்து செய்ய (Cancel)
              </button>
            </div>

            {/* Banner Image Preview & Upload Controls */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[140px] sm:min-h-[180px] flex items-center justify-center group">
                {formHeaderImage ? (
                  <>
                    <img
                      src={formHeaderImage}
                      alt="Form Header Banner"
                      className="w-full h-44 sm:h-52 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer bg-white text-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md hover:bg-slate-50 flex items-center gap-1.5">
                        <Upload size={14} /> படத்தை மாற்ற (Change)
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormHeaderImage('')}
                        className="bg-red-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md hover:bg-red-700 flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> நீக்கு (Remove)
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      படிவத்தின் முகப்புப் படம் எதுவும் தேர்ந்தெடுக்கப்படவில்லை
                    </p>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-all">
                      <Upload size={14} /> படம் பதிவேற்றுக (Upload Image up to 3MB)
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {isUploadingImage && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                      <RefreshCw className="animate-spin" size={16} /> படத்தை உகப்பாக்குகிறது...
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Banners Selection */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" /> முன்மாதிரி படங்கள் (Presets):
                </span>
                <button
                  type="button"
                  onClick={() => setFormHeaderImage('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200"
                >
                  🎓 சேர்க்கை / கல்வி
                </button>
                <button
                  type="button"
                  onClick={() => setFormHeaderImage('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200"
                >
                  📝 பரீட்சை & வினாத்தாள்
                </button>
                <button
                  type="button"
                  onClick={() => setFormHeaderImage('https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=1200&auto=format&fit=crop')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200"
                >
                  💬 பொதுத் தொடர்பு
                </button>
                <button
                  type="button"
                  onClick={() => setFormHeaderImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200"
                >
                  💻 ஆன்லைன் வகுப்பு
                </button>
              </div>

              {/* Subtitle / Academy Name */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  அகாடமி பெயர் / Subtitle (URL & WhatsApp இல் தோன்றும் பெயர்) *
                </label>
                <input
                  type="text"
                  required
                  value={formInstituteSubtitle}
                  onChange={(e) => setFormInstituteSubtitle(e.target.value)}
                  placeholder="agrandinesh online academy"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  குறிப்பு: இது படிவத்தின் முகப்பிலும் மற்றும் WhatsApp பகிர்வுகளிலும் முக்கிய அடையாளமாகத் தோன்றும் (Format: <code>agrandinesh online academy</code>).
                </p>
              </div>
            </div>
          </div>

          {/* Form Title & 3 Highlights Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              படிவ விபரங்கள் & 3 முக்கிய குறிப்புகள் (Details & 3 Key Bullet Points)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  படிவத்தின் தலைப்பு (Form Title) *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="உதாரணம்: மாணவர் சேர்க்கைப் படிவம் (Student Admission & Registration 2026)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  படிவத்தின் பொது விளக்கம் (General Description)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="படிவம் பற்றிய சிறிய அறிமுகம் அல்லது விளக்கம்..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* 3 Structured Description Points */}
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-blue-600" />
                    3 முக்கிய குறிப்புகள் (3 Highlight Points for Fast Reading & WhatsApp Share):
                  </span>
                  <span className="text-[11px] text-slate-500">மாணவர்கள் எளிதில் புரிந்து கொள்ள ஏதுவாக</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 w-5 text-center">1.</span>
                    <input
                      type="text"
                      value={formDescriptionPoint1}
                      onChange={(e) => setFormDescriptionPoint1(e.target.value)}
                      placeholder="புள்ளி 1: உதாரணம் - இலங்கையின் 25 மாவட்ட மாணவர்களுக்கான நேரடி தமிழ் வகுப்புகள்."
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 w-5 text-center">2.</span>
                    <input
                      type="text"
                      value={formDescriptionPoint2}
                      onChange={(e) => setFormDescriptionPoint2(e.target.value)}
                      placeholder="புள்ளி 2: உதாரணம் - தவணைப் பரீட்சை வினாத்தாள் பயிற்சிகள் மற்றும் உடனடி Zoom இணைப்புகள்."
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 w-5 text-center">3.</span>
                    <input
                      type="text"
                      value={formDescriptionPoint3}
                      onChange={(e) => setFormDescriptionPoint3(e.target.value)}
                      placeholder="புள்ளி 3: உதாரணம் - ஒரு மாணவருக்கு ஒரு பதிவு மட்டுமே அனுமதிக்கப்படும்."
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  வகை (Category)
                </label>
                <select
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="admission">மாணவர் சேர்க்கை (Student Admission)</option>
                  <option value="exam">தேர்வுப் பதிவு (Exam Registration)</option>
                  <option value="contact">தொடர்பு விபரம் (Contact / Inquiries)</option>
                  <option value="feedback">கருத்துப் படிவம் (Feedback & Survey)</option>
                  <option value="general">பொதுப் படிவம் (General)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  நிலை (Status)
                </label>
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="active">செயலில் உள்ளது / ஏற்கப்படுகிறது (Active / Open)</option>
                  <option value="closed">மூடப்பட்டுள்ளது (Closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  வண்ண தீம் (Theme Color)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formThemeColor}
                    onChange={(e) => setFormThemeColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                  />
                  <span className="text-xs font-mono text-slate-600">{formThemeColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  சமர்ப்பித்த பின் காட்ட வேண்டிய செய்தி (Success Message)
                </label>
                <input
                  type="text"
                  value={formSuccessMessage}
                  onChange={(e) => setFormSuccessMessage(e.target.value)}
                  placeholder="உங்கள் பதிவு வெற்றிகரமாக பெறப்பட்டது!"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Live WhatsApp Share Preview Card */}
          <div className="bg-[#0b141a] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <MessageSquare size={14} /> WhatsApp பகிர்தல் மாதிரிப் பார்வை (Live WhatsApp Preview):
              </span>
              <span className="text-[11px] text-slate-400">இணைப்பு பகிரப்படும் போது இவ்வாறு காட்சி தரும்</span>
            </div>

            <div className="max-w-md bg-[#202c33] rounded-xl p-3 border border-[#2a3942] space-y-2 text-xs">
              {formHeaderImage && (
                <div className="rounded-lg overflow-hidden h-36 w-full bg-slate-900">
                  <img
                    src={formHeaderImage}
                    alt="WhatsApp Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  {formInstituteSubtitle || "agrandinesh online academy"}
                </div>
                <div className="font-bold text-sm text-slate-100 leading-snug">
                  {formTitle || "மாணவர் சேர்க்கைப் படிவம் (Student Admission & Registration)"}
                </div>
                <div className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                  {formDescription || "அகரம் தினேஸ் தமிழ் ஆன்லைன் அகாடமியின் நேரடி பதிவுப் படிவம்."}
                </div>
                
                {(formDescriptionPoint1 || formDescriptionPoint2 || formDescriptionPoint3) && (
                  <div className="pt-1.5 border-t border-[#2a3942] space-y-1 text-[11px] text-slate-200">
                    {formDescriptionPoint1 && <div>• {formDescriptionPoint1}</div>}
                    {formDescriptionPoint2 && <div>• {formDescriptionPoint2}</div>}
                    {formDescriptionPoint3 && <div>• {formDescriptionPoint3}</div>}
                  </div>
                )}

                <div className="pt-1 text-[11px] text-emerald-400 font-mono">
                  {window.location.origin}/form/{editingForm?.id || "form_admission_2026"}
                </div>
              </div>
            </div>
          </div>

          {/* Submission Security & Limit Settings Card */}
          <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white rounded-2xl p-6 border border-blue-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-blue-900 border-b border-blue-100 pb-3">
              <Phone size={18} className="text-blue-700" />
              <div>
                <h3 className="font-bold text-sm sm:text-base text-blue-950">
                  மாணவர் சமர்ப்பிப்பு வரம்புகள் & தொலைபேசி இலக்கக் கட்டுப்பாடு (Submission Limits & Rules)
                </h3>
                <p className="text-xs text-blue-700">
                  ஒரு மாணவர் எத்தனை முறை படிவத்தை சமர்ப்பிக்கலாம் மற்றும் போலி பதிவுகளை எவ்வாறு தடுக்கலாம் என்பதை இங்கே தீர்மானிக்கவும்.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Max Submissions Limit */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  ஒரு மாணவர் / தொலைபேசி இலக்கத்திற்கான சமர்ப்பிப்பு வரம்பு (Max Allowed Submissions) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMaxSubmissionsPerPhone(1)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formMaxSubmissionsPerPhone === 1
                        ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    1 முறை மட்டுமே (1 Time Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMaxSubmissionsPerPhone(2)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formMaxSubmissionsPerPhone === 2
                        ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    2 முறைகள் (2 Times)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMaxSubmissionsPerPhone(0)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formMaxSubmissionsPerPhone === 0
                        ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    வரம்பற்றது (Unlimited)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {formMaxSubmissionsPerPhone === 1
                    ? '✓ ஒரு தொலைபேசி இலக்கத்திலிருந்து 1 முறை மட்டுமே சமர்ப்பிக்க முடியும் (பரிந்துரைக்கப்படுகிறது).'
                    : formMaxSubmissionsPerPhone === 2
                    ? '✓ ஒரு தொலைபேசி இலக்கத்திலிருந்து அதிகபட்சம் 2 முறை சமர்ப்பிக்க முடியும் (திருத்தங்கள் செய்ய ஏதுவாக).'
                    : '⚠ எத்தனை முறை வேண்டுமானாலும் சமர்ப்பிக்கலாம்.'}
                </p>
              </div>

              {/* Prevent Duplicate Phone Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  ஒரே தொலைபேசி இலக்கப் பாதுகாப்பு (Duplicate Phone Prevention)
                </label>
                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={formPreventDuplicatePhone}
                    onChange={(e) => setFormPreventDuplicatePhone(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">மீண்டும் மீண்டும் பதிவு செய்வதைத் தடு (Enforce Phone Lock)</span>
                    <span className="text-slate-500 text-[11px]">
                      ஏற்கனவே சமர்ப்பிக்கப்பட்ட தொலைபேசி இலக்கத்தை மீண்டும் பதிவு செய்ய முடியாது.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Admin Process Guide Note */}
            <div className="bg-white/80 rounded-xl p-3.5 border border-blue-100 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                நிர்வாகி செயல்முறை வழிகாட்டி (Admin Process Guide):
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                1. படிவத்தை உருவாக்கும்போது அல்லது திருத்தும்போது மேலே உள்ள விருப்பத்தில் <strong>1 முறை</strong> அல்லது <strong>2 முறை</strong> என்பதைத் தேர்ந்தெடுக்கலாம்.<br />
                2. படிவத்தில் உள்ள தொலைபேசி இலக்கம் (Phone / WhatsApp) முக்கிய அடையாளப் புலமாகப் பயன்படுத்தப்படும்.<br />
                3. மாணவர் ஏற்கனவே சமர்ப்பித்திருந்தால், மீண்டும் சமர்ப்பிக்க முற்படும்போது அவர்களுக்குத் தெளிவான எச்சரிக்கை செய்தி காண்பிக்கப்பட்டு போலி பதிவுகள் தடுக்கப்படும்.
              </p>
            </div>
          </div>

          {/* Form Fields Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers size={18} className="text-blue-700" />
                <span>படிவத்தின் கேள்விகள் / புலங்கள் (Form Questions & Fields)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddField}
                className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus size={14} /> + கேள்வி சேர்க்க (Add Field)
              </button>
            </div>

            {formFields.map((field, idx) => (
              <div
                key={field.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-xs text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg">
                    கேள்வி {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormFields(formFields.filter(f => f.id !== field.id))}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                    title="நீக்கு"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      கேள்வியின் தலைப்பு (Field Label) *
                    </label>
                    <input
                      type="text"
                      required
                      value={field.label}
                      onChange={(e) => {
                        const updated = [...formFields];
                        updated[idx].label = e.target.value;
                        setFormFields(updated);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      வகை (Input Type)
                    </label>
                    <select
                      value={field.type}
                      onChange={(e: any) => {
                        const updated = [...formFields];
                        updated[idx].type = e.target.value;
                        if ((e.target.value === 'select' || e.target.value === 'radio' || e.target.value === 'checkbox') && !updated[idx].options) {
                          updated[idx].options = ["தெரிவு 1 (Option 1)", "தெரிவு 2 (Option 2)"];
                        }
                        setFormFields(updated);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="text">உரை (Text)</option>
                      <option value="district">இலங்கை மாவட்டம் (Sri Lanka District Dropdown)</option>
                      <option value="grade">வகுப்பு / தரம் (Grade Dropdown)</option>
                      <option value="phone">தொலைபேசி / WhatsApp (Phone)</option>
                      <option value="email">மின்னஞ்சல் (Email)</option>
                      <option value="textarea">நீண்ட உரை (Long Text / Remarks)</option>
                      <option value="select">கீழ்தோன்று தேர்வு (Dropdown Select)</option>
                      <option value="radio">ஒற்றைத் தெரிவு (Single Choice Radio)</option>
                      <option value="checkbox">பல்வேறு தெரிவுகள் (Multiple Checkboxes)</option>
                      <option value="date">திகதி (Date)</option>
                      <option value="number">எண் (Number)</option>
                    </select>
                  </div>
                </div>

                {/* Option Builder for Select/Radio/Checkbox */}
                {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                  <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                    <label className="block text-10px font-bold text-slate-500 uppercase tracking-wider">
                      தெரிவுகள் (Options List)
                    </label>
                    {(field.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...formFields];
                            const opts = [...(updated[idx].options || [])];
                            opts[optIdx] = e.target.value;
                            updated[idx].options = opts;
                            setFormFields(updated);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formFields];
                            const opts = (updated[idx].options || []).filter((_, i) => i !== optIdx);
                            updated[idx].options = opts;
                            setFormFields(updated);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...formFields];
                        const opts = [...(updated[idx].options || []), `தெரிவு ${(updated[idx].options || []).length + 1}`];
                        updated[idx].options = opts;
                        setFormFields(updated);
                      }}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      + தெரிவு சேர்க்க (Add Option)
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const updated = [...formFields];
                        updated[idx].required = e.target.checked;
                        setFormFields(updated);
                      }}
                      className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                    />
                    <span>கட்டாய கேள்வி (Required field)</span>
                  </label>

                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => {
                      const updated = [...formFields];
                      updated[idx].placeholder = e.target.value;
                      setFormFields(updated);
                    }}
                    placeholder="Placeholder குறிப்பு..."
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Submit Save */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 font-semibold text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ரத்து (Cancel)
            </button>

            <button
              type="submit"
              disabled={isSavingForm || isUploadingImage}
              className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-7 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingForm && <RefreshCw size={14} className="animate-spin" />}
              {isSavingForm 
                ? "டேட்டாபேஸ் மற்றும் கணினியில் சேமிக்கப்படுகிறது..." 
                : editingForm 
                  ? "படிவத்தை புதுப்பிக்க (Update Form)" 
                  : "படிவத்தை சேமித்து வெளியிட (Publish Form)"}
            </button>
          </div>

        </form>
      )}

      {/* MODAL 1: QR CODE DISPLAY MODAL */}
      {qrModalForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="text-left">
                <h3 className="font-bold text-slate-900 text-base">QR Code & நேரடி இணைப்பு</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{qrModalForm.title}</p>
              </div>
              <button
                onClick={() => setQrModalForm(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <QRCodeSVG
                value={`${window.location.origin}/form/${qrModalForm.id}`}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              மாணவர்கள் இந்த QR Code ஐ தங்களது மொபைல் கேமரா மூலம் ஸ்கேன் செய்து உடனடியாக படிவத்தைப் பூர்த்தி செய்யலாம்.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopyLink(qrModalForm.id)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
              >
                {copiedId === qrModalForm.id ? "Copied Link!" : "Copy Link"}
              </button>

              <button
                onClick={() => handleShareWhatsApp(qrModalForm)}
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Share2 size={14} /> WhatsApp Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMISSION DETAILS MODAL */}
      {viewSubmissionModal && (() => {
        const disp = getSubmissionDisplay(viewSubmissionModal);
        const parentForm = forms.find(f => f.id === viewSubmissionModal.formId);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div>
                  <span className="text-10px font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    Response Details
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                    {disp.studentName || "Student Response"}
                  </h3>
                </div>
                <button
                  onClick={() => setViewSubmissionModal(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-xs block">படிவம் (Form)</span>
                    <span className="font-semibold text-slate-800">{viewSubmissionModal.formTitle}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">திகதி (Submitted At)</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(viewSubmissionModal.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">மாணவர் பெயர் (Name)</span>
                    <span className="font-semibold text-slate-800">{disp.studentName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">பதிவு எண் (Roll No)</span>
                    <span className="font-semibold text-slate-800">{disp.rollNo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">மாவட்டம் (District)</span>
                    <span className="font-semibold text-slate-800">{disp.district || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">வகுப்பு (Grade)</span>
                    <span className="font-semibold text-slate-800">{disp.grade || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">தொலைபேசி (Phone)</span>
                    <span className="font-semibold text-slate-800">{disp.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">மின்னஞ்சல் (Email)</span>
                    <span className="font-semibold text-slate-800">{disp.email || "-"}</span>
                  </div>
                </div>

                {/* Dynamic Field Responses */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
                    அனைத்துப் பதில்கள் (All Submitted Values)
                  </h4>
                  {viewSubmissionModal.data && Object.entries(viewSubmissionModal.data).map(([k, v], idx) => {
                    const matchedField = parentForm?.fields?.find(f => f.id === k);
                    const fieldLabel = matchedField ? matchedField.label : k.replace('f_', '').replace(/_/g, ' ');
                    return (
                      <div key={idx} className="border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500 block font-medium">
                          {fieldLabel}
                        </span>
                        <span className="font-semibold text-slate-900 block mt-0.5 whitespace-pre-wrap">
                          {Array.isArray(v) ? v.join(', ') : String(v || '-')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDeleteSubmission(viewSubmissionModal.id)}
                  className="text-red-600 hover:text-red-800 font-semibold text-xs flex items-center gap-1"
                >
                  <Trash2 size={14} /> பதிவை நீக்கு (Delete Entry)
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEnrollStudent(viewSubmissionModal)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <UserPlus size={14} /> மாணவராகச் சேர் (Enroll Student)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Form Saved & Ready to Share Modal */}
      {createdFormSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-3 w-full bg-emerald-600" />
            <div className="p-6 sm:p-8 space-y-6 text-center">
              
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">
                  ✓ டேட்டாபேஸ் & கணினியில் வெற்றிகரமாக சேமிக்கப்பட்டது
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  படிவம் தயார்! இணைப்பைப் பகிருங்கள்
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {createdFormSuccessModal.title}
                </p>
              </div>

              {/* Shareable Link Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  படிவத்தின் பொது இணைப்பு (Public Share Link):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/form/${createdFormSuccessModal.id}`}
                    className="flex-1 bg-white border border-slate-300 px-3 py-2 rounded-xl text-xs sm:text-sm font-mono text-slate-700 select-all focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopyLink(createdFormSuccessModal.id)}
                    className="inline-flex items-center gap-1 bg-[#1e3a8a] hover:bg-blue-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all shrink-0 shadow-xs"
                  >
                    {copiedId === createdFormSuccessModal.id ? (
                      <>
                        <Check size={14} className="text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleShareWhatsApp(createdFormSuccessModal)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
                >
                  <MessageSquare size={16} />
                  <span>WhatsApp இல் பகிர்க</span>
                </button>
                <a
                  href={`/form/${createdFormSuccessModal.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
                >
                  <ExternalLink size={16} />
                  <span>படிவத்தை திறக்க (Open Form)</span>
                </a>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setCreatedFormSuccessModal(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  மூடுக (Close)
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
