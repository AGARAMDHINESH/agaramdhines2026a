import React, { useState, useEffect } from "react";
import { getStudents, getFees, saveFees, saveStudents, getClasses, getAdminSettings } from "../../lib/db";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileText, X, CheckCircle, Download, Printer, Copy, Image as ImageIcon, Share2, Plus, Trash2 } from "lucide-react";
import { toPng, toBlob } from 'html-to-image';
import { useRef } from 'react';

export default function Fees() {
  const [view, setView] = useState<"menu" | "history" | "status" | "zoom_control">("menu");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [feesHistory, setFeesHistory] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statusMonth, setStatusMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [statusGrade, setStatusGrade] = useState<string>("All");
  const [zoomControlClass, setZoomControlClass] = useState<string>("");
  const [selectedUnpaidStudents, setSelectedUnpaidStudents] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Receipt Modal State for Unpaid Preview
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedStudentForReceipt, setSelectedStudentForReceipt] = useState<any>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);

  useEffect(() => {
    getAdminSettings().then(data => setAdminSettings(data));
  }, []);

  const handleDeleteFee = async (id: string) => {
    if (!window.confirm("இந்த கட்டண விபரத்தை நிச்சயமாக நீக்க வேண்டுமா?")) return;
    
    setIsDeleting(id);
    try {
      const updatedHistory = feesHistory.filter(f => f.id !== id);
      await saveFees(updatedHistory);
      setFeesHistory(updatedHistory);
      alert("கட்டண விபரம் நீக்கப்பட்டது.");
    } catch (error: any) {
      alert("பிழை: " + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePreviewUnpaid = (student: any) => {
    setSelectedStudentForReceipt(student);
    
    // Calculate what's unpaid
    const classObj = classes.find(c => c.name === student.grade);
    const amount = Number(classObj?.monthlyTuitionFees) || 1500;
    
    setReceiptItems([{
      type: 'monthly',
      label: 'Monthly Tuition Fee',
      subLabel: new Date(statusMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: amount,
      id: statusMonth
    }]);
    
    setShowReceiptModal(true);
  };

  const handleDownloadReceiptImage = async () => {
    if (receiptRef.current && selectedStudentForReceipt) {
      try {
        const url = await toPng(receiptRef.current, { pixelRatio: 3, backgroundColor: 'white' });
        const link = document.createElement("a");
        link.download = `Unpaid_Receipt_${selectedStudentForReceipt.name}.png`;
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating receipt image:", error);
      }
    }
  };

  const handleDownloadReceiptPDF = async () => {
    if (receiptRef.current && selectedStudentForReceipt) {
      try {
        const imgData = await toPng(receiptRef.current, { pixelRatio: 3, backgroundColor: 'white' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (imgProps.height * pdfW) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save(`Unpaid_Receipt_${selectedStudentForReceipt.name}.pdf`);
      } catch (error) {
        console.error("Error generating receipt PDF:", error);
      }
    }
  };

  const copyAsImage = async () => {
    if (receiptRef.current && selectedStudentForReceipt) {
      try {
        const blob = await toBlob(receiptRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert("Image copied to clipboard!");
        }
      } catch (err) {
        console.error('Copy failed', err);
        alert("Failed to copy image. Try downloading instead.");
      }
    }
  };

  const toggleReceiptItem = (itemId: string) => {
    setReceiptItems(prev => prev.filter(item => item.id !== itemId));
  };

  // டேட்டாபேஸில் இருந்து பழைய கட்டண விபரங்களை எடுக்க
  useEffect(() => {
    if (view === "history" || view === "status" || view === "zoom_control") {
      getFees().then((data) => {
        if (data) setFeesHistory(data);
      });
    }
    if (view === "status" || view === "zoom_control") {
      getStudents().then((data) => {
        if (data) setAllStudents(data);
      });
      getClasses().then((data) => {
        if (data) setClasses(data);
      });
    }
  }, [view]);

  if (view === "menu") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 flex flex-col space-y-4">
        <button
          onClick={() => setView("history")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Fee History
        </button>
        <button
          onClick={() => setView("status")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Student Fee Status
        </button>
        <button
          onClick={() => setView("zoom_control")}
          className="bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 transition-colors font-medium text-center"
        >
          Zoom Access Control
        </button>
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <button onClick={() => setView("menu")} className="mr-4 text-gray-600 hover:text-gray-900">
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">Fee History</h2>
        </div>
        <div className="space-y-4">
          {feesHistory.filter((f: any) => (Number(f.amount) || 0) > 0 || (Number(f.fullFee) || 0) > 0).length === 0 ? (
            <div className="text-center text-gray-500 py-8">வரலாறு எதுவும் இல்லை.</div>
          ) : (
            feesHistory.filter((f: any) => (Number(f.amount) || 0) > 0 || (Number(f.fullFee) || 0) > 0).map((fee: any) => (
              <div key={fee.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center group relative">
                <div>
                  <h3 className="font-bold text-[#1e3a8a]">{fee.studentName}{fee.rollNo ? ` (Roll: ${fee.rollNo})` : ''}</h3>
                  <p className="text-sm text-gray-500">Month: {fee.month} | Grade: {fee.grade}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded text-sm">Rs. {fee.amount}</span>
                    <p className="text-xs text-gray-400 mt-1">{new Date(fee.date).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFee(fee.id)}
                    disabled={isDeleting === fee.id}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete Record"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === "status") {
    // Grade matching logic
    const matchGrade = (studentGrade: string | undefined, selectedGrade: string) => {
      if (selectedGrade === "All") return true;
      if (!studentGrade) return false;

      const sNorm = studentGrade.toString().toLowerCase().trim();
      const selNorm = selectedGrade.toString().toLowerCase().trim();

      if (sNorm === selNorm) return true;

      // Extract numbers: e.g., "grade 06" -> 6, "06" -> 6, "தரம் 06" -> 6
      const sDigits = sNorm.match(/\d+/)?.[0];
      const selDigits = selNorm.match(/\d+/)?.[0];

      if (sDigits && selDigits && parseInt(sDigits, 10) === parseInt(selDigits, 10)) {
        return true;
      }

      return sNorm.includes(selNorm) || selNorm.includes(sNorm);
    };

    const filteredStudentsByGrade = allStudents.filter(s => matchGrade(s.grade, statusGrade));

    // Filter students who haven't paid for the selected month
    const paidStudentIds = feesHistory
      .filter(fee => {
        const isMatch = fee.month === statusMonth || (!fee.month && fee.date && fee.date.startsWith(statusMonth));
        return isMatch && (fee.type === "Monthly Tuition" || fee.type === "Subject Fee" || fee.category === "Main");
      })
      .map(fee => fee.studentId);
      
    const outstandingStudents = filteredStudentsByGrade.filter(
      student => !paidStudentIds.includes(student.student_id || student.id) && !paidStudentIds.includes(student.id)
    );
    
    const paidStudents = filteredStudentsByGrade.filter(
      student => paidStudentIds.includes(student.student_id || student.id) || paidStudentIds.includes(student.id)
    );

    // Dynamic list of grades for dropdown
    const gradeListOptions = [
      { value: "All", label: "All Grades (அனைத்து வகுப்புகளும்)" },
      ...Array.from({ length: 13 }, (_, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        return { value: `Grade ${num}`, label: `Grade ${num} (தரம் ${num})` };
      })
    ];

    const stdValues = new Set(gradeListOptions.map(g => g.value.toLowerCase()));
    const extraGradesFromDB = Array.from(new Set([
      ...classes.map(c => c.name).filter(Boolean),
      ...allStudents.map(s => s.grade).filter(Boolean)
    ])).filter(g => {
      const gNorm = g.toString().toLowerCase().trim();
      const num = gNorm.match(/\d+/)?.[0];
      if (num && parseInt(num, 10) >= 1 && parseInt(num, 10) <= 13) return false;
      return !stdValues.has(gNorm);
    });

    const exportToExcel = () => {
      const data = [
        ...paidStudents.map(s => ({
          "Student Name": s.name,
          "Roll Number": s.rollNo || "N/A",
          "Grade": s.grade,
          "Status": "Paid",
          "Month": statusMonth
        })),
        ...outstandingStudents.map(s => ({
          "Student Name": s.name,
          "Roll Number": s.rollNo || "N/A",
          "Grade": s.grade,
          "Status": "Unpaid",
          "Month": statusMonth
        }))
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fee Status");
      XLSX.writeFile(wb, `Fee_Status_${statusGrade}_${statusMonth}.xlsx`);
    };

    const exportToPDF = () => {
      const doc = new jsPDF();
      doc.text(`Student Fee Status (${statusGrade}) - ${statusMonth}`, 14, 15);
      
      const tableData = [
        ...paidStudents.map(s => [s.name, s.rollNo || "N/A", s.grade, "Paid"]),
        ...outstandingStudents.map(s => [s.name, s.rollNo || "N/A", s.grade, "Unpaid"])
      ];
      
      autoTable(doc, {
        startY: 20,
        head: [['Student Name', 'Roll No', 'Grade', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 58, 138] },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Paid') {
              data.cell.styles.textColor = [21, 128, 61];
            } else {
              data.cell.styles.textColor = [185, 28, 28];
            }
          }
        }
      });
      
      doc.save(`Fee_Status_${statusGrade}_${statusMonth}.pdf`);
    };

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              Student Fee Status
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusGrade}
              onChange={(e) => setStatusGrade(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {gradeListOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              {extraGradesFromDB.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input 
              type="month" 
              value={statusMonth}
              onChange={(e) => setStatusMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm font-medium shadow-sm" 
            />
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm font-medium transition-colors shadow-sm"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outstanding Fees */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 p-3 border-b border-red-200 flex justify-between items-center">
              <h3 className="font-bold text-red-800">Outstanding Fees</h3>
              <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{outstandingStudents.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {outstandingStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">All students have paid!</p>
              ) : (
                outstandingStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Unpaid</span>
                      <button 
                        onClick={() => handlePreviewUnpaid(student)}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Preview Invoice
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Paid Fees */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 p-3 border-b border-green-200 flex justify-between items-center">
              <h3 className="font-bold text-green-800">Paid Fees</h3>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">{paidStudents.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {paidStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments yet.</p>
              ) : (
                paidStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Paid</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Unpaid Receipt Modal */}
        {showReceiptModal && selectedStudentForReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto relative">
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <div className="bg-gray-100 p-1 rounded-full"><Plus className="rotate-45" size={20} /></div>
              </button>
              
              <div className="flex flex-col md:flex-row h-full">
                {/* Left Side: Preview */}
                <div className="flex-1 p-6 bg-slate-100 border-r border-gray-100 overflow-y-auto max-h-[80vh] flex justify-center">
                  <div 
                    ref={receiptRef}
                    id="receipt-download-version"
                    className="bg-white shadow-2xl relative p-8 font-sans border-t-[6px] border-pink-500 rounded-b-xl"
                    style={{ width: '450px', minHeight: '600px' }}
                  >
                    {/* UNPAID Corner Ribbon */}
                    <div className="absolute top-6 right-[-35px] rotate-45 text-white font-black text-[10px] uppercase tracking-widest px-10 py-1 shadow-md z-20 bg-red-600 border-2 border-white">
                      UNPAID / INVOICE
                    </div>

                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-6 pt-4">
                      <img 
                        src="/logo.png" 
                        alt="Academy Logo" 
                        className="w-16 h-16 object-contain mb-3" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
                      />
                      <h1 className="text-sm font-black text-gray-800 tracking-tight leading-none uppercase">
                        {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                      </h1>
                      <p className="text-[9px] text-pink-600 font-black tracking-[3px] uppercase mt-1 italic">Excellence in Digital Learning</p>
                    </div>

                    <div className="h-px bg-gray-100 mb-6" />

                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6 border-y border-gray-50 py-4 text-[11px]">
                      <div className="space-y-1">
                        <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Invoiced To</h2>
                        <p className="text-sm font-black text-gray-900">{selectedStudentForReceipt.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Roll No: {selectedStudentForReceipt.rollNo || "N/A"}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Class: {selectedStudentForReceipt.grade}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Details</h2>
                        <p className="text-[10px] text-gray-800 font-bold uppercase">Date: {new Date().toLocaleDateString()}</p>
                        <p className="text-red-600 font-black uppercase text-[10px]">Status: Overdue</p>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="mb-6">
                      <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <span>Description</span>
                        <span>Amount</span>
                      </div>
                      <div className="divide-y divide-gray-50 text-[11px]">
                        {receiptItems.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="py-3 flex justify-between items-center group relative">
                            <div>
                              <p className="text-xs font-black text-gray-800 uppercase tracking-tighter">{item.label}</p>
                              <p className="text-[9px] text-gray-400 font-bold italic tracking-wider">
                                {item.subLabel}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-xs font-black text-gray-900">LKR {item.amount}.00</p>
                              <button 
                                onClick={() => toggleReceiptItem(item.id)}
                                className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 border-t-2 border-gray-100 pt-4 mb-10 text-right flex flex-col items-end">
                      <div className="w-52 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Sub Total</span>
                          <span className="text-xs font-black text-gray-600">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}.00</span>
                        </div>
                        <div className="bg-red-600 text-white p-3 rounded-xl shadow-lg flex justify-between items-center border border-red-500 shadow-red-100">
                          <span className="text-[9px] font-black uppercase tracking-widest italic">Amount Due</span>
                          <span className="text-lg font-black tracking-tighter">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Aesthetic Footer */}
                    <div className="text-center pt-6 border-t border-dashed border-gray-100">
                      <div className="mb-2">
                         <CheckCircle size={20} className="mx-auto text-red-500" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">PLEASE PAY BEFORE DUEDATE</p>
                      <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest mt-2 font-bold italic">Generated via Agaram Academy Portal</p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="w-full md:w-64 p-6 bg-white flex flex-col gap-3 justify-center shadow-inner">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-2 italic">Invoice Actions</h3>
                  
                  <button 
                    onClick={copyAsImage}
                    className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all group shadow-sm border border-blue-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <Copy size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Copy Image</p>
                      <p className="text-[9px] font-bold text-blue-400">Copy to Clipboard</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleDownloadReceiptImage}
                    className="flex items-center gap-3 w-full p-3 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 transition-all group shadow-sm border border-pink-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <ImageIcon size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Save Photo</p>
                      <p className="text-[9px] font-bold text-pink-400">Download as PNG</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleDownloadReceiptPDF}
                    className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all group shadow-sm border border-purple-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <FileText size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">PDF Document</p>
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
                                <title>Invoice - ${selectedStudentForReceipt.name}</title>
                                <style>
                                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                  body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 20px; }
                                  .print-container { width: 100%; display: flex; justify-content: center; }
                                  #print-node { width: 450px; border: 1px solid #eee; position: relative; }
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
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-all hover:bg-gray-50 active:scale-95"
                    >
                      <Printer size={16} />
                      Traditional Print
                    </button>

                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 mt-2">
                      <p className="text-[9px] text-center text-red-600 font-black uppercase tracking-[0.1em] leading-relaxed">
                        This is a payment reminder invoice. Please settle the dues at your earliest convenience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "zoom_control") {
    // Filter students who haven't paid for the selected month
    const paidStudentIds = feesHistory
      .filter(fee => {
        const isMatch = fee.month === statusMonth || (!fee.month && fee.date && fee.date.startsWith(statusMonth));
        return isMatch && (fee.type === "Monthly Tuition" || fee.type === "Subject Fee" || fee.category === "Main");
      })
      .map(fee => fee.studentId);
      
    const classFilteredStudents = zoomControlClass 
      ? allStudents.filter(s => s.grade === zoomControlClass)
      : allStudents;

    const outstandingStudents = classFilteredStudents.filter(
      student => !paidStudentIds.includes(student.student_id || student.id) && !paidStudentIds.includes(student.id)
    );
    
    const paidStudents = classFilteredStudents.filter(
      student => paidStudentIds.includes(student.student_id || student.id) || paidStudentIds.includes(student.id)
    );

    const handleSelectUnpaid = (studentId: string) => {
      setSelectedUnpaidStudents(prev => 
        prev.includes(studentId) 
          ? prev.filter(id => id !== studentId)
          : [...prev, studentId]
      );
    };

    const handleSelectAllUnpaid = () => {
      if (selectedUnpaidStudents.length === outstandingStudents.length) {
        setSelectedUnpaidStudents([]);
      } else {
        setSelectedUnpaidStudents(outstandingStudents.map(s => s.id));
      }
    };

    const handleBlockZoom = async () => {
      if (selectedUnpaidStudents.length === 0) {
        alert("Please select at least one student.");
        return;
      }
      try {
        const updatedStudents = allStudents.map(s => 
          selectedUnpaidStudents.includes(s.id) ? { ...s, zoomBlocked: true } : s
        );
        setAllStudents(updatedStudents);
        await saveStudents(updatedStudents);
        alert("Zoom access blocked for selected students.");
        setSelectedUnpaidStudents([]);
      } catch (error: any) {
        alert("Error blocking zoom: " + error.message);
      }
    };

    const handleUnblockZoom = async (studentId: string) => {
      try {
        const updatedStudents = allStudents.map(s => 
          s.id === studentId ? { ...s, zoomBlocked: false } : s
        );
        setAllStudents(updatedStudents);
        await saveStudents(updatedStudents);
        alert("Zoom access allowed for this student.");
      } catch (error: any) {
        alert("Error unblocking zoom: " + error.message);
      }
    };

    return (
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              Zoom Access Control
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={zoomControlClass}
              onChange={(e) => setZoomControlClass(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
            <input 
              type="month" 
              value={statusMonth}
              onChange={(e) => setStatusMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Unpaid Students (Block Zoom) */}
          <div className="border border-red-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="bg-red-50 p-3 border-b border-red-200 flex justify-between items-center">
              <h3 className="font-bold text-red-800">Unpaid Students (கட்டணம் செலுத்தாதவர்கள்)</h3>
              <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{outstandingStudents.length}</span>
            </div>
            
            <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={outstandingStudents.length > 0 && selectedUnpaidStudents.length === outstandingStudents.length}
                  onChange={handleSelectAllUnpaid}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium">Select All</span>
              </label>
              <button 
                onClick={handleBlockZoom}
                disabled={selectedUnpaidStudents.length === 0}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Block Zoom for Selected
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {outstandingStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No unpaid students found.</p>
              ) : (
                outstandingStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        checked={selectedUnpaidStudents.includes(student.id)}
                        onChange={() => handleSelectUnpaid(student.id)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {student.zoomBlocked ? (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">Blocked</span>
                      ) : (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Active</span>
                      )}
                      <button 
                        onClick={() => handlePreviewUnpaid(student)}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Preview Invoice
                      </button>
                      {student.zoomBlocked && (
                        <button 
                          onClick={() => handleUnblockZoom(student.id)}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Allow Access
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Paid Students (Zoom Allowed) */}
          <div className="border border-green-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="bg-green-50 p-3 border-b border-green-200 flex justify-between items-center">
              <h3 className="font-bold text-green-800">Paid Students (கட்டணம் செலுத்தியவர்கள்)</h3>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">{paidStudents.length}</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {paidStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments found for this month.</p>
              ) : (
                paidStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Paid</span>
                      {student.zoomBlocked && (
                        <button 
                          onClick={() => handleUnblockZoom(student.id)}
                          className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                        >
                          Unblock Zoom
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Unpaid Receipt Modal */}
        {showReceiptModal && selectedStudentForReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto relative">
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <div className="bg-gray-100 p-1 rounded-full"><Plus className="rotate-45" size={20} /></div>
              </button>
              
              <div className="flex flex-col md:flex-row h-full">
                {/* Left Side: Preview */}
                <div className="flex-1 p-6 bg-slate-100 border-r border-gray-100 overflow-y-auto max-h-[80vh] flex justify-center">
                  <div 
                    ref={receiptRef}
                    id="receipt-download-version"
                    className="bg-white shadow-2xl relative p-8 font-sans border-t-[6px] border-pink-500 rounded-b-xl"
                    style={{ width: '450px', minHeight: '600px' }}
                  >
                    {/* UNPAID Corner Ribbon */}
                    <div className="absolute top-6 right-[-35px] rotate-45 text-white font-black text-[10px] uppercase tracking-widest px-10 py-1 shadow-md z-20 bg-red-600 border-2 border-white">
                      UNPAID / INVOICE
                    </div>

                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-6 pt-4">
                      <img 
                        src="/logo.png" 
                        alt="Academy Logo" 
                        className="w-16 h-16 object-contain mb-3" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
                      />
                      <h1 className="text-sm font-black text-gray-800 tracking-tight leading-none uppercase">
                        {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                      </h1>
                      <p className="text-[9px] text-pink-600 font-black tracking-[3px] uppercase mt-1 italic">Excellence in Digital Learning</p>
                    </div>

                    <div className="h-px bg-gray-100 mb-6" />

                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6 border-y border-gray-50 py-4 text-[11px]">
                      <div className="space-y-1">
                        <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Invoiced To</h2>
                        <p className="text-sm font-black text-gray-900">{selectedStudentForReceipt.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Roll No: {selectedStudentForReceipt.rollNo || "N/A"}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Class: {selectedStudentForReceipt.grade}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Details</h2>
                        <p className="text-[10px] text-gray-800 font-bold uppercase">Date: {new Date().toLocaleDateString()}</p>
                        <p className="text-red-600 font-black uppercase text-[10px]">Status: Overdue</p>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="mb-6">
                      <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <span>Description</span>
                        <span>Amount</span>
                      </div>
                      <div className="divide-y divide-gray-50 text-[11px]">
                        {receiptItems.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="py-3 flex justify-between items-center group relative">
                            <div>
                              <p className="text-xs font-black text-gray-800 uppercase tracking-tighter">{item.label}</p>
                              <p className="text-[9px] text-gray-400 font-bold italic tracking-wider">
                                {item.subLabel}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-xs font-black text-gray-900">LKR {item.amount}.00</p>
                              <button 
                                onClick={() => toggleReceiptItem(item.id)}
                                className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 border-t-2 border-gray-100 pt-4 mb-10 text-right flex flex-col items-end">
                      <div className="w-52 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Sub Total</span>
                          <span className="text-xs font-black text-gray-600">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}.00</span>
                        </div>
                        <div className="bg-red-600 text-white p-3 rounded-xl shadow-lg flex justify-between items-center border border-red-500 shadow-red-100">
                          <span className="text-[9px] font-black uppercase tracking-widest italic">Amount Due</span>
                          <span className="text-lg font-black tracking-tighter">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Aesthetic Footer */}
                    <div className="text-center pt-6 border-t border-dashed border-gray-100">
                      <div className="mb-2">
                         <CheckCircle size={20} className="mx-auto text-red-500" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">PLEASE PAY BEFORE DUEDATE</p>
                      <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest mt-2 font-bold italic">Generated via Agaram Academy Portal</p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="w-full md:w-64 p-6 bg-white flex flex-col gap-3 justify-center shadow-inner">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-2 italic">Invoice Actions</h3>
                  
                  <button 
                    onClick={copyAsImage}
                    className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all group shadow-sm border border-blue-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <Copy size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Copy Image</p>
                      <p className="text-[9px] font-bold text-blue-400">Copy to Clipboard</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleDownloadReceiptImage}
                    className="flex items-center gap-3 w-full p-3 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 transition-all group shadow-sm border border-pink-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <ImageIcon size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Save Photo</p>
                      <p className="text-[9px] font-bold text-pink-400">Download as PNG</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleDownloadReceiptPDF}
                    className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all group shadow-sm border border-purple-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <FileText size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">PDF Document</p>
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
                                <title>Invoice - ${selectedStudentForReceipt.name}</title>
                                <style>
                                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                  body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 20px; }
                                  .print-container { width: 100%; display: flex; justify-content: center; }
                                  #print-node { width: 450px; border: 1px solid #eee; position: relative; }
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
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-all hover:bg-gray-50 active:scale-95"
                    >
                      <Printer size={16} />
                      Traditional Print
                    </button>

                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 mt-2">
                      <p className="text-[9px] text-center text-red-600 font-black uppercase tracking-[0.1em] leading-relaxed">
                        This is a payment reminder invoice. Please settle the dues at your earliest convenience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
