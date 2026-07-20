import { Doughnut, Bar, Line } from 'react-chartjs-2';

/**
 * A component to display financial summary cards and charts.
 * @param {Object} props
 * @param {number} props.totalBalance - Total balance.
 * @param {number} props.totalIncomeValue - Total income.
 * @param {number} props.todayIncome - Today's income.
 * @param {number} props.totalExpenseValue - Total expense.
 * @param {number} props.todayExpense - Today's expense.
 * @param {Array} props.expenses - List of expense transactions.
 * @param {Object} props.doughnutData - Data config for Doughnut chart.
 * @param {string} props.chartType - Type of chart ('line', 'bar', 'waterfall').
 * @param {Function} props.setChartType - Setter for chartType.
 * @param {string} props.chartView - View of chart ('today', 'this_month', 'this_year', 'all_time').
 * @param {Function} props.setChartView - Setter for chartView.
 * @param {boolean} props.renderAsBar - Whether to render as Bar chart.
 * @param {Object} props.chartConfig - Data config for main chart.
 */
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
  return (
    <>
      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" aria-label="สรุปยอดเงิน">
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-6 rounded-2xl shadow-md text-white flex flex-col justify-between">
          <div>
            <h3 className="text-blue-100 font-medium mb-1">ยอดเงินคงเหลือ</h3>
            <div className="text-3xl font-bold">{totalBalance.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">รายรับรวม</h3>
            <div className="text-2xl font-bold text-green-600">+{totalIncomeValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-sm flex justify-between items-center">
            <span className="text-slate-500">วันนี้</span>
            <span className="font-semibold text-green-600">+{todayIncome.toLocaleString('th-TH')} บาท</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 font-medium mb-1">รายจ่ายรวม</h3>
            <div className="text-2xl font-bold text-red-600">-{totalExpenseValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-sm flex justify-between items-center">
            <span className="text-slate-500">วันนี้</span>
            <span className="font-semibold text-red-600">-{todayExpense.toLocaleString('th-TH')} บาท</span>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" aria-label="กราฟวิเคราะห์ข้อมูล">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">สัดส่วนรายจ่าย</h3>
          <div className="h-64 flex justify-center">
            {expenses.length > 0 ? (
               <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
            ) : (
               <div className="flex items-center text-slate-400">ยังไม่มีข้อมูลรายจ่าย</div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-700">แนวโน้มรายรับ - รายจ่าย</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select 
                value={chartType} 
                onChange={e => setChartType(e.target.value)} 
                className="flex-1 sm:flex-none text-sm p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-medium text-slate-600"
                aria-label="เลือกรูปแบบกราฟ"
              >
                <option value="line">กราฟเส้น (Line)</option>
                <option value="bar">กราฟแท่ง (Bar)</option>
                <option value="waterfall">กราฟน้ำตก (Waterfall)</option>
              </select>
              <select 
                value={chartView} 
                onChange={e => setChartView(e.target.value)} 
                className="flex-1 sm:flex-none text-sm p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-medium text-slate-600"
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
        </div>
      </section>
    </>
  );
}
