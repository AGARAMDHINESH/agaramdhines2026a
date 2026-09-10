import React, { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, Save, Mail } from 'lucide-react';
import { getStaffs, saveStaffs } from '../../lib/db';

export default function ManageStaffLogin() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [staffData, setStaffData] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '' });

  useEffect(() => {
    loadStaffs();
  }, []);

  const loadStaffs = async () => {
    const data = await getStaffs();
    setStaffData(data || []);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleEdit = (staff: any) => {
    setEditingId(staff.id);
    setEditForm({ username: staff.username || '', password: staff.password || '' });
  };

  const handleSave = async (id: string) => {
    const updatedStaffs = staffData.map(s => 
      s.id === id ? { ...s, username: editForm.username, password: editForm.password } : s
    );
    await saveStaffs(updatedStaffs);
    setStaffData(updatedStaffs);
    setEditingId(null);
    alert('Login credentials updated successfully!');
  };

  const filteredStaff = staffData.filter(staff => {
    const matchesSearch = staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          staff.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? staff.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Staff Login</h1>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="w-full lg:w-1/4">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-fit">
            <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">Filters</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Name or Username" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="">All Roles</option>
                <option value="Teacher">Teacher</option>
                <option value="Management">Management</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            
            <button 
              onClick={() => { setSearchQuery(''); setRoleFilter(''); }}
              className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Right Main Area */}
        <div className="w-full lg:w-3/4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.length > 0 ? (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {staff.role || 'Teacher'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingId === staff.id ? (
                            <input 
                              type="text" 
                              value={editForm.username}
                              onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                              className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            staff.username
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            {editingId === staff.id ? (
                              <input 
                                type={visiblePasswords[staff.id] ? "text" : "password"}
                                value={editForm.password}
                                onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs tracking-wider">
                                {visiblePasswords[staff.id] ? staff.password : '••••••••'}
                              </span>
                            )}
                            <button 
                              onClick={() => togglePasswordVisibility(staff.id)}
                              className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              {visiblePasswords[staff.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          {editingId === staff.id ? (
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => handleSave(staff.id)}
                                className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-md"
                                title="Save"
                              >
                                <Save size={18} />
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="text-gray-600 hover:text-gray-900 bg-gray-100 p-1.5 rounded-md"
                                title="Cancel"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => handleEdit(staff)}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-md text-xs font-medium"
                              >
                                Edit Login
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        No staff members found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
