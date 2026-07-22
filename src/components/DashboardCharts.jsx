import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';

export default function DashboardCharts({
  totalBalance,
  totalIncomeValue,
  todayIncome,
  totalExpenseValue,
  todayExpense,
  expenses,
  doughnutData,
  chartType,
  setChartType,
  chartView,
  setChartView,
  renderAsBar,
  chartConfig
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" aria-label="สรุปยอดเงิน">
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-purple-600 to-orange-500 p-6 rounded-2xl shadow-[0_8px_30px_rgba(139,92,246,0.3)] text-white flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
          {/* Decorative shapes for premium credit card look */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-300/20 rounded-full blur-xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <h3 className="text-purple-100 font-medium mb-1 flex items-center gap-2">
              ยอดเงินคงเหลือ
            </h3>
            <div className="text-3xl font-bold tracking-tight">{totalBalance.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</div>
          </div>
          <div className="relative z-10 mt-6 flex justify-between items-end opacity-80 text-sm">
            <span>BounD Premium</span>
            <div className="w-8 h-5 rounded bg-white/20 backdrop-blur-md border border-white/30"></div>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="glass-card flex flex-col justify-between group">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">รายรับรวม</h3>
            <div className="text-2xl font-bold text-green-600">+{totalIncomeValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/50 text-sm flex justify-between items-center transition-colors group-hover:border-green-100">
            <span className="text-slate-500">วันนี้</span>
            <span className="font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">+{todayIncome.toLocaleString('th-TH')} บาท</span>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="glass-card flex flex-col justify-between group">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">รายจ่ายรวม</h3>
            <div className="text-2xl font-bold text-red-600">-{totalExpenseValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/50 text-sm flex justify-between items-center transition-colors group-hover:border-red-100">
            <span className="text-slate-500">วันนี้</span>
            <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">-{todayExpense.toLocaleString('th-TH')} บาท</span>
          </div>
        </motion.div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" aria-label="กราฟสรุปรายรับและรายจ่าย">
        <motion.div variants={itemVariants} className="lg:col-span-1 glass-card flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">สัดส่วนรายจ่าย</h3>
          <div className="h-64 flex justify-center">
            {expenses.length > 0 ? (
               <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
            ) : (
               <div className="flex items-center text-slate-400">ยังไม่มีข้อมูลรายจ่าย</div>
            )}
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="glass-card lg:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-800 tracking-tight">แนวโน้มรายรับ - รายจ่าย</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select 
                value={chartType} 
                onChange={e => setChartType(e.target.value)} 
                className="flex-1 sm:flex-none text-sm p-2 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-medium text-slate-600 transition-all cursor-pointer backdrop-blur-sm"
                aria-label="เลือกรูปแบบกราฟ"
              >
                <option value="line">กราฟเส้น (Line)</option>
                <option value="bar">กราฟแท่ง (Bar)</option>
                <option value="waterfall">กราฟน้ำตก (Waterfall)</option>
              </select>
              <select 
                value={chartView} 
                onChange={e => setChartView(e.target.value)} 
                className="flex-1 sm:flex-none text-sm p-2 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-medium text-slate-600 transition-all cursor-pointer backdrop-blur-sm"
                aria-label="เลือกช่วงเวลากราฟ"
              >
                <option value="today">วันนี้</option>
                <option value="this_month">เดือนนี้</option>
                <option value="this_year">ปีนี้</option>
                <option value="all_time">ทั้งหมด</option>
              </select>
            </div>
          </div>
          <div className="min-h-[350px] md:min-h-[450px] w-full relative mt-4">
            {renderAsBar ? (
              <Bar data={chartConfig} options={{ maintainAspectRatio: false, responsive: true }} />
            ) : (
              <Line data={chartConfig} options={{ maintainAspectRatio: false, responsive: true }} />
            )}
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
