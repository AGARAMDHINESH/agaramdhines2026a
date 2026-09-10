import React, { useState, useEffect } from 'react';
import { getStudents, getFees, getClasses, getSubjects } from '../../lib/db';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileSpreadsheet, FileText, Search, Filter, RefreshCw, Printer } from 'lucide-react';

export default function StudentFeeStatement() {
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');

  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  
  // Helper to map month string (e.g., '2025-12') to short month name ('Dec')
  const getMonthShortName = (monthStr: string) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length !== 2) return '';
    const monthIndex = parseInt(parts[1], 10) - 1;
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return shortMonths[monthIndex];
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [studentsData, feesData, classesData, subjectsData] = await Promise.all([
          getStudents(),
          getFees(),
          getClasses(),
          getSubjects()
        ]);
        
        if (studentsData) setStudents(studentsData);
        if (feesData) setFees(feesData);
        if (classesData) setClasses(classesData);
        if (subjectsData) setSubjects(subjectsData);
      } catch (error) {
        console.error("Error loading fee statement data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredStudents = students.filter(student => {
    const searchLow = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchTerm ? true :
      (student.name && student.name.toLowerCase().includes(searchLow)) ||
      (student.username && student.username.toString().toLowerCase().includes(searchLow)) ||
      (student.id && student.id.toString().toLowerCase().includes(searchLow)) ||
      (student.rollNo && student.rollNo.toString().toLowerCase().includes(searchLow));
      
    const matchesGrade = selectedGrade === 'All' || student.grade === selectedGrade;
    
    const matchesSubject = selectedSubject === 'All' || 
      (student.subjects && student.subjects.includes(selectedSubject));

    return matchesSearch && matchesGrade && matchesSubject;
  });

  // Prepare table data
  const tableData = filteredStudents.map(student => {
    const studentFees = fees.filter(f => f.studentId === student.id || f.studentId === student.student_id);
    
    // Create a map of month -> amount paid
    const paidMonths: Record<string, number> = {};
    studentFees.forEach(fee => {
      const shortMonth = getMonthShortName(fee.month);
      if (shortMonth) {
        paidMonths[shortMonth] = (paidMonths[shortMonth] || 0) + Number(fee.amount);
      }
    });

    return {
      number: student.phone || student.username || '',
      name: student.name || '',
      reg: student.rollNo || student.id || '',
      paidMonths
    };
  });

  const exportToExcel = () => {
    const exportData = tableData.map(row => {
      const rowData: any = {
        'NUMBER': row.number,
        'NAME': row.name,
        'REG': row.reg,
      };
      
      months.forEach(month => {
        rowData[month.toUpperCase()] = row.paidMonths[month] || '';
      });
      
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Statement");
    XLSX.writeFile(workbook, `Student_Fee_Statement_${selectedGrade !== 'All' ? selectedGrade : 'All'}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Student Fee Statement', 14, 15);
    doc.setFontSize(10);
    doc.text(`Grade: ${selectedGrade} | Subject: ${selectedSubject}`, 14, 22);

    const tableColumn = ["NUMBER", "NAME", "REG", ...months.map(m => m.toUpperCase())];
    const tableRows = tableData.map(row => [
      row.number,
      row.name,
      row.reg,
      ...months.map(month => row.paidMonths[month] ? row.paidMonths[month].toString() : '')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
      didDrawCell: (data) => {
        // Highlight cells with payments in yellow like the image
        if (data.section === 'body' && data.column.index >= 3) {
          const value = data.cell.raw;
          if (value && value !== '') {
            doc.setFillColor(255, 255, 0); // Yellow
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(0, 0, 0);
            doc.text(value.toString(), data.cell.x + 2, data.cell.y + 4);
          }
        }
      }
    });

    doc.save(`Student_Fee_Statement_${selectedGrade !== 'All' ? selectedGrade : 'All'}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Student Fee Statement</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Top Filters Section */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Grade Filter */}
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
              </select>
            </div>

            {/* Subject Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={16} className="text-gray-400" />
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
              >
                <option value="All">All Subjects</option>
                {subjects.map((s: any) => (
                  <option key={s.id || s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search by Number, Name, Reg..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <FileText size={16} /> PDF
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-yellow-300">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border border-gray-300">NUMBER</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border border-gray-300">NAME</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border border-gray-300">REG</th>
                {months.map(month => (
                  <th key={month} className="px-2 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border border-gray-300">{month.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={months.length + 3} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw size={32} className="text-blue-500 mb-3 animate-spin" />
                      <p className="text-base font-medium text-gray-600">Loading data...</p>
                    </div>
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={months.length + 3} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <FileText size={32} className="text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-600">No students found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tableData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.number}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.reg}</td>
                    {months.map(month => (
                      <td 
                        key={month} 
                        className={`px-2 py-2 whitespace-nowrap text-sm text-center border border-gray-300 ${row.paidMonths[month] ? 'bg-yellow-200 font-medium' : ''}`}
                      >
                        {row.paidMonths[month] || ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600 bg-white">
          <div>Showing {tableData.length} students</div>
        </div>

      </div>
    </div>
  );
}
