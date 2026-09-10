import React, { useRef } from "react";
import { Award, Download, Printer, ShieldCheck, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface StaffCertificateViewProps {
  staff: any;
  adminSettings?: any;
}

export default function StaffCertificateView({ staff, adminSettings }: StaffCertificateViewProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (format: "png" | "pdf") => {
    if (!certRef.current) return;
    try {
      const imgData = await toPng(certRef.current, { pixelRatio: 3, backgroundColor: "#ffffff" });

      if (format === "png") {
        const link = document.createElement("a");
        link.download = `${staff.name.replace(/\s+/g, "_")}_Certificate.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "in",
          format: [11, 8.5]
        });
        pdf.addImage(imgData, "PNG", 0, 0, 11, 8.5);
        pdf.save(`${staff.name.replace(/\s+/g, "_")}_Certificate.pdf`);
      }
    } catch (err) {
      console.error("Failed to generate Certificate:", err);
      alert("Failed to download Certificate. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const instName = adminSettings?.instituteName || "AGARAM DHINES ACADEMY";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-400/30">
            <Award size={14} className="text-yellow-400" /> Official Certificate of Service
          </div>
          <h1 className="text-2xl font-black">Staff Service Certificate</h1>
          <p className="text-blue-200 text-xs mt-0.5">Appreciation and experience credential for {staff.name}</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => handleDownload("png")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <Download size={14} /> Download PNG
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Certificate Frame */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center overflow-x-auto">
        <div
          ref={certRef}
          className="w-[780px] h-[550px] bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-8 rounded-2xl border-8 border-double border-amber-600/80 shadow-2xl relative flex flex-col justify-between select-none text-gray-800 shrink-0"
        >
          {/* Inner Decorative Corner Borders */}
          <div className="absolute inset-2 border border-amber-300 pointer-events-none rounded-lg" />
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-600" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-600" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-600" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-600" />

          {/* Certificate Header */}
          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center gap-2 mb-1">
              {adminSettings?.profileImage ? (
                <img src={adminSettings.profileImage} alt="Logo" className="w-10 h-10 object-cover rounded-full shadow-sm" />
              ) : (
                <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
                  ★
                </div>
              )}
              <h2 className="font-black text-xl text-blue-950 tracking-wider uppercase font-serif">
                {instName}
              </h2>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
              Centre for Academic Excellence & Digital Learning
            </p>

            <div className="mt-3">
              <h1 className="text-2xl font-black text-amber-700 tracking-widest uppercase font-serif">
                Certificate of Service & Appreciation
              </h1>
              <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-1" />
            </div>
          </div>

          {/* Body Content */}
          <div className="text-center my-auto space-y-3 relative z-10 px-8">
            <p className="text-xs text-gray-500 font-serif italic">This is proudly certified and presented to</p>
            
            <h3 className="text-3xl font-black text-blue-950 tracking-wide font-serif border-b-2 border-amber-400 pb-1 inline-block px-8">
              {staff.name}
            </h3>

            <p className="text-xs text-gray-600 max-w-xl mx-auto leading-relaxed pt-2">
              In sincere recognition and appreciation of their dedicated service, excellence in{" "}
              <strong className="text-gray-900 font-semibold">{staff.specialization || "Graphic Design & Examination Typing"}</strong>,{" "}
              and continuous professional contributions as{" "}
              <strong className="text-blue-900 font-semibold">{staff.role || "Design Worker / Staff"}</strong> at {instName}.
            </p>
          </div>

          {/* Footer with Signatures & Seal */}
          <div className="flex items-end justify-between px-8 relative z-10 pt-4">
            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1" />
              <p className="text-[10px] font-bold text-gray-700 uppercase">Director / Principal</p>
              <p className="text-[9px] text-gray-500">{instName}</p>
            </div>

            {/* Official Gold Seal badge */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-dashed border-white flex flex-col items-center justify-center text-white">
                  <span className="text-[8px] font-black tracking-widest">OFFICIAL</span>
                  <span className="text-[11px] font-black">★ SEAL ★</span>
                  <span className="text-[7px] font-bold">AGARAM</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1" />
              <p className="text-[10px] font-bold text-gray-700 uppercase">Issue Date</p>
              <p className="text-[9px] text-gray-500">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
