import React, { useState, useEffect, useMemo } from "react";
import { getStudents, saveStudents, getFees, saveFees, getClasses, getAdminSettings, getSubjects } from "../../lib/db";
import { Search, Calendar, CreditCard, User, BookOpen, DollarSign, CheckCircle, Printer, Download, Copy, FileText, Image as ImageIcon, Share2, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { toPng, toBlob } from 'html-to-image';
import jsPDF from 'jspdf';

const MONTH_LIST = [
  { index: '01', en: 'Jan', ta: 'ஜனவரி', full: 'January' },
  { index: '02', en: 'Feb', ta: 'பிப்ரவரி', full: 'February' },
  { index: '03', en: 'Mar', ta: 'மார்ச்', full: 'March' },
  { index: '04', en: 'Apr', ta: 'ஏப்ரல்', full: 'April' },
  { index: '05', en: 'May', ta: 'மே', full: 'May' },
  { index: '06', en: 'Jun', ta: 'ஜூன்', full: 'June' },
  { index: '07', en: 'Jul', ta: 'ஜூலை', full: 'July' },
  { index: '08', en: 'Aug', ta: 'ஆகஸ்ட்', full: 'August' },
  { index: '09', en: 'Sep', ta: 'செப்டம்பர்', full: 'September' },
  { index: '10', en: 'Oct', ta: 'அக்டோபர்', full: 'October' },
  { index: '11', en: 'Nov', ta: 'நவம்பர்', full: 'November' },
  { index: '12', en: 'Dec', ta: 'டிசம்பர்', full: 'December' },
];

const formatMonthKey = (mKey: string) => {
  if (!mKey || typeof mKey !== 'string') return '';
  const parts = mKey.split('-');
  if (parts.length !== 2) return mKey;
  const y = parts[0];
  const m = parts[1];
  const item = MONTH_LIST.find(x => x.index === m);
  return item ? `${item.full} ${y}` : mKey;
};

const formatMonthsList = (months: string[]) => {
  if (!months || !Array.isArray(months) || months.length === 0) return '';
  const sorted = [...months].sort();
  const formatted = sorted.map(m => formatMonthKey(m));
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]} (${formatted.length} Months)`;
};

export default function CollectFee() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allFees, setAllFees] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentFeeHistory, setStudentFeeHistory] = useState<any[]>([]);
  
  // Multi-month state
  const [selectedMonths, setSelectedMonths] = useState<string[]>([new Date().toISOString().slice(0, 7)]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customMonthInput, setCustomMonthInput] = useState<string>("");

  const [paymentData, setPaymentData] = useState({
    method: "Bank Transfer",
    date: new Date().toISOString().split('T')[0],
  });

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [isManualAmount, setIsManualAmount] = useState(false);

  // Discount states
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");

  const [subjects, setSubjects] = useState<any[]>([]);
  const [feeSettings, setFeeSettings] = useState<any[]>([]);

  useEffect(() => {
    getStudents().then(data => setStudents(data || []));
    getClasses().then(data => setClasses(data || []));
    getFees().then(data => setAllFees(data || []));
    getAdminSettings().then(data => setSettings(data));
    getSubjects().then(data => setSubjects(data || []));
    
    // Get fee presets from settings
    getAdminSettings().then(data => {
      if (data?.fees?.items) {
        setFeeSettings(data.fees.items);
      }
    });

    // Check if student ID is passed in URL
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student');
    if (studentId) {
      getStudents().then(data => {
        const student = data?.find((s: any) => s.id === studentId);
        if (student) handleSelectStudent(student);
      });
    }
  }, []);

  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [isUnpaidReceipt, setIsUnpaidReceipt] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>('/logo.png');

  useEffect(() => {
    let isMounted = true;
    const logoSrc = settings?.profileImage && settings.profileImage !== '/logo.png' 
      ? settings.profileImage 
      : '/logo.png';
      
    fetch(logoSrc)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && typeof reader.result === 'string') {
            setLogoDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        if (isMounted) setLogoDataUrl('/logo.png');
      });

    return () => { isMounted = false; };
  }, [settings]);

  const handleDeleteFee = async (fee: any) => {
    if (!window.confirm("இந்த கட்டண விபரத்தை நிச்சயமாக நீக்க வேண்டுமா?")) return;
    
    // Determine what to delete (batch or single)
    const idToDelete = fee.batchId || fee.id;
    setIsDeleting(idToDelete);
    
    try {
      let updatedFees;
      if (fee.batchId) {
        updatedFees = allFees.filter(f => f.batchId !== fee.batchId);
      } else {
        updatedFees = allFees.filter(f => f.id !== fee.id);
      }
      
      await saveFees(updatedFees);
      setAllFees(updatedFees);
      alert("கட்டண விபரம் நீக்கப்பட்டது.");
    } catch (error: any) {
      alert("பிழை: " + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      const history = allFees.filter(f => f.studentId === selectedStudent.id || f.studentId === selectedStudent.student_id);
      setStudentFeeHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
      setStudentFeeHistory([]);
    }
  }, [selectedStudent, allFees]);

  const filteredStudents = useMemo(() => {
    if (!(searchQuery || selectedGrade)) return [];
    
    return students.filter(s => {
        const searchLow = searchQuery.toLowerCase().trim();
        const matchesSearch = searchQuery 
          ? s.name?.toLowerCase().includes(searchLow) || 
            s.student_id?.toString().toLowerCase().includes(searchLow) ||
            s.id?.toString().toLowerCase().includes(searchLow) ||
            s.rollNo?.toString().toLowerCase().includes(searchLow)
          : true;
        const matchesGrade = selectedGrade 
          ? s.grade?.toString().trim().toLowerCase() === selectedGrade.toString().trim().toLowerCase() 
          : true;
        return matchesSearch && matchesGrade;
      }).sort((a, b) => {
        if (a.grade !== b.grade) {
          return (a.grade || "").localeCompare(b.grade || "");
        }
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [students, searchQuery, selectedGrade]);

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    
    // Reset discount states when student changes
    setDiscountValue(0);
    setDiscountType('amount');
    setDiscountReason("");
    setIsManualAmount(false);
    setSelectedMonths([new Date().toISOString().slice(0, 7)]);
    setSelectedItems([]);
  };

  const monthCount = useMemo(() => Math.max(1, selectedMonths.length), [selectedMonths]);

  const toggleMonth = (mKey: string) => {
    setSelectedMonths(prev => {
      let next: string[];
      if (prev.includes(mKey)) {
        if (prev.length <= 1) {
          return prev; // keep at least one month
        }
        next = prev.filter(m => m !== mKey);
      } else {
        next = [...prev, mKey].sort();
      }
      return next;
    });
  };

  const selectCurrentMonth = () => {
    const cur = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonths([cur]);
    setSelectedYear(new Date().getFullYear());
  };

  const selectTwoMonths = () => {
    const now = new Date();
    const m1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextD = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const m2 = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonths([m1, m2]);
    setSelectedYear(now.getFullYear());
  };

  const selectThreeMonths = () => {
    const now = new Date();
    const m1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const d2 = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const m2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`;
    const d3 = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const m3 = `${d3.getFullYear()}-${String(d3.getMonth() + 2).padStart(2, '0')}`;
    setSelectedMonths([m1, m2, m3]);
    setSelectedYear(now.getFullYear());
  };

  // Recalculate item totals when monthCount changes
  useEffect(() => {
    if (!isManualAmount) {
      setSelectedItems(prevItems =>
        prevItems.map(item => {
          const base = item.baseAmount !== undefined ? item.baseAmount : (parseInt(item.amount) || 0);
          return {
            ...item,
            baseAmount: base,
            amount: base * monthCount
          };
        })
      );
    }
  }, [monthCount, isManualAmount]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return Math.min(totalAmount, Math.round((totalAmount * val) / 100));
    }
    return Math.min(totalAmount, val);
  }, [totalAmount, discountValue, discountType]);

  const netPayable = useMemo(() => {
    return Math.max(0, totalAmount - discountAmount);
  }, [totalAmount, discountAmount]);

  useEffect(() => {
    if (!isManualAmount) {
      const total = selectedItems.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0);
      setTotalAmount(total);
    }
  }, [selectedItems, isManualAmount]);

  useEffect(() => {
    if (!isManualAmount) {
      setAmountPaid(netPayable);
    }
  }, [netPayable, isManualAmount]);

  const toggleItem = (itemType: string, itemName: string, unitAmount: number, isSubject: boolean, category?: string) => {
    setIsManualAmount(false); // Reset manual override when changing selection
    const multiplier = monthCount;

    if (isSubject) {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.itemName === itemName && i.type === 'Subject Fee');
        if (exists) {
          return prev.filter(i => !(i.itemName === itemName && i.type === 'Subject Fee'));
        } else {
          return [...prev, {
            id: Date.now() + Math.random().toString(),
            type: 'Subject Fee',
            label: itemName,
            itemName: itemName,
            baseAmount: unitAmount,
            amount: unitAmount * multiplier,
            category: category
          }];
        }
      });
    } else if (itemType === 'Monthly Tuition') {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.type === 'Monthly Tuition');
        if (exists) {
          return prev.filter(i => i.type !== 'Monthly Tuition');
        } else {
          const classData = classes.find(c => c.name === selectedStudent?.grade);
          const tuitionAmount = classData ? parseInt(classData.monthlyTuitionFees.toString().replace(/\D/g, '')) : 1500;
          return [...prev, {
            id: 'tuition',
            type: 'Monthly Tuition',
            label: 'Monthly Tuition',
            baseAmount: tuitionAmount,
            amount: tuitionAmount * multiplier
          }];
        }
      });
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || selectedItems.length === 0 || !paymentData.date || selectedMonths.length === 0) {
      alert("Please select at least one month and one fee item.");
      return;
    }

    if (paymentData.method === "Online") {
      setShowPaymentGateway(true);
    } else {
      await processPayment();
    }
  };

  const processPayment = async (transactionId?: string) => {
    try {
      const existingFees = await getFees() || [];
      const batchId = `BATCH-${Date.now()}`;
      const txnIdBase = transactionId || `TXN-${Math.floor(Math.random() * 1000000)}`;
      const numMonths = selectedMonths.length || 1;
      const formattedMonths = formatMonthsList(selectedMonths);
      
      // Filter out items with 0 amount
      const validItems = selectedItems.filter(item => (parseInt(item.amount) || 0) > 0);
      if (validItems.length === 0) {
        alert("கட்டணத் தொகை 0 ஆக உள்ள விபரங்களைச் சேமிக்க முடியாது. தயவுசெய்து சரியான கட்டணத் தொகையைத் தேர்ந்தெடுக்கவும்.");
        return;
      }

      // Calculate proportions if amount was manually changed or discount applied
      const calculatedTotal = validItems.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0);
      const adjustmentRatio = calculatedTotal > 0 ? amountPaid / calculatedTotal : 1;
      const discountRatio = calculatedTotal > 0 ? discountAmount / calculatedTotal : 0;

      const newFeeRecords: any[] = [];

      selectedMonths.forEach((m, mIdx) => {
        validItems.forEach((item, idx) => {
          const itemBaseMonthly = item.baseAmount !== undefined ? item.baseAmount : Math.round((parseInt(item.amount) || 0) / numMonths);
          const finalItemMonthlyAmount = Math.round(itemBaseMonthly * adjustmentRatio);
          const itemMonthlyDiscount = Math.round(itemBaseMonthly * discountRatio);
          const itemNetMonthly = Math.max(0, itemBaseMonthly - itemMonthlyDiscount);
          const itemRemainingMonthly = Math.max(0, itemNetMonthly - finalItemMonthlyAmount);

          newFeeRecords.push({
            id: `${Date.now()}-${mIdx}-${idx}`,
            studentId: selectedStudent.student_id || selectedStudent.id,
            studentName: selectedStudent.name,
            grade: selectedStudent.grade,
            rollNo: selectedStudent.rollNo || "",
            month: m,
            amount: finalItemMonthlyAmount.toString(),
            fullFee: itemBaseMonthly.toString(),
            discount: itemMonthlyDiscount.toString(),
            discountReason: discountReason || "",
            discountType: discountType,
            discountValue: discountValue.toString(),
            netFee: itemNetMonthly.toString(),
            remainingAmount: itemRemainingMonthly.toString(),
            method: paymentData.method,
            date: paymentData.date,
            type: item.type,
            category: item.category || "",
            itemName: item.itemName || item.label || "",
            transactionId: (validItems.length > 1 || numMonths > 1) ? `${txnIdBase}-${mIdx + 1}-${idx + 1}` : txnIdBase,
            batchId: batchId,
            batchMonths: selectedMonths,
            batchMonthsFormatted: formattedMonths,
            batchMonthCount: numMonths,
            timestamp: new Date().toISOString(),
            batchFullFee: totalAmount.toString(),
            batchSubTotal: totalAmount.toString(),
            batchDiscount: discountAmount.toString(),
            batchDiscountType: discountType,
            batchDiscountValue: discountValue.toString(),
            batchDiscountReason: discountReason || "",
            batchNetPayable: netPayable.toString(),
            batchAmountPaid: amountPaid.toString(),
            batchRemaining: Math.max(0, netPayable - amountPaid).toString()
          });
        });
      });

      const updatedFees = [...existingFees, ...newFeeRecords];
      await saveFees(updatedFees);
      setAllFees(updatedFees);

      // Unblock zoom access automatically when fee is paid
      const studentsList = await getStudents();
      const updatedStudents = studentsList.map((s: any) => 
        (s.id === selectedStudent.id || s.student_id === selectedStudent.student_id)
          ? { ...s, zoomBlocked: false } 
          : s
      );
      await saveStudents(updatedStudents);

      setReceiptData({
        studentId: selectedStudent.student_id || selectedStudent.id,
        studentName: selectedStudent.name,
        grade: selectedStudent.grade,
        rollNo: selectedStudent.rollNo || "",
        month: formattedMonths,
        batchMonths: selectedMonths,
        batchMonthsFormatted: formattedMonths,
        monthCount: numMonths,
        date: paymentData.date,
        method: paymentData.method,
        items: selectedItems.map((item, idx) => {
          let finalAmount = parseInt(item.amount) || 0;
          let itemDiscount = Math.round((parseInt(item.amount) || 0) * discountRatio);
          if (isManualAmount || discountAmount > 0) {
            if (idx === selectedItems.length - 1) {
              const otherItemsTotal = selectedItems.slice(0, -1).reduce((sum, it) => sum + Math.round((parseInt(it.amount) || 0) * adjustmentRatio), 0);
              finalAmount = amountPaid - otherItemsTotal;
              const otherDiscounts = selectedItems.slice(0, -1).reduce((sum, it) => sum + Math.round((parseInt(it.amount) || 0) * discountRatio), 0);
              itemDiscount = discountAmount - otherDiscounts;
            } else {
              finalAmount = Math.round(finalAmount * adjustmentRatio);
            }
          }
          const itemNet = Math.max(0, (parseInt(item.amount) || 0) - itemDiscount);
          return {
            ...item,
            label: numMonths > 1 ? `${item.itemName || item.label} (${numMonths} Months)` : (item.itemName || item.label),
            subLabel: numMonths > 1 ? `${formattedMonths} (${numMonths} × LKR ${item.baseAmount || Math.round(item.amount / numMonths)})` : formattedMonths,
            paidAmount: finalAmount,
            discount: itemDiscount,
            remainingAmount: Math.max(0, itemNet - finalAmount)
          };
        }),
        subTotal: totalAmount,
        totalAmount: totalAmount,
        discount: discountAmount,
        discountType: discountType,
        discountValue: discountValue,
        discountReason: discountReason,
        netPayable: netPayable,
        amountPaid: amountPaid,
        remainingAmount: Math.max(0, netPayable - amountPaid),
        transactionId: txnIdBase,
        batchFullFee: totalAmount.toString(),
        batchSubTotal: totalAmount.toString(),
        batchDiscount: discountAmount.toString(),
        batchDiscountReason: discountReason,
        batchNetPayable: netPayable.toString(),
        batchAmountPaid: amountPaid.toString(),
        batchRemaining: Math.max(0, netPayable - amountPaid).toString()
      });
      setShowReceipt(true);
      
      // Reset form
      setSelectedItems([]);
      setDiscountValue(0);
      setDiscountReason("");
      setDiscountType('amount');
      setIsManualAmount(false);
      setSelectedMonths([new Date().toISOString().slice(0, 7)]);
    } catch (error) {
      console.error("Error saving fee:", error);
      alert("An error occurred while saving the payment. Please try again.");
    }
  };

  const handleMockPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPaymentGateway(false);
      const mockTxnId = `ONL-${Math.floor(Math.random() * 100000000)}`;
      processPayment(mockTxnId);
    }, 2000);
  };

  const groupFeesByBatch = (fees: any[]) => {
    const groups: { [key: string]: any } = {};
    const validFees = (fees || []).filter((f: any) => (Number(f.amount) || 0) > 0 || (Number(f.fullFee) || 0) > 0);
    
    validFees.forEach(fee => {
      let id = fee.batchId;
      if (!id && fee.transactionId) {
        id = fee.transactionId.split('-')[0] + '-' + fee.transactionId.split('-')[1];
        if (fee.transactionId.split('-').length < 2) id = fee.transactionId;
      }
      if (!id) id = fee.id;

      const itemFull = Number(fee.fullFee || fee.amount) || 0;
      const itemDiscount = Number(fee.discount) || 0;
      const itemPaid = Number(fee.amount) || 0;
      const itemRem = Number(fee.remainingAmount || "0") || 0;

      const batchFull = fee.batchSubTotal || fee.batchFullFee ? Number(fee.batchSubTotal || fee.batchFullFee) : null;
      const batchDiscount = fee.batchDiscount !== undefined && fee.batchDiscount !== null ? Number(fee.batchDiscount) : null;
      const batchNet = fee.batchNetPayable ? Number(fee.batchNetPayable) : null;
      const batchPaid = fee.batchAmountPaid ? Number(fee.batchAmountPaid) : null;
      const batchRem = fee.batchRemaining ? Number(fee.batchRemaining) : null;

      if (!groups[id]) {
        groups[id] = {
          ...fee,
          batchMonths: fee.batchMonths || (fee.month ? [fee.month] : []),
          totalAmount: batchFull !== null && !isNaN(batchFull) && batchFull > 0 ? batchFull : itemFull,
          batchSubTotal: batchFull !== null && !isNaN(batchFull) && batchFull > 0 ? batchFull : itemFull,
          batchDiscount: batchDiscount !== null && !isNaN(batchDiscount) ? batchDiscount : itemDiscount,
          batchDiscountReason: fee.batchDiscountReason || fee.discountReason || "",
          batchNetPayable: batchNet !== null && !isNaN(batchNet) ? batchNet : Math.max(0, itemFull - itemDiscount),
          amountPaid: batchPaid !== null && !isNaN(batchPaid) && batchPaid > 0 ? batchPaid : itemPaid,
          remainingAmount: batchRem !== null && !isNaN(batchRem) ? batchRem : itemRem,
          items: [{ 
            label: (fee.itemName || fee.type), 
            amount: itemFull, 
            discount: itemDiscount,
            paidAmount: itemPaid,
            remainingAmount: itemRem,
            type: fee.type, 
            itemName: fee.itemName, 
            category: fee.category 
          }],
          displayType: fee.type,
          displayMonth: fee.batchMonthsFormatted || (fee.batchMonths ? formatMonthsList(fee.batchMonths) : formatMonthKey(fee.month))
        };
      } else {
        if (fee.month && !groups[id].batchMonths.includes(fee.month)) {
          groups[id].batchMonths.push(fee.month);
          groups[id].displayMonth = formatMonthsList(groups[id].batchMonths);
        }

        const existingItem = groups[id].items.find((i: any) => i.label === (fee.itemName || fee.type) && i.type === fee.type);
        if (existingItem && fee.batchMonths && fee.batchMonths.length > 1) {
          existingItem.amount += itemFull;
          existingItem.discount += itemDiscount;
          existingItem.paidAmount += itemPaid;
          existingItem.remainingAmount += itemRem;
        } else {
          groups[id].items.push({ 
            label: (fee.itemName || fee.type), 
            amount: itemFull, 
            discount: itemDiscount,
            paidAmount: itemPaid,
            remainingAmount: itemRem,
            type: fee.type, 
            itemName: fee.itemName, 
            category: fee.category 
          });
        }

        if (batchFull !== null && !isNaN(batchFull) && batchFull > 0) {
          groups[id].totalAmount = batchFull;
          groups[id].batchSubTotal = batchFull;
          groups[id].batchDiscount = batchDiscount !== null && !isNaN(batchDiscount) ? batchDiscount : groups[id].batchDiscount;
          groups[id].batchDiscountReason = fee.batchDiscountReason || fee.discountReason || groups[id].batchDiscountReason;
          groups[id].batchNetPayable = batchNet !== null && !isNaN(batchNet) ? batchNet : groups[id].batchNetPayable;
          groups[id].amountPaid = batchPaid !== null && !isNaN(batchPaid) && batchPaid > 0 ? batchPaid : groups[id].amountPaid;
          groups[id].remainingAmount = batchRem !== null && !isNaN(batchRem) ? batchRem : groups[id].remainingAmount;
        } else {
          const hasBatchLevel = groups[id].batchFullFee && Number(groups[id].batchFullFee) > 0;
          if (!hasBatchLevel) {
            groups[id].totalAmount = (Number(groups[id].totalAmount) || 0) + itemFull;
            groups[id].batchSubTotal = (Number(groups[id].batchSubTotal) || 0) + itemFull;
            groups[id].batchDiscount = (Number(groups[id].batchDiscount) || 0) + itemDiscount;
            groups[id].amountPaid = (Number(groups[id].amountPaid) || 0) + itemPaid;
            groups[id].remainingAmount = (Number(groups[id].remainingAmount) || 0) + itemRem;
          }
        }
      }
    });
    
    return Object.values(groups).sort((a: any, b: any) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
  };

  const handleEditFee = (fee: any) => {
    const sourceFee = fee.items ? fee : fee;
    setEditingFeeId(sourceFee.id);
    setPaymentData({
      method: sourceFee.method,
      date: sourceFee.date,
    });

    if (sourceFee.batchMonths && Array.isArray(sourceFee.batchMonths) && sourceFee.batchMonths.length > 0) {
      setSelectedMonths(sourceFee.batchMonths);
    } else if (sourceFee.month) {
      setSelectedMonths([sourceFee.month]);
    }

    if (sourceFee.batchDiscount || sourceFee.discount) {
      setDiscountValue(Number(sourceFee.batchDiscountValue || sourceFee.batchDiscount || sourceFee.discount) || 0);
      setDiscountType((sourceFee.batchDiscountType || 'amount') as any);
      setDiscountReason(sourceFee.batchDiscountReason || sourceFee.discountReason || "");
    } else {
      setDiscountValue(0);
      setDiscountType('amount');
      setDiscountReason("");
    }
    
    setSelectedItems(sourceFee.items ? sourceFee.items.map((it: any) => ({
      id: Date.now() + Math.random().toString(),
      type: it.type,
      label: it.label,
      itemName: it.itemName,
      baseAmount: it.amount,
      amount: it.amount,
      category: it.category
    })) : [{
      id: sourceFee.id,
      type: sourceFee.type || 'Monthly Tuition',
      label: sourceFee.type === 'Subject Fee' ? sourceFee.itemName : sourceFee.type,
      itemName: sourceFee.itemName,
      baseAmount: parseInt(sourceFee.fullFee || sourceFee.amount) || 0,
      amount: parseInt(sourceFee.fullFee || sourceFee.amount) || 0
    }]);
  };

  const handleLoadReceipt = (fee: any) => {
    setIsUnpaidReceipt(false);
    const subTotal = Number(fee.batchSubTotal || fee.batchFullFee || fee.totalAmount || fee.fullFee || fee.amount) || 0;
    const discount = Number(fee.batchDiscount ?? fee.discount) || 0;
    const netPayable = Number(fee.batchNetPayable) || Math.max(0, subTotal - discount);
    const amountPaid = Number(fee.batchAmountPaid ?? fee.amountPaid ?? fee.amount) || 0;
    const remainingAmount = Number(fee.batchRemaining ?? fee.remainingAmount ?? (netPayable - amountPaid)) || 0;
    const displayMonths = fee.batchMonthsFormatted || (fee.batchMonths ? formatMonthsList(fee.batchMonths) : (fee.month ? formatMonthKey(fee.month) : ""));

    if (fee.items) {
      setReceiptData({
        ...fee,
        month: displayMonths || fee.displayMonth || fee.month,
        subTotal: subTotal,
        totalAmount: subTotal,
        discount: discount,
        discountReason: fee.batchDiscountReason || fee.discountReason || "",
        netPayable: netPayable,
        amountPaid: amountPaid,
        remainingAmount: remainingAmount,
        transactionId: fee.transactionId?.split('-')[0] + '-' + fee.transactionId?.split('-')[1] || fee.transactionId
      });
    } else {
      setReceiptData({
        ...fee,
        month: displayMonths || fee.month,
        items: [{ 
          label: fee.itemName || fee.type, 
          amount: parseInt(fee.fullFee || fee.amount) || 0, 
          paidAmount: parseInt(fee.amount) || 0, 
          remainingAmount: parseInt(fee.remainingAmount || "0") || 0,
          type: fee.type, 
          itemName: fee.itemName 
        }],
        subTotal: subTotal,
        totalAmount: subTotal,
        discount: discount,
        discountReason: fee.batchDiscountReason || fee.discountReason || "",
        netPayable: netPayable,
        amountPaid: amountPaid,
        remainingAmount: remainingAmount
      });
    }
    setShowReceipt(true);
  };

  const handlePreviewUnpaid = () => {
    if (!selectedStudent || selectedItems.length === 0) {
      alert("Please select a student and at least one item to preview the invoice.");
      return;
    }
    
    const numMonths = selectedMonths.length || 1;
    const formattedMonths = formatMonthsList(selectedMonths);

    setIsUnpaidReceipt(true);
    setReceiptData({
      studentId: selectedStudent.student_id || selectedStudent.id,
      studentName: selectedStudent.name,
      grade: selectedStudent.grade,
      rollNo: selectedStudent.rollNo || "",
      month: formattedMonths,
      batchMonths: selectedMonths,
      batchMonthsFormatted: formattedMonths,
      date: paymentData.date,
      items: selectedItems.map(item => ({
        ...item,
        label: numMonths > 1 ? `${item.itemName || item.label} (${numMonths} Months)` : (item.itemName || item.label),
        subLabel: numMonths > 1 ? `${formattedMonths} (${numMonths} × LKR ${item.baseAmount || Math.round(item.amount / numMonths)})` : formattedMonths,
        paidAmount: 0,
        remainingAmount: parseInt(item.amount) || 0
      })),
      subTotal: totalAmount,
      totalAmount: totalAmount,
      discount: discountAmount,
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      netPayable: netPayable,
      amountPaid: 0,
      remainingAmount: netPayable,
      transactionId: "PREVIEW-INVOICE",
      batchFullFee: totalAmount.toString(),
      batchSubTotal: totalAmount.toString(),
      batchDiscount: discountAmount.toString(),
      batchDiscountReason: discountReason,
      batchNetPayable: netPayable.toString(),
      batchAmountPaid: "0",
      batchRemaining: netPayable.toString()
    });
    setShowReceipt(true);
  };

  const downloadAsImage = async () => {
    const node = document.getElementById('receipt-download-version');
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Receipt-${receiptData.studentName}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  const copyAsImage = async () => {
    const node = document.getElementById('receipt-download-version');
    if (!node) return;
    try {
      const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      if (!blob) throw new Error("Could not generate image blob");

      let copied = false;
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type || 'image/png']: blob })
          ]);
          copied = true;
          alert("Receipt image copied to clipboard successfully!");
          return;
        } catch (clipErr) {
          console.warn('Clipboard write restricted:', clipErr);
        }
      }

      // If browser security restricted direct clipboard copy, download image automatically
      if (!copied) {
        const link = document.createElement('a');
        link.download = `Receipt-${receiptData?.studentName || 'Student'}-${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        alert("Direct clipboard copy was restricted by your browser. The receipt image has been downloaded to your device instead!");
      }
    } catch (err) {
      console.error('Copy failed', err);
      downloadAsImage();
    }
  };

  const downloadAsPDF = async () => {
    const node = document.getElementById('receipt-download-version');
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${receiptData.studentName}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF creation failed', err);
    }
  };

  const groupedHistory = useMemo(() => groupFeesByBatch(studentFeeHistory), [studentFeeHistory]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Collect Fee / கட்டணம் வசூலித்தல்
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                மாணவர் கட்டணங்கள், பல மாத கட்டணத் தேர்வு, கழிவு மற்றும் ரசீது மேலாண்மை
              </p>
            </div>
          </div>
        </div>

        {selectedStudent && (
          <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200/80 px-4 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {selectedStudent.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 leading-tight">{selectedStudent.name}</p>
              <p className="text-[11px] text-blue-600 font-bold">
                Roll: {selectedStudent.rollNo || "N/A"} • Class: {selectedStudent.grade}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="ml-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              மாற்று (Change)
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout: Landscape 3-Column Grid on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Student Selection & Quick Profile (3 cols on desktop) */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                <h2 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                  1. மாணவர் தேர்வு (Select Student)
                </h2>
              </div>
            </div>

            {/* Filter by Grade */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-600 mb-1">வகுப்பு (Grade Filter)</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-bold text-slate-800"
              >
                <option value="">அனைத்து வகுப்புகளும் (All Grades)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={15} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="பெயர் அல்லது Roll No தேடுக..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-semibold"
              />
            </div>

            {/* Search Results List */}
            {(searchQuery || selectedGrade) && (
              <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto bg-white shadow-inner mb-4 divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <div 
                      key={student.id} 
                      onClick={() => handleSelectStudent(student)}
                      className={`p-2.5 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col ${selectedStudent?.id === student.id ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''}`}
                    >
                      <span className="font-bold text-xs text-slate-800">{student.name}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Roll: {student.rollNo || "N/A"} • Class: {student.grade}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">மாணவர்கள் எவரும் கிடைக்கவில்லை</div>
                )}
              </div>
            )}

            {/* Currently Selected Student Card */}
            {selectedStudent ? (
              <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-xl p-4 relative space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-lg shadow-sm">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 text-sm truncate">{selectedStudent.name}</h3>
                    <p className="text-xs text-blue-700 font-bold">Class: {selectedStudent.grade}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Roll No: {selectedStudent.rollNo || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-[11px]">
                  <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block">கடைசி கட்டணம்:</span>
                    <span className="font-black text-emerald-600">
                      {studentFeeHistory.length > 0 ? (studentFeeHistory[0].displayMonth || studentFeeHistory[0].month) : "இல்லை"}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block">ரசீதுகள்:</span>
                    <span className="font-black text-blue-700">{studentFeeHistory.length} பதிவுகள்</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                <User size={30} className="mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-bold text-slate-600">மாணவரைத் தேர்வு செய்க</p>
                <p className="text-[11px] text-slate-400 mt-0.5">மேலே உள்ள பட்டியலில் இருந்து மாணவரைத் தேர்ந்தெடுக்கவும்</p>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Fee Items & Multi-Month Selector (5 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {!selectedStudent ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center min-h-[360px] text-slate-400">
              <CreditCard size={44} className="mb-3 opacity-30 text-blue-500" />
              <p className="text-base font-black text-slate-700">மாணவர் தேர்ந்தெடுக்கப்படவில்லை</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                இடதுபுற பலகத்தில் இருந்து ஒரு மாணவரைத் தேர்ந்தெடுத்த பின் கட்டண விபரங்கள் மற்றும் பாடங்கள் இங்கு தோன்றும்.
              </p>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-5">
              
              {/* Multi-Month Selection Panel */}
              <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-xl border border-blue-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <Calendar size={17} className="text-blue-600" />
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        கட்டண மாதங்கள் ({selectedMonths.length} Selected)
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">ஒரே நேரத்தில் பல மாதங்களைத் தேர்வு செய்யலாம்</p>
                    </div>
                  </div>

                  {/* Year Selector and Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center bg-white rounded-lg border border-blue-200 shadow-2xs px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="text-xs font-black text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded cursor-pointer"
                      >
                        ◀
                      </button>
                      <span className="text-xs font-black text-slate-800 px-1.5">{selectedYear}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="text-xs font-black text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={selectCurrentMonth}
                      className="px-2 py-0.5 text-xs font-bold rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      1 M
                    </button>
                    <button
                      type="button"
                      onClick={selectTwoMonths}
                      className="px-2 py-0.5 text-xs font-bold rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      2 M
                    </button>
                    <button
                      type="button"
                      onClick={selectThreeMonths}
                      className="px-2 py-0.5 text-xs font-bold rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      3 M
                    </button>
                  </div>
                </div>

                {/* Months Grid (6 columns) */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                  {MONTH_LIST.map((m) => {
                    const mKey = `${selectedYear}-${m.index}`;
                    const isSelected = selectedMonths.includes(mKey);
                    return (
                      <button
                        key={m.index}
                        type="button"
                        onClick={() => toggleMonth(mKey)}
                        className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span className="text-[11px] font-black tracking-tight">{m.en}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {m.ta}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-300 rounded-full"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Summary Bar */}
                <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap text-slate-700 font-medium">
                    <span className="font-bold text-blue-900 text-[11px]">தேர்வு:</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                      {formatMonthsList(selectedMonths) || "மாதம் தேர்ந்தெடுக்கவும்"}
                    </span>
                  </div>
                  
                  {/* Custom Month Picker */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Other:</span>
                    <input
                      type="month"
                      value={customMonthInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomMonthInput(val);
                        if (val && !selectedMonths.includes(val)) {
                          setSelectedMonths(prev => [...prev, val].sort());
                        }
                      }}
                      className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Main Subjects & Tuition */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-blue-600 uppercase tracking-wider border-l-3 border-blue-600 pl-2">
                    Main Subjects & Tuition / முக்கிய பாடங்கள்
                  </label>
                  {monthCount > 1 && (
                    <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                      {monthCount} Months
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Monthly Tuition Checkbox */}
                  {(() => {
                    const classData = classes.find(c => c.name === selectedStudent?.grade);
                    const baseTuition = classData ? parseInt(classData.monthlyTuitionFees.toString().replace(/\D/g, '')) : 1500;
                    const calculatedTuition = baseTuition * monthCount;
                    const isSelected = !!selectedItems.find(i => i.type === 'Monthly Tuition');
                    return (
                      <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50/90 border-blue-400 shadow-xs ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem('Monthly Tuition', '', baseTuition, false)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">Monthly Tuition</p>
                          <p className="text-[10px] text-slate-500">
                            {monthCount > 1 ? `${monthCount}M × LKR ${baseTuition}` : `LKR ${baseTuition} / month`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-xs text-blue-600">LKR {calculatedTuition}</p>
                        </div>
                      </label>
                    );
                  })()}

                  {/* Main Subjects Checkboxes */}
                  {subjects.filter(s => s.category === "Main").map((sub) => {
                    const baseFee = parseInt(sub.fee) || 0;
                    const calculatedFee = baseFee * monthCount;
                    const isSelected = !!selectedItems.find(i => i.itemName === sub.name && i.type === 'Subject Fee');
                    return (
                      <label key={sub.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50/90 border-blue-400 shadow-xs ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem('Subject Fee', sub.name, baseFee, true, 'Main')}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{sub.name}</p>
                          <p className="text-[10px] text-blue-600 font-medium">
                            {monthCount > 1 ? `${monthCount}M × LKR ${baseFee}` : `Main (LKR ${baseFee})`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-xs text-blue-600">LKR {calculatedFee}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sub Subjects / Extra Classes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-pink-600 uppercase tracking-wider border-l-3 border-pink-600 pl-2">
                    Sub Subjects (Extra Classes) / கூடுதல் வகுப்புகள்
                  </label>
                  {monthCount > 1 && (
                    <span className="text-[11px] font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded-full">
                      {monthCount} Months
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {subjects.filter(s => s.category === "Sub").map((sub) => {
                    const baseFee = parseInt(sub.fee) || 0;
                    const calculatedFee = baseFee * monthCount;
                    const isSelected = !!selectedItems.find(i => i.itemName === sub.name && i.type === 'Subject Fee');
                    return (
                      <label key={sub.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-pink-50/90 border-pink-400 shadow-xs ring-1 ring-pink-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem('Subject Fee', sub.name, baseFee, true, 'Sub')}
                          className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{sub.name}</p>
                          <p className="text-[10px] text-pink-600 font-medium">
                            {monthCount > 1 ? `${monthCount}M × LKR ${baseFee}` : `Sub (LKR ${baseFee})`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-xs text-pink-600">LKR {calculatedFee}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Column: Billing, Discount & Checkout Panel (4 cols on desktop, sticky) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 lg:sticky lg:top-4 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-600" />
                <h2 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                  3. கட்டண கணக்கீடு & செலுத்துகை
                </h2>
              </div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {selectedItems.length} Items
              </span>
            </div>

            {!selectedStudent ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                மாணவரைத் தேர்வுசெய்த பின் கட்டண கணக்கீடு இங்கு தோன்றும்.
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                
                {/* Live Selected Items Chips */}
                {selectedItems.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 max-h-36 overflow-y-auto">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      தேர்ந்தெடுக்கப்பட்ட கட்டணங்கள்:
                    </span>
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="truncate max-w-[200px]">{item.itemName || item.label}</span>
                        <span className="font-bold text-blue-700 ml-2">LKR {item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full Fee / Sub Total */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Full Fee / Sub Total (முழு கட்டணம்)
                  </label>
                  <div className="flex rounded-xl shadow-2xs overflow-hidden border border-slate-200">
                    <span className="inline-flex items-center px-3 bg-slate-100 text-slate-500 font-black text-xs uppercase select-none">
                      LKR
                    </span>
                    <input 
                      type="number" 
                      value={totalAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTotalAmount(val);
                        setIsManualAmount(true);
                      }}
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-50 font-black text-slate-800 text-base focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Discount / Concession Section */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <label className="text-xs font-bold text-emerald-950">
                        Discount / Concession (கட்டணக் கழிவு)
                      </label>
                    </div>
                    
                    {/* Toggle LKR vs % */}
                    <div className="flex bg-white rounded-lg border border-emerald-300 p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDiscountType('amount')}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${discountType === 'amount' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                      >
                        LKR
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${discountType === 'percent' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex rounded-lg overflow-hidden border border-emerald-300 bg-white">
                      <span className="inline-flex items-center px-2 bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        {discountType === 'amount' ? 'LKR' : '%'}
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        max={discountType === 'percent' ? 100 : totalAmount}
                        placeholder="0"
                        value={discountValue || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setDiscountValue(val);
                        }}
                        className="flex-1 min-w-0 px-2 py-1.5 font-bold text-emerald-900 text-sm outline-none"
                      />
                    </div>

                    <input 
                      type="text" 
                      placeholder="காரணம் (Reason)..."
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-emerald-300 bg-white rounded-lg text-xs font-medium text-emerald-900 placeholder:text-emerald-400 outline-none"
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {[
                      { label: '0%', val: 0, type: 'percent', reason: '' },
                      { label: '10%', val: 10, type: 'percent', reason: '10% Discount' },
                      { label: '20%', val: 20, type: 'percent', reason: '20% Discount' },
                      { label: '50%', val: 50, type: 'percent', reason: '50% Concession' },
                      { label: '100%', val: 100, type: 'percent', reason: 'Full Scholarship' },
                      { label: 'LKR 500', val: 500, type: 'amount', reason: 'Special Discount' },
                      { label: 'LKR 1000', val: 1000, type: 'amount', reason: 'Sibling Concession' },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDiscountType(preset.type as 'amount' | 'percent');
                          setDiscountValue(preset.val);
                          if (preset.reason) setDiscountReason(preset.reason);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                          discountValue === preset.val && discountType === preset.type
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-[11px] bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg text-emerald-900 font-bold">
                      <span>கழிவு: - LKR {discountAmount}</span>
                      <span>Net: LKR {netPayable}</span>
                    </div>
                  )}
                </div>

                {/* Net Payable Fee */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Net Payable (கழிவு போக செலுத்த வேண்டியது)
                    </p>
                    <p className="text-lg font-black text-emerald-400">LKR {netPayable}.00</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {monthCount} Month(s)
                    </span>
                  </div>
                </div>

                {/* Amount Paid Now */}
                <div>
                  <label className="block text-xs font-bold text-blue-800 mb-1">
                    Amount Paid Now (செலுத்திய தொகை) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-xl shadow-2xs overflow-hidden border border-blue-400">
                    <span className="inline-flex items-center px-3 bg-blue-100 text-blue-700 font-black text-xs uppercase select-none">
                      LKR
                    </span>
                    <input 
                      type="number" 
                      required
                      value={amountPaid}
                      onChange={(e) => {
                        setAmountPaid(parseInt(e.target.value) || 0);
                        setIsManualAmount(true);
                      }}
                      className="flex-1 min-w-0 px-3 py-2 bg-white font-black text-blue-700 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Remaining Balance Indicator */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold bg-slate-50 border-slate-200">
                  <span className="text-slate-600">Remaining Balance (மீதி):</span>
                  <span className={`font-black px-2 py-0.5 rounded text-xs ${
                    netPayable - amountPaid > 0 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    LKR {Math.max(0, netPayable - amountPaid)}.00
                  </span>
                </div>

                {/* Payment Method & Date in 2 columns */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method *</label>
                    <select 
                      value={paymentData.method}
                      onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online">Online (Card/UPI)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Date *</label>
                    <input 
                      type="date" 
                      required
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button 
                    type="button"
                    onClick={handlePreviewUnpaid}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                  >
                    <Share2 size={15} />
                    Unpaid Preview
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <CreditCard size={15} />
                    {paymentData.method === "Online" && !editingFeeId ? "Pay Online" : editingFeeId ? "Update Payment" : "Submit Payment"}
                  </button>
                </div>

                {editingFeeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFeeId(null);
                      setPaymentData({
                        amount: "",
                        method: "Bank Transfer",
                        date: new Date().toISOString().split('T')[0],
                        month: new Date().toISOString().slice(0, 7)
                      });
                    }}
                    className="w-full bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}

              </form>
            )}

          </div>
        </div>

      </div>

      {/* Bottom Full-Width Landscape Section: Payment History */}
      {selectedStudent && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-base">
                கட்டண வரலாறு (Payment History & Receipts) - {selectedStudent.name}
              </h3>
              <p className="text-xs text-slate-500">
                இம்மாணவரின் கடந்தகால கட்டணப் பதிவுகள் மற்றும் ரசீதுகள்
              </p>
            </div>
            <span className="text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
              மொத்தம்: {groupedHistory.length} பதிவுகள்
            </span>
          </div>

          {studentFeeHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">மாதம் (Month)</th>
                    <th className="px-4 py-3">தேதி (Date)</th>
                    <th className="px-4 py-3">பாடங்கள் & விபரங்கள் (Items)</th>
                    <th className="px-4 py-3">செலுத்திய தொகை (Paid)</th>
                    <th className="px-4 py-3">முறை (Method)</th>
                    <th className="px-4 py-3 text-right">செயல்கள் (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {groupedHistory.map((fee: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-black text-slate-900 whitespace-nowrap">
                        {fee.displayMonth || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {fee.date}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-700 font-semibold max-w-xs block truncate">
                          {fee.items.map((i: any) => i.label).join(", ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-emerald-600">
                            LKR {fee.amountPaid ?? fee.totalAmount}
                          </span>
                          {fee.batchDiscount && Number(fee.batchDiscount) > 0 ? (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              -LKR {fee.batchDiscount} {fee.batchDiscountReason ? `(${fee.batchDiscountReason})` : ''}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-tight">
                          {fee.method}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => handleEditFee(fee)} 
                          className="text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-wider px-2 py-1 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleLoadReceipt(fee)} 
                          className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100 font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
                        >
                          Receipt
                        </button>
                        <button 
                          onClick={() => handleDeleteFee(fee)} 
                          disabled={isDeleting === (fee.batchId || fee.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 inline-flex items-center cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              இம்மாணவருக்கு இதுவரை கட்டணப் பதிவுகள் எதுவும் இல்லை.
            </div>
          )}
        </div>
      )}

      {/* Mock Payment Gateway Modal */}
      {showPaymentGateway && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
              <h3 className="text-2xl font-bold mb-1">Secure Payment</h3>
              <p className="text-blue-100 opacity-90">Agaram Dhines Academy</p>
            </div>
            <div className="p-6">
              <div className="flex justify-between mb-6 pb-4 border-b border-gray-100">
                <span className="text-gray-600">Amount to Pay</span>
                <span className="text-2xl font-bold text-gray-800">LKR {totalAmount}</span>
              </div>
              
              {isProcessingPayment ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 font-medium">Processing Payment...</p>
                  <p className="text-sm text-gray-400 mt-2">Please do not close this window</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 border border-blue-500 bg-blue-50 rounded-lg flex items-center gap-3 cursor-pointer">
                      <CreditCard className="text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Credit / Debit Card</p>
                        <p className="text-xs text-blue-600">Pay securely with your card</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-4 border-blue-600 bg-white"></div>
                    </div>
                    <div className="p-4 border border-gray-200 hover:border-blue-300 rounded-lg flex items-center gap-3 cursor-pointer transition-colors">
                      <div className="w-6 h-6 bg-gray-200 rounded-sm flex items-center justify-center text-xs font-bold text-gray-500">UPI</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">UPI / QR</p>
                        <p className="text-xs text-gray-500">GPay, PhonePe, Paytm</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowPaymentGateway(false)}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleMockPayment}
                      className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      Pay LKR {totalAmount}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto relative">
            <button 
              onClick={() => setShowReceipt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <div className="bg-gray-100 p-1 rounded-full"><Plus className="rotate-45" size={20} /></div>
            </button>

            <div className="flex flex-col md:flex-row h-full">
              {/* Left Side: Preview */}
              <div className="flex-1 p-6 bg-gray-50 border-r border-gray-100 overflow-y-auto max-h-[80vh]">
                <div id="receipt-download-version" className="bg-white shadow-lg mx-auto p-8 rounded-sm relative overflow-hidden" style={{ width: '450px', minHeight: '600px' }}>
                  {/* Watermark/Banner */}
                  <div className={`absolute top-6 right-[-35px] rotate-45 text-white font-black text-[10px] uppercase tracking-widest px-10 py-1 shadow-md z-20 ${isUnpaidReceipt ? 'bg-red-600' : 'bg-green-600'}`}>
                    {isUnpaidReceipt ? 'UNPAID / INVOICE' : 'OFFICIAL RECEIPT'}
                  </div>

                  <div className="text-center mb-6 pt-4">
                    <img 
                      src={logoDataUrl || "/logo.png"} 
                      alt="Logo" 
                      className="w-16 h-16 mx-auto mb-2 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">AGARAM DHINES ONLINE ACADEMY</h2>
                    <p className="text-[9px] font-bold text-pink-600 uppercase tracking-[3px] mt-1 italic">excellence in digital learning</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 border-y border-gray-100 py-4">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Invoiced To:</p>
                      <p className="text-sm font-black text-gray-800">{receiptData.studentName}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Roll No: {receiptData.rollNo || "N/A"}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Class: {receiptData.grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Details:</p>
                      <p className="text-[10px] text-gray-800 font-bold uppercase">No: {receiptData.transactionId}</p>
                      <p className="text-[10px] text-gray-800 font-bold uppercase">Date: {receiptData.date}</p>
                      {!isUnpaidReceipt && <p className="text-[10px] text-gray-800 font-bold uppercase">Via: {receiptData.method}</p>}
                    </div>
                  </div>

                  <table className="w-full text-left mb-6">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {receiptData.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3">
                            <p className="text-xs font-black text-gray-800 uppercase">{item.label}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight italic">
                              {item.type === 'Monthly Tuition' ? receiptData.month : (item.category === 'Main' ? 'Main Subject Fee' : 'Sub Subject Special Fee')}
                            </p>
                          </td>
                          <td className="py-3 text-right text-xs font-black text-gray-800">LKR {item.amount}.00</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="space-y-2 border-t-2 border-gray-100 pt-4 mb-10">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Sub Total (முழு கட்டணம்)</span>
                      <span className="text-xs font-black text-gray-600">LKR {receiptData.subTotal || receiptData.totalAmount || receiptData.amount}.00</span>
                    </div>

                    {receiptData.discount && Number(receiptData.discount) > 0 ? (
                      <>
                        <div className="flex justify-between items-center px-2 text-emerald-700 font-bold">
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Discount (கட்டணக் கழிவு) {receiptData.discountReason ? `[${receiptData.discountReason}]` : ''}
                          </span>
                          <span className="text-xs font-black">- LKR {receiptData.discount}.00</span>
                        </div>
                        <div className="flex justify-between items-center px-2 text-slate-700 font-bold">
                          <span className="text-[10px] font-black uppercase tracking-widest">Net Payable (கழிவு போக மொத்தம்)</span>
                          <span className="text-xs font-black">LKR {receiptData.netPayable || (Number(receiptData.subTotal || receiptData.totalAmount || receiptData.amount) - Number(receiptData.discount))}.00</span>
                        </div>
                      </>
                    ) : null}

                    {!isUnpaidReceipt && receiptData.remainingAmount && parseInt(receiptData.remainingAmount) > 0 ? (
                      <>
                        <div className="flex justify-between items-center px-2 text-emerald-600">
                          <span className="text-[10px] font-black uppercase tracking-widest font-bold">Amount Paid (செலுத்தியது)</span>
                          <span className="text-xs font-black">LKR {receiptData.amountPaid || receiptData.amount}.00</span>
                        </div>
                        <div className="flex justify-between items-center px-2 text-red-500">
                          <span className="text-[10px] font-black uppercase tracking-widest font-bold">Remaining Balance (மீதி கட்டணம்)</span>
                          <span className="text-xs font-black">LKR {receiptData.remainingAmount}.00</span>
                        </div>
                      </>
                    ) : null}
                    <div className={`flex justify-between items-center p-3 rounded-xl shadow-lg border ${isUnpaidReceipt ? 'bg-red-600 border-red-500 shadow-red-100' : 'bg-green-600 border-green-500 shadow-green-100'}`}>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest font-bold">{isUnpaidReceipt ? 'Amount Due' : 'Paid Today'}</span>
                      <span className="text-xl font-black text-white">LKR {isUnpaidReceipt ? (receiptData.netPayable || receiptData.totalAmount || receiptData.amount) : (receiptData.amountPaid || receiptData.netPayable || receiptData.amount)}</span>
                    </div>
                  </div>

                  <div className="text-center pt-6 border-t border-dashed border-gray-100">
                    <div className="mb-2">
                       <CheckCircle size={20} className={`mx-auto ${isUnpaidReceipt ? 'text-red-500' : 'text-green-500'}`} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{isUnpaidReceipt ? 'PLEASE PAY BEFORE DUEDATE' : 'THANK YOU FOR YOUR PAYMENT'}</p>
                    <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest mt-2 font-bold">www.agaramdhines.lk | excelence in digital learning</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="w-full md:w-64 p-6 bg-white flex flex-col gap-3 justify-center">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-2">Receipt Actions</h3>
                
                <button 
                  onClick={copyAsImage}
                  className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Copy size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight">Copy Image</p>
                    <p className="text-[9px] font-bold text-blue-400">Copy to Clipboard</p>
                  </div>
                </button>

                <button 
                  onClick={downloadAsImage}
                  className="flex items-center gap-3 w-full p-3 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 transition-all group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <ImageIcon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight">Save Photo</p>
                    <p className="text-[9px] font-bold text-pink-400">Download as PNG</p>
                  </div>
                </button>

                <button 
                  onClick={downloadAsPDF}
                  className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight">PDF Document</p>
                    <p className="text-[9px] font-bold text-purple-400">Download as PDF</p>
                  </div>
                </button>

                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      const content = document.getElementById('receipt-download-version');
                      
                      let printIframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
                      if (!printIframe) {
                        printIframe = document.createElement('iframe');
                        printIframe.id = 'receipt-print-iframe';
                        printIframe.style.position = 'absolute';
                        printIframe.style.top = '-9999px';
                        printIframe.style.left = '-9999px';
                        document.body.appendChild(printIframe);
                      }
                      
                      const printDoc = printIframe.contentWindow?.document;
                      if (printDoc && content) {
                        printDoc.open();
                        printDoc.write(`
                          <html>
                            <head>
                              <title>Receipt - ${receiptData.studentName}</title>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 20px; }
                                .print-container { width: 100%; display: flex; justify-content: center; }
                                #print-node { width: 450px; border: 1px solid #eee; }
                              </style>
                            </head>
                            <body>
                              <div class="print-container">
                                <div id="print-node">${content.innerHTML}</div>
                              </div>
                            </body>
                          </html>
                        `);
                        printDoc.close();
                        setTimeout(() => {
                          printIframe.contentWindow?.focus();
                          printIframe.contentWindow?.print();
                        }, 500);
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg"
                  >
                    <Printer size={16} />
                    Traditional Print
                  </button>

                  {!isUnpaidReceipt && (
                    <p className="text-[10px] text-center text-gray-400 font-bold bg-gray-50 p-2 rounded-lg mt-2">
                      Official transaction record for student reference.
                    </p>
                  )}
                  {isUnpaidReceipt && (
                    <p className="text-[10px] text-center text-red-500 font-bold bg-red-50 p-2 rounded-lg mt-2 uppercase tracking-widest">
                      Payment Pending
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
