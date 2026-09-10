import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, RefreshCw, FileText, Copy, Download, Printer, Search, Filter } from 'lucide-react';
import { getIncomeExpense, saveIncomeExpense, getFees, saveFees, getClasses } from '../../lib/db';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AccountStatement() {
  const [dateRange, setDateRange] = useState('All Time');
  const [showReferences, setShowReferences] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incomeExpense, fees, classesData] = await Promise.all([
        getIncomeExpense(),
        getFees(),
        getClasses()
      ]);
      
      if (classesData) setClasses(classesData);

      // Combine and format data
      const combinedData = [
        ...(incomeExpense || []).map((item: any) => ({
          id: item.id,
          date: item.date,
          description: item.description || (item.type === 'Income' ? 'Other Income' : 'Expense'),
          type: item.type, // 'Income' or 'Expense'
          amount: Number(item.amount),
          grade: 'N/A', // General income/expense doesn't have a grade
          origin: 'incomeExpense'
        })),
        ...(fees || []).map((fee: any) => ({
          id: fee.id,
          date: fee.date || fee.month + '-01', // Fallback to month if exact date not available
          description: `Fee Collection - ${fee.studentName || 'Student'}`,
          type: 'Income',
          amount: Number(fee.amount),
          grade: fee.grade || 'N/A',
          origin: 'fees'
        }))
      ];

      // Sort by date descending
      combinedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(combinedData);
    } catch (error) {
      console.error("Error loading account statement data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (transaction: any) => {
    if (!window.confirm("இந்த விபரத்தை நிச்சயமாக நீக்க வேண்டுமா?")) return;
    
    setIsDeleting(transaction.id);
    try {
      if (transaction.origin === 'incomeExpense') {
        const currentData = await getIncomeExpense() || [];
        const updatedData = currentData.filter((item: any) => item.id !== transaction.id);
        await saveIncomeExpense(updatedData);
      } else if (transaction.origin === 'fees') {
        const currentData = await getFees() || [];
        const updatedData = currentData.filter((item: any) => item.id !== transaction.id);
        await saveFees(updatedData);
      }
      
      // Refresh local state
      await loadData();
      alert("விபரம் நீக்கப்பட்டது.");
    } catch (error: any) {
      alert("பிழை: " + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  // Filter by search term and selected grade
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.date.includes(searchTerm);
    const matchesGrade = selectedGrade === 'All' || t.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = [...filteredTransactions].reverse().map(t => {
    if (t.type === 'Income') {
      runningBalance += t.amount;
    } else {
      runningBalance -= t.amount;
    }
    return { ...t, balance: runningBalance };
  }).reverse(); // Reverse back to descending order for display

  const totalIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const exportToExcel = () => {
    const exportData = transactionsWithBalance.map(t => ({
      Date: t.date,
      Description: t.description,
      Grade: t.grade,
      'Debit (Expense)': t.type === 'Expense' ? t.amount : 0,
      'Credit (Income)': t.type === 'Income' ? t.amount : 0,
      'Net Balance': t.balance
    }));
    
    exportData.push({
      Date: 'Total',
      Description: '',
      Grade: '',
      'Debit (Expense)': totalExpense,
      'Credit (Income)': totalIncome,
      'Net Balance': netBalance
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Account Statement");
    XLSX.writeFile(workbook, `Account_Statement_${selectedGrade !== 'All' ? selectedGrade : 'All'}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Account Statement', 14, 22);
    doc.setFontSize(11);
    doc.text(`Grade Filter: ${selectedGrade}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

    const tableColumn = ["Date", "Description", "Grade", "Debit (Expense)", "Credit (Income)", "Net Balance"];
    const tableRows = transactionsWithBalance.map(t => [
      t.date,
      t.description,
      t.grade,
      t.type === 'Expense' ? `Rs ${t.amount.toFixed(2)}` : '-',
      t.type === 'Income' ? `Rs ${t.amount.toFixed(2)}` : '-',
      `Rs ${t.balance.toFixed(2)}`
    ]);

    // Add totals row
    tableRows.push([
      'TOTAL',
      '',
      '',
      `Rs ${totalExpense.toFixed(2)}`,
      `Rs ${totalIncome.toFixed(2)}`,
      `Rs ${netBalance.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });

    doc.save(`Account_Statement_${selectedGrade !== 'All' ? selectedGrade : 'All'}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Account Statement</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Top Section */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          {/* Date Range Picker */}
          <button className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-50 shadow-sm transition-colors w-full md:w-auto">
            <Calendar size={18} className="text-blue-600" />
            {dateRange}
          </button>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={16} className="text-gray-400" />
              </div>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
              >
                <option value="All">All Grades</option>
                {classes.map((c: any) => (
                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
                <option value="N/A">General (No Grade)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={showReferences}
                onChange={() => setShowReferences(!showReferences)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Show References
            </label>
            
            <button className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              <RefreshCw size={16} className="text-blue-600" />
              Reset Profit
            </button>
            
            <button className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 shadow-sm transition-colors">
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* Middle Section */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded text-sm font-medium transition-colors">
              <Download size={14} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded text-sm font-medium transition-colors">
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
              <Printer size={14} /> Print
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
            />
          </div>
        </div>

        {/* Bottom Section: Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Debit (Expense)</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Credit (Income)</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Balance</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw size={32} className="text-blue-500 mb-3 animate-spin" />
                      <p className="text-base font-medium text-gray-600">Loading data...</p>
                    </div>
                  </td>
                </tr>
              ) : transactionsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <FileText size={32} className="text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-600">No data available in table</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your date range or search filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactionsWithBalance.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.grade === 'N/A' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>
                        {t.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {t.type === 'Expense' ? `Rs ${t.amount.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {t.type === 'Income' ? `Rs ${t.amount.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      Rs {t.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={isDeleting === t.id}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <th colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-700">Total:</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-red-600">Rs {totalExpense.toFixed(2)}</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-green-600">Rs {totalIncome.toFixed(2)}</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-gray-900">Rs {netBalance.toFixed(2)}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600 bg-white">
          <div>Showing {transactionsWithBalance.length} entries</div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors" disabled>Previous</button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors" disabled>Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}
