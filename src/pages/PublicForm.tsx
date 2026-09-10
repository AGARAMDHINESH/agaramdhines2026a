import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getForms, 
  getFastFormById,
  getFormByIdAsync,
  submitFormResponse, 
  checkPhoneSubmissionStatus,
  CustomForm, 
  FormField, 
  SRI_LANKA_DISTRICTS, 
  getAdminSettings,
  getClasses
} from '../lib/db';
import { 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  RotateCcw, 
  Globe, 
  MessageSquare, 
  FileText, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Info,
  Share2,
  Copy,
  Check
} from 'lucide-react';

export default function PublicForm() {
  const { id } = useParams<{ id: string }>();

  // Instant fast form loading from synchronous memory/storage cache
  const fastInitialForm = useMemo(() => id ? getFastFormById(id) : null, [id]);
  
  const [form, setForm] = useState<CustomForm | null>(fastInitialForm);
  const [adminSettings, setAdminSettings] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('dhines_admin_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [classesList, setClassesList] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('dhines_classes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(!fastInitialForm);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    if (fastInitialForm) {
      fastInitialForm.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initial[field.id] = [];
        } else {
          initial[field.id] = '';
        }
      });
    }
    return initial;
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [phoneStatusNotice, setPhoneStatusNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync document title and social share preview
  useEffect(() => {
    if (form) {
      const subtitle = form.instituteSubtitle || "agrandinesh online academy";
      document.title = `${form.title} | ${subtitle}`;
    }
  }, [form]);

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!form) return;
    const fullUrl = window.location.href;
    const subtitle = form.instituteSubtitle || "agrandinesh online academy";
    
    let pointsText = '';
    if (form.descriptionPoints && form.descriptionPoints.length > 0) {
      const validPoints = form.descriptionPoints.filter(p => p && p.trim().length > 0);
      if (validPoints.length > 0) {
        pointsText = '\n' + validPoints.map(p => `• ${p.trim()}`).join('\n') + '\n';
      }
    }

    const message = `*${form.title}*\n_${subtitle}_\n\n${form.description || "படிவத்தை பூர்த்தி செய்து உடனே சமர்ப்பிக்கவும்."}${pointsText}\n👉 *படிவ இணைப்பு (Form Link):*\n${fullUrl}\n\n🎓 *${adminSettings?.instituteName || "Agaram Dhines Online Academy"}*`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Background Sync to get latest form definition and settings without delaying initial paint
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const syncLatestData = async () => {
      try {
        const [targetForm, settings, classes] = await Promise.all([
          getFormByIdAsync(id),
          getAdminSettings(),
          getClasses()
        ]);

        if (!isMounted) return;

        if (settings) setAdminSettings(settings);
        if (classes) setClassesList(classes);

        if (targetForm) {
          setForm(targetForm);
          setError(null);
          // If form fields were not populated, initialize them now
          setFormData(prev => {
            const initial: Record<string, any> = { ...prev };
            targetForm.fields.forEach(field => {
              if (initial[field.id] === undefined) {
                initial[field.id] = field.type === 'checkbox' ? [] : '';
              }
            });
            return initial;
          });
        } else if (!form) {
          setError("கோரப்பட்ட படிவம் கிடைக்கவில்லை (Form Not Found)");
        }
      } catch (err: any) {
        if (!form) {
          setError(err?.message || "படிவத்தை ஏற்றுவதில் பிழை ஏற்பட்டது.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    syncLatestData();

    // Listen for real-time db updates (e.g. if admin updates the form while student has page open)
    const handleDbUpdate = (e: any) => {
      if (e?.detail?.key === 'forms' && isMounted) {
        getFormByIdAsync(id).then(f => {
          if (f && isMounted) {
            setForm(f);
            setError(null);
          }
        });
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('db_updated', handleDbUpdate);
    };
  }, [id]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear errors when user is typing
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }

    // Check phone status if this is a phone field
    const fieldObj = form?.fields.find(f => f.id === fieldId);
    if (fieldObj && fieldObj.type === 'phone' && form) {
      const cleanPhone = String(value).replace(/[\s\-\+]/g, '');
      if (cleanPhone.length >= 9) {
        checkPhoneSubmissionStatus(form.id, cleanPhone).then(status => {
          if (!status.isAllowed) {
            setFormErrors(prev => ({
              ...prev,
              [fieldId]: status.reason || "இந்த தொலைபேசி இலக்கம் ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது."
            }));
            setPhoneStatusNotice(null);
          } else if (status.count > 0 && status.maxLimit > 1) {
            setPhoneStatusNotice(`குறிப்பு: இந்த தொலைபேசி இலக்கத்திற்கு ${status.count} சமர்ப்பிப்பு உள்ளது (அதிகபட்சம் ${status.maxLimit}).`);
          } else {
            setPhoneStatusNotice(null);
          }
        });
      } else {
        setPhoneStatusNotice(null);
      }
    }
  };

  const handleCheckboxToggle = (fieldId: string, option: string) => {
    const currentList: string[] = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
    const nextList = currentList.includes(option)
      ? currentList.filter(o => o !== option)
      : [...currentList, option];
    handleInputChange(fieldId, nextList);
  };

  const validateForm = () => {
    if (!form) return false;
    const errors: Record<string, string> = {};

    form.fields.forEach(field => {
      const val = formData[field.id];
      if (field.required) {
        if (field.type === 'checkbox') {
          if (!Array.isArray(val) || val.length === 0) {
            errors[field.id] = "குறைந்தது ஒரு தெரிவைத் தேர்ந்தெடுக்கவும் (Required)";
          }
        } else if (!val || String(val).trim() === '') {
          errors[field.id] = "இந்த விபரம் கட்டாயமானது (Required field)";
        }
      }

      if (val && field.type === 'phone') {
        const cleanPhone = String(val).replace(/[\s\-\+]/g, '');
        if (cleanPhone.length < 9 || cleanPhone.length > 13) {
          errors[field.id] = "சரியான தொலைபேசி இலக்கத்தை உள்ளிடவும் (e.g. 0778054232)";
        }
      }

      if (val && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val).trim())) {
          errors[field.id] = "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்";
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorKey = Object.keys(formErrors)[0];
      const el = document.getElementById(`container_${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionResult = await submitFormResponse(form.id, formData);
      setSubmittedData(submissionResult);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to submit";
      
      // If error is about duplicate phone, highlight the phone field
      const phoneField = form.fields.find(f => f.type === 'phone' || f.id === form.phoneFieldId);
      if (phoneField && (errorMsg.includes("தொலைபேசி") || errorMsg.includes("Phone") || errorMsg.includes("ஏற்கனவே"))) {
        setFormErrors(prev => ({
          ...prev,
          [phoneField.id]: errorMsg
        }));
        const el = document.getElementById(`container_${phoneField.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      alert("சமர்ப்பிப்பில் பிழை: " + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!form) return;
    const initial: Record<string, any> = {};
    form.fields.forEach(field => {
      if (field.type === 'checkbox') {
        initial[field.id] = [];
      } else {
        initial[field.id] = '';
      }
    });
    setFormData(initial);
    setFormErrors({});
    setPhoneStatusNotice(null);
    setIsSubmitted(false);
    setSubmittedData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-lg font-semibold text-slate-800">படிவம் ஏற்றப்படுகிறது...</h3>
          <p className="text-sm text-slate-500">Loading form content, please wait.</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">படிவம் கிடைக்கவில்லை</h2>
          <p className="text-sm text-slate-600">{error || "இந்த படிவம் நீக்கப்பட்டிருக்கலாம் அல்லது இணைப்பு தவறானது."}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-800 transition-colors text-sm shadow-sm"
          >
            <Globe size={16} /> முகப்புப் பக்கத்திற்குச் செல்க
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = form.themeColor || "#1e3a8a";

  const renderField = (field: FormField) => {
    const errorMsg = formErrors[field.id];
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={`field_${field.id}`}
            rows={4}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder || "உங்கள் பதிலை இங்கே உள்ளிடவும்..."}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
            }`}
          />
        );

      case 'district':
        return (
          <div className="relative">
            <select
              id={`field_${field.id}`}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm appearance-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
              }`}
            >
              <option value="">-- மாவட்டத்தைத் தேர்ந்தெடுக்கவும் (Select District) --</option>
              {SRI_LANKA_DISTRICTS.map((dist, idx) => (
                <option key={idx} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
              <MapPin size={18} />
            </div>
          </div>
        );

      case 'grade':
        return (
          <div className="relative">
            <select
              id={`field_${field.id}`}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm appearance-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
              }`}
            >
              <option value="">-- வகுப்பைத் தேர்ந்தெடுக்கவும் (Select Grade/Class) --</option>
              {classesList.length > 0 ? (
                classesList.map((c: any, idx: number) => (
                  <option key={idx} value={c.name}>
                    {c.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="தரம் 06">தரம் 06 (Grade 06)</option>
                  <option value="தரம் 07">தரம் 07 (Grade 07)</option>
                  <option value="தரம் 08">தரம் 08 (Grade 08)</option>
                  <option value="தரம் 09">தரம் 09 (Grade 09)</option>
                  <option value="தரம் 10">தரம் 10 (Grade 10)</option>
                  <option value="தரம் 11">தரம் 11 (Grade 11)</option>
                  <option value="30 DAY'S TAMIL COURSE">30 DAY'S TAMIL COURSE</option>
                </>
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
              <GraduationCap size={18} />
            </div>
          </div>
        );

      case 'select':
        return (
          <select
            id={`field_${field.id}`}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
            }`}
          >
            <option value="">-- தேர்ந்தெடுக்கவும் (Please Select) --</option>
            {(field.options || []).map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2 pt-1">
            {(field.options || []).map((opt, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  value === opt
                    ? 'border-blue-600 bg-blue-50/60 font-medium text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name={`radio_${field.id}`}
                  checked={value === opt}
                  onChange={() => handleInputChange(field.id, opt)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkedList: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2 pt-1">
            {(field.options || []).map((opt, idx) => {
              const isChecked = checkedList.includes(opt);
              return (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-blue-600 bg-blue-50/60 font-medium text-blue-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxToggle(field.id, opt)}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case 'date':
        return (
          <input
            id={`field_${field.id}`}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
            }`}
          />
        );

      case 'phone':
        return (
          <div className="relative">
            <input
              id={`field_${field.id}`}
              type="tel"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || "0778054232"}
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
              }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
              <Phone size={18} />
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="relative">
            <input
              id={`field_${field.id}`}
              type="email"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || "example@gmail.com"}
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
              }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
          </div>
        );

      case 'number':
        return (
          <input
            id={`field_${field.id}`}
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder || "0"}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
            }`}
          />
        );

      default:
        return (
          <input
            id={`field_${field.id}`}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder || "உங்கள் பதிலை உள்ளிடவும்..."}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errorMsg ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-slate-300 focus:border-blue-600 bg-white'
            }`}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Top Academy Banner */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header Image if available */}
          {form.headerImage && (
            <div className="w-full h-44 sm:h-56 overflow-hidden bg-slate-100 relative">
              <img
                src={form.headerImage}
                alt={form.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end p-4 sm:p-6">
                <div className="text-white">
                  <div className="text-xs uppercase font-bold tracking-widest text-blue-200">
                    {form.instituteSubtitle || "agrandinesh online academy"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div 
            className="h-3.5 w-full"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={adminSettings?.profileImage || "/logo.png"}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-contain border border-slate-100 p-1 bg-white shadow-xs"
                  onError={(e: any) => { e.target.src = "/logo.png"; }}
                />
                <div>
                  <h2 className="text-xs font-bold text-slate-700 tracking-wide">
                    {form.instituteSubtitle || "agrandinesh online academy"}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                      form.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {form.status === 'active' ? '● ஏற்கும் நிலையில் உள்ளது (Open)' : '● மூடப்பட்டுள்ளது (Closed)'}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {form.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Share on WhatsApp Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors border border-emerald-200 shadow-2xs"
                  title="WhatsApp இல் பகிர்க"
                >
                  <MessageSquare size={13} className="text-emerald-600" />
                  <span>WhatsApp பகிர்க</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-xs transition-colors border border-slate-200"
                  title="இணைப்பை நகலெடுக்க"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedLink ? "நகலெடுக்கப்பட்டது!" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {form.title}
              </h1>
              {form.description && (
                <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                  {form.description}
                </p>
              )}
            </div>

            {/* 3 Structured Highlight Points */}
            {form.descriptionPoints && form.descriptionPoints.length > 0 && (
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-2.5 my-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  <span>முக்கிய அறிவுறுத்தல்கள் (Key Information):</span>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {form.descriptionPoints.map((point, index) => (
                    point.trim() && (
                      <div key={index} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{point.trim()}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <span className="text-red-500 font-bold">*</span> கட்டாய விபரங்களைக் குறிக்கிறது (Required)
              </span>
              <div className="flex items-center gap-2">
                {form.maxSubmissionsPerPhone === 1 ? (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    <ShieldCheck size={12} className="text-amber-600" /> 1 மாணவருக்கு 1 பதிவு மட்டுமே (Single Submission)
                  </span>
                ) : form.maxSubmissionsPerPhone === 2 ? (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    <ShieldCheck size={12} className="text-purple-600" /> அதிகபட்சம் 2 பதிவுகள் (Max 2 Entries)
                  </span>
                ) : null}
                <span className="text-slate-400">
                  agrandinesh.lk/v1/app
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Closed State Message */}
        {form.status === 'closed' && !isSubmitted && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 text-center space-y-3">
            <AlertCircle size={36} className="text-amber-600 mx-auto" />
            <h3 className="text-lg font-bold text-amber-900">
              இந்த படிவம் தற்போது மூடப்பட்டுள்ளது
            </h3>
            <p className="text-sm text-amber-700 max-w-md mx-auto">
              புதிய பதில்கள் எதுவும் ஏற்கப்படவில்லை. மேலதிக விபரங்களுக்கு அகாடமி நிர்வாகத்தைத் தொடர்பு கொள்ளவும்.
            </p>
            {adminSettings?.contactWhatsapp && (
              <a
                href={`https://wa.me/${adminSettings.contactWhatsapp.replace(/\+/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-all shadow-xs"
              >
                <MessageSquare size={16} /> WhatsApp இல் தொடர்பு கொள்ள
              </a>
            )}
          </div>
        )}

        {/* Success Confirmation State */}
        {isSubmitted ? (
          <div className="bg-white rounded-2xl shadow-xs border border-emerald-200 overflow-hidden animate-in fade-in duration-300">
            <div className="h-3 w-full bg-emerald-600" />
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={38} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  பதிவு வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!
                </h2>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
                  {form.successMessage || "உங்கள் விபரங்கள் வெற்றிகரமாகப் பெறப்பட்டு சேமிக்கப்பட்டுள்ளன. நன்றி!"}
                </p>
              </div>

              {/* Submitted Summary Box */}
              {submittedData && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left max-w-md mx-auto space-y-2 text-xs sm:text-sm">
                  <div className="font-semibold text-slate-700 pb-2 border-b border-slate-200 flex justify-between">
                    <span>சமர்ப்பிப்பு விபரம் (Receipt)</span>
                    <span className="font-mono text-slate-500">{submittedData.id?.slice(-8)}</span>
                  </div>
                  {submittedData.studentName && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">மாணவர் பெயர்:</span>
                      <span className="font-medium text-slate-800">{submittedData.studentName}</span>
                    </div>
                  )}
                  {submittedData.district && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">மாவட்டம்:</span>
                      <span className="font-medium text-slate-800">{submittedData.district}</span>
                    </div>
                  )}
                  {submittedData.grade && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">வகுப்பு:</span>
                      <span className="font-medium text-slate-800">{submittedData.grade}</span>
                    </div>
                  )}
                  {submittedData.phone && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">தொலைபேசி:</span>
                      <span className="font-medium text-slate-800">{submittedData.phone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
                >
                  <RotateCcw size={16} /> மற்றொரு பதிலை சமர்ப்பிக்க (Submit Another)
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-800 transition-colors shadow-xs"
                >
                  <Globe size={16} /> அகாடமி தளம் (Website)
                </Link>
              </div>
            </div>
          </div>
        ) : form.status === 'active' ? (
          /* Active Form Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {form.fields.map((field, index) => {
              const errorMsg = formErrors[field.id];
              return (
                <div
                  key={field.id}
                  id={`container_${field.id}`}
                  className={`bg-white rounded-2xl p-6 shadow-xs border transition-all ${
                    errorMsg ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <label className="block mb-2 text-slate-900">
                    <span className="font-semibold text-sm sm:text-base">
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="text-red-500 font-bold ml-1 text-base">*</span>
                    )}
                  </label>

                  {field.helpText && (
                    <p className="text-xs text-slate-500 mb-2.5">
                      {field.helpText}
                    </p>
                  )}

                  {renderField(field)}

                  {field.type === 'phone' && phoneStatusNotice && !errorMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg mt-2 border border-blue-200">
                      <Info size={14} className="shrink-0 text-blue-600" />
                      <span>{phoneStatusNotice}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-2 bg-red-50/50 p-2 rounded-lg border border-red-100">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1e3a8a] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>சமர்ப்பிக்கப்படுகிறது...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>படிவத்தை சமர்ப்பிக்கவும் (Submit)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
              >
                படிவத்தை மீட்டமைக்க (Clear Form)
              </button>
            </div>
          </form>
        ) : null}

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 py-4 space-y-1">
          <p>
            {adminSettings?.instituteName || "Agaram Dhines Online Academy"} • Google Forms Setup
          </p>
          <p>
            மாணவர் தரவுகள் பாதுகாப்பாக சேமிக்கப்படுகின்றன.
          </p>
        </div>

      </div>
    </div>
  );
}
