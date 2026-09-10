import React from "react";
import { Award } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export interface CertificateData {
  id: string;
  name: string;
  grade?: string;
  course?: string;
  role?: string;
  rollNo?: string;
  phone?: string;
  username?: string;
  password?: string;
  issueDate?: string;
}

export interface CertificateProps {
  data: CertificateData;
  adminSettings?: {
    instituteName?: string;
    profileImage?: string;
    phone?: string;
  } | null;
  title?: string;
  subtitle?: string;
  type?: "student" | "staff";
  variant?: "full" | "preview";
  id?: string;
}

export const Certificate: React.FC<CertificateProps> = ({
  data,
  adminSettings,
  title = "Certificate of Excellence",
  subtitle = "Official Academic Award",
  type = "student",
  variant = "full",
  id,
}) => {
  const logoUrl =
    adminSettings?.profileImage ||
    "/logo.png";
  const instituteName =
    adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY";
  const formattedDate = data.issueDate || new Date().toLocaleDateString();

  if (variant === "preview") {
    return (
      <div
        id={id}
        className="w-[800px] h-[565px] bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-6 relative overflow-hidden flex flex-col justify-between items-center text-center shadow-2xl select-none"
      >
        {/* Ornate Gold & Royal Blue Borders */}
        <div className="absolute inset-3 border-[8px] border-double border-indigo-900 rounded-2xl pointer-events-none"></div>
        <div className="absolute inset-5 border border-amber-400/80 rounded-xl pointer-events-none"></div>

        {/* Ornate Corner Accents */}
        <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-amber-500 pointer-events-none"></div>
        <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-amber-500 pointer-events-none"></div>
        <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-amber-500 pointer-events-none"></div>
        <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-amber-500 pointer-events-none"></div>

        {/* Background Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Award size={380} className="text-indigo-900" />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-2 px-6">
          {/* Top Academy Logo & Branding Header */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-white rounded-full p-0.5 shadow-md border-2 border-amber-400 mb-1 overflow-hidden flex items-center justify-center">
              <img
                src={logoUrl}
                alt={instituteName}
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/logo.png";
                }}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-indigo-950 leading-tight">
              {instituteName}
            </h3>
            <p className="text-xs font-extrabold text-amber-600 tracking-wide mt-0.5">
              அகரம் தினேஷ் ஆன்லைன் அகாடமி{" "}
              <span className="text-indigo-800 text-[11px] ml-1 font-bold">
                | 📞 {adminSettings?.phone || "778054232"}
              </span>
            </p>
          </div>

          {/* Certificate Main Title */}
          <div>
            <h1 className="text-3xl font-serif font-black text-indigo-900 tracking-wide uppercase drop-shadow-xs">
              {title}
            </h1>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em]">
              {subtitle}
            </p>
          </div>

          {/* Presentation Line & Name */}
          <div className="w-full">
            <p className="text-xs text-gray-500 font-medium tracking-widest uppercase mb-0.5">
              This is proudly presented to
            </p>
            <h2 className="text-2xl font-extrabold text-indigo-950 border-b-2 border-amber-400 pb-1 px-8 inline-block font-serif drop-shadow-xs">
              {data.name}
            </h2>
          </div>

          {/* Citation */}
          <p className="text-sm text-gray-700 max-w-xl leading-relaxed font-serif my-1">
            {type === "staff" ? (
              <>
                For outstanding dedication, leadership, and invaluable service
                as{" "}
                <span className="font-bold text-indigo-900">
                  {data.role || "Staff Member"}
                </span>{" "}
                at {instituteName}.
              </>
            ) : (
              <>
                For outstanding academic performance, dedication, and active
                participation in{" "}
                <span className="font-bold text-indigo-900">
                  {data.course || (data.grade ? `Grade ${data.grade}` : "Course Completion")}
                </span>{" "}
                at {instituteName}.
              </>
            )}
          </p>

          {/* Footer with Signatures, Seal & Student Credentials + QR */}
          <div className="flex justify-between items-end w-full mt-auto pt-2 px-4">
            {/* Date */}
            <div className="text-center w-32">
              <p className="font-bold text-gray-900 text-xs mb-0.5">
                {formattedDate}
              </p>
              <div className="w-full border-b border-indigo-900 mb-0.5"></div>
              <p className="font-bold text-indigo-900 text-[10px] uppercase tracking-widest">
                Date / தேதி
              </p>
            </div>

            {/* Center Stamp & Credentials Badge */}
            <div className="flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm backdrop-blur-sm">
              <div className="bg-white p-0.5 rounded border border-indigo-100 shadow-2xs">
                <QRCodeSVG
                  value={data.id || "CERT-ID"}
                  size={48}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-left text-[10px] font-medium text-slate-800 space-y-0.5">
                {data.rollNo && (
                  <p>
                    <span className="font-bold text-indigo-900 w-12 inline-block">
                      Roll No:
                    </span>{" "}
                    <strong>{data.rollNo}</strong>
                  </p>
                )}
                {data.username && (
                  <p>
                    <span className="font-bold text-indigo-900 w-12 inline-block">
                      User:
                    </span>{" "}
                    <span className="font-mono font-bold text-indigo-700">
                      {data.username}
                    </span>
                  </p>
                )}
                {data.password && (
                  <p>
                    <span className="font-bold text-indigo-900 w-12 inline-block">
                      Pass:
                    </span>{" "}
                    <span className="font-mono font-bold text-amber-600">
                      {data.password}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Director Signature */}
            <div className="text-center w-32">
              <div className="font-serif italic text-base text-indigo-900 font-bold mb-0.5">
                Dhines Nivas
              </div>
              <div className="w-full border-b border-indigo-900 mb-0.5"></div>
              <p className="font-bold text-indigo-900 text-[10px] uppercase tracking-widest">
                Director / இயக்குனர்
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default "full" printable size (11in x 8.5in)
  return (
    <div
      id={id}
      className="w-[11in] h-[8.5in] bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-10 relative shrink-0 flex flex-col justify-between overflow-hidden shadow-2xl print:shadow-none select-none"
      style={{ pageBreakInside: "avoid" }}
    >
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
              src={logoUrl}
              alt={instituteName}
              crossOrigin="anonymous"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/logo.png";
              }}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-wider text-indigo-950 leading-tight">
            {instituteName}
          </h3>
          <p className="text-base font-extrabold text-amber-600 mt-0.5 tracking-wide">
            அகரம் தினேஷ் ஆன்லைன் அகாடமி{" "}
            <span className="text-indigo-800 text-sm ml-2 font-bold">
              | 📞 {adminSettings?.phone || "778054232"}
            </span>
          </p>
        </div>

        {/* Certificate Main Title */}
        <div className="my-2">
          <h1 className="text-5xl font-serif font-black text-indigo-900 tracking-wide uppercase drop-shadow-xs">
            {title}
          </h1>
          <p className="text-sm font-black text-amber-600 uppercase tracking-[0.3em] mt-1">
            {subtitle}
          </p>
        </div>

        {/* Presentation Line & Name */}
        <div className="w-full max-w-3xl">
          <p className="text-base text-gray-600 font-medium tracking-widest uppercase mb-1">
            This is proudly presented to
          </p>
          <h2 className="text-4xl font-extrabold text-indigo-950 border-b-4 border-amber-400 pb-2 px-10 inline-block font-serif drop-shadow-xs">
            {data.name}
          </h2>
        </div>

        {/* Citation */}
        <p className="text-lg text-gray-700 max-w-3xl leading-relaxed font-serif my-2">
          {type === "staff" ? (
            <>
              For outstanding dedication, leadership, and invaluable service as{" "}
              <span className="font-bold text-indigo-900">
                {data.role || "Staff Member"}
              </span>{" "}
              at {instituteName}.
            </>
          ) : (
            <>
              For outstanding academic performance, dedication, and active
              participation in{" "}
              <span className="font-bold text-indigo-900">
                {data.course || (data.grade ? `Grade ${data.grade}` : "Course Completion")}
              </span>{" "}
              at {instituteName}.
            </>
          )}
        </p>

        {/* Footer with Signatures, Seal & Credentials + QR */}
        <div className="flex justify-between items-end w-full mt-auto pt-4">
          {/* Date */}
          <div className="text-center w-48">
            <p className="font-bold text-gray-900 text-sm mb-1">
              {formattedDate}
            </p>
            <div className="w-full border-b-2 border-indigo-900 mb-1"></div>
            <p className="font-bold text-indigo-900 text-xs uppercase tracking-widest">
              Date / தேதி
            </p>
          </div>

          {/* Center Stamp & Credentials Badge */}
          <div className="flex items-center gap-4 bg-white/90 p-3 rounded-2xl border-2 border-amber-300 shadow-md backdrop-blur-sm">
            <div className="bg-white p-1 rounded-lg border border-indigo-100 shadow-xs">
              <QRCodeSVG
                value={data.id || "CERT-ID"}
                size={70}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="text-left text-xs font-medium text-slate-800 space-y-0.5">
              {data.rollNo && (
                <p>
                  <span className="font-bold text-indigo-900 w-16 inline-block">
                    Roll No:
                  </span>{" "}
                  <strong className="text-slate-900">{data.rollNo}</strong>
                </p>
              )}
              {data.username && (
                <p>
                  <span className="font-bold text-indigo-900 w-16 inline-block">
                    Username:
                  </span>{" "}
                  <span className="font-mono font-bold text-indigo-700">
                    {data.username}
                  </span>
                </p>
              )}
              {data.password && (
                <p>
                  <span className="font-bold text-indigo-900 w-16 inline-block">
                    Password:
                  </span>{" "}
                  <span className="font-mono font-bold text-amber-600">
                    {data.password}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Director Signature */}
          <div className="text-center w-48">
            <div className="font-serif italic text-xl text-indigo-900 font-bold mb-1">
              Dhines Nivas
            </div>
            <div className="w-full border-b-2 border-indigo-900 mb-1"></div>
            <p className="font-bold text-indigo-900 text-xs uppercase tracking-widest">
              Director / இயக்குனர்
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
