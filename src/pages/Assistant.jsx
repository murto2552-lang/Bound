import { useState, useEffect } from 'react';
import { api } from '../api';
import { Target, ShieldAlert, TrendingUp, Calendar, ArrowRight, Bot, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import AiChatbot from '../components/AiChatbot';

export default function Assistant() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'planner'
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState({
    savings: 5000,
    emergency: 2000,
    luxury: 1000
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error('Failed to load transactions for assistant', err);
      }
    };
    loadData();
  }, []);

  const handleGoalChange = (e) => {
    setGoals({
      ...goals,
      [e.target.name]: Number(e.target.value)
    });
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = today.toISOString().substring(0, 7);
  
  // ยอดเงินคงเหลือจริง (Current Balance)
  const pastTransactions = transactions.filter(t => t.date <= todayStr);
  const totalPastIncome = pastTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPastExpense = pastTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const currentBalance = totalPastIncome - totalPastExpense;

  // บิลที่รอชำระเดือนนี้ (Pending Bills for the rest of the month)
  const pendingMandatory = transactions
    .filter(t => t.date > todayStr && t.date.startsWith(currentMonthStr) && t.type === 'expense' && (t.mainCategory === 'fixed' || t.mainCategory === 'debt'))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalGoals = goals.savings + goals.emergency + goals.luxury;
  const remainingBudget = currentBalance - pendingMandatory - totalGoals;
  
  // Calculate days remaining in current month
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const daysPassed = today.getDate();
  const daysRemaining = daysInMonth - daysPassed + 1;

  const safeToSpendPerDay = remainingBudget > 0 ? remainingBudget / daysRemaining : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            Present Assistant
          </h2>
          <p className="text-slate-500 mt-1 text-sm">ผู้ช่วยคำนวณและวางแผนการเงินส่วนบุคคลอัจฉริยะ</p>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl flex gap-1 border border-slate-200/60 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bot className="w-4 h-4" /> BounD Gemini AI
          </button>
          
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'planner'
                ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calculator className="w-4 h-4" /> วางแผนงบ Safe-to-Spend
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <AiChatbot />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Goals Input */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Target size={20} className="text-purple-600" /> ตั้งเป้าหมายเดือนนี้
              </h3>
              
              <div className="space-y-4">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  เงินออมที่ตั้งเป้าไว้ (บาท)
                  <input type="number" name="savings" value={goals.savings} onChange={handleGoalChange} className="mt-1.5 p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors" />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  สำรองฉุกเฉิน (บาท)
                  <input type="number" name="emergency" value={goals.emergency} onChange={handleGoalChange} className="mt-1.5 p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors" />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  เงินฟุ่มเฟือย/ให้รางวัลตัวเอง (บาท)
                  <input type="number" name="luxury" value={goals.luxury} onChange={handleGoalChange} className="mt-1.5 p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors" />
                </label>
              </div>
              
              <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-sm text-purple-800 font-medium mb-1">รวมเงินเป้าหมาย</div>
                <div className="text-2xl font-bold text-purple-900">
                  {totalGoals.toLocaleString('th-TH')} <span className="text-base font-normal">บาท</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Output */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Safe to spend */}
              <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-20">
                  <Calendar size={80} />
                </div>
                <h3 className="text-purple-100 font-medium mb-2 relative z-10">โควต้าใช้จ่ายต่อวัน (Safe-to-spend)</h3>
                <div className="text-4xl font-bold mb-1 relative z-10">
                  {Math.max(0, safeToSpendPerDay).toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span className="text-lg font-normal">บาท/วัน</span>
                </div>
                <p className="text-sm text-purple-100 relative z-10">สำหรับ {daysRemaining} วันที่เหลือของเดือนนี้</p>
              </div>

              {/* Remaining budget */}
              <div className="glass-card">
                <h3 className="text-slate-500 font-medium mb-2">งบใช้จ่ายที่เหลือจริง</h3>
                <div className={`text-3xl font-bold mb-1 ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.max(0, remainingBudget).toLocaleString('th-TH')} <span className="text-lg font-normal text-slate-500">บาท</span>
                </div>
                <p className="text-sm text-slate-400">คำนวณจากยอดเงินคงเหลือ {currentBalance.toLocaleString('th-TH')} บาท</p>
              </div>
            </div>

            <div className="glass-card">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">สูตรการคำนวณเดือนนี้</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-green-50 text-green-800 border border-green-100">
                  <span className="font-medium flex items-center gap-2"><TrendingUp size={18}/> ยอดเงินคงเหลือปัจจุบัน</span>
                  <span className="font-bold">{currentBalance.toLocaleString('th-TH')} บาท</span>
                </div>
                
                <div className="flex justify-center text-slate-300"><ArrowRight className="rotate-90" /></div>
                
                <div className="flex justify-between items-center p-3 rounded-xl bg-orange-50 text-orange-800 border border-orange-100">
                  <span className="font-medium flex items-center gap-2"><ShieldAlert size={18}/> หัก บิลที่รอชำระเดือนนี้ (คงที่ + หนี้)</span>
                  <span className="font-bold">- {pendingMandatory.toLocaleString('th-TH')} บาท</span>
                </div>
                
                <div className="flex justify-center text-slate-300"><ArrowRight className="rotate-90" /></div>
                
                <div className="flex justify-between items-center p-3 rounded-xl bg-purple-50 text-purple-800 border border-purple-100">
                  <span className="font-medium flex items-center gap-2"><Target size={18}/> หัก เป้าหมายเงินออม</span>
                  <span className="font-bold">- {totalGoals.toLocaleString('th-TH')} บาท</span>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-700">เท่างบที่ใช้ได้จริง (สุทธิ)</span>
                  <span className="font-bold text-xl text-slate-900">{remainingBudget.toLocaleString('th-TH')} บาท</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
