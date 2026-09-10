import React, { useState, useEffect } from "react";
import { getStudents, saveStudents, getClasses } from "../../lib/db";

export default function PromoteStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    getStudents().then(setStudents);
    getClasses().then(setClasses);
  }, []);

  const filteredStudents = fromClass
    ? students.filter((s) => s.grade === fromClass)
    : [];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handlePromote = async () => {
    if (!toClass) {
      alert("Please select a class to promote to.");
      return;
    }
    if (selectedIds.length === 0) {
      alert("Please select at least one student.");
      return;
    }
    if (fromClass === toClass) {
      alert("Source and destination classes cannot be the same.");
      return;
    }

    if (window.confirm(`Are you sure you want to promote ${selectedIds.length} students to ${toClass}?`)) {
      const updatedStudents = students.map((s) =>
        selectedIds.includes(s.id) ? { ...s, grade: toClass } : s
      );
      await saveStudents(updatedStudents);
      setStudents(updatedStudents);
      setSelectedIds([]);
      setFromClass("");
      setToClass("");
      alert("Students promoted successfully!");
    }
  };

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Promote Students</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left: Filter */}
        <div className="w-full lg:w-1/4 bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-fit">
          <h2 className="font-bold text-lg mb-4 text-gray-700">1. Select Current Class</h2>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Class</label>
          <select
            value={fromClass}
            onChange={(e) => {
              setFromClass(e.target.value);
              setSelectedIds([]); // Reset selection on class change
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Class --</option>
            {classes.length > 0 ? (
              classes.map((cls) => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))
            ) : (
              GRADES.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))
            )}
          </select>
        </div>

        {/* Center: Students Table */}
        <div className="w-full lg:w-2/4 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h2 className="font-bold text-lg mb-4 text-gray-700">2. Select Students</h2>
          {fromClass ? (
            filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={handleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(student.id)}
                            onChange={() => handleSelect(student.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{student.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">No students found in this class.</p>
            )
          ) : (
            <p className="text-gray-500 text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">Please select a class from the left panel to view students.</p>
          )}
        </div>

        {/* Right: Action */}
        <div className="w-full lg:w-1/4 bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-fit">
          <h2 className="font-bold text-lg mb-4 text-gray-700">3. Promote To</h2>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Class</label>
          <select
            value={toClass}
            onChange={(e) => setToClass(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 mb-6"
          >
            <option value="">-- Select Target Class --</option>
            {classes.length > 0 ? (
              classes.map((cls) => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))
            ) : (
              GRADES.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))
            )}
          </select>
          
          <div className="bg-blue-50 p-3 rounded-md mb-6 border border-blue-100">
            <p className="text-sm text-blue-800 text-center">
              <span className="block text-2xl font-bold mb-1">{selectedIds.length}</span>
              students selected
            </p>
          </div>

          <button
            onClick={handlePromote}
            disabled={selectedIds.length === 0 || !toClass}
            className={`w-full py-3 px-4 rounded-md font-bold text-white transition-colors shadow-sm ${
              selectedIds.length === 0 || !toClass
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
