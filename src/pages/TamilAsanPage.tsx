import React from "react";
import TamilAsanChat from "../components/TamilAsanChat";
import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap } from "lucide-react";

export default function TamilAsanPage() {
  return (
    <div className="h-screen max-h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Header bar */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">முகப்பு</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap size={18} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-amber-100 leading-tight">
                AI அகரம் தினேஷ் தமிழ் ஆசான்
              </h1>
              <p className="text-[11px] text-slate-400">
                AGARAM DHINES ONLINE ACADEMY - தனிப்பயன் AI வழிகாட்டி
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>

      {/* Main Full Page Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-4 max-w-5xl w-full mx-auto overflow-hidden">
        <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <TamilAsanChat isEmbedded={false} />
        </div>
      </div>
    </div>
  );
}
