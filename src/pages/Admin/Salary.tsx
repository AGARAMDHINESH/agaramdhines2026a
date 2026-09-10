import React, { useState, useEffect } from 'react';
import { getStaffs, saveStaffs } from '../../lib/db';
import { jsPDF } from 'jspdf';
import { 
  Search, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Edit3, 
  History, 
  CreditCard, 
  Trash2, 
  X, 
  Plus, 
  FileText, 
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react';

export default function Salary() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Modals state
  const [editSalaryModalStaff, setEditSalaryModalStaff] = useState<any | null>(null);
  const [newSalaryInput, setNewSalaryInput] = useState<string>('');

  const [payModalStaff, setPayModalStaff] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('Bank Transfer');
  const [payBonus, setPayBonus] = useState<string>('0');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [historyModalStaff, setHistoryModalStaff] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadStaffs();
    const handleDbUpdate = (e: any) => {
      if (e.detail?.key === 'staffs') {
        loadStaffs();
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const loadStaffs = async () => {
    const data = await getStaffs();
    setStaffs(data || []);
  };

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

  const findPayment = (staff: any, targetMonth: string) => {
    const payments = staff.payments || [];
    const normTarget = normalizeMonth(targetMonth);
    return payments.find((p: any) => {
      if (!p) return false;
      if (p.month === targetMonth) return true;
      if (normalizeMonth(p.month) === normTarget) return true;
      return false;
    });
  };

  // 1. Update Base Salary
  const openEditSalary = (staff: any) => {
    setEditSalaryModalStaff(staff);
    setNewSalaryInput(String(staff.salary || '0'));
  };

  const handleSaveBaseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSalaryModalStaff) return;
    setIsSaving(true);

    const updatedAmount = Number(newSalaryInput) || 0;
    const updatedStaffs = staffs.map(s => {
      if (s.id === editSalaryModalStaff.id) {
        return { ...s, salary: updatedAmount, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    await saveStaffs(updatedStaffs);
    setStaffs(updatedStaffs);
    setIsSaving(false);
    setEditSalaryModalStaff(null);
  };

  // 2. Open Pay Modal
  const openPayModal = (staff: any) => {
    setPayModalStaff(staff);
    setPayAmount(String(staff.salary || '0'));
    setPayBonus('0');
    setPayNotes(`Salary payment for ${month}`);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod('Bank Transfer');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalStaff) return;
    setIsSaving(true);

    const totalAmt = (Number(payAmount) || 0) + (Number(payBonus) || 0);

    const newPaymentRecord = {
      id: Date.now().toString(),
      month: month, // YYYY-MM
      amount: totalAmt,
      baseAmount: Number(payAmount) || 0,
      bonus: Number(payBonus) || 0,
      paymentMethod: payMethod,
      notes: payNotes,
      date: payDate || new Date().toISOString(),
      status: 'Paid'
    };

    const updatedStaffs = staffs.map(s => {
      if (s.id === payModalStaff.id) {
        const payments = [...(s.payments || [])];
        // Remove duplicate entry for same month if any
        const filtered = payments.filter((p: any) => normalizeMonth(p.month) !== normalizeMonth(month));
        filtered.push(newPaymentRecord);
        return { ...s, payments: filtered, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    await saveStaffs(updatedStaffs);
    setStaffs(updatedStaffs);
    setIsSaving(false);
    setPayModalStaff(null);
  };

  // 3. Remove Payment Record
  const handleDeletePayment = async (staffId: string, paymentId: string) => {
    if (!window.confirm("Are you sure you want to remove this payment record?")) return;

    const updatedStaffs = staffs.map(s => {
      if (s.id === staffId) {
        const payments = (s.payments || []).filter((p: any) => p.id !== paymentId);
        return { ...s, payments, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    await saveStaffs(updatedStaffs);
    setStaffs(updatedStaffs);
    if (historyModalStaff && historyModalStaff.id === staffId) {
      setHistoryModalStaff(updatedStaffs.find(s => s.id === staffId));
    }
  };

  // Download Official PDF Payslip with phone number +94778054232
  const handleDownloadAdminPayslip = (staff: any, targetMonth: string, paymentRecord?: any) => {
    const doc = new jsPDF();
    const instName = "AGARAM DHINES ACADEMY";
    const instPhone = "+94778054232";
    const instEmail = "info@agaramacademy.lk";
    const baseSalary = Number(staff.salary) || 0;
    const amount = paymentRecord ? Number(paymentRecord.amount) : baseSalary;
    const paymentDate = paymentRecord?.date ? new Date(paymentRecord.date).toLocaleDateString() : new Date().toLocaleDateString();

    // Header Accent
    doc.setFillColor(30, 58, 138);
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
    doc.text(`SALARY SLIP FOR THE MONTH: ${targetMonth.toUpperCase()}`, 105, 47, { align: "center" });

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
    doc.text(staff.name || "N/A", 60, 64);
    doc.text(staff.id || "STF-" + Math.floor(Math.random() * 8999 + 1000), 60, 71);
    doc.text(staff.phone || "+94778054232", 60, 78);
    doc.text(staff.role || "Staff Member", 60, 85);
    doc.text(staff.joinDate || "N/A", 60, 92);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Payment Status:", 120, 64);
    doc.text("Payment Date:", 120, 71);
    doc.text("Official Helpline:", 120, 78);
    doc.text("Payment Mode:", 120, 85);
    doc.text("Category:", 120, 92);

    doc.setFont("helvetica", "bold");
    if (paymentRecord) {
      doc.setTextColor(16, 185, 129);
      doc.text("PAID IN FULL", 158, 64);
    } else {
      doc.setTextColor(217, 119, 6);
      doc.text("PROCESSED / PENDING", 158, 64);
    }

    doc.setTextColor(15, 23, 42);
    doc.text(paymentDate, 158, 71);
    doc.text("+94778054232", 158, 78);
    doc.text(paymentRecord?.paymentMethod || "Bank Transfer", 158, 85);
    doc.text(staff.specialization || "Online Academy Staff", 158, 92);

    // Earnings Table Header
    doc.setFillColor(239, 246, 255);
    doc.rect(14, 104, 182, 9, "F");
    doc.setDrawColor(191, 219, 254);
    doc.rect(14, 104, 182, 9, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text("EARNINGS & ALLOWANCES", 18, 110);
    doc.text("AMOUNT (LKR)", 190, 110, { align: "right" });

    let rowY = 120;
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
    if (paymentRecord?.bonus) {
      drawRow("Performance Bonus & Allowances", `Rs. ${Number(paymentRecord.bonus).toLocaleString()}`);
    }

    doc.setFillColor(248, 250, 252);
    doc.rect(14, rowY, 182, 11, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, rowY, 182, 11, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text("NET SALARY DISBURSED", 18, rowY + 7);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${amount.toLocaleString()}.00`, 190, rowY + 7, { align: "right" });

    rowY += 40;
    doc.setDrawColor(156, 163, 175);
    doc.line(24, rowY, 74, rowY);
    doc.line(136, rowY, 186, rowY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("Employee Signature", 49, rowY + 6, { align: "center" });
    doc.text("Authorized Signatory & Stamp", 161, rowY + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Helpline / Accounts: +94778054232 • ${instEmail}`, 105, 276, { align: "center" });
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`This is an authentic computer generated payslip issued by ${instName}. Verified securely.`, 105, 282, { align: "center" });

    doc.save(`Payslip_${(staff.name || "Staff").replace(/\s+/g, '_')}_${targetMonth.replace(/\s+/g, '_')}.pdf`);
  };

  // Filter & Search
  const filteredStaff = staffs.filter(staff => {
    const matchesSearch = 
      staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      staff.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phone?.includes(searchQuery);

    if (!matchesSearch) return false;
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'DESIGN') {
      const r = (staff.role || '').toLowerCase();
      return r.includes('design') || r.includes('typist') || r.includes('worker') || r.includes('technical');
    }
    if (roleFilter === 'TEACHER') {
      const r = (staff.role || '').toLowerCase();
      return r.includes('teacher') || r.includes('instructor') || r.includes('faculty');
    }
    return true;
  });

  // Calculate Metrics
  const totalBaseSalary = staffs.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);
  const paidThisMonthCount = staffs.filter(s => !!findPayment(s, month)).length;
  const pendingThisMonthCount = staffs.length - paidThisMonthCount;
  const totalPaidThisMonth = staffs.reduce((sum, s) => {
    const p = findPayment(s, month);
    return sum + (p ? Number(p.amount) || 0 : 0);
  }, 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <CreditCard size={14} /> Payroll & Financial Engine
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Staff Salary Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Update base salaries, disburse monthly wages, and sync real-time records to staff accounts.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-xs">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-2">Payroll Month:</label>
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-semibold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{staffs.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paid ({month})</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{paidThisMonthCount} Staff</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending ({month})</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{pendingThisMonthCount} Staff</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disbursed ({month})</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">Rs. {totalPaidThisMonth.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search staff name, role, phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Roles ({staffs.length})</option>
              <option value="DESIGN">Designers & Typists</option>
              <option value="TEACHER">Teachers & Faculty</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role & ID</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Base Salary</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status ({month})</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => {
                  const paymentForMonth = findPayment(staff, month);
                  const isPaid = !!paymentForMonth;
                  const currentSalary = Number(staff.salary) || 0;
                  const isDesign = (staff.role || '').toLowerCase().includes('design') || (staff.role || '').toLowerCase().includes('typist') || (staff.role || '').toLowerCase().includes('worker');

                  return (
                    <tr key={staff.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                            isDesign ? "bg-gradient-to-tr from-purple-600 to-indigo-600" : "bg-gradient-to-tr from-blue-600 to-cyan-600"
                          }`}>
                            {staff.name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{staff.name}</p>
                            <p className="text-xs text-gray-500">{staff.phone || staff.email || "No contact info"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          isDesign ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                          {staff.role || 'Teacher'}
                        </span>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {staff.id?.slice(0, 8) || "N/A"}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-gray-900">
                            Rs. {currentSalary.toLocaleString()}
                          </span>
                          <button
                            onClick={() => openEditSalary(staff)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Base Salary"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPaid ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={13} /> Paid (Rs. {Number(paymentForMonth.amount).toLocaleString()})
                            </span>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {paymentForMonth.date ? new Date(paymentForMonth.date).toLocaleDateString() : ""} {paymentForMonth.paymentMethod ? `• ${paymentForMonth.paymentMethod}` : ""}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={13} /> Pending Payment
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleDownloadAdminPayslip(staff, month, paymentForMonth)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors"
                          title="Download Official Salary Payslip (+94778054232)"
                        >
                          <Download size={14} /> Payslip
                        </button>

                        {isPaid ? (
                          <button 
                            onClick={() => {
                              setHistoryModalStaff(staff);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                          >
                            <History size={14} /> Receipts
                          </button>
                        ) : (
                          <button 
                            onClick={() => openPayModal(staff)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                          >
                            <DollarSign size={14} /> Disburse Salary
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setHistoryModalStaff(staff);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center justify-center"
                          title="View Payment History"
                        >
                          <History size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    No staff members matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal: Edit Base Salary */}
      {editSalaryModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Update Monthly Salary</h3>
                <p className="text-xs text-gray-500">{editSalaryModalStaff.name} ({editSalaryModalStaff.role})</p>
              </div>
              <button 
                onClick={() => setEditSalaryModalStaff(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBaseSalary} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Monthly Base Amount (Rs.)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                    Rs.
                  </div>
                  <input 
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={newSalaryInput}
                    onChange={(e) => setNewSalaryInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    placeholder="e.g. 35000"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  This base amount will immediately reflect in the Staff portal and future salary slips.
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditSalaryModalStaff(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Pay Salary */}
      {payModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Disburse Salary Payment</h3>
                <p className="text-xs text-gray-500">Beneficiary: <strong className="text-gray-800">{payModalStaff.name}</strong> • Month: <strong className="text-blue-600">{month}</strong></p>
              </div>
              <button 
                onClick={() => setPayModalStaff(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Base Salary (Rs.)
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Bonus / Allowance (Rs.)
                  </label>
                  <input 
                    type="number"
                    min="0"
                    value={payBonus}
                    onChange={(e) => setPayBonus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm"
                  >
                    <option value="Bank Transfer">Bank Transfer (Direct Deposit)</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online / Card / Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Payment Date
                  </label>
                  <input 
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payment Reference / Remarks
                </label>
                <input 
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Completed graphic design deliverables for August"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase">Net Disbursed Amount:</span>
                  <p className="text-xl font-black text-emerald-700">
                    Rs. {((Number(payAmount) || 0) + (Number(payBonus) || 0)).toLocaleString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-full text-xs font-bold">
                  Status: Paid
                </span>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalStaff(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  {isSaving ? "Saving..." : "Confirm & Disburse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Payment History */}
      {historyModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Salary Payment History</h3>
                <p className="text-xs text-gray-500">Staff: <strong className="text-gray-800">{historyModalStaff.name}</strong> • Base: Rs. {Number(historyModalStaff.salary || 0).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setHistoryModalStaff(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(historyModalStaff.payments || []).length > 0 ? (
                (historyModalStaff.payments || []).map((p: any) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Month: {p.month}</h4>
                        <p className="text-xs text-gray-500">
                          Date: {p.date ? new Date(p.date).toLocaleDateString() : 'N/A'} • Method: {p.paymentMethod || 'Bank Transfer'}
                        </p>
                        {p.notes && <p className="text-[11px] text-gray-400 italic mt-0.5">{p.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-1">
                        <p className="text-base font-black text-emerald-600">Rs. {Number(p.amount).toLocaleString()}</p>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Paid</span>
                      </div>
                      <button
                        onClick={() => handleDownloadAdminPayslip(historyModalStaff, p.month, p)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        title="Download Payslip (+94778054232)"
                      >
                        <Download size={15} /> Payslip
                      </button>
                      <button
                        onClick={() => handleDeletePayment(historyModalStaff.id, p.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No historical payment records found for this staff member.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 shrink-0 flex justify-end">
              <button
                onClick={() => setHistoryModalStaff(null)}
                className="py-2 px-5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
