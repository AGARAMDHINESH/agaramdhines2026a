import React, { useState, useEffect } from "react";
import { Users, Briefcase, DollarSign, TrendingUp, Gift, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Database, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import { getStudents, getStaffs, getFees, getIncomeExpense, getTimeTable, getAdminSettings, getDbHealthMetrics, DbMetrics } from "../../lib/db";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function AdminHome() {
  const [stats, setStats] = useState({
    students: 0,
    employees: 0,
    revenue: 0,
    profit: 0
  });
  
  const [pieData, setPieData] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dbMetrics, setDbMetrics] = useState<DbMetrics | null>(null);

  useEffect(() => {
    setDbMetrics(getDbHealthMetrics());
    const loadData = async () => {
      const students = await getStudents();
      const staffs = await getStaffs();
      const fees = await getFees();
      const incomeExpense = await getIncomeExpense() || [];
      const tt = await getTimeTable() || [];
      const adminSettingData = await getAdminSettings();
      
      setTimetable(tt);
      setDbMetrics(getDbHealthMetrics());
      
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      
      // Calculate current month revenue from fees and other incomes
      const monthFees = fees.filter((f: any) => f.month === currentMonthStr);
      const totalFeeRevenue = monthFees.reduce((sum: number, f: any) => sum + Number(f.amount), 0);
      
      const currentMonthIncomeExpense = incomeExpense.filter((item: any) => item.date && item.date.startsWith(currentMonthStr));
      const otherIncome = currentMonthIncomeExpense.filter((i: any) => i.type === 'Income').reduce((sum: number, i: any) => sum + Number(i.amount), 0);
      const totalExpenses = currentMonthIncomeExpense.filter((i: any) => i.type === 'Expense').reduce((sum: number, i: any) => sum + Number(i.amount), 0);
      
      const totalRevenue = totalFeeRevenue + otherIncome;
      
      setStats({
        students: students.length,
        employees: staffs.length,
        revenue: totalRevenue,
        profit: totalRevenue - totalExpenses
      });

      // Calculate Pie Chart Data (Estimated vs Collected)
      // Assuming average fee is 1000 per student per month for estimation
      const estimatedTotal = students.length * 1000;
      const remainings = Math.max(0, estimatedTotal - totalFeeRevenue);
      
      setPieData([
        { name: 'Collections', value: totalFeeRevenue, color: '#36c6a1' },
        { name: 'Remainings', value: remainings, color: '#e2e8f0' }
      ]);
    };
    loadData();

    const handleDbUpdate = (e: any) => {
      const key = e.detail?.key;
      if (!key || ['students', 'staffs', 'fees', 'incomeExpense', 'timeTable'].includes(key)) {
        loadData();
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('db_updated', handleDbUpdate);
    };
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const today = new Date();

  const getDayName = (dayIndex: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayIndex];
  };

  const getClassesForDate = (date: number) => {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    const dayName = getDayName(dateObj.getDay());
    return timetable.filter(t => t.day === dayName);
  };

  const getSubjectColor = (subject: string) => {
    const colors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400'];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-[#6b5b95] rounded-xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-white/80 mb-1">Total Students</p>
              <Users size={20} className="text-white/60" />
            </div>
            <h3 className="text-4xl font-bold">{stats.students}</h3>
          </div>
          <div className="flex justify-between items-end text-xs text-white/70">
            <span>This Month</span>
            <span>0</span>
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-[#9b89b3] rounded-xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-white/80 mb-1">Total Employees</p>
              <Briefcase size={20} className="text-white/60" />
            </div>
            <h3 className="text-4xl font-bold">{stats.employees}</h3>
          </div>
          <div className="flex justify-between items-end text-xs text-white/70">
            <span>This Month</span>
            <span>0</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-[#ff8a8a] rounded-xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-white/80 mb-1">Revenue</p>
              <span className="text-xl font-bold">Rs</span>
            </div>
            <h3 className="text-4xl font-bold">{stats.revenue.toLocaleString()}</h3>
          </div>
          <div className="flex justify-between items-end text-xs text-white/70">
            <span>This Month</span>
            <span>Auto-clears monthly</span>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-[#5c8aeb] rounded-xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-white/80 mb-1">Total Profit</p>
              <span className="text-xl font-bold">Rs</span>
            </div>
            <h3 className="text-4xl font-bold">{stats.profit.toLocaleString()}</h3>
          </div>
          <div className="flex justify-between items-end text-xs text-white/70">
            <span>This Month</span>
            <span>Auto-clears monthly</span>
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-[#ffeaea] rounded-xl p-6 flex items-center justify-between border border-red-100">
        <div>
          <h3 className="text-[#ff6b6b] font-medium mb-1">Welcome to Admin Dashboard</h3>
          <p className="text-gray-600 text-sm mb-1">Your Account is Verified! 👍</p>
          <p className="text-gray-500 text-xs">Enjoy World's No.1 Education Software.</p>
        </div>
        <div className="hidden md:block">
          <img src="https://picsum.photos/seed/admin-welcome/150/100" alt="Welcome" className="h-20 object-contain rounded-lg" />
        </div>
      </div>

      {/* Google Forms / Registration Setup Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-xl p-5 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              NEW Feature
            </span>
            <h3 className="text-base font-bold text-white">Google Forms மாதிரி மாணவர் சேர்க்கை & பதிவுப் படிவங்கள்</h3>
          </div>
          <p className="text-xs text-blue-100 max-w-xl">
            படிவங்களை உருவாக்கி இணைப்பை மாணவர்களுடன் பகிருங்கள். மாவட்ட வாரியான மாணவர் எண்ணிக்கை மற்றும் பதில்களை உடனடியாகப் பெற்று எக்செல் (Excel) வடிவில் சேமிக்கலாம்.
          </p>
        </div>
        <a
          href="/admin/forms"
          className="inline-flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm"
        >
          <span>படிவங்களை நிர்வகிக்க (Open Forms)</span>
          <ArrowUpRight size={14} />
        </a>
      </div>

      {/* Widgets Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Estimated Fee Donut Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#5c6e7d] font-medium text-sm">Estimated Fee This Month</h3>
            <span className="text-xs text-blue-500 cursor-pointer">Show 👁</span>
          </div>
          <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-400">Estimation</span>
              <span className="text-sm font-bold text-gray-300">Hidden</span>
            </div>
          </div>
          <div className="flex justify-between mt-6 text-xs">
            <div className="text-center">
              <p className="text-gray-400 mb-1">Hidden</p>
              <p className="text-[#36c6a1] font-medium flex items-center gap-1"><span className="w-2 h-2 bg-[#36c6a1] rounded-full"></span> Collections</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 mb-1">Hidden</p>
              <p className="text-[#e2e8f0] font-medium flex items-center gap-1"><span className="w-2 h-2 bg-[#e2e8f0] rounded-full"></span> Remainings</p>
            </div>
          </div>
        </div>

        {/* Middle Column: SMS Banner & Progress Bars */}
        <div className="space-y-6">
          {/* SMS Banner */}
          <div className="bg-[#5c5c9a] rounded-xl p-5 text-white flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <h3 className="font-bold text-sm mb-1">Free SMS Gateway</h3>
              <p className="text-xs text-white/70">Send Unlimited Free SMS<br/>on Mobile Numbers.</p>
            </div>
            <div className="z-10">
              <WhatsAppIcon size={32} className="text-white/20" />
            </div>
            <div className="absolute right-0 bottom-0 opacity-50">
              <img src="https://picsum.photos/seed/sms/100/100" alt="SMS" className="w-24 h-24 object-cover rounded-tl-full" />
            </div>
          </div>

          {/* Progress Bars */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Today Present Students</span>
                <span className="text-blue-500 font-medium">0%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Today Present Employees</span>
                <span className="text-red-500 font-medium">0%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">This Month Fee Collection</span>
                <span className="text-green-500 font-medium">0%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>

          {/* Database & Site Health Status Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-800 text-sm">Database Health & Usage</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {dbMetrics?.healthStatus || "Healthy"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Daily Writes */}
              <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold text-amber-900">Writes Today (எழுதுதல்)</span>
                  <ArrowUpRight size={14} className="text-amber-600" />
                </div>
                <p className="text-2xl font-black text-amber-950">{dbMetrics?.writesToday || 0}</p>
                <p className="text-[10px] text-amber-800/80 font-medium mt-1">
                  Last write: {dbMetrics?.lastWriteTime || 'None today'}
                </p>
              </div>

              {/* Daily Reads */}
              <div className="bg-blue-50/80 border border-blue-200/60 rounded-xl p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold text-blue-900">Reads Today (வாசிப்பு)</span>
                  <ArrowDownRight size={14} className="text-blue-600" />
                </div>
                <p className="text-2xl font-black text-blue-950">{dbMetrics?.readsToday || 0}</p>
                <p className="text-[10px] text-blue-800/80 font-medium mt-1">
                  Last read: {dbMetrics?.lastReadTime || 'None today'}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Fast Memory Cache Hits:</span>
                <span className="font-bold text-slate-800">{dbMetrics?.cachedReadsToday || 0} hits</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Lifetime Reads:</span>
                <span className="font-bold text-slate-800">{(dbMetrics?.totalReadsAllTime || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Lifetime Writes:</span>
                <span className="font-bold text-slate-800">{(dbMetrics?.totalWritesAllTime || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Firestore Cloud Backend:</span>
                <span className={`font-bold ${dbMetrics?.isFirebaseConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {dbMetrics?.isFirebaseConnected ? 'Active (Cloud Storage)' : 'Offline / Local Sync'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="text-gray-500">Health Score: <strong className="text-emerald-600 font-bold">{dbMetrics?.healthScore || 100}%</strong></span>
              <button 
                onClick={() => setDbMetrics(getDbHealthMetrics())}
                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-[11px]"
              >
                <RefreshCw size={12} /> Refresh Metrics
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Calendar Widget */}
        <div className="space-y-6">
          {/* Calendar Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <button onClick={handlePrevMonth} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full"><ChevronLeft size={16} /></button>
              <div className="text-center">
                <h3 className="text-[#ff6b6b] font-bold text-sm uppercase">
                  {currentDate.toLocaleString('default', { month: 'long' })}, {currentDate.getFullYear()}
                </h3>
                <p className="text-xs text-gray-500">{today.toDateString()}</p>
              </div>
              <button onClick={handleNextMonth} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="text-gray-400 font-medium py-1">{day}</div>
              ))}
              {Array.from({length: firstDay}).map((_, i) => (
                <div key={`empty-${i}`} className="py-1.5"></div>
              ))}
              {Array.from({length: daysInMonth}, (_, i) => i + 1).map(date => {
                const isToday = date === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                const dayClasses = getClassesForDate(date);
                
                return (
                  <div key={date} className="relative group">
                    <div className={`py-1.5 rounded-md flex flex-col items-center justify-center min-h-[40px] ${isToday ? 'border border-[#ff6b6b] text-[#ff6b6b] font-bold' : 'text-blue-500 hover:bg-blue-50 cursor-pointer'}`}>
                      <span>{date}</span>
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-1">
                        {dayClasses.slice(0, 3).map((c, idx) => (
                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${getSubjectColor(c.subject)}`} />
                        ))}
                        {dayClasses.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                      </div>
                    </div>
                    {dayClasses.length > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl">
                        <div className="font-bold mb-1 border-b border-gray-700 pb-1">Classes on {date} {currentDate.toLocaleString('default', { month: 'short' })}</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {dayClasses.map((c, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${getSubjectColor(c.subject)}`} />
                              <div>
                                <div className="font-medium">{c.subject} ({c.grade})</div>
                                <div className="text-[10px] text-gray-300">{c.startTime} - {c.endTime}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
