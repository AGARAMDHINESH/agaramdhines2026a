import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getStudents, saveStudents, getStaffs, saveStaffs, getAdminSettings, saveAdminSettings } from "../lib/db";
import { CheckCircle, XCircle, ArrowRight, KeyRound, Mail, Lock } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get("type") || "student";
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userType, setUserType] = useState<string>(defaultType);
  const [userId, setUserId] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let userExists = false;
      
      if (userType === 'student') {
        const students = await getStudents();
        userExists = students.some((s: any) => s.username === userId || s.id === userId);
      } else if (userType === 'staff') {
        const staffs = await getStaffs();
        userExists = staffs.some((s: any) => s.username === userId);
      } else if (userType === 'admin') {
        const settings = await getAdminSettings();
        userExists = settings?.username === userId || userId === "ddhinesnivas111@gmail.com";
      }

      if (!userExists) {
        setError(`No ${userType} found with this username/ID.`);
        setIsLoading(false);
        return;
      }

      // Simulate sending code
      setTimeout(() => {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        setResetCode(generatedCode);
        console.log(`Reset code for ${userId}: ${generatedCode}`); // For testing
        setIsLoading(false);
        setStep(2);
        // In a real app, this would be sent via email/SMS
        alert(`Simulated: A reset code has been sent to your registered contact. (Code: ${generatedCode})`);
      }, 1500);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (inputCode !== resetCode) {
      setError("Invalid reset code. Please try again.");
      return;
    }
    
    setStep(3);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      if (userType === 'student') {
        const students = await getStudents();
        const studentIndex = students.findIndex((s: any) => s.username === userId || s.id === userId);
        if (studentIndex !== -1) {
          students[studentIndex].password = newPassword;
          await saveStudents(students);
        }
      } else if (userType === 'staff') {
        const staffs = await getStaffs();
        const staffIndex = staffs.findIndex((s: any) => s.username === userId);
        if (staffIndex !== -1) {
          staffs[staffIndex].password = newPassword;
          await saveStaffs(staffs);
        }
      } else if (userType === 'admin') {
        const settings = await getAdminSettings();
        if (settings && settings.username === userId) {
          settings.password = newPassword;
          await saveAdminSettings(settings);
        } else if (userId === "ddhinesnivas111@gmail.com") {
          // Master admin password cannot be changed here
          setError("Master admin password cannot be changed.");
          setIsLoading(false);
          return;
        }
      }

      setSuccess(true);
    } catch (err) {
      setError("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-600 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Password Reset!</h2>
          <p className="text-gray-500 mb-8 text-lg">Your password has been successfully updated. You can now login with your new password.</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-lg shadow-lg shadow-emerald-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="text-blue-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-gray-500 mt-2">
            {step === 1 && "Enter your details to receive a reset code"}
            {step === 2 && "Enter the 6-digit code sent to you"}
            {step === 3 && "Create a new secure password"}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <XCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">I am a</label>
              <div className="grid grid-cols-3 gap-3">
                {['student', 'staff', 'admin'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setUserType(type)}
                    className={`py-2 px-3 rounded-xl text-sm font-bold capitalize border-2 transition-all ${
                      userType === type 
                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Username / ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                  placeholder={`Enter your ${userType} username`}
                />
              </div>
            </div>
            
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !userId}
                className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? "Sending..." : "Send Code"} <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">6-Digit Reset Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-center text-2xl tracking-[0.5em]"
                placeholder="000000"
              />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Check your registered contact for the code.
              </p>
            </div>
            
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={inputCode.length !== 6}
                className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                Verify Code
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 shadow-lg shadow-blue-200"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
