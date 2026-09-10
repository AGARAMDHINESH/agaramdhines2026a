import React, { useState, useEffect, useRef } from "react";
import { getStudents, getClasses, getAdminSettings } from "../../lib/db";
import { Printer, CheckSquare, Square, Search, Award, FileText, CreditCard, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function BulkDocuments() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  const [printMode, setPrintMode] = useState<'idcard' | 'certificate' | null>(null);

  useEffect(() => {
    getStudents().then(data => setStudents(data || []));
    getClasses().then(data => setClasses(data || []));
    getAdminSettings().then(data => setAdminSettings(data));
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesGrade = selectedGrade ? s.grade === selectedGrade : true;
    const matchesSearch = searchQuery 
      ? s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesGrade && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handlePrint = (mode: 'idcard' | 'certificate') => {
    if (selectedIds.size === 0) {
      alert("Please select at least one student.");
      return;
    }
    setPrintMode(mode);
    setIsGenerating(true);
    
    // Give React time to render the hidden print area
    setTimeout(() => {
      const content = printRef.current;
      if (!content) {
        setIsGenerating(false);
        setPrintMode(null);
        return;
      }

      // Instead of window.open, use a hidden iframe to avoid popup blockers in Electron/Nativefier
      let printIframe = document.getElementById('bulk-print-iframe') as HTMLIFrameElement;
      if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'bulk-print-iframe';
        printIframe.style.position = 'absolute';
        printIframe.style.top = '-9999px';
        printIframe.style.left = '-9999px';
        printIframe.title = 'Print Frame';
        document.body.appendChild(printIframe);
      }

      const printDoc = printIframe.contentWindow?.document;
      
      if (printDoc) {
        printDoc.open();
        printDoc.write(`
          <html>
            <head>
              <title>Bulk Print ${mode === 'idcard' ? 'ID Cards' : 'Certificates'}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  .page-break { page-break-after: always; }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                .id-grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
                .cert-container { display: flex; flex-direction: column; align-items: center; gap: 40px; }
              </style>
            </head>
            <body class="p-8 bg-white">
              ${content.innerHTML}
            </body>
          </html>
        `);
        printDoc.close();
        
        // Wait for Tailwind scripts to inject styles before printing
        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          setIsGenerating(false);
          setPrintMode(null);
        }, 1500);
      } else {
        setIsGenerating(false);
        setPrintMode(null);
        alert("Unable to generate print document. Please check your browser's security settings.");
      }
    }, 500);
  };

  const selectedStudentsData = students.filter(s => selectedIds.has(s.id));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bulk Document Generator</h1>
          <p className="text-gray-500 text-sm mt-1">Generate ID Cards and Certificates for multiple students</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => handlePrint('idcard')}
            disabled={selectedIds.size === 0 || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {isGenerating && printMode === 'idcard' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <CreditCard size={18} />
            )}
            Generate ID Cards ({selectedIds.size})
          </button>
          <button
            onClick={() => handlePrint('certificate')}
            disabled={selectedIds.size === 0 || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {isGenerating && printMode === 'certificate' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FileText size={18} />
            )}
            Generate Certificates ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="sm:w-64">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <button 
                    onClick={handleSelectAll}
                    className="flex items-center text-gray-500 hover:text-indigo-600"
                  >
                    {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll No
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(student.id) ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => toggleSelect(student.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {selectedIds.has(student.id) ? (
                        <CheckSquare size={20} className="text-indigo-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                          {student.image ? (
                            <img className="h-10 w-10 object-cover" src={student.image} alt="" />
                          ) : (
                            <span className="text-gray-500 font-medium text-lg">{student.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{student.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {student.rollNo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.phone || 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No students found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef}>
          {printMode === 'idcard' && (
            <div className="id-grid">
              {selectedStudentsData.map(student => (
                <div key={student.id} className="w-[3.375in] h-[2.125in] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl p-2.5 relative overflow-hidden text-white shadow-lg print:shadow-none break-inside-avoid shrink-0 flex flex-col justify-between" style={{ pageBreakInside: 'avoid' }}>
                  {/* Subtle background glow accents */}
                  <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-400/20 rounded-full blur-xl pointer-events-none"></div>

                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-1.5 border-b border-white/20 pb-1 z-10">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-9 h-9 bg-white rounded-full p-0.5 shadow-md border border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
                        <img 
                          src={adminSettings?.profileImage || "/logo.png"} 
                          alt="AGARAM DHINES ONLINE ACADEMY" 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logo.png";
                          }}
                          className="w-full h-full object-cover rounded-full" 
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[9px] font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs truncate">
                          {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                        </h3>
                        <p className="text-[7.5px] font-extrabold text-amber-200 leading-tight drop-shadow-xs truncate">
                          அகரம் தினேஷ் ஆன்லைன் அகாடமி
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[6.5px] font-black bg-amber-400 text-indigo-950 px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                        OFFICIAL ID
                      </span>
                      <span className="text-[7px] font-extrabold text-sky-100 block mt-0.5 whitespace-nowrap">
                        📞 778054232
                      </span>
                    </div>
                  </div>

                  {/* Student Main Info Row */}
                  <div className="flex items-center gap-2 my-0.5 z-10">
                    <div className="w-10 h-10 rounded-full border-2 border-white/90 overflow-hidden shrink-0 bg-white/20 flex items-center justify-center shadow-md">
                      {student.image ? (
                        <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[11px] font-extrabold text-white truncate leading-tight drop-shadow-xs">
                        {student.name}
                      </h2>
                      <div className="flex items-center gap-2 text-[8px] text-sky-100 mt-0.5">
                        <span>Grade: <strong className="text-amber-200">{student.grade}</strong></span>
                        <span className="text-white/40">•</span>
                        <span>Roll No: <strong className="text-white">{student.rollNo || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Subjects List - Colorful Badges */}
                  <div className="z-10 bg-black/20 backdrop-blur-xs p-1 rounded-md border border-white/15">
                    <span className="text-[6.5px] font-black uppercase tracking-wider text-sky-200 block mb-0.5">
                      Subjects / பாடங்கள்:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-[26px] overflow-hidden">
                      {(() => {
                        const subs = student.subjects || student.enrolledClasses;
                        const badgeColors = [
                          'bg-amber-400 text-indigo-950',
                          'bg-emerald-400 text-indigo-950',
                          'bg-sky-300 text-indigo-950',
                          'bg-pink-300 text-indigo-950',
                          'bg-purple-300 text-indigo-950',
                          'bg-yellow-300 text-indigo-950',
                        ];
                        if (Array.isArray(subs) && subs.length > 0) {
                          return subs.map((s: string, idx: number) => (
                            <span 
                              key={idx} 
                              className={`text-[7px] font-black px-1.5 py-0.2 rounded shadow-xs whitespace-nowrap ${badgeColors[idx % badgeColors.length]}`}
                            >
                              {s}
                            </span>
                          ));
                        }
                        return (
                          <span className="text-[7px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-indigo-950">
                            All Registered Courses
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer Credentials & QR Code */}
                  <div className="flex items-end justify-between gap-1 mt-0.5 z-10">
                    <div className="bg-black/25 backdrop-blur-xs px-1.5 py-0.5 rounded border border-white/20 text-[7.5px] font-mono leading-tight flex-1">
                      <p className="text-white/80 flex justify-between"><span>User:</span> <span className="text-white font-bold">{student.username}</span></p>
                      <p className="text-white/80 flex justify-between"><span>Pass:</span> <span className="text-amber-200 font-bold">{student.password}</span></p>
                    </div>
                    <div className="bg-white p-0.5 rounded shrink-0 shadow-md">
                      <QRCodeSVG value={student.id} size={32} level="H" includeMargin={false} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {printMode === 'certificate' && (
            <div className="cert-container">
              {selectedStudentsData.map(student => (
                <div key={student.id} className="w-[11in] h-[8.5in] bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-10 relative break-inside-avoid shrink-0 flex flex-col justify-between overflow-hidden shadow-xl print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
                  {/* Ornate Gold & Royal Blue Borders */}
                  <div className="absolute inset-4 border-[10px] border-double border-indigo-900 rounded-3xl pointer-events-none"></div>
                  <div className="absolute inset-7 border-2 border-amber-400/80 rounded-2xl pointer-events-none"></div>
                  
                  {/* Ornate Corner Accents */}
                  <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-amber-500 pointer-events-none"></div>
                  <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-amber-500 pointer-events-none"></div>
                  <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-amber-500 pointer-events-none"></div>
                  <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-amber-500 pointer-events-none"></div>

                  {/* Background Watermark Logo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                    <Award size={520} className="text-indigo-900" />
                  </div>

                  <div className="relative z-10 h-full w-full flex flex-col items-center justify-between text-center px-12 py-4">
                    {/* Top Academy Logo & Branding Header */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg border-2 border-amber-400 mb-2 overflow-hidden flex items-center justify-center">
                        <img 
                          src={adminSettings?.profileImage || "/logo.png"} 
                          alt="AGARAM DHINES ONLINE ACADEMY" 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logo.png";
                          }}
                          className="w-full h-full object-cover rounded-full" 
                        />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-wider text-indigo-950 leading-tight">
                        {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                      </h3>
                      <p className="text-base font-extrabold text-amber-600 mt-0.5 tracking-wide">
                        அகரம் தினேஷ் ஆன்லைன் அகாடமி <span className="text-indigo-800 text-sm ml-2 font-bold">| 📞 778054232</span>
                      </p>
                    </div>

                    {/* Certificate Main Title */}
                    <div className="my-2">
                      <h1 className="text-5xl font-serif font-black text-indigo-900 tracking-wide uppercase drop-shadow-xs">
                        Certificate of Excellence
                      </h1>
                      <p className="text-sm font-black text-amber-600 uppercase tracking-[0.3em] mt-1">
                        Official Academic Award
                      </p>
                    </div>

                    {/* Presentation Line & Name */}
                    <div className="w-full max-w-3xl">
                      <p className="text-base text-gray-600 font-medium tracking-widest uppercase mb-1">
                        This is proudly presented to
                      </p>
                      <h2 className="text-4xl font-extrabold text-indigo-950 border-b-4 border-amber-400 pb-2 px-10 inline-block font-serif drop-shadow-xs">
                        {student.name}
                      </h2>
                    </div>

                    {/* Citation */}
                    <p className="text-lg text-gray-700 max-w-3xl leading-relaxed font-serif my-2">
                      For outstanding academic performance, dedication, and active participation in <span className="font-bold text-indigo-900">Grade {student.grade}</span> at AGARAM DHINES ONLINE ACADEMY.
                    </p>

                    {/* Footer with Signatures, Seal & Student Credentials + QR */}
                    <div className="flex justify-between items-end w-full mt-auto pt-4">
                      {/* Date */}
                      <div className="text-center w-48">
                        <p className="font-bold text-gray-900 text-sm mb-1">{new Date().toLocaleDateString()}</p>
                        <div className="w-full border-b-2 border-indigo-900 mb-1"></div>
                        <p className="font-bold text-indigo-900 text-xs uppercase tracking-widest">Date / தேதி</p>
                      </div>

                      {/* Center Stamp & Credentials Badge */}
                      <div className="flex items-center gap-4 bg-white/90 p-3 rounded-2xl border-2 border-amber-300 shadow-md backdrop-blur-sm">
                        <div className="bg-white p-1 rounded-lg border border-indigo-100 shadow-xs">
                          <QRCodeSVG value={student.id} size={70} level="H" includeMargin={false} />
                        </div>
                        <div className="text-left text-xs font-medium text-slate-800 space-y-0.5">
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">Roll No:</span> <strong className="text-slate-900">{student.rollNo || 'N/A'}</strong></p>
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">Username:</span> <span className="font-mono font-bold text-indigo-700">{student.username}</span></p>
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">Password:</span> <span className="font-mono font-bold text-amber-600">{student.password}</span></p>
                        </div>
                      </div>

                      {/* Director Signature */}
                      <div className="text-center w-48">
                        <div className="font-serif italic text-xl text-indigo-900 font-bold mb-1">Dhines Nivas</div>
                        <div className="w-full border-b-2 border-indigo-900 mb-1"></div>
                        <p className="font-bold text-indigo-900 text-xs uppercase tracking-widest">Director / இயக்குனர்</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
