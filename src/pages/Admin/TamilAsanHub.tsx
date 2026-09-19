import React from 'react';
import { useNavigate } from 'react-router-dom';
import TamilAsanKnowledgeHub from '../../components/TamilAsanKnowledgeHub';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function TamilAsanHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Quick Nav Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} /> Admin Dashboard
        </button>

        <button
          onClick={() => navigate('/admin/course-materials')}
          className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          <BookOpen size={16} /> மாணவர் Course Materials பக்கம் செல்ல ➔
        </button>
      </div>

      {/* Main Knowledge Hub Component */}
      <TamilAsanKnowledgeHub />
    </div>
  );
}
