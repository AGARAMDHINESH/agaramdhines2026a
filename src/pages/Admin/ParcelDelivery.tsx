import React, { useState, useEffect, useRef } from "react";
import { 
  getParcelDeliveries, 
  saveParcelDeliveries, 
  addParcelDelivery, 
  updateParcelDelivery, 
  deleteParcelDelivery, 
  getStudents, 
  getClasses, 
  ParcelDelivery, 
  DEFAULT_SENDER_DETAILS,
  getParcelSenderSettings,
  saveParcelSenderSettings,
  ParcelSenderSettings
} from "../../lib/db";
import ParcelReceiptCard from "../../components/ParcelReceiptCard";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Layers, 
  Users, 
  FileText, 
  Scissors, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Settings,
  Sparkles,
  ClipboardPaste,
  Building,
  PackageSearch,
  Truck,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function ParcelDeliveryPage() {
  const [parcels, setParcels] = useState<ParcelDelivery[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dedicated AGD & Roll Number Tracking Search State
  const [trackingSearchInput, setTrackingSearchInput] = useState("");
  const [trackedParcel, setTrackedParcel] = useState<ParcelDelivery | null>(null);
  const [trackingSearched, setTrackingSearched] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "dispatched" | "delivered">("ALL");
  const [filterGrade, setFilterGrade] = useState<string>("ALL");

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingParcel, setViewingParcel] = useState<ParcelDelivery | null>(null);
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);

  // Add / Edit Form State
  const [editingParcelId, setEditingParcelId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    studentId: "",
    studentRollNo: "",
    studentName: "",
    grade: "",
    phone: "",
    addressLines: ["", "", ""],
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    itemsDescription: "தமிழ் டியூட் & வினாத்தாள் பாடப் பொதி (Tamil Tute Package)",
    dispatchedDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Sender Settings Modal State
  const [showSenderSettingsModal, setShowSenderSettingsModal] = useState(false);
  const [senderSettings, setSenderSettings] = useState<ParcelSenderSettings>(DEFAULT_SENDER_DETAILS);
  const [senderFormData, setSenderFormData] = useState<ParcelSenderSettings>(DEFAULT_SENDER_DETAILS);
  const [updateExistingSender, setUpdateExistingSender] = useState(true);

  // Smart Paste State
  const [smartPasteText, setSmartPasteText] = useState("");
  const [showSmartPasteBox, setShowSmartPasteBox] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Dynamic Address Line Helpers
  const handleAddAddressLine = () => {
    setFormData(prev => ({
      ...prev,
      addressLines: [...prev.addressLines, ""]
    }));
  };

  const handleRemoveAddressLine = (index: number) => {
    setFormData(prev => {
      const updated = prev.addressLines.filter((_, i) => i !== index);
      const lines = updated.length > 0 ? updated : [""];
      return {
        ...prev,
        addressLines: lines,
        addressLine1: lines[0] || "",
        addressLine2: lines[1] || "",
        addressLine3: lines[2] || "",
        addressLine4: lines[3] || ""
      };
    });
  };

  const handleAddressLineChange = (index: number, val: string) => {
    setFormData(prev => {
      const updated = [...prev.addressLines];
      updated[index] = val;
      return {
        ...prev,
        addressLines: updated,
        addressLine1: updated[0] || "",
        addressLine2: updated[1] || "",
        addressLine3: updated[2] || "",
        addressLine4: updated[3] || ""
      };
    });
  };

  // Bulk Generation Modal State
  const [bulkGrade, setBulkGrade] = useState("");
  const [bulkItemDescription, setBulkItemDescription] = useState("தமிழ் பாடப் பொதி & டியூட் (Tamil Tute Package)");
  const [bulkDispatchedDate, setBulkDispatchedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadData();
    const handleDbUpdate = (e: any) => {
      if (e.detail?.key === 'parcelDeliveries') {
        getParcelDeliveries().then(setParcels);
      } else if (e.detail?.key === 'parcelSenderSettings') {
        getParcelSenderSettings().then(setSenderSettings);
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [parcelList, studentList, classList, sender] = await Promise.all([
        getParcelDeliveries(),
        getStudents(),
        getClasses(),
        getParcelSenderSettings()
      ]);
      setParcels(parcelList);
      setStudents(studentList);
      setClasses(classList);
      setSenderSettings(sender);
      setSenderFormData(sender);
    } catch (err) {
      console.error("Error loading parcel deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  // Autofill student details into Add Form when student is selected from dropdown
  const handleSelectStudentForForm = (studentId: string) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;

    // Parse existing student address into lines
    const rawAddress = (student.address || "").trim();
    let parts: string[] = [];
    if (rawAddress) {
      parts = rawAddress.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
    }
    if (student.district && !parts.includes(student.district)) {
      parts.push(student.district);
    }
    if (parts.length === 0) {
      parts = ["", "", ""];
    }

    setFormData({
      studentId: String(student.id),
      studentRollNo: student.rollNo || student.username || "",
      studentName: student.name || "",
      grade: student.grade || "",
      phone: student.phone || "",
      addressLines: parts,
      addressLine1: parts[0] || "",
      addressLine2: parts[1] || "",
      addressLine3: parts[2] || "",
      addressLine4: parts[3] || "",
      itemsDescription: formData.itemsDescription,
      dispatchedDate: formData.dispatchedDate,
      notes: ""
    });
  };

  const handleOpenAddModal = () => {
    setEditingParcelId(null);
    setSmartPasteText("");
    setFormData({
      studentId: "",
      studentRollNo: "",
      studentName: "",
      grade: "",
      phone: "",
      addressLines: ["", "", ""],
      addressLine1: "",
      addressLine2: "",
      addressLine3: "",
      addressLine4: "",
      itemsDescription: "தமிழ் டியூட் & வினாத்தாள் பாடப் பொதி (Tamil Tute Package)",
      dispatchedDate: new Date().toISOString().split("T")[0],
      notes: ""
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (parcel: ParcelDelivery) => {
    setEditingParcelId(parcel.id);
    setSmartPasteText("");
    const existingLines = (parcel.addressLines && parcel.addressLines.length > 0)
      ? parcel.addressLines.filter(Boolean)
      : [parcel.addressLine1, parcel.addressLine2, parcel.addressLine3, parcel.addressLine4].filter(Boolean) as string[];

    setFormData({
      studentId: parcel.studentId || "",
      studentRollNo: parcel.studentRollNo,
      studentName: parcel.studentName,
      grade: parcel.grade || "",
      phone: parcel.phone,
      addressLines: existingLines.length > 0 ? existingLines : ["", "", ""],
      addressLine1: parcel.addressLine1 || existingLines[0] || "",
      addressLine2: parcel.addressLine2 || existingLines[1] || "",
      addressLine3: parcel.addressLine3 || existingLines[2] || "",
      addressLine4: parcel.addressLine4 || existingLines[3] || "",
      itemsDescription: parcel.itemsDescription || "",
      dispatchedDate: parcel.dispatchedDate,
      notes: parcel.notes || ""
    });
    setShowAddModal(true);
  };

  // Smart Parser for pasting Name, Address, Phone, Roll Number
  const handleApplySmartPaste = () => {
    if (!smartPasteText.trim()) {
      alert("தயவுசெய்து விபரங்களைப் பேஸ்ட் செய்யவும் (Please paste text first).");
      return;
    }

    const lines = smartPasteText.split("\n").map(l => l.trim()).filter(Boolean);
    let parsedName = "";
    let parsedPhone = "";
    let parsedRollNo = "";
    const addressLines: string[] = [];
    let currentField: 'none' | 'name' | 'address' | 'phone' | 'roll' = 'none';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const lower = line.toLowerCase();

      // 1. Roll number
      if (lower.startsWith("roll") || lower.includes("roll number") || lower.includes("roll no")) {
        parsedRollNo = line.replace(/^(roll\s*(number|no)?:?\s*[-:]?\s*)/i, "").trim();
        currentField = 'none';
        continue;
      }

      // 2. Phone
      if (lower.startsWith("phone") || lower.startsWith("tel") || lower.includes("phone number") || lower.includes("mobile")) {
        parsedPhone = line.replace(/^(phone(\s*number)?|tel|mobile):?\s*[-:]?\s*/i, "").trim();
        currentField = 'none';
        continue;
      }

      // 3. Name
      if (lower.startsWith("name") || lower.startsWith("பெயர்")) {
        parsedName = line.replace(/^(name|பெயர்):?\s*[-:]?\s*/i, "").trim().replace(/,$/, "");
        currentField = 'none';
        continue;
      }

      // 4. Address header
      if (lower.startsWith("adress") || lower.startsWith("address") || lower.startsWith("முகவரி")) {
        const val = line.replace(/^(adress|address|முகவரி):?\s*[-:]?\s*/i, "").trim();
        if (val) addressLines.push(val);
        currentField = 'address';
        continue;
      }

      // In address block
      if (currentField === 'address') {
        if (/^(\+?94|0)\d{9}/.test(line.replace(/[\s-]/g, '')) || /^\d{10}$/.test(line.replace(/[\s-]/g, ''))) {
          parsedPhone = line.trim();
          currentField = 'none';
          continue;
        }
        if (/^\d{4}\/[a-zA-Z0-9\/]+$/.test(line) || lower.includes("sem/") || lower.includes("stu")) {
          parsedRollNo = line.trim();
          currentField = 'none';
          continue;
        }
        addressLines.push(line);
        continue;
      }

      // Pattern-based fallback
      if (!parsedPhone && (/^(\+?94|0)\d{9}/.test(line.replace(/[\s-]/g, '')) || /^\d{10}$/.test(line.replace(/[\s-]/g, '')))) {
        parsedPhone = line.trim();
      } else if (!parsedRollNo && (/^\d{4}\/[a-zA-Z0-9\/]+$/.test(line) || lower.includes("sem/") || lower.includes("stu"))) {
        parsedRollNo = line.trim();
      } else if (!parsedName) {
        parsedName = line.replace(/,$/, "");
      } else {
        addressLines.push(line);
      }
    }

    const cleanAddress = addressLines.map(a => a.replace(/,$/, "").trim()).filter(Boolean);
    const finalAddressLines = cleanAddress.length > 0 ? cleanAddress : (formData.addressLines.length > 0 ? formData.addressLines : [""]);

    setFormData(prev => ({
      ...prev,
      studentName: parsedName || prev.studentName,
      phone: parsedPhone || prev.phone,
      studentRollNo: parsedRollNo || prev.studentRollNo,
      addressLines: finalAddressLines,
      addressLine1: finalAddressLines[0] || prev.addressLine1,
      addressLine2: finalAddressLines[1] || prev.addressLine2,
      addressLine3: finalAddressLines[2] || prev.addressLine3,
      addressLine4: finalAddressLines[3] || prev.addressLine4
    }));

    alert(`விபரங்கள் தானாகப் பிரிக்கப்பட்டு பூர்த்தியாகின!\n\nபெயர்: ${parsedName || 'N/A'}\nரோல் எண்: ${parsedRollNo || 'N/A'}\nதொலைபேசி: ${parsedPhone || 'N/A'}\nமுகவரி வரிகள்: ${finalAddressLines.length} வரிகள் (அனைத்து வரிகளும் தனித்தனியாக சேர்க்கப்பட்டன)`);
  };

  const handleSaveParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.studentRollNo.trim()) {
      alert("தயவுசெய்து மாணவர் பெயர் மற்றும் ரோல் எண்ணை உள்ளிடவும்.");
      return;
    }

    const activeLines = formData.addressLines.map(l => l.trim()).filter(Boolean);
    const line1 = activeLines[0] || formData.addressLine1 || "";
    const line2 = activeLines[1] || formData.addressLine2 || "";
    const line3 = activeLines[2] || formData.addressLine3 || "";
    const line4 = activeLines[3] || formData.addressLine4 || "";

    try {
      if (editingParcelId) {
        await updateParcelDelivery(editingParcelId, {
          studentRollNo: formData.studentRollNo,
          studentName: formData.studentName,
          grade: formData.grade,
          phone: formData.phone,
          addressLines: activeLines,
          addressLine1: line1,
          addressLine2: line2,
          addressLine3: line3,
          addressLine4: line4,
          fullAddress: activeLines.join(', '),
          itemsDescription: formData.itemsDescription,
          dispatchedDate: formData.dispatchedDate,
          notes: formData.notes
        });
        alert("பார்சல் விபரங்கள் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டன!");
      } else {
        await addParcelDelivery({
          studentId: formData.studentId,
          studentRollNo: formData.studentRollNo,
          studentName: formData.studentName,
          grade: formData.grade,
          phone: formData.phone,
          addressLines: activeLines,
          addressLine1: line1,
          addressLine2: line2,
          addressLine3: line3,
          addressLine4: line4,
          fullAddress: activeLines.join(', '),
          itemsDescription: formData.itemsDescription,
          dispatchedDate: formData.dispatchedDate,
          notes: formData.notes,
          senderName: senderSettings.senderName,
          senderAcademy: senderSettings.senderAcademy,
          senderAddressLine1: senderSettings.senderAddressLine1,
          senderAddressLine2: senderSettings.senderAddressLine2,
          senderAddressLine3: senderSettings.senderAddressLine3,
          senderAddressLine4: senderSettings.senderAddressLine4,
          senderPhone: senderSettings.senderPhone
        });
        alert("புதிய பார்சல் வெற்றிகரமாகச் சேர்க்கப்பட்டது!");
      }

      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      console.error("Error saving parcel:", err);
      alert("பிழை: " + (err?.message || err));
    }
  };

  // Save Custom Sender Settings
  const handleSaveSenderSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await saveParcelSenderSettings(senderFormData);
      setSenderSettings(senderFormData);

      if (updateExistingSender) {
        const current = await getParcelDeliveries();
        const updated = current.map(p => ({
          ...p,
          senderName: senderFormData.senderName,
          senderAcademy: senderFormData.senderAcademy,
          senderAddressLine1: senderFormData.senderAddressLine1,
          senderAddressLine2: senderFormData.senderAddressLine2,
          senderAddressLine3: senderFormData.senderAddressLine3,
          senderAddressLine4: senderFormData.senderAddressLine4 || '',
          senderPhone: senderFormData.senderPhone
        }));
        await saveParcelDeliveries(updated);
        setParcels(updated);
      }

      setShowSenderSettingsModal(false);
      alert("அனுப்புநர் முகவரி வெற்றிகரமாகச் சேமிக்கப்பட்டது!");
    } catch (err: any) {
      console.error("Error saving sender settings:", err);
      alert("சேமிப்பதில் பிழை: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Download Bulk 4-per-A4 Sheets as PDF
  const handleDownloadA4PDF = async () => {
    const container = document.getElementById("printable-bulk-a4");
    if (!container) return;

    try {
      setIsGeneratingPdf(true);
      const sheets = container.querySelectorAll(".a4-page-sheet");
      if (sheets.length === 0) return;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i] as HTMLElement;
        if (i > 0) pdf.addPage("a4", "portrait");

        const dataUrl = await toPng(sheet, {
          quality: 0.98,
          pixelRatio: 2.5,
          backgroundColor: "#ffffff"
        });

        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
      }

      pdf.save(`Agaram_Parcel_Receipts_A4_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err: any) {
      console.error("Error generating bulk A4 PDF:", err);
      alert("A4 PDF பதிவிறக்கத்தில் பிழை: " + (err?.message || err));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Bulk Generation for a Grade
  const handleBulkGenerate = async () => {
    if (!bulkGrade) {
      alert("தயவுசெய்து ஒரு தரத்தைத் (Grade) தேர்ந்தெடுக்கவும்.");
      return;
    }

    const targetStudents = students.filter(s => {
      if (!s.grade) return false;
      return s.grade.trim().toLowerCase() === bulkGrade.trim().toLowerCase();
    });

    if (targetStudents.length === 0) {
      alert(`தேர்ந்தெடுக்கப்பட்ட தரத்தில் (${bulkGrade}) மாணவர்கள் எவரும் இல்லை.`);
      return;
    }

    const confirmMsg = `${bulkGrade}-ல் உள்ள ${targetStudents.length} மாணவர்களுக்கும் ஒரே கிளிக்கில் பார்சல் ரசீதுகளை உருவாக்க விரும்புகிறீர்களா?\n\nDo you want to generate parcel receipts for all ${targetStudents.length} students?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const newItems: ParcelDelivery[] = [];

      for (const st of targetStudents) {
        let line1 = "";
        let line2 = "";
        let line3 = "";
        const rawAddr = (st.address || "").trim();
        if (rawAddr) {
          const parts = rawAddr.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
          line1 = parts[0] || "";
          line2 = parts[1] || "";
          line3 = parts.slice(2).join(", ") || "";
        }
        if (!line3 && st.district) {
          line3 = st.district;
        }

        const id = `parcel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        newItems.push({
          id,
          trackingNumber: `AGD-${Math.floor(100000 + Math.random() * 900000)}`,
          studentId: String(st.id || ""),
          studentRollNo: st.rollNo || st.username || ("STU" + Math.floor(1000 + Math.random() * 9000)),
          studentName: st.name || "Student",
          grade: st.grade || bulkGrade,
          phone: st.phone || "",
          addressLine1: line1 || "இல. 00, முதலாம் ஒழுங்கை",
          addressLine2: line2 || "ஊர் / கிராமம்",
          addressLine3: line3 || st.district || "இலங்கை",
          fullAddress: [line1, line2, line3].filter(Boolean).join(", "),
          itemsDescription: bulkItemDescription,
          senderName: DEFAULT_SENDER_DETAILS.senderName,
          senderAcademy: DEFAULT_SENDER_DETAILS.senderAcademy,
          senderAddressLine1: DEFAULT_SENDER_DETAILS.senderAddressLine1,
          senderAddressLine2: DEFAULT_SENDER_DETAILS.senderAddressLine2,
          senderAddressLine3: DEFAULT_SENDER_DETAILS.senderAddressLine3,
          senderPhone: DEFAULT_SENDER_DETAILS.senderPhone,
          status: "dispatched",
          dispatchedDate: bulkDispatchedDate,
          qrToken: Math.random().toString(36).substring(2, 10),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      const currentParcels = await getParcelDeliveries();
      await saveParcelDeliveries([...newItems, ...currentParcels]);
      
      setShowBulkGenerateModal(false);
      alert(`வெற்றிகரமாக ${newItems.length} மாணவர்களுக்கு பார்சல் ரசீதுகள் உருவாக்கப்பட்டன!`);
      loadData();
    } catch (err: any) {
      console.error("Error bulk generating:", err);
      alert("பிழை: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Dedicated AGD Tracking & Roll Number Search Handler
  const handleTrackSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = trackingSearchInput.trim();
    if (!query) {
      setTrackedParcel(null);
      setTrackingSearched(false);
      setSearchQuery("");
      return;
    }

    setTrackingSearched(true);
    setSearchQuery(query);

    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = parcels.find(p => {
      const pTrk = (p.trackingNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pRoll = (p.studentRollNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return pTrk === cleanQuery || 
             pRoll === cleanQuery || 
             (cleanQuery.length >= 3 && pTrk.includes(cleanQuery)) ||
             (cleanQuery.length >= 3 && pRoll.includes(cleanQuery)) ||
             p.trackingNumber.toLowerCase().includes(query.toLowerCase()) || 
             p.studentRollNo.toLowerCase().includes(query.toLowerCase()) ||
             p.studentName.toLowerCase().includes(query.toLowerCase());
    });

    setTrackedParcel(found || null);
  };

  const handleClearTrackSearch = () => {
    setTrackingSearchInput("");
    setTrackedParcel(null);
    setTrackingSearched(false);
    setSearchQuery("");
  };

  // Toggle Delivery Status
  const handleToggleStatus = async (parcel: ParcelDelivery) => {
    const newStatus = parcel.status === "delivered" ? "dispatched" : "delivered";
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-GB") + " " + now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });

    try {
      await updateParcelDelivery(parcel.id, {
        status: newStatus,
        deliveredDate: newStatus === "delivered" ? dateFormatted : ""
      });
      // Synchronize trackedParcel live state immediately
      if (trackedParcel && (trackedParcel.id === parcel.id || trackedParcel.trackingNumber === parcel.trackingNumber)) {
        setTrackedParcel({
          ...trackedParcel,
          status: newStatus,
          deliveredDate: newStatus === "delivered" ? dateFormatted : ""
        });
      }
      loadData();
    } catch (err: any) {
      alert("பிழை: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("இந்த பார்சல் பதிவை நீக்க விரும்புகிறீர்களா? (Delete this parcel?)")) {
      await deleteParcelDelivery(id);
      loadData();
    }
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParcels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParcels.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filtered parcels (robust search across AGD tracking, roll no, name, phone)
  const filteredParcels = parcels.filter(p => {
    const cleanSearch = searchQuery.trim().toLowerCase();
    const cleanQueryNoPunct = cleanSearch.replace(/[^a-z0-9]/g, '');
    const cleanTracking = (p.trackingNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanRoll = (p.studentRollNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const matchesSearch = !cleanSearch ||
      p.studentName.toLowerCase().includes(cleanSearch) ||
      p.studentRollNo.toLowerCase().includes(cleanSearch) ||
      p.trackingNumber.toLowerCase().includes(cleanSearch) ||
      (cleanQueryNoPunct && cleanTracking.includes(cleanQueryNoPunct)) ||
      (cleanQueryNoPunct && cleanRoll.includes(cleanQueryNoPunct)) ||
      (p.phone && p.phone.includes(cleanSearch));

    const matchesStatus = 
      filterStatus === "ALL" ? true : p.status === filterStatus;

    const matchesGrade = 
      filterGrade === "ALL" ? true : (p.grade && p.grade.toLowerCase() === filterGrade.toLowerCase());

    return matchesSearch && matchesStatus && matchesGrade;
  });

  // Calculate statistics
  const totalCount = parcels.length;
  const deliveredCount = parcels.filter(p => p.status === "delivered").length;
  const dispatchedCount = parcels.filter(p => p.status === "dispatched").length;

  // Selected items for bulk print
  const selectedParcelsForBulk = parcels.filter(p => selectedIds.includes(p.id));
  const bulkPrintItems = selectedParcelsForBulk.length > 0 ? selectedParcelsForBulk : filteredParcels;

  // Chunk array into groups of 4 for A4 sheets
  const chunkIntoFours = (arr: ParcelDelivery[]) => {
    const chunks: ParcelDelivery[][] = [];
    for (let i = 0; i < arr.length; i += 4) {
      chunks.push(arr.slice(i, i + 4));
    }
    return chunks;
  };

  const a4Pages = chunkIntoFours(bulkPrintItems);

  // Trigger A4 Print
  const handlePrintA4Sheets = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 
        Print-only stylesheet for 4 receipts per A4 sheet with cutting guides 
      */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-bulk-a4, #printable-bulk-a4 * {
            visibility: visible;
          }
          #printable-bulk-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background: #fff;
          }
          .a4-page-sheet {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            padding: 4mm !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: 1fr 1fr !important;
            gap: 3mm !important;
            position: relative !important;
            background: #fff !important;
            overflow: hidden !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Package size={26} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  ஆன்லைன் பார்சல் & டியூட் விநியோகம்
                </h1>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Parcel & Tute Delivery
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                மாணவர்களுக்கான டியூட், வினாத்தாள் பார்சல்களைப் பதிவுசெய்தல், A4-ல் 4 ரசீதுகள் பல்க் அச்சிடுதல் & QR டெலிவரி உறுதிப்படுத்தல்.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSenderFormData(senderSettings);
                setShowSenderSettingsModal(true);
              }}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all shadow-sm"
              title="அனுப்புநர் (From) முகவரி & விபரங்களைத் திருத்த"
            >
              <Building size={15} />
              அனுப்புநர் முகவரி எடிட்
            </button>

            <button
              onClick={() => setShowBulkGenerateModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all shadow-sm"
              title="வகுப்பு வாரியாக அனைத்து மாணவர்களுக்கும் பல்க்காக ரசீது உருவாக்க"
            >
              <Layers size={15} />
              வகுப்பு பல்க் ஜெனரேட்டர்
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus size={16} className="stroke-[3]" />
              புதிய பார்சல் சேர்க்க
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                மொத்த பார்சல்கள் (Total Parcels)
              </span>
              <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            </div>
            <div className="p-3 bg-white text-indigo-600 rounded-xl border border-slate-200 shadow-2xs">
              <Package size={20} />
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                கிடைத்துவிட்டது (Delivered)
              </span>
              <span className="text-2xl font-black text-emerald-800">{deliveredCount}</span>
            </div>
            <div className="p-3 bg-white text-emerald-600 rounded-xl border border-emerald-200 shadow-2xs">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                அனுப்பப்பட்டுள்ளது / வழியில் (Dispatched)
              </span>
              <span className="text-2xl font-black text-amber-800">{dispatchedCount}</span>
            </div>
            <div className="p-3 bg-white text-amber-600 rounded-xl border border-amber-200 shadow-2xs">
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Parcel Tracking & Status Search Tool */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-md p-5 sm:p-6 text-white border border-indigo-900/50">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Search className="text-indigo-400 stroke-[2.5]" size={20} />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
              பார்சல் நிலை கண்காணிப்பு & விரைவுத் தேடல் (AGD Tracking & Roll No Search)
            </h2>
          </div>
          <p className="text-xs text-slate-300 mb-4 font-medium">
            மாணவரின் <strong className="text-white">AGD டிராக்கிங் எண்</strong> (எ.கா: AGD-870750) அல்லது <strong className="text-white">ரோல் எண்ணை</strong> உள்ளிட்டு பார்சல் டெலிவரி செய்யப்பட்டுவிட்டதா அல்லது வழியில் உள்ளதா என்பதை உடனடியாகக் கண்டறியலாம்.
          </p>

          <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <PackageSearch className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={trackingSearchInput}
                onChange={(e) => {
                  setTrackingSearchInput(e.target.value);
                  if (!e.target.value) {
                    handleClearTrackSearch();
                  }
                }}
                placeholder="AGD Tracking No (எ.கா: AGD-870750) அல்லது Roll No உள்ளிடவும்..."
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs sm:text-sm font-semibold pl-10 pr-10 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-inner"
              />
              {trackingSearchInput && (
                <button
                  type="button"
                  onClick={handleClearTrackSearch}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  title="அழிக்க (Clear)"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search size={16} className="stroke-[3]" />
              <span>தேடுக (Search Status)</span>
            </button>
          </form>

          {/* Instant Track Result Box */}
          {trackingSearched && (
            <div className="mt-4 pt-4 border-t border-slate-700/80">
              {trackedParcel ? (
                <div className={`p-4 rounded-xl border transition-all ${
                  trackedParcel.status === "delivered" 
                    ? "bg-emerald-950/50 border-emerald-500/60 text-white" 
                    : "bg-amber-950/50 border-amber-500/60 text-white"
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        trackedParcel.status === "delivered"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-slate-950"
                      }`}>
                        {trackedParcel.status === "delivered" ? (
                          <CheckCircle2 size={24} className="stroke-[2.5]" />
                        ) : (
                          <Truck size={24} className="stroke-[2.5]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            trackedParcel.status === "delivered"
                              ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
                              : "bg-amber-500/30 text-amber-300 border border-amber-400/40"
                          }`}>
                            {trackedParcel.status === "delivered" ? "✓ டெலிவரி செய்யப்பட்டது (Delivered)" : "🚚 அனுப்பப்பட்டுள்ளது / வழியில் (In Transit)"}
                          </span>
                          <span className="font-mono text-xs font-black bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-indigo-300">
                            {trackedParcel.trackingNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            Roll No: <span className="text-white underline font-mono">{trackedParcel.studentRollNo}</span>
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-white mt-1">
                          {trackedParcel.studentName} {trackedParcel.grade ? `(${trackedParcel.grade})` : ""}
                        </h3>

                        <div className="text-xs text-slate-300 mt-1 space-y-0.5">
                          <p>📍 {trackedParcel.fullAddress || trackedParcel.addressLine1 || "முகவரி குறிப்பிடப்படவில்லை"}</p>
                          <p>📞 {trackedParcel.phone || "தொலைபேசி எண் இல்லை"}</p>
                          {trackedParcel.status === "delivered" ? (
                            <p className="text-emerald-300 font-bold mt-1">
                              ✓ மாணவருக்குக் கிடைத்த திகதி / நேரம்: {trackedParcel.deliveredDate || "உறுதிப்படுத்தப்பட்டது"}
                            </p>
                          ) : (
                            <p className="text-amber-300 font-bold mt-1">
                              ⏱️ அனுப்பப்பட்ட திகதி: {trackedParcel.dispatchedDate} (மாணவர் பார்சலை இன்னும் உறுதிப்படுத்தவில்லை)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                      <button
                        onClick={() => handleToggleStatus(trackedParcel)}
                        className={`text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                          trackedParcel.status === "delivered"
                            ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                        title="டெலிவரி நிலையை மாற்றுக"
                      >
                        {trackedParcel.status === "delivered" ? (
                          <>
                            <RotateCcw size={14} />
                            <span>'வழியில் உள்ளது' என மாற்று</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>'டெலிவரி ஆகிவிட்டது' என மாற்று</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setViewingParcel(trackedParcel);
                          setShowViewModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>ரசீது பார்க்க</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-400 shrink-0" />
                  <span>
                    <strong>'{trackingSearchInput}'</strong> என்ற AGD டிராக்கிங் எண் அல்லது Roll எண்ணுடன் எந்த பார்சலும் கிடைக்கவில்லை. தயவுசெய்து எண்களைச் சரிபார்க்கவும்.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Bulk Action Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="AGD Tracking No / Roll No / மாணவர் பெயர் தேட..."
              className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === "ALL" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                அனைத்தும்
              </button>
              <button
                onClick={() => setFilterStatus("dispatched")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === "dispatched" ? "bg-amber-500 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                அனுப்பப்பட்டவை
              </button>
              <button
                onClick={() => setFilterStatus("delivered")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === "delivered" ? "bg-emerald-600 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                கிடைத்துவிட்டவை
              </button>
            </div>

            {/* Grade Filter */}
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none text-slate-700 cursor-pointer"
            >
              <option value="ALL">அனைத்து தரம் (All Grades)</option>
              {classes.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Bulk A4 Sheet Print Button */}
            <button
              onClick={() => setShowBulkPrintModal(true)}
              disabled={filteredParcels.length === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm disabled:opacity-50"
              title="ஒரு A4 தாளில் 4 ரசீதுகள் வீதம் அச்சிட அல்லது PDF சேமிக்க"
            >
              <Printer size={15} />
              <span>A4-ல் 4 வீதம் பல்க் பிரிண்ட் {selectedIds.length > 0 ? `(${selectedIds.length})` : `(${filteredParcels.length})`}</span>
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-indigo-50/50 p-2.5 rounded-xl">
            <span className="font-bold text-indigo-900">
              {selectedIds.length} பார்சல்கள் தெரிவு செய்யப்பட்டுள்ளன
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Parcels Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            விபரங்கள் ஏற்றப்படுகின்றன...
          </div>
        ) : filteredParcels.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            பார்சல் பதிவுகள் எதுவும் கிடைக்கவில்லை. மேலே உள்ள "புதிய பார்சல் சேர்க்க" பொத்தானை அழுத்தவும்.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredParcels.length && filteredParcels.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-3.5">Tracking / Roll No</th>
                  <th className="p-3.5">மாணவர் பெயர் (Student)</th>
                  <th className="p-3.5">முகவரி (Delivery Address)</th>
                  <th className="p-3.5">அனுப்பப்பட்ட திகதி</th>
                  <th className="p-3.5 text-center">டெலிவரி நிலை (Status)</th>
                  <th className="p-3.5 text-right">நடவடிக்கைகள்</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParcels.map(parcel => (
                  <tr 
                    key={parcel.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedIds.includes(parcel.id) ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(parcel.id)}
                        onChange={() => toggleSelectOne(parcel.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>

                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-indigo-700 block text-xs">
                        {parcel.trackingNumber}
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                        Roll: {parcel.studentRollNo}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {parcel.studentName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {parcel.grade && <span className="font-semibold text-slate-700">{parcel.grade}</span>}
                        {parcel.phone && <span>• Tel: {parcel.phone}</span>}
                      </div>
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="text-slate-700 text-[11px] font-medium leading-snug line-clamp-2">
                        {[parcel.addressLine1, parcel.addressLine2, parcel.addressLine3].filter(Boolean).join(", ")}
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                      {parcel.dispatchedDate}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(parcel)}
                        title="நிலையை மாற்ற கிளிக் செய்க (Click to toggle status)"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                          parcel.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
                        }`}
                      >
                        {parcel.status === "delivered" ? (
                          <>
                            <CheckCircle2 size={13} className="text-emerald-700 stroke-[3]" />
                            <span>கிடைத்துவிட்டது</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} className="text-amber-700 stroke-[3]" />
                            <span>அனுப்பப்பட்டது</span>
                          </>
                        )}
                      </button>
                      {parcel.deliveredDate && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          {parcel.deliveredDate.split(" ")[0]}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setViewingParcel(parcel);
                            setShowViewModal(true);
                          }}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border border-indigo-200"
                          title="ரசீதைப் பார்க்க & அச்சிட"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(parcel)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="விபரங்களை மாற்ற"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(parcel.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
                          title="நீக்க"
                        >
                          <Trash2 size={15} />
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

      {/* 
        ====================================================
        1. ADD / EDIT PARCEL MODAL
        ====================================================
      */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header - Always Visible */}
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-emerald-400" />
                <h3 className="text-sm sm:text-base font-black">
                  {editingParcelId ? "பார்சல் விபரங்களைத் தொகுக்க" : "புதிய பார்சல் பதிவு செய்தல்"}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body - Never overflows viewport */}
            <form onSubmit={handleSaveParcel} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Smart Paste Section */}
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3.5 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    ஸ்மார்ட் பேஸ்ட் (Smart Paste Auto-Fill)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSmartPasteBox(!showSmartPasteBox)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    {showSmartPasteBox ? "மறைக்குக" : "காட்டுக"}
                  </button>
                </div>
                {showSmartPasteBox && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 leading-tight">
                      வாட்ஸ்அப் அல்லது மெசேஜில் வந்த விபரங்களை (Name, Adress, Phone, Roll number) அப்படியே கீழே ஒட்டவும்:
                    </p>
                    <textarea
                      rows={4}
                      value={smartPasteText}
                      onChange={(e) => setSmartPasteText(e.target.value)}
                      placeholder={`name - K. Krithishaan,\nadress- C/o mrs. T. Thamilarasi,\nUrupitiya\nKuliyapitiya.\nPhone number 0767289921\nroll number 2026/SEM/B1/1903`}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplySmartPaste}
                      className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      <ClipboardPaste size={14} />
                      தானாக நிரப்புக (Auto-Fill Details)
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Student Autofill Dropdown */}
              {!editingParcelId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    அல்லது மாணவர் பட்டியலில் இருந்து தேர்ந்தெடுக்க (Autofill from Student List):
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => handleSelectStudentForForm(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 outline-none"
                  >
                    <option value="">-- மாணவரைத் தேர்வு செய்க (Select Student) --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rollNo || s.username}) - {s.grade || 'No Grade'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    மாணவர் பெயர் (Student Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    placeholder="e.g. K. Krithishaan"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ரோல் எண் (Roll Number) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.studentRollNo}
                    onChange={(e) => setFormData({ ...formData, studentRollNo: e.target.value })}
                    placeholder="e.g. 2026/SEM/B1/1903"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    தரம் (Grade / Class)
                  </label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g. தரம் 10"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    தொலைபேசி எண் (Telephone)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 0767289921"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Dynamic Address Lines with Add Line Button */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800">
                    விநியோக முகவரி வரிகள் (Address Lines):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAddressLine}
                    className="text-[11px] text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                  >
                    <Plus size={12} className="stroke-[3]" />
                    + வரி சேர்க்க (Add Line)
                  </button>
                </div>

                {formData.addressLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold min-w-[48px] shrink-0">
                      Line {idx + 1}:
                    </span>
                    <input
                      type="text"
                      required={idx === 0}
                      value={line}
                      onChange={(e) => handleAddressLineChange(idx, e.target.value)}
                      placeholder={
                        idx === 0 ? "e.g. C/o mrs. T. Thamilarasi" :
                        idx === 1 ? "e.g. Urupitiya" :
                        idx === 2 ? "e.g. Kuliyapitiya." :
                        `Address Line ${idx + 1}`
                      }
                      className="flex-1 text-xs border border-slate-300 rounded-lg p-2 outline-none focus:border-indigo-500"
                    />
                    {formData.addressLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAddressLine(idx)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="இந்த வரியை நீக்குக"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    அனுப்பும் திகதி (Dispatched Date)
                  </label>
                  <input
                    type="date"
                    value={formData.dispatchedDate}
                    onChange={(e) => setFormData({ ...formData, dispatchedDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    பொதி விபரம் (Items)
                  </label>
                  <input
                    type="text"
                    value={formData.itemsDescription}
                    onChange={(e) => setFormData({ ...formData, itemsDescription: e.target.value })}
                    placeholder="e.g. 10ம் வகுப்பு தமிழ் டியூட்"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Sender Details Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-800">அனுப்புநர் விபரம் (From - Fix):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSenderFormData(senderSettings);
                      setShowSenderSettingsModal(true);
                    }}
                    className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                  >
                    மாற்றுக
                  </button>
                </div>
                {senderSettings.senderName}, {senderSettings.senderAddressLine1} {senderSettings.senderAddressLine2} {senderSettings.senderAddressLine3} {senderSettings.senderAddressLine4 || ''} | Tel: {senderSettings.senderPhone}
              </div>

              {/* Sticky Footer Action Buttons */}
              <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ரத்து செய்க
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  {editingParcelId ? "மாற்றங்களைச் சேமி" : "பார்சலைச் சேர்"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ====================================================
        2. BULK GENERATE BY GRADE MODAL
        ====================================================
      */}
      {showBulkGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4.5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-emerald-400" />
                <h3 className="text-sm sm:text-base font-black">வகுப்பு பல்க் பார்சல் ஜெனரேட்டர்</h3>
              </div>
              <button 
                onClick={() => setShowBulkGenerateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                ஒரு குறிப்பிட்ட தரத்தைத் தெரிவு செய்து, அத்தரத்தில் உள்ள அனைத்து மாணவர்களுக்கும் ஒரே கிளிக்கில் பார்சல் ரசீதுகளை உருவாக்கலாம்.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  தரத்தைத் தேர்ந்தெடுக்கவும் (Select Grade) *
                </label>
                <select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- வகுப்பைத் தேர்வு செய்க --</option>
                  {classes.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {bulkGrade && (
                  <span className="text-[11px] text-indigo-700 font-semibold block mt-1">
                    இந்த வகுப்பில் உள்ள மாணவர்கள் எண்ணிக்கை: {students.filter(s => s.grade === bulkGrade).length}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  பொதி விபரம் (Tute / Book Description)
                </label>
                <input
                  type="text"
                  value={bulkItemDescription}
                  onChange={(e) => setBulkItemDescription(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  அனுப்பும் திகதி (Dispatched Date)
                </label>
                <input
                  type="date"
                  value={bulkDispatchedDate}
                  onChange={(e) => setBulkDispatchedDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkGenerateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  ரத்து செய்க
                </button>
                <button
                  type="button"
                  onClick={handleBulkGenerate}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  ரசீதுகளை உருவாக்கு
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
        ====================================================
        3. SINGLE RECEIPT VIEW & DOWNLOAD MODAL
        ====================================================
      */}
      {showViewModal && viewingParcel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden my-6">
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                பார்சல் ரசீது (Receipt Preview) - 1/4 A4 Ratio
              </h3>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center">
              <ParcelReceiptCard parcel={viewingParcel} showActions={true} />
            </div>
          </div>
        </div>
      )}

      {/* 
        ====================================================
        4. BULK A4 SHEET PRINT & PDF MODAL (4 PER PAGE)
        ====================================================
      */}
      {showBulkPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center p-2 sm:p-4 overflow-y-auto">
          {/* Sticky Toolbar */}
          <div className="sticky top-2 z-50 bg-slate-900 text-white border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 w-full max-w-4xl mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <Printer size={18} className="text-emerald-400" />
                A4-ல் 4 ரசீதுகள் பல்க் அச்சிடுதல் (Bulk 4-Per-A4 Print & PDF)
              </h3>
              <p className="text-[11px] text-slate-300">
                மொத்தம் {bulkPrintItems.length} ரசீதுகள் ({a4Pages.length} A4 தாள்கள்). நடுவில் கட் செய்வதற்கான கோடுகள் உள்ளன.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadA4PDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
                title="A4 பக்கங்களை உயர்தர PDF கோப்பாகப் பதிவிறக்க"
              >
                <Download size={16} />
                {isGeneratingPdf ? "PDF உருவாகிறது..." : "A4 PDF பதிவிறக்கு (Download PDF)"}
              </button>

              <button
                type="button"
                onClick={handlePrintA4Sheets}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Printer size={16} />
                அச்சிடுக / Print
              </button>

              <button
                type="button"
                onClick={() => setShowBulkPrintModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Container for 4-per-A4 Grid */}
          <div id="printable-bulk-a4" className="w-full max-w-4xl space-y-8 pb-12">
            {a4Pages.map((pageGroup, pageIndex) => (
              <div 
                key={pageIndex}
                className="a4-page-sheet bg-white border border-slate-300 rounded-xl shadow-xl mx-auto relative overflow-hidden"
                style={{
                  width: "210mm",
                  height: "297mm",
                  minHeight: "297mm",
                  maxHeight: "297mm",
                  padding: "4mm",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  gap: "3mm",
                  overflow: "hidden"
                }}
              >
                {/* Horizontal Center Cut Line */}
                <div 
                  className="absolute left-0 right-0 border-b-2 border-dashed border-gray-400 pointer-events-none flex items-center justify-center"
                  style={{ top: "148.5mm" }}
                >
                  <span className="bg-white text-[9px] font-bold text-gray-500 px-2 py-0.5 rounded border border-gray-300 uppercase tracking-widest flex items-center gap-1">
                    <Scissors size={10} /> Cut Here (இங்கு வெட்டவும்)
                  </span>
                </div>

                {/* Vertical Center Cut Line */}
                <div 
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-gray-400 pointer-events-none flex items-center justify-center"
                  style={{ left: "105mm" }}
                >
                  <span className="bg-white text-[9px] font-bold text-gray-500 px-1 py-1 rounded border border-gray-300 uppercase tracking-widest -rotate-90">
                    <Scissors size={10} /> Cut
                  </span>
                </div>

                {/* 4 Quadrants on the A4 page */}
                {pageGroup.map((parcelItem) => (
                  <div key={parcelItem.id} className="flex items-center justify-center p-0.5">
                    <ParcelReceiptCard 
                      parcel={parcelItem} 
                      showActions={false} 
                      isPrintView={true} 
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 
        ====================================================
        5. SENDER (FROM) ADDRESS SETTINGS MODAL
        ====================================================
      */}
      {showSenderSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6">
            <div className="bg-slate-900 text-white p-4.5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building size={20} className="text-amber-400" />
                <h3 className="text-sm sm:text-base font-black">
                  அனுப்புநர் (From) முகவரி அமைப்புகள்
                </h3>
              </div>
              <button 
                onClick={() => setShowSenderSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSenderSettings} className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                பார்சல் ரசீதுகளில் அச்சிடப்படும் அனுப்புநர் (From) விபரங்களை நீங்கள் விரும்பியவாறு இங்கே மாற்றிக் கொள்ளலாம்.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    அனுப்புநர் பெயர் (Sender Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderFormData.senderName}
                    onChange={(e) => setSenderFormData({ ...senderFormData, senderName: e.target.value })}
                    placeholder="e.g. D. DINESHKUMAR"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    அகாடமி / நிறுவனம் (Academy Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderFormData.senderAcademy}
                    onChange={(e) => setSenderFormData({ ...senderFormData, senderAcademy: e.target.value })}
                    placeholder="e.g. AGARAM DHINESH ONLINE ACADEMY"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-bold text-slate-800">
                  அனுப்புநர் முகவரி வரிகள் (Sender Address Lines):
                </label>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Line 1 (இலக்கம் / வீதி):</span>
                  <input
                    type="text"
                    required
                    value={senderFormData.senderAddressLine1}
                    onChange={(e) => setSenderFormData({ ...senderFormData, senderAddressLine1: e.target.value })}
                    placeholder="e.g. No. 111/2, Pahalakamma,"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Line 2 (கிராமம் / பிரதேசம்):</span>
                  <input
                    type="text"
                    required
                    value={senderFormData.senderAddressLine2}
                    onChange={(e) => setSenderFormData({ ...senderFormData, senderAddressLine2: e.target.value })}
                    placeholder="e.g. Udatheltotta,"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Line 3 (நகரம் / மாவட்டம்):</span>
                  <input
                    type="text"
                    required
                    value={senderFormData.senderAddressLine3}
                    onChange={(e) => setSenderFormData({ ...senderFormData, senderAddressLine3: e.target.value })}
                    placeholder="e.g. Galaha, Kandy."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Line 4 (விருப்பத்தெரிவு / Optional):</span>
                  <input
                    type="text"
                    value={senderFormData.senderAddressLine4 || ""}
                    onChange={(e) => setSenderFormData({ ...senderFormData, senderAddressLine4: e.target.value })}
                    placeholder="e.g. Sri Lanka"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  அனுப்புநர் தொலைபேசி எண் (Sender Tel) *
                </label>
                <input
                  type="text"
                  required
                  value={senderFormData.senderPhone}
                  onChange={(e) => setSenderFormData({ ...senderFormData, senderPhone: e.target.value })}
                  placeholder="e.g. 0778054232"
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={updateExistingSender}
                    onChange={(e) => setUpdateExistingSender(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  ஏற்கனவே உள்ள அனைத்து பார்சல்களிலும் இந்த முகவரியைப் புதுப்பிக்கவும் (Apply to all existing parcels)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSenderSettingsModal(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  ரத்து செய்க
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  சேமிக்குக (Save Settings)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
