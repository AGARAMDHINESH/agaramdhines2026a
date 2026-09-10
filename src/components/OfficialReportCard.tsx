import React, { useRef } from 'react';
import { Download, Printer, Award, CheckCircle2, AlertCircle, Phone, Globe, Mail, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportSubjectItem {
  subject: string;
  obtained: number;
  total: number;
  percentage: number;
  gradeLetter: string;
  status: "Pass" | "Fail";
  remarks?: string;
}

export interface ReportCardData {
  studentId: string;
  studentName: string;
  rollNo: string;
  gradeLabel: string;
  gradeNumber: number;
  examName: string;
  termName?: string;
  date?: string;
  subjects: ReportSubjectItem[];
  totalObtained: number;
  totalPossible: number;
  overallPercentage: number;
  overallGrade: string;
  overallStatus: "Pass" | "Fail";
  rank?: number;
  classTeacherRemarks?: string;
  principalRemarks?: string;
}

interface OfficialReportCardProps {
  data: ReportCardData;
  showActions?: boolean;
  onClose?: () => void;
}

export const generateSingleStudentPdf = (data: ReportCardData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 27, 75); // Dark Indigo
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AGARAM DHINES ONLINE ACADEMY', pageWidth / 2, 13, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(253, 224, 71); // Amber
  doc.text('OFFICIAL STUDENT PERFORMANCE REPORT SHEET (2026)', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text('Tel: +94 77 805 4232 | Web: www.agaramdhines.lk | Email: agaramdhines@gmail.com', pageWidth / 2, 26, { align: 'center' });

  // Student Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', 18, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.studentName || 'N/A'), 48, 46);

  doc.setFont('helvetica', 'bold');
  doc.text('Roll / Student ID:', 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.rollNo || data.studentId || 'N/A'), 48, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Grade / Class:', 115, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.gradeLabel} (Grade ${data.gradeNumber})`, 145, 46);

  doc.setFont('helvetica', 'bold');
  doc.text('Exam / Term:', 115, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.examName || 'Assessment'), 145, 54);

  // Table of Subjects
  const tableRows = data.subjects.map((sub, idx) => [
    idx + 1,
    sub.subject,
    sub.obtained,
    sub.total,
    `${sub.percentage.toFixed(1)}%`,
    sub.gradeLetter,
    sub.status === 'Pass' ? 'PASS' : 'FAIL',
    sub.remarks || (sub.percentage >= 75 ? 'Distinction' : sub.percentage >= 50 ? 'Good' : 'Needs Practice')
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Subject', 'Obtained', 'Total', 'Percentage', 'Grade', 'Result', 'Remarks']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 18 },
      7: { cellWidth: 'auto' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Performance Summary Card
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  doc.text(`Total Marks: ${data.totalObtained} / ${data.totalPossible}`, 20, finalY + 9);
  doc.text(`Average: ${data.overallPercentage.toFixed(1)}%`, 80, finalY + 9);
  doc.text(`Overall Grade: ${data.overallGrade}`, 130, finalY + 9);

  doc.setTextColor(data.overallStatus === 'Pass' ? 22 : 220, data.overallStatus === 'Pass' ? 101 : 38, data.overallStatus === 'Pass' ? 52 : 38);
  doc.text(`Result: ${data.overallStatus === 'Pass' ? 'PASSED (தேர்ச்சி)' : 'NEEDS IMPROVEMENT'}`, 20, finalY + 17);

  // Signatures Section
  const sigY = finalY + 36;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);

  // Line for Class Teacher
  doc.line(25, sigY, 70, sigY);
  doc.text('Class Teacher Signature', 28, sigY + 5);

  // Official Seal
  doc.setDrawColor(99, 102, 241);
  doc.circle(105, sigY - 2, 10, 'S');
  doc.setFontSize(7);
  doc.text('OFFICIAL SEAL', 95, sigY - 1);
  doc.setFontSize(9);

  // Line for Principal / Director
  doc.line(140, sigY, 185, sigY);
  doc.text('Principal / Director Signature', 142, sigY + 5);

  // Footer Date
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const dateStr = data.date || new Date().toISOString().split('T')[0];
  doc.text(`Date of Issue: ${dateStr} | Agaram Dhines Online Academy Verification ID: AD-${data.studentId.slice(0, 6)}`, pageWidth / 2, 285, { align: 'center' });

  return doc;
};

export default function OfficialReportCard({ data, showActions = true, onClose }: OfficialReportCardProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    try {
      const doc = generateSingleStudentPdf(data);
      const safeName = (data.studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`${safeName}_Grade${data.gradeNumber}_ReportCard.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF உருவாக்குவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto my-4">
      {/* Top Action Controls (hidden on print) */}
      {showActions && (
        <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <span className="font-bold text-xs sm:text-sm">அகரம் தினைஸ் ஆன்லைன் அகாடமி • உத்தியோகபூர்வ அறிக்கை அட்டை</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Download size={14} />
              PDF பதிவிறக்கம்
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer size={14} />
              அச்சிடு (Print)
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                மூடு (Close)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Sheet Container */}
      <div ref={printRef} className="p-6 sm:p-10 text-slate-800 bg-white">
        
        {/* Academy Header Banner */}
        <div className="border-b-2 border-indigo-950 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.png" 
                alt="Agaram Dhines Academy Logo" 
                className="w-20 h-20 object-contain rounded-2xl border border-indigo-100 shadow-sm"
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                  அகரம் தினைஸ் ஆன்லைன் அகாடமி
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-indigo-600 tracking-wider uppercase">
                  Agaram Dhines Online Academy
                </h2>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  அனைத்துலக தமிழ் & பாடக் கல்வி மேம்பாட்டு மையம் • இலங்கை
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 sm:text-right space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center sm:justify-end gap-1.5 font-bold text-indigo-900">
                <Phone size={13} className="text-indigo-600" />
                <span>+94 77 805 4232</span>
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] text-slate-500">
                <Globe size={13} className="text-indigo-600" />
                <span>www.agaramdhines.lk</span>
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] text-slate-500">
                <Mail size={13} className="text-indigo-600" />
                <span>agaramdhines@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-indigo-950 text-white py-2 px-4 rounded-xl text-center">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
              மாணவர் அடைவு மட்ட உத்தியோகபூர்வ அறிக்கை அட்டை (Official Performance Report)
            </span>
          </div>
        </div>

        {/* Student Details Grid */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">மாணவர் பெயர் (Student Name):</span>
            <strong className="text-slate-900 text-sm font-black block mt-0.5">{data.studentName}</strong>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block">பதிவிலக்கம் (Roll / ID):</span>
            <strong className="text-slate-900 text-sm font-mono font-bold block mt-0.5">{data.rollNo || data.studentId}</strong>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block">வகுப்பு / தரம் (Grade):</span>
            <strong className="text-indigo-700 text-sm font-black block mt-0.5">{data.gradeLabel} (Grade {data.gradeNumber})</strong>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block">பரீட்சை (Exam / Term):</span>
            <strong className="text-slate-900 text-sm font-bold block mt-0.5">{data.examName}</strong>
          </div>
        </div>

        {/* Marks Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-950 text-white font-bold">
                <th className="py-3 px-3.5 text-center w-10">#</th>
                <th className="py-3 px-3.5">பாடம் (Subject)</th>
                <th className="py-3 px-3.5 text-center">பெற்ற புள்ளி</th>
                <th className="py-3 px-3.5 text-center">மொத்தம்</th>
                <th className="py-3 px-3.5 text-center">சதவீதம் (%)</th>
                <th className="py-3 px-3.5 text-center">அடைவுத் தரம்</th>
                <th className="py-3 px-3.5 text-center">முடிவு</th>
                <th className="py-3 px-3.5">ஆசிரியர் குறிப்பு</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {data.subjects.map((sub, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                  <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-900">{sub.subject}</td>
                  <td className="py-2.5 px-3.5 text-center font-bold text-indigo-700">{sub.obtained}</td>
                  <td className="py-2.5 px-3.5 text-center text-slate-500">{sub.total}</td>
                  <td className="py-2.5 px-3.5 text-center font-bold">{sub.percentage.toFixed(1)}%</td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span className={`inline-block w-6 h-6 rounded-md text-center leading-6 font-black text-xs ${
                      sub.gradeLetter === 'A' ? 'bg-emerald-100 text-emerald-800' :
                      sub.gradeLetter === 'B' ? 'bg-blue-100 text-blue-800' :
                      sub.gradeLetter === 'C' ? 'bg-amber-100 text-amber-800' :
                      sub.gradeLetter === 'S' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {sub.gradeLetter}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sub.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {sub.status === 'Pass' ? 'தேர்ச்சி' : 'மறுமுயற்சி'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px] text-slate-600">
                    {sub.remarks || (sub.percentage >= 75 ? "சிறந்த அடைவு" : sub.percentage >= 50 ? "நன்று" : "கூடுதல் பயிற்சி தேவை")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td colSpan={2} className="py-3 px-3.5 text-right uppercase text-slate-700 font-black">
                  மொத்தப் புள்ளிகள் (Grand Total):
                </td>
                <td className="py-3 px-3.5 text-center text-indigo-900 font-black text-sm">
                  {data.totalObtained}
                </td>
                <td className="py-3 px-3.5 text-center text-slate-600">
                  {data.totalPossible}
                </td>
                <td className="py-3 px-3.5 text-center text-indigo-900 font-black text-sm">
                  {data.overallPercentage.toFixed(1)}%
                </td>
                <td className="py-3 px-3.5 text-center">
                  <span className="font-black text-sm text-indigo-900">{data.overallGrade}</span>
                </td>
                <td colSpan={2} className="py-3 px-3.5 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    data.overallStatus === 'Pass' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {data.overallStatus === 'Pass' ? 'சித்தியடைந்தார் (PASSED)' : 'மேலதிக கவனம் தேவை'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Grading Scale & Legend */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-8 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-slate-700">அடைவு மட்டக் குறியீடு (Grading Scheme):</div>
          <div className="flex flex-wrap items-center gap-3">
            <span><strong>A:</strong> 75-100% (விசேட சித்தி)</span>
            <span><strong>B:</strong> 65-74% (திறமைச் சித்தி)</span>
            <span><strong>C:</strong> 55-64% (சாதாரண சித்தி)</span>
            <span><strong>S:</strong> 35-54% (தகைமைச் சித்தி)</span>
            <span><strong>W:</strong> 0-34% (பலவீனமான அடைவு)</span>
          </div>
        </div>

        {/* Signatures & Seal */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="h-12 flex items-end justify-center">
              <span className="border-b border-slate-400 w-40 block"></span>
            </div>
            <strong className="block mt-2 text-slate-800">வகுப்பு ஆசிரியர் கையொப்பம்</strong>
            <span className="text-[10px] text-slate-500">Class Teacher Signature</span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-[10px] text-indigo-400 font-bold p-1 text-center">
              அகாடமி முத்திரை (Official Seal)
            </div>
          </div>

          <div>
            <div className="h-12 flex items-end justify-center">
              <span className="border-b border-slate-400 w-40 block"></span>
            </div>
            <strong className="block mt-2 text-slate-800">அதிபர் / பணிப்பாளர் கையொப்பம்</strong>
            <span className="text-[10px] text-slate-500">Principal / Director Signature</span>
          </div>
        </div>

        {/* Issue Date & Watermark */}
        <div className="mt-8 text-center text-[10px] text-slate-400">
          வழங்கப்பட்ட திகதி (Issue Date): {data.date || new Date().toISOString().split('T')[0]} • Agaram Dhines Online Academy Verification ID: AD-{data.studentId.slice(0, 8)}
        </div>
      </div>
    </div>
  );
}
