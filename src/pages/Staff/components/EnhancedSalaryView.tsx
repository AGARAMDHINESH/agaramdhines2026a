import React, { useState } from "react";
import { 
  DollarSign, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  Printer,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { jsPDF } from "jspdf";

interface SalaryViewProps {
  staff: any;
  adminSettings?: any;
  onRefresh?: () => void;
}

export default function EnhancedSalaryView({ staff, adminSettings, onRefresh }: SalaryViewProps) {
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);

  const payments = staff.payments || [];
  const baseSalary = Number(staff.salary) || 0;

  const normalizeMonth = (mStr: string) => {
    if (!mStr) return "";
    const s = String(mStr).trim().toLowerCase();
    if (/^\d{4}-\d{1,2}$/.test(s)) {
      const [y, m] = s.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase();
    }
    return s;
  };

  const findPaymentForMonth = (targetMonth: string) => {
    const normTarget = normalizeMonth(targetMonth);
    return payments.find((p: any) => {
      if (!p) return false;
      if (p.month === targetMonth) return true;
      if (normalizeMonth(p.month) === normTarget) return true;
      return false;
    });
  };

  // Recent 6 months list
  const recentMonths = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  // Selected month payment status
  const currentPayment = findPaymentForMonth(selectedMonth);
  const isPaidThisMonth = !!currentPayment;
  const paidAmountThisMonth = currentPayment ? Number(currentPayment.amount) : 0;
  const balanceDue = isPaidThisMonth ? 0 : baseSalary;

  // Lifetime paid sum
  const lifetimePaid = payments.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

  const handleDownloadSalarySlip = (monthToDownload: string) => {
    const payment = findPaymentForMonth(monthToDownload);
    const amount = payment ? Number(payment.amount) : baseSalary;
    const paymentDate = payment?.date ? new Date(payment.date).toLocaleDateString() : new Date().toLocaleDateString();

    const doc = new jsPDF();
    const instName = adminSettings?.instituteName || "AGARAM DHINES ACADEMY";
    const instPhone = "+94778054232";
    const instEmail = adminSettings?.email || "info@agaramacademy.lk";

    // Header Background Accent
    doc.setFillColor(30, 58, 138); // Deep Navy
    doc.rect(0, 0, 210, 32, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(instName.toUpperCase(), 105, 14, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(219, 234, 254);
    doc.text(`Official Salary Payslip & Payment Voucher • Tel / WhatsApp: +94778054232 • ${instEmail}`, 105, 22, { align: "center" });

    // Document Title Banner
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 38, 182, 14, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(`SALARY SLIP FOR THE MONTH: ${monthToDownload.toUpperCase()}`, 105, 47, { align: "center" });

    // Staff Details Table Container
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 56, 182, 42, 2, 2, "FD");

    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Staff Name:", 18, 64);
    doc.text("Staff ID:", 18, 71);
    doc.text("Phone Number:", 18, 78);
    doc.text("Designation / Role:", 18, 85);
    doc.text("Date of Joining:", 18, 92);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(staff.name, 60, 64);
    doc.text(staff.id || "STF-" + Math.floor(Math.random() * 8999 + 1000), 60, 71);
    doc.text(staff.phone || "+94778054232", 60, 78);
    doc.text(staff.role || "Design Worker / Staff", 60, 85);
    doc.text(staff.joinDate || "N/A", 60, 92);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Payment Status:", 120, 64);
    doc.text("Payment Date:", 120, 71);
    doc.text("Official Helpline:", 120, 78);
    doc.text("Payment Mode:", 120, 85);
    doc.text("Specialization:", 120, 92);

    doc.setFont("helvetica", "bold");
    if (payment) {
      doc.setTextColor(16, 185, 129);
      doc.text("PAID IN FULL", 158, 64);
    } else {
      doc.setTextColor(217, 119, 6);
      doc.text("PENDING / PROCESSED", 158, 64);
    }

    doc.setTextColor(15, 23, 42);
    doc.text(paymentDate, 158, 71);
    doc.text("+94778054232", 158, 78);
    doc.text("Bank Transfer / Cash", 158, 85);
    doc.text(staff.specialization || "Creative & Typing", 158, 92);

    // Earnings Table Header
    doc.setFillColor(239, 246, 255);
    doc.rect(14, 102, 182, 9, "F");
    doc.setDrawColor(191, 219, 254);
    doc.rect(14, 102, 182, 9, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text("EARNINGS & ALLOWANCES", 18, 108);
    doc.text("AMOUNT (LKR)", 190, 108, { align: "right" });

    // Earnings Rows
    let rowY = 118;
    const drawRow = (label: string, val: string, isBold: boolean = false) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(label, 18, rowY);
      doc.text(val, 190, rowY, { align: "right" });
      doc.setDrawColor(241, 245, 249);
      doc.line(14, rowY + 3, 196, rowY + 3);
      rowY += 10;
    };

    drawRow("Basic Monthly Salary", `Rs. ${baseSalary.toLocaleString()}`);
    drawRow("Design & Typing Performance Allowance", `Rs. 0.00`);
    drawRow("Special Monthly Responsibility Bonus", `Rs. 0.00`);

    // Total Earnings Row
    doc.setFillColor(248, 250, 252);
    doc.rect(14, rowY, 182, 11, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, rowY, 182, 11, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text("NET SALARY PAYABLE", 18, rowY + 7);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${amount.toLocaleString()}.00`, 190, rowY + 7, { align: "right" });

    // Amount in Words
    rowY += 20;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Amount in words: Sri Lankan Rupees ${numberToWords(amount)} Only.`, 18, rowY);

    // Signatures Section
    rowY += 40;
    doc.setDrawColor(156, 163, 175);
    doc.line(24, rowY, 74, rowY);
    doc.line(136, rowY, 186, rowY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("Employee Signature", 49, rowY + 6, { align: "center" });
    doc.text("Authorized Signatory & Stamp", 161, rowY + 6, { align: "center" });

    // Footer note
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Helpline / Accounts: +94778054232 • ${instEmail}`, 105, 276, { align: "center" });
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`This is an authentic computer generated payslip issued by ${instName}. Verified securely.`, 105, 282, { align: "center" });

    doc.save(`Payslip_${staff.name.replace(/\s+/g, '_')}_${monthToDownload.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Salary Dashboard */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck size={14} className="text-emerald-400" />
              Salary & Financial Statement
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{staff.name}</h1>
            <p className="text-blue-200 text-sm mt-1">
              Role: <strong className="text-white">{staff.role || "Design Worker"}</strong> • Monthly Basic: <strong className="text-emerald-300">Rs. {baseSalary.toLocaleString()}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs border border-white/20 backdrop-blur-xs transition-colors"
                title="Sync latest salary from database"
              >
                <Sparkles size={14} className="text-yellow-300" />
                <span>Sync Real-Time</span>
              </button>
            )}
            <button
              onClick={() => handleDownloadSalarySlip(selectedMonth)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Download size={16} />
              <span>Download {selectedMonth} Slip</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Base Salary</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">Rs. {baseSalary.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paid ({selectedMonth})</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              {isPaidThisMonth ? `Rs. ${paidAmountThisMonth.toLocaleString()}` : "Rs. 0"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Balance Due</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              Rs. {balanceDue.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Received</p>
            <p className="text-2xl font-black text-purple-600 mt-0.5">Rs. {lifetimePaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Detailed Salary Card for Selected Month */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Monthly Remuneration Statement
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Select a month to inspect salary details and download receipt</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              {recentMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Calculation Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Earnings Calculation</h4>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                  <span className="text-gray-600 font-medium">Basic Remuneration</span>
                  <span className="font-bold text-gray-900">Rs. {baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                  <span className="text-gray-600 font-medium">Design & Typing Allowance</span>
                  <span className="font-bold text-gray-900">Rs. 0.00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                  <span className="text-gray-600 font-medium">Deductions</span>
                  <span className="font-bold text-gray-900">- Rs. 0.00</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-base">
                  <span className="font-bold text-emerald-900">Net Payable Amount</span>
                  <span className="font-black text-emerald-700">Rs. {baseSalary.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right: Payment Status & Action Card */}
            <div className="flex flex-col justify-between p-6 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Payment Status</span>
                  {isPaidThisMonth ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={14} /> Paid (Rs. {paidAmountThisMonth.toLocaleString()})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock size={14} /> Pending Payment
                    </span>
                  )}
                </div>

                <div className="p-4 bg-white rounded-xl border border-gray-200/80 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Beneficiary:</span>
                    <strong className="text-gray-900">{staff.name}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Month:</span>
                    <strong className="text-gray-900">{selectedMonth}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Payment Reference:</span>
                    <strong className="text-gray-900">{currentPayment ? `PAY-${currentPayment.id || '2026'}` : 'Scheduled'}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => handleDownloadSalarySlip(selectedMonth)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  <Download size={14} /> Download PDF Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Recent Payment Records & Slips</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {recentMonths.map((m, idx) => {
            const p = findPaymentForMonth(m);
            const isPaid = !!p;
            const paidAmt = p ? Number(p.amount) : baseSalary;

            return (
              <div key={idx} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isPaid ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Salary Slip — {m}</h4>
                    <p className="text-xs text-gray-500">
                      Amount: <strong className="text-gray-800">Rs. {paidAmt.toLocaleString()}</strong> • Status: {isPaid ? <span className="text-emerald-600 font-bold">Paid</span> : <span className="text-amber-600 font-semibold">Pending</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => handleDownloadSalarySlip(m)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-300 hover:bg-white hover:border-blue-500 hover:text-blue-600 rounded-xl text-xs font-semibold text-gray-700 transition-colors shadow-xs"
                  >
                    <Download size={13} />
                    <span>Download Payslip</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "");
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + numberToWords(num % 100000) : "");
  return num.toString();
}
