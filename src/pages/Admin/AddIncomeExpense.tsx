import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { getIncomeExpense, saveIncomeExpense } from '../../lib/db';

export default function AddIncomeExpense() {
  const [type, setType] = useState<'Income' | 'Expense'>('Income');
  const [formData, setFormData] = useState({
    date: '',
    description: '',
    amount: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.amount) return;
    
    try {
      const existingData = await getIncomeExpense() || [];
      const newEntry = {
        id: Date.now().toString(),
        type,
        date: formData.date,
        description: formData.description,
        amount: Number(formData.amount),
        createdAt: new Date().toISOString()
      };
      
      const updatedData = [...existingData, newEntry];
      await saveIncomeExpense(updatedData);
      
      alert(`Successfully added ${type}: ${formData.amount}`);
      setFormData({ date: '', description: '', amount: '' });
    } catch (error) {
      console.error("Error saving income/expense:", error);
      alert("Error saving data.");
    }
  };

  return (
    <div className="p-6 flex justify-center items-start min-h-[80vh]">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mt-10">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-4 text-center font-semibold transition-colors ${type === 'Income' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setType('Income')}
          >
            Add Income
          </button>
          <button 
            className={`flex-1 py-4 text-center font-semibold transition-colors ${type === 'Expense' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setType('Expense')}
          >
            Add Expense
          </button>
        </div>

        <div className="p-8">
          {/* Legend */}
          <div className="flex gap-4 text-xs mb-6 justify-end">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Required</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Optional</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar size={18} className="text-gray-400" />
                </div>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter details..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            {/* Amount Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">₹</span>
                </div>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                className={`w-full py-3.5 px-4 rounded-full font-bold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  type === 'Income' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                + Add {type}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
