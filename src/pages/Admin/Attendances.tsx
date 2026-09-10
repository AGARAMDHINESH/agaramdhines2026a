import React, { useState, useEffect } from "react";
import { getStudents, getAttendance, saveAttendance, getStaffs, getStaffAttendance } from "../../lib/db";
import { Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle, FileText } from "lucide-react";

export default function Attendances() {
  const [activeTab, setActiveTab] = useState<"students" | "staffs">("students");
  
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  
  const [staffs, setStaffs] = useState<any[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [showReport, setShowReport] = useState(false);

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const [selectedGrade, setSelectedGrade] = useState("தரம் 10");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadData = async () => {
      setStudents(await getStudents());
      setAttendance(await getAttendance());
      setStaffs(await getStaffs());
      setStaffAttendance(await getStaffAttendance());
    };
    loadData();
  }, []);

  const handleMarkAttendance = async (studentId: string, status: "Present" | "Absent" | "Leave" | "Late") => {
    const newRecord = {
      id: Date.now().toString() + studentId,
      studentId,
      date,
      status
    };

    const existingIndex = attendance.findIndex(a => a.studentId === studentId && a.date === date);
    let updatedAttendance = [...attendance];
    
    if (existingIndex >= 0) {
      updatedAttendance[existingIndex] = newRecord;
    } else {
      updatedAttendance.push(newRecord);
    }

    setAttendance(updatedAttendance);
    await saveAttendance(updatedAttendance);
  };

  const filteredStudents = students.filter(s => s.grade === selectedGrade);

  const renderMonthlyReport = () => {
    if (!showReport) return null;
    
    const [year, month] = date.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 text-lg">
              Monthly Attendance Report - {selectedGrade} ({new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' })})
            </h3>
            <button onClick={() => setShowReport(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
              <XCircle size={24} />
            </button>
          </div>
          
          <div className="p-4 overflow-auto flex-1">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3 border border-gray-200 sticky left-0 bg-gray-100 z-20">Student Name</th>
                  <th className="p-3 border border-gray-200 sticky left-[150px] bg-gray-100 z-20">Student ID</th>
                  {days.map(day => (
                    <th key={day} className="p-2 border border-gray-200 text-center w-8">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-800 text-sm">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-blue-50/50">
                    <td className="p-3 border border-gray-200 sticky left-0 bg-white z-10 font-medium">{student.name}</td>
                    <td className="p-3 border border-gray-200 sticky left-[150px] bg-white z-10 text-gray-500">{student.student_id || student.id}</td>
                    {days.map(day => {
                      const currentDate = `${year}-${month}-${day.toString().padStart(2, '0')}`;
                      const record = attendance.find(a => a.studentId === student.id && a.date === currentDate);
                      let statusText = "-";
                      let statusColor = "text-gray-400";
                      
                      if (record) {
                        switch (record.status) {
                          case "Present": statusText = "P"; statusColor = "text-green-600 font-bold"; break;
                          case "Absent": statusText = "A"; statusColor = "text-red-600 font-bold"; break;
                          case "Leave": statusText = "L"; statusColor = "text-yellow-600 font-bold"; break;
                          case "Late": statusText = "T"; statusColor = "text-orange-600 font-bold"; break;
                        }
                      }
                      
                      return (
                        <td key={day} className={`p-2 border border-gray-200 text-center ${statusColor}`}>
                          {statusText}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-4 text-sm font-medium text-gray-600">
            <span className="flex items-center gap-1"><span className="text-green-600 font-bold">P</span> = Present</span>
            <span className="flex items-center gap-1"><span className="text-red-600 font-bold">A</span> = Absent</span>
            <span className="flex items-center gap-1"><span className="text-yellow-600 font-bold">L</span> = Leave</span>
            <span className="flex items-center gap-1"><span className="text-orange-600 font-bold">T</span> = Late</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {renderMonthlyReport()}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-gray-100 bg-gradient-to-r from-white/60 to-white/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Users className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Attendance Portal</h2>
                  <p className="text-sm text-gray-500 font-medium">Manage daily student & staff records</p>
                </div>
              </div>
              
              <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shadow-inner">
                <button 
                  onClick={() => setActiveTab("students")}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "students" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Students
                </button>
                <button 
                  onClick={() => setActiveTab("staffs")}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "staffs" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Staffs
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 md:p-8">
            {activeTab === "students" ? (
              <>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-6 mb-8 bg-white/60 p-5 rounded-2xl border border-white shadow-sm items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Class</label>
                    <select 
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="w-full border-2 border-blue-100 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white font-medium text-gray-700 transition-all cursor-pointer"
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar size={18} className="text-blue-400" />
                      </div>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white font-medium text-gray-700 transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex-none">
                    <button
                      onClick={() => setShowReport(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-md shadow-blue-600/20"
                    >
                      <FileText size={20} />
                      Monthly Report
                    </button>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-600 text-sm font-bold uppercase tracking-wider">
                          <th className="p-5 border-b border-gray-100">Student Info</th>
                          <th className="p-5 border-b border-gray-100 text-center">Mark Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-800">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="p-12 text-center">
                              <div className="flex flex-col items-center justify-center text-gray-400">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p className="text-lg font-medium text-gray-500">No students found for this class.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map(student => {
                            const record = attendance.find(a => a.studentId === student.id && a.date === date);
                            const status = record?.status;
                            
                            return (
                              <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group border-b border-gray-50 last:border-0">
                                <td className="p-5">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-blue-600 font-bold shadow-sm">
                                      {student.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-800 text-base">{student.name}</p>
                                      <p className="text-[10px] text-blue-500 font-bold uppercase mt-0.5">Roll No: {student.rollNo || "N/A"}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-5">
                                  <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                                    {/* Present Pill */}
                                    <label className="cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`attendance-${student.id}`} 
                                        className="peer sr-only"
                                        checked={status === "Present"}
                                        onChange={() => handleMarkAttendance(student.id, "Present")}
                                      />
                                      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 border-2 border-transparent bg-gray-100 text-gray-500 hover:bg-green-50 peer-checked:bg-green-500 peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-green-500/30 peer-checked:scale-105">
                                        <CheckCircle size={16} className={status === "Present" ? "text-white" : "text-green-500"} />
                                        Present
                                      </div>
                                    </label>

                                    {/* Absent Pill */}
                                    <label className="cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`attendance-${student.id}`} 
                                        className="peer sr-only"
                                        checked={status === "Absent"}
                                        onChange={() => handleMarkAttendance(student.id, "Absent")}
                                      />
                                      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 border-2 border-transparent bg-gray-100 text-gray-500 hover:bg-red-50 peer-checked:bg-red-500 peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-red-500/30 peer-checked:scale-105">
                                        <XCircle size={16} className={status === "Absent" ? "text-white" : "text-red-500"} />
                                        Absent
                                      </div>
                                    </label>

                                    {/* Leave Pill */}
                                    <label className="cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`attendance-${student.id}`} 
                                        className="peer sr-only"
                                        checked={status === "Leave"}
                                        onChange={() => handleMarkAttendance(student.id, "Leave")}
                                      />
                                      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 border-2 border-transparent bg-gray-100 text-gray-500 hover:bg-yellow-50 peer-checked:bg-yellow-400 peer-checked:text-yellow-900 peer-checked:shadow-lg peer-checked:shadow-yellow-400/30 peer-checked:scale-105">
                                        <AlertCircle size={16} className={status === "Leave" ? "text-yellow-900" : "text-yellow-500"} />
                                        Leave
                                      </div>
                                    </label>

                                    {/* Late Pill */}
                                    <label className="cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`attendance-${student.id}`} 
                                        className="peer sr-only"
                                        checked={status === "Late"}
                                        onChange={() => handleMarkAttendance(student.id, "Late")}
                                      />
                                      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 border-2 border-transparent bg-gray-100 text-gray-500 hover:bg-orange-50 peer-checked:bg-orange-500 peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-orange-500/30 peer-checked:scale-105">
                                        <Clock size={16} className={status === "Late" ? "text-white" : "text-orange-500"} />
                                        Late
                                      </div>
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                  <h3 className="text-lg font-bold text-gray-800">Staff Activity & Attendance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4 border-b border-gray-100">Date & Time</th>
                        <th className="p-4 border-b border-gray-100">Staff Name</th>
                        <th className="p-4 border-b border-gray-100">Activity Type</th>
                        <th className="p-4 border-b border-gray-100">Details</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                      {staffAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">No staff attendance records found.</td>
                        </tr>
                      ) : (
                        staffAttendance.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
                          <tr key={record.id} className="hover:bg-purple-50/30 transition-colors border-b border-gray-50 last:border-0">
                            <td className="p-4 font-medium text-gray-600">{new Date(record.date).toLocaleString()}</td>
                            <td className="p-4 font-bold text-gray-800">{record.staffName}</td>
                            <td className="p-4">
                              <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-bold">
                                {record.type}
                              </span>
                            </td>
                            <td className="p-4 text-gray-500">{record.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
