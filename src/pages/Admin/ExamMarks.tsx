import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getStudents, getClasses, saveExamMarks, getExamMarks, getExamSettings } from "../../lib/db";
import { Award, Search, FileSpreadsheet, Download, CheckCircle, AlertCircle, ChevronDown, Filter, Printer, X, FileText, Image as ImageIcon, BarChart3 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function ExamMarks() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [examPeriods, setExamPeriods] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [resultCardModal, setResultCardModal] = useState<{ student: any, mark: any } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const availableSubjects = selectedGrade 
    ? classes.find(c => c.name === selectedGrade)?.subjects || []
    : [];

  // Form state
  const [marksInput, setMarksInput] = useState<Record<string, { obtained: string, total: string, remarks: string }>>({});

  useEffect(() => {
    getStudents().then(setStudents);
    getClasses().then(setClasses);
    getExamMarks().then(setMarks);
    getExamSettings().then(data => {
      if (data && data.length > 0) {
        setExamPeriods(data);
      } else {
        setExamPeriods([
          { id: "1", name: "Term 1 Examination" },
          { id: "2", name: "Term 2 Examination" },
          { id: "3", name: "Final Examination" },
          { id: "4", name: "Midterm Test" }
        ]);
      }
    });
  }, []);

  const filteredStudents = students.filter(s => {
    // Determine the student's subjects.
    const studentSubjects = s.subjects && s.subjects.length > 0 ? s.subjects : (classes.find(c => c.name === s.grade)?.subjects || []);
    
    const searchLow = searchTerm.toLowerCase().trim();
    // Support matching the end of the roll number/id specifically if the user types just digits
    const isNumericSearch = /^\d+$/.test(searchLow);

    return (!selectedGrade || s.grade === selectedGrade) &&
    (!selectedSubject || studentSubjects.includes(selectedSubject)) &&
    (!searchTerm || 
        s.name?.toLowerCase().includes(searchLow) || 
        s.id?.toString().toLowerCase().includes(searchLow) ||
        s.rollNo?.toString().toLowerCase().includes(searchLow) ||
        (isNumericSearch && s.rollNo?.toString().endsWith(searchLow)) ||
        (isNumericSearch && s.id?.toString().endsWith(searchLow)) ||
        s.username?.toString().toLowerCase().includes(searchLow)
      )
  });

  const handleMarkChange = (studentId: string, field: 'obtained' | 'total' | 'remarks', value: string) => {
    setMarksInput(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId] || { obtained: '', total: '100', remarks: '' },
        [field]: value
      }
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedGrade || !selectedExam || !selectedSubject) {
      alert("Please select Class, Exam, and Subject first.");
      return;
    }

    const newMarksEntries = Object.entries(marksInput).map(([studentId, data]: [string, any]) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      studentId,
      grade: selectedGrade,
      exam: selectedExam,
      subject: selectedSubject,
      obtained: Number(data.obtained) || 0,
      total: Number(data.total) || 100,
      remarks: data.remarks || "",
      date: new Date().toISOString().split('T')[0]
    }));

    // Update existing marks: remove old entries for exactly this student/exam/subject combination
    // and replace with new ones to avoid duplicates.
    let updatedMarks = [...marks];
    
    newMarksEntries.forEach(newEntry => {
      // Find and remove if duplicate
      updatedMarks = updatedMarks.filter(m => 
        !(m.studentId === newEntry.studentId && 
          m.exam === newEntry.exam && 
          m.subject === newEntry.subject)
      );
      // Add the new one
      updatedMarks.push(newEntry);
    });

    setMarks(updatedMarks);
    await saveExamMarks(updatedMarks);
    
    alert("Marks saved successfully!");
    setMarksInput({}); // Clear inputs after save
  };

  const getGradeLetter = (obtained: number, total: number) => {
    const percentage = (obtained / total) * 100;
    if (percentage >= 90) return { letter: 'A+', color: 'text-emerald-600 bg-emerald-100' };
    if (percentage >= 80) return { letter: 'A', color: 'text-green-600 bg-green-100' };
    if (percentage >= 70) return { letter: 'B', color: 'text-blue-600 bg-blue-100' };
    if (percentage >= 60) return { letter: 'C', color: 'text-yellow-600 bg-yellow-100' };
    if (percentage >= 50) return { letter: 'D', color: 'text-orange-600 bg-orange-100' };
    return { letter: 'F', color: 'text-red-600 bg-red-100' };
  };

  const handleGenerateCards = async (format: 'pdf' | 'image') => {
    const studentsWithMarks = filteredStudents.filter(s => 
      marks.find(m => m.studentId === s.id && m.exam === selectedExam && m.subject === selectedSubject)
    );

    if (studentsWithMarks.length === 0) {
      alert("No marks found for the selected students.");
      return;
    }

    setIsGenerating(true);

    try {
      if (format === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [11, 8.5]
        });

        for (let i = 0; i < studentsWithMarks.length; i++) {
          const student = studentsWithMarks[i];
          const element = document.getElementById(`result-card-template-${student.id}`);
          if (!element) continue;

          // Ensure images are loaded before capturing
          await new Promise(resolve => setTimeout(resolve, 100));

          const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2 });
          
          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(dataUrl, 'PNG', 0, 0, 11, 8.5);
        }

        pdf.save(`${selectedGrade}_${selectedSubject}_Results.pdf`);
      } else {
        // Generate Images
        for (const student of studentsWithMarks) {
          const element = document.getElementById(`result-card-template-${student.id}`);
          if (!element) continue;

          await new Promise(resolve => setTimeout(resolve, 100));

          const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2 });
          const link = document.createElement('a');
          link.download = `${student.name}_${selectedSubject}_Result.png`;
          link.href = dataUrl;
          link.click();
          
          // Small delay to prevent browser blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Error generating cards:", error);
      alert("An error occurred while generating the cards.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    let printIframe = document.getElementById('exam-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'exam-print-iframe';
      printIframe.style.position = 'absolute';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      document.body.appendChild(printIframe);
    }
    
    const printDoc = printIframe.contentWindow?.document;
    if (!printDoc) {
      alert('Unable to print document. Please check your browser security settings.');
      return;
    }
    
    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Print Result Card</title>
          <style>
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
            .print-container { background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
            @media print {
              body { background: white; padding: 0; }
              .print-container { box-shadow: none; }
              @page { margin: 0; }
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div class="print-container">
            ${content.innerHTML}
          </div>
        </body>
      </html>
    `);
    printDoc.close();
    
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
              <Award size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Exam Marks & Results</h1>
              <p className="text-gray-500 font-medium mt-1">Manage student scores and generate result cards.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to="/admin/grade-performance"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <BarChart3 size={18} />
              வகுப்பு வாரியான பகுப்பாய்வு (Grade 6-11 Dashboard)
            </Link>

            <button className="bg-white border-2 border-indigo-100 text-indigo-600 px-5 py-3 rounded-xl font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-2 shadow-sm text-sm">
              <FileSpreadsheet size={18} /> Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Exam</label>
            <div className="relative">
              <select 
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full appearance-none border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 font-bold text-gray-700 cursor-pointer"
              >
                <option value="">Choose Exam...</option>
                {examPeriods.map(exam => (
                  <option key={exam.id} value={exam.name}>{exam.name}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Class</label>
            <div className="relative">
              <select 
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSubject("");
                }}
                className="w-full appearance-none border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 font-bold text-gray-700 cursor-pointer"
              >
                <option value="">All Classes</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Subject</label>
            <div className="relative">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full appearance-none border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 font-bold text-gray-700 cursor-pointer"
              >
                <option value="">Choose Subject...</option>
                {availableSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Student</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, ID or Roll No..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 font-medium text-gray-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedGrade && selectedExam && selectedSubject ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header Gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4">
            <div className="grid grid-cols-12 gap-4 text-white font-bold text-sm uppercase tracking-wider">
              <div className="col-span-1 text-center">ID</div>
              <div className="col-span-2">Student Name</div>
              <div className="col-span-2 text-center">Marks Obtained</div>
              <div className="col-span-2 text-center">Total Marks</div>
              <div className="col-span-1 text-center">Grade</div>
              <div className="col-span-2">Remarks</div>
              <div className="col-span-2 text-center">Action</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => {
                // Check if marks already exist for this student/exam/subject
                const existingMark = marks.find(m => 
                  m.studentId === student.id && 
                  m.exam === selectedExam && 
                  m.subject === selectedSubject
                );
                
                const inputData = marksInput[student.id] || { 
                  obtained: existingMark?.obtained?.toString() || '', 
                  total: existingMark?.total?.toString() || '100',
                  remarks: existingMark?.remarks || ''
                };

                const obtainedNum = Number(inputData.obtained);
                const totalNum = Number(inputData.total) || 100;
                const gradeInfo = inputData.obtained ? getGradeLetter(obtainedNum, totalNum) : null;

                return (
                  <div 
                    key={student.id} 
                    className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50/50`}
                  >
                    <div className="col-span-1 text-center font-mono text-sm text-gray-500">{student.id}</div>
                    <div className="col-span-2 font-bold text-gray-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-xs overflow-hidden">
                        {student.image ? (
                          <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.charAt(0)
                        )}
                      </div>
                      <span className="truncate">{student.name}</span>
                    </div>
                    
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        value={inputData.obtained}
                        onChange={(e) => handleMarkChange(student.id, 'obtained', e.target.value)}
                        className="w-full text-center border-2 border-gray-200 rounded-lg py-2 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 font-bold text-gray-800"
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        value={inputData.total}
                        onChange={(e) => handleMarkChange(student.id, 'total', e.target.value)}
                        className="w-full text-center border-2 border-gray-200 rounded-lg py-2 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 font-bold text-gray-500 bg-gray-50"
                      />
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      {gradeInfo ? (
                        <span className={`px-3 py-1 rounded-full font-extrabold text-sm ${gradeInfo.color}`}>
                          {gradeInfo.letter}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        value={inputData.remarks}
                        onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 text-sm"
                        placeholder="Optional..."
                      />
                    </div>

                    <div className="col-span-2 flex justify-center">
                      {existingMark && (
                        <button
                          onClick={() => setResultCardModal({ student, mark: existingMark })}
                          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <FileSpreadsheet size={14} /> Result Card
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <AlertCircle size={48} className="text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-700">No students found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your filters or search term.</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {filteredStudents.length > 0 && (
            <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-500">
                Showing {filteredStudents.length} students
              </p>
              <div className="flex gap-4">
                <button className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveMarks}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <CheckCircle size={18} /> Save Marks
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Filter size={40} className="text-blue-300" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Select Filters to Begin</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Please select an Exam, Class, and Subject from the filters above to view the student list and enter marks.
          </p>
        </div>
      )}
      
      {/* Generate Result Cards Section - Only show if filters are selected */}
      {selectedGrade && selectedExam && selectedSubject && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border border-purple-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-extrabold text-gray-800">Generate Result Cards</h3>
            <p className="text-gray-600 mt-1">Create printable report cards for {selectedGrade} - {selectedExam} ({selectedSubject}).</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => handleGenerateCards('pdf')}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileText size={20} /> {isGenerating ? "Generating..." : "Download PDFs"}
            </button>
            <button 
              onClick={() => handleGenerateCards('image')}
              disabled={isGenerating}
              className="bg-white text-purple-600 border-2 border-purple-200 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-purple-50 hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <ImageIcon size={20} /> {isGenerating ? "Generating..." : "Download Images"}
            </button>
          </div>
        </div>
      )}

      {/* Result Card Modal */}
      {resultCardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">Student Result Card</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                  <Printer size={16} /> Print
                </button>
                <button onClick={() => setResultCardModal(null)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-8 flex justify-center bg-gray-100 flex-1 overflow-auto">
              <div ref={printRef} className="bg-white shadow-lg w-[500px] border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-indigo-900 text-white p-6 text-center">
                  <h1 className="text-2xl font-bold uppercase tracking-wider">Agaram Dhines Academy</h1>
                  <p className="text-indigo-200 text-sm mt-1">Academic Result Card</p>
                </div>
                
                <div className="p-6 flex-1">
                  {/* Student Info */}
                  <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-100">
                    <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-indigo-100 overflow-hidden flex items-center justify-center">
                      {resultCardModal.student.image ? (
                        <img src={resultCardModal.student.image} alt={resultCardModal.student.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-gray-400">{resultCardModal.student.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 mb-1">{resultCardModal.student.name}</h2>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mt-3">
                        <div><span className="text-gray-500">ID:</span> <span className="font-medium text-gray-800">{resultCardModal.student.id}</span></div>
                        <div><span className="text-gray-500">Class:</span> <span className="font-medium text-gray-800">{resultCardModal.student.grade}</span></div>
                        <div><span className="text-gray-500">Exam:</span> <span className="font-medium text-gray-800">{resultCardModal.mark.exam}</span></div>
                        <div><span className="text-gray-500">Subject:</span> <span className="font-medium text-gray-800">{resultCardModal.mark.subject}</span></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Marks Details */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="text-center font-bold text-gray-700 mb-6 uppercase tracking-wider text-sm">Performance Summary</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Marks Obtained</p>
                        <p className="text-3xl font-black text-indigo-600">{resultCardModal.mark.obtained} <span className="text-lg text-gray-400 font-medium">/ {resultCardModal.mark.total}</span></p>
                      </div>
                      
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Percentage</p>
                        <p className="text-3xl font-black text-blue-600">{((resultCardModal.mark.obtained / resultCardModal.mark.total) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Grade Achieved</p>
                        <p className="text-2xl font-black text-gray-800">
                          {getGradeLetter(resultCardModal.mark.obtained, resultCardModal.mark.total).letter}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Remarks</p>
                        <p className="text-sm font-medium text-gray-700">{resultCardModal.mark.remarks || "No remarks provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Templates for Download */}
      <div className="fixed top-0 left-0 z-[-50] pointer-events-none opacity-0">
        {filteredStudents.map(student => {
          const mark = marks.find(m => m.studentId === student.id && m.exam === selectedExam && m.subject === selectedSubject);
          if (!mark) return null;
          
          const gradeInfo = getGradeLetter(mark.obtained, mark.total);

          return (
            <div 
              key={`template-${student.id}`}
              id={`result-card-template-${student.id}`} 
              className="w-[11in] h-[8.5in] bg-white p-8 relative shrink-0 flex items-center justify-center"
            >
              {/* Colorful Border */}
              <div className="absolute inset-4 border-[12px] border-double border-indigo-900 rounded-2xl"></div>
              <div className="absolute inset-8 border-2 border-yellow-500 rounded-xl opacity-50"></div>

              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                <Award size={500} />
              </div>

              <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-16 py-8">
                <h1 className="text-6xl font-serif font-black text-indigo-900 mb-2 tracking-wide uppercase">Academic Result Card</h1>
                <p className="text-2xl text-yellow-600 font-serif italic mb-8 font-semibold">Agaram Dhines Academy</p>

                <div className="w-full flex justify-between items-start mb-8 text-left">
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex-1 mr-6">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4 border-b-2 border-indigo-200 pb-2">{student.name}</h2>
                    <div className="grid grid-cols-2 gap-4 text-lg">
                      <p><span className="font-bold text-indigo-800">Grade:</span> {student.grade}</p>
                      <p><span className="font-bold text-indigo-800">Roll No:</span> {student.rollNo || 'N/A'}</p>
                      <p><span className="font-bold text-indigo-800">Phone:</span> {student.phone || 'N/A'}</p>
                      <p><span className="font-bold text-indigo-800">Exam:</span> {mark.exam}</p>
                      <p><span className="font-bold text-indigo-800">Subject:</span> {mark.subject}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                      <QRCodeSVG value={student.id} size={100} level="H" includeMargin={false} />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1 font-mono text-left w-full">
                      <p><span className="font-bold text-indigo-900">User:</span> {student.username}</p>
                      <p><span className="font-bold text-indigo-900">Pass:</span> {student.password}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden mb-8">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Performance Summary</h3>
                    <span className="text-sm font-medium text-gray-500">Date: {new Date(mark.date).toLocaleDateString()}</span>
                  </div>
                  <div className="p-8 grid grid-cols-3 gap-8">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 uppercase font-bold mb-2">Marks Obtained</p>
                      <p className="text-5xl font-black text-indigo-600">{mark.obtained} <span className="text-2xl text-gray-400 font-medium">/ {mark.total}</span></p>
                    </div>
                    <div className="text-center border-l border-r border-gray-100">
                      <p className="text-sm text-gray-500 uppercase font-bold mb-2">Percentage</p>
                      <p className="text-5xl font-black text-blue-600">{((mark.obtained / mark.total) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 uppercase font-bold mb-2">Grade</p>
                      <p className={`text-5xl font-black ${gradeInfo.color.split(' ')[0]}`}>{gradeInfo.letter}</p>
                    </div>
                  </div>
                  {mark.remarks && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-left">
                      <p className="text-sm text-gray-600"><span className="font-bold text-gray-800">Remarks:</span> {mark.remarks}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end w-full mt-auto pt-4 px-10">
                  <div className="text-center">
                    <div className="w-56 border-b-2 border-gray-800 mb-3"></div>
                    <p className="font-bold text-gray-800 text-lg uppercase tracking-widest">Class Teacher</p>
                  </div>
                  <div className="text-center">
                    <div className="w-56 border-b-2 border-gray-800 mb-3"></div>
                    <p className="font-bold text-gray-800 text-lg uppercase tracking-widest">Principal</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
