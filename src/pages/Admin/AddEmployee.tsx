import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStaffs, saveStaffs } from '../../lib/db';

export default function AddEmployee() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '',
    image: '',
    joinDate: '',
    salary: '',
    fatherName: '',
    gender: '',
    experience: '',
    nationalId: '',
    religion: '',
    email: '',
    education: '',
    bloodGroup: '',
    address: '',
    username: '',
    password: '',
    assignedClasses: [] as any[],
    specialization: '',
    monthlyTarget: '',
    workNotes: ''
  });

  useEffect(() => {
    if (id) {
      loadStaffData();
    }
  }, [id]);

  const loadStaffData = async () => {
    const staffs = await getStaffs();
    const staff = staffs.find((s: any) => s.id === id);
    if (staff) {
      setFormData({
        name: staff.name || '',
        phone: staff.phone || '',
        role: staff.role || '',
        image: staff.image || '',
        joinDate: staff.joinDate || '',
        salary: staff.salary || '',
        fatherName: staff.fatherName || '',
        gender: staff.gender || '',
        experience: staff.experience || '',
        nationalId: staff.nationalId || '',
        religion: staff.religion || '',
        email: staff.email || '',
        education: staff.education || '',
        bloodGroup: staff.bloodGroup || '',
        address: staff.address || '',
        username: staff.username || '',
        password: staff.password || '',
        assignedClasses: staff.assignedClasses || [],
        specialization: staff.specialization || '',
        monthlyTarget: staff.monthlyTarget || '',
        workNotes: staff.workNotes || ''
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input Validation
    if (!formData.name.trim()) {
      alert("Please enter employee name");
      return;
    }
    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone.trim())) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    if (!formData.role.trim()) {
      alert("Please select a role");
      return;
    }
    if (!formData.joinDate) {
      alert("Please select a join date");
      return;
    }
    if (!formData.username.trim()) {
      alert("Please enter a username");
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      alert("Please enter a password with at least 6 characters");
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }
    if (formData.salary && isNaN(Number(formData.salary))) {
      alert("Please enter a valid salary amount");
      return;
    }

    const currentStaffs = await getStaffs();
    let updatedStaffs: any[] = [];
    
    if (id) {
      const exists = currentStaffs.some((s: any) => String(s.id) === String(id));
      if (exists) {
        updatedStaffs = currentStaffs.map((s: any) => String(s.id) === String(id) ? { ...s, ...formData, id } : s);
      } else {
        updatedStaffs = [...currentStaffs, { ...formData, id }];
      }
    } else {
      const newStaff = {
        id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...formData,
        createdAt: Date.now()
      };
      // Keep existing staffs and append new employee
      const existingWithoutDupe = currentStaffs.filter((s: any) => s && String(s.id) !== newStaff.id);
      updatedStaffs = [...existingWithoutDupe, newStaff];
    }

    await saveStaffs(updatedStaffs);
    alert(`Employee ${id ? 'updated' : 'added'} successfully!`);
    navigate('/admin/staffs');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{id ? 'Edit Employee' : 'Add New Employee'}</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <form className="p-6" onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name <span className="text-red-500">*</span></label>
                <input name="name" value={formData.name} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No <span className="text-red-500">*</span></label>
                <input name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter mobile number" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Role <span className="text-red-500">*</span></label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white" required>
                  <option value="">Select Role</option>
                  <option value="Teacher">Teacher (ஆசிரியர்)</option>
                  <option value="Management">Management Staff (நிர்வாக பணியாளர்)</option>
                  <option value="Design Worker">Design Worker / Typist (வடிவமைப்பு & தட்டச்சு பணியாளர்)</option>
                  <option value="Technical Staff">Technical & Media Staff (தொழில்நுட்ப பணியாளர்)</option>
                  <option value="Admin">Admin (முதன்மை நிர்வாகி)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Picture Upload</label>
                <input type="file" onChange={handleImageUpload} accept="image/*" className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining <span className="text-red-500">*</span></label>
                <input name="joinDate" value={formData.joinDate} onChange={handleChange} type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (LKR)</label>
                <input name="salary" value={formData.salary} onChange={handleChange} type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Work & Technical Responsibilities (For Design Workers / Staff) */}
          {(formData.role === "Design Worker" || formData.role === "Technical Staff" || formData.role === "Management") && (
            <div className="mb-8 p-5 bg-blue-50/70 rounded-xl border border-blue-100">
              <h2 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                🎨 Work & Responsibilities (பணிகள் மற்றும் பொறுப்புகள்)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization / Primary Work</label>
                  <input 
                    name="specialization" 
                    value={formData.specialization} 
                    onChange={handleChange} 
                    type="text" 
                    className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    placeholder="e.g. Question Paper Typing, Graphic Design, Thumbnails, Course Materials" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Monthly Tasks / Output</label>
                  <input 
                    name="monthlyTarget" 
                    value={formData.monthlyTarget} 
                    onChange={handleChange} 
                    type="number" 
                    className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    placeholder="e.g. 25 tasks / month" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Scope / Instructions</label>
                  <textarea 
                    name="workNotes" 
                    value={formData.workNotes} 
                    onChange={handleChange} 
                    rows={2} 
                    className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    placeholder="Enter specific duties, daily typing assignments, graphic design requirements..." 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Other Information Section */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">Other Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father/Husband Name</label>
                <input name="fatherName" value={formData.fatherName} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                <input name="experience" value={formData.experience} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 5 Years" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                <input name="nationalId" value={formData.nationalId} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter ID number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                <select name="religion" value={formData.religion} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="">Select Religion</option>
                  <option value="Hinduism">Hinduism</option>
                  <option value="Islam">Islam</option>
                  <option value="Christianity">Christianity</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter email address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                <input name="education" value={formData.education} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. B.Ed, M.Sc" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter full address"></textarea>
            </div>
          </div>
          
          {/* Login Details Section */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">Login Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                <input name="username" value={formData.username} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter username" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input name="password" value={formData.password} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter password" required />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/admin/staffs')} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">
              {id ? 'Update Employee' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
