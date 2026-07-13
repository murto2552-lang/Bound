import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Trash2 } from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const DEFAULT_CATEGORIES = {
  income: {
    'salary': { label: 'เงินเดือน', type: 'income' },
    'freelance': { label: 'งานเสริม', type: 'income' },
    'other_income': { label: 'รายรับอื่นๆ', type: 'income' }
  },
  expense: {
    'food': { label: 'อาหารและเครื่องดื่ม', type: 'variable' },
    'transport': { label: 'เดินทาง', type: 'variable' },
    'shopping': { label: 'ช้อปปิ้ง', type: 'variable' },
    'rent': { label: 'ค่าเช่า', type: 'fixed' },
    'utilities': { label: 'ค่าน้ำ/ค่าไฟ', type: 'fixed' },
    'internet': { label: 'ค่าโทรศัพท์/เน็ต', type: 'fixed' },
    'credit_card': { label: 'บัตรเครดิต', type: 'debt' },
    'loan': { label: 'เงินกู้/สินเชื่อ', type: 'debt' }
  }
};

export default function Bookshelf() {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState('expense');
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('financeCategories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [isAddingCustomSubCat, setIsAddingCustomSubCat] = useState(false);
  const [customSubCatName, setCustomSubCatName] = useState('');
  const [customMainCat, setCustomMainCat] = useState('variable');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('this_month');
  const [recurrenceDurationType, setRecurrenceDurationType] = useState('custom_installments');
  const [recurrenceCount, setRecurrenceCount] = useState('');
  const [salarySchedule, setSalarySchedule] = useState('end_of_month');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [chartView, setChartView] = useState('this_month');
  const [chartType, setChartType] = useState('line');
  const [amountInputMethod, setAmountInputMethod] = useState('manual');
  const [isExtracting, setIsExtracting] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (chartView === 'today') setChartType('bar');
    else if (chartView === 'this_month') setChartType('line');
    else if (chartView === 'this_year') setChartType('line');
    else if (chartView === 'all_time') setChartType('waterfall');
  }, [chartView]);

  const loadData = async () => {
    const data = await api.getTransactions();
    setTransactions(data);
  };

  const handleSlipUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsExtracting(true);
      if (window.Tesseract) {
        window.Tesseract.recognize(
          file,
          'tha+eng',
          { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
          // ค้นหาตัวเลขที่มีจุดทศนิยม 2 ตำแหน่ง (รูปแบบยอดเงิน)
          const matches = text.match(/[\d,]+\.\d{2}/g);
          if (matches && matches.length > 0) {
            // มักจะมียอดเงินและค่าธรรมเนียม (0.00) ให้ใช้ค่าที่มากที่สุดหรือตัวแรก
            const amounts = matches.map(m => parseFloat(m.replace(/,/g, '')));
            const maxAmount = Math.max(...amounts);
            if (maxAmount > 0) {
              setTxAmount(maxAmount.toFixed(2));
            } else {
              setTxAmount('');
              alert('ไม่พบยอดเงินในสลิป หรือสลิปอ่านยาก โปรดระบุเองครับ');
            }
          } else {
            setTxAmount('');
            alert('ไม่สามารถอ่านยอดเงินจากสลิปนี้ได้ โปรดระบุเองครับ');
          }
          setIsExtracting(false);
        }).catch(err => {
          console.error(err);
          setIsExtracting(false);
          alert('เกิดข้อผิดพลาดในการอ่านสลิป');
        });
      } else {
        // Fallback
        setTimeout(() => {
          setTxAmount('0.00');
          setIsExtracting(false);
        }, 1000);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRef.current) return;
    
    const formData = new FormData(formRef.current);
    
    // The subcategory maps to a main category group.
    let subCat = formData.get('subcategory');
    let mainCat = 'income';
    
    if (subCat === 'add_new') {
      const newKey = 'custom_' + Date.now();
      const newType = txType === 'expense' ? customMainCat : 'income';
      
      const newCats = { ...categories };
      newCats[txType] = {
        ...newCats[txType],
        [newKey]: { label: customSubCatName, type: newType }
      };
      
      setCategories(newCats);
      localStorage.setItem('financeCategories', JSON.stringify(newCats));
      
      subCat = newKey;
      mainCat = newType;
      formData.set('subcategory', newKey);
    } else {
      if (txType === 'expense') {
        mainCat = categories.expense[subCat].type;
      }
    }
    
    formData.append('mainCategory', mainCat);
    
    let iterations = 1;
    let loopRule = null;
    if (txType === 'expense' && (mainCat === 'fixed' || mainCat === 'debt')) {
      if (recurrenceType !== 'this_month') {
        loopRule = recurrenceType;
        if (recurrenceDurationType === 'custom_installments') iterations = parseInt(recurrenceCount) || 1;
        else iterations = 24; // Generate 24 months for "continuous/forever"
      }
    } else if (txType === 'income' && subCat === 'salary' && salarySchedule !== 'custom_date') {
      iterations = 24;
      loopRule = salarySchedule;
    }
    
    const baseDateStr = formData.get('date');
    const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
    const amount = parseFloat(formData.get('amount'));
    const notes = formData.get('notes');
    
    const isRecurringType = (txType === 'expense' && (mainCat === 'fixed' || mainCat === 'debt')) || (txType === 'income' && subCat === 'salary');
    const seriesId = isRecurringType ? `series_${Date.now()}_${Math.random().toString(36).substring(2,9)}` : null;
    const title = isRecurringType ? seriesTitle : '';
    
    for (let i = 0; i < iterations; i++) {
      let d = new Date(baseDate);
      if (iterations > 1 && loopRule) {
        if (loopRule === 'end_of_month') {
          d.setMonth(d.getMonth() + i + 1);
          d.setDate(0);
        } else if (loopRule === 'every_30th') {
          d.setMonth(d.getMonth() + i);
          const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          d.setDate(Math.min(30, lastDay));
        } else if (loopRule === 'every_30_days_today') {
          d.setDate(d.getDate() + (i * 30));
        } else if (loopRule === 'every_30_days_tomorrow') {
          d.setDate(d.getDate() + 1 + (i * 30));
        } else if (loopRule === 'custom_months') {
          d.setMonth(d.getMonth() + i);
        }
      }
      
      const txData = new FormData();
      txData.append('date', d.toISOString().split('T')[0]);
      txData.append('amount', amount);
      txData.append('type', txType);
      txData.append('subcategory', subCat);
      txData.append('mainCategory', mainCat);
      txData.append('notes', notes + (iterations > 1 ? ` (งวดที่ ${i+1}/${iterations})` : ''));
      if (seriesId) {
        txData.append('seriesId', seriesId);
        txData.append('title', title);
      }
      if (i === 0 && formData.get('receipt')) txData.append('receipt', formData.get('receipt'));
      
      await api.createTransaction(txData);
    }
    
    setIsModalOpen(false);
    setIsAddingCustomSubCat(false);
    setCustomSubCatName('');
    setSelectedSubCat('');
    setSeriesTitle('');
    setRecurrenceType('this_month');
    setRecurrenceDurationType('custom_installments');
    setRecurrenceCount('');
    setSalarySchedule('end_of_month');
    setAmountInputMethod('manual');
    setTxAmount('');
    formRef.current.reset();
    loadData();
  };

  const handleDelete = async (tx) => {
    if (tx.seriesId) {
      if (window.confirm(`รายการนี้อยู่ในชุด "${tx.title}"\n\nคุณต้องการลบรายการนี้ และรายการล่วงหน้าทั้งหมดที่อยู่ในชื่อนี้ด้วยใช่หรือไม่?`)) {
        try {
          await api.deleteSeries(tx.seriesId);
          loadData();
        } catch (err) {
          console.error('Failed to delete series', err);
          alert('เกิดข้อผิดพลาดในการลบรายการชุดนี้');
        }
      }
    } else {
      if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        try {
          await api.deleteTransaction(tx.id);
          loadData();
        } catch (err) {
          console.error('Failed to delete transaction', err);
          alert('เกิดข้อผิดพลาดในการลบรายการ');
        }
      }
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const pastTransactions = transactions.filter(t => t.date <= todayStr);

  // Prepare chart data
  const expenses = pastTransactions.filter(t => t.type === 'expense');
  const expenseBySubcat = expenses.reduce((acc, t) => {
    acc[t.subcategory] = (acc[t.subcategory] || 0) + Number(t.amount);
    return acc;
  }, {});

  const subcatKeys = Object.keys(expenseBySubcat);
  const subcatLabels = subcatKeys.map(k => categories.expense[k]?.label || k);
  const subcatData = subcatKeys.map(k => expenseBySubcat[k]);

  const colors = [
    '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];
  
  const doughnutData = {
    labels: subcatLabels,
    datasets: [{
      data: subcatData,
      backgroundColor: subcatKeys.map((_, i) => colors[i % colors.length]),
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const sorted = [...pastTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);
  
  let labels = [];
  let incomeData = [];
  let expenseData = [];

  if (chartView === 'today') {
    labels = [todayStr];
    incomeData = [sorted.filter(t => t.date === todayStr && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)];
    expenseData = [sorted.filter(t => t.date === todayStr && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)];
  } else if (chartView === 'this_month') {
    const currentMonthNum = parseInt(todayStr.substring(5, 7), 10);
    const currentYearNum = parseInt(todayStr.substring(0, 4), 10);
    const daysInMonth = new Date(currentYearNum, currentMonthNum, 0).getDate();
    
    labels = Array.from({ length: daysInMonth }, (_, i) => `${currentMonthStr}-${String(i + 1).padStart(2, '0')}`);
    const thisMonthTx = sorted.filter(t => t.date.startsWith(currentMonthStr));
    
    incomeData = labels.map(date => thisMonthTx.filter(t => t.date === date && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
    expenseData = labels.map(date => thisMonthTx.filter(t => t.date === date && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
  } else if (chartView === 'this_year') {
    labels = Array.from({ length: 12 }, (_, i) => `${currentYearStr}-${String(i + 1).padStart(2, '0')}`);
    const thisYearTx = sorted.filter(t => t.date.startsWith(currentYearStr));
    
    incomeData = labels.map(ym => thisYearTx.filter(t => t.date.startsWith(ym) && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
    expenseData = labels.map(ym => thisYearTx.filter(t => t.date.startsWith(ym) && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
  } else if (chartView === 'all_time') {
    labels = [...new Set(sorted.map(t => t.date.substring(0, 7)))];
    if (labels.length === 0) labels = [currentMonthStr];
    incomeData = labels.map(ym => sorted.filter(t => t.date.startsWith(ym) && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
    expenseData = labels.map(ym => sorted.filter(t => t.date.startsWith(ym) && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
  }

  let waterfallData = [];
  let waterfallColors = [];
  let cumulative = 0;
  
  if (chartType === 'waterfall') {
    for (let i = 0; i < labels.length; i++) {
      const inc = incomeData[i] || 0;
      const exp = expenseData[i] || 0;
      const net = inc - exp;
      const start = cumulative;
      cumulative += net;
      const end = cumulative;
      waterfallData.push([start, end]);
      waterfallColors.push(net >= 0 ? '#10b981' : '#ef4444');
    }
  }

  const isSinglePoint = chartView === 'today' || labels.length === 1;
  const renderAsBar = isSinglePoint || chartType === 'bar' || chartType === 'waterfall';

  let chartConfig = { labels, datasets: [] };
  
  if (chartType === 'waterfall') {
    chartConfig.datasets = [{
      label: 'กระแสเงินสดสะสม (Cumulative Cashflow)',
      data: waterfallData,
      backgroundColor: waterfallColors,
      borderWidth: 1,
      borderColor: waterfallColors,
    }];
  } else {
    chartConfig.datasets = [
      {
        label: 'รายรับ',
        data: incomeData,
        borderColor: '#10b981',
        backgroundColor: renderAsBar ? '#10b981' : undefined,
        tension: 0.3,
      },
      {
        label: 'รายจ่าย',
        data: expenseData,
        borderColor: '#ef4444',
        backgroundColor: renderAsBar ? '#ef4444' : undefined,
        tension: 0.3,
      }
    ];
  }

  const totalIncomeValue = pastTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenseValue = pastTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBalance = totalIncomeValue - totalExpenseValue;

  const todayIncome = pastTransactions.filter(t => t.type === 'income' && t.date === todayStr).reduce((sum, t) => sum + Number(t.amount), 0);
  const todayExpense = pastTransactions.filter(t => t.type === 'expense' && t.date === todayStr).reduce((sum, t) => sum + Number(t.amount), 0);

  let currentMainCat = 'variable';
  if (txType === 'expense') {
    if (selectedSubCat === 'add_new') currentMainCat = customMainCat;
    else if (categories.expense[selectedSubCat]) currentMainCat = categories.expense[selectedSubCat].type;
  }
  const showRecurrence = txType === 'expense' && (currentMainCat === 'fixed' || currentMainCat === 'debt');
  
  const isRecurringType = (txType === 'expense' && (currentMainCat === 'fixed' || currentMainCat === 'debt')) || (txType === 'income' && selectedSubCat === 'salary');

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Bookshelf (สรุปการเงิน)</h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">ภาพรวมรายรับและหมวดหมู่รายจ่ายของคุณ</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-orange-500 text-white px-5 py-2.5 rounded-lg font-medium hover:from-purple-700 hover:to-orange-600 shadow-md transition-all hover:-translate-y-0.5">
          + บันทึกรายการใหม่
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-700 to-orange-500 p-6 rounded-2xl shadow-md text-white flex flex-col justify-between">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-700">แนวโน้มรายรับ - รายจ่าย</h3>
            <div className="flex gap-2">
              <select value={chartType} onChange={e => setChartType(e.target.value)} className="text-sm p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-600">
                <option value="line">กราฟเส้น (Line)</option>
                <option value="bar">กราฟแท่ง (Bar)</option>
                <option value="waterfall">กราฟน้ำตก (Waterfall)</option>
              </select>
              <select value={chartView} onChange={e => setChartView(e.target.value)} className="text-sm p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-600">
                <option value="today">วันนี้</option>
                <option value="this_month">เดือนนี้</option>
                <option value="this_year">ปีนี้</option>
                <option value="all_time">ทั้งหมด</option>
              </select>
            </div>
          </div>
          <div className="h-64 flex-1">
            {renderAsBar ? (
              <Bar data={chartConfig} options={{ maintainAspectRatio: false, responsive: true }} />
            ) : (
              <Line data={chartConfig} options={{ maintainAspectRatio: false, responsive: true }} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700">ประวัติล่าสุด</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">วันที่</th>
                <th className="px-6 py-3 font-medium">รายการ</th>
                <th className="px-6 py-3 font-medium">หมวดหมู่หลัก</th>
                <th className="px-6 py-3 font-medium text-right">จำนวนเงิน</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.slice().reverse().map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 text-sm">{tx.date}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {tx.type === 'income' ? categories.income[tx.subcategory]?.label : categories.expense[tx.subcategory]?.label}
                    </div>
                    {tx.title && <div className="text-xs font-semibold text-blue-600 mt-0.5">{tx.title}</div>}
                    {tx.notes && <div className="text-xs text-slate-500 mt-1">{tx.notes}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      tx.type === 'income' ? 'bg-green-100 text-green-700' :
                      tx.mainCategory === 'variable' ? 'bg-blue-100 text-blue-700' :
                      tx.mainCategory === 'fixed' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tx.type === 'income' ? 'รายรับ' : 
                       tx.mainCategory === 'variable' ? 'รายจ่ายผันแปร' :
                       tx.mainCategory === 'fixed' ? 'รายจ่ายคงที่' : 'ภาระหนี้สิน'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                    {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button onClick={() => handleDelete(tx)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="ลบรายการ">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">ยังไม่มีประวัติการทำรายการ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">บันทึกรายการใหม่</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
                <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${txType === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setTxType('expense')}
                >
                  รายจ่าย
                </button>
                <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${txType === 'income' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setTxType('income')}
                >
                  รายรับ
                </button>
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input type="hidden" name="type" value={txType} />
                
                {isRecurringType && (
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    ชื่อรายการ <span className="text-xs text-slate-500 font-normal">(เพื่อป้องกันการซ้ำกันเวลาลบ)</span>
                    <input type="text" value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)} required className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm" placeholder="เช่น ค่าเช่าห้อง, ผ่อนรถ, เงินเดือนบริษัท A" />
                  </label>
                )}

                <label className="flex flex-col text-sm font-medium text-slate-700">
                  หมวดหมู่ย่อย (ระบบจะจัดกลุ่มหลักให้อัตโนมัติ)
                  <select name="subcategory" value={selectedSubCat} onChange={(e) => {
                    setSelectedSubCat(e.target.value);
                    setIsAddingCustomSubCat(e.target.value === 'add_new');
                  }} required className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                    <option value="" disabled>-- เลือกหมวดหมู่ย่อย --</option>
                    {Object.entries(categories[txType]).map(([key, val]) => (
                      <option key={key} value={key}>{val.label} {txType === 'expense' ? `(หมวด: ${val.type === 'variable' ? 'ผันแปร' : val.type === 'fixed' ? 'คงที่' : 'หนี้'})` : ''}</option>
                    ))}
                    <option value="add_new" className="font-bold text-blue-600">+ เพิ่มหมวดหมู่ใหม่...</option>
                  </select>
                </label>

                {txType === 'income' && selectedSubCat === 'salary' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-3">
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      รอบเงินเดือนออก (ระบบจะตั้งเวลารับล่วงหน้าให้อัตโนมัติ)
                      <select name="salarySchedule" value={salarySchedule} onChange={e => setSalarySchedule(e.target.value)} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-green-500">
                        <option value="end_of_month">1. ทุกสิ้นเดือนของทุกเดือน</option>
                        <option value="every_30th">2. ทุกวันที่ 30 ของทุกเดือน</option>
                        <option value="custom_date">3. ระบุวันเงินเดือนออกเอง</option>
                      </select>
                    </label>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {!(txType === 'income' && selectedSubCat === 'salary' && salarySchedule !== 'custom_date') && (
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      วันที่
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                    </label>
                  )}
                  
                  <div className={`flex flex-col gap-3 ${txType === 'income' && selectedSubCat === 'salary' && salarySchedule !== 'custom_date' ? 'col-span-2' : ''}`}>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">วิธีระบุจำนวนเงิน</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                          <input type="radio" checked={amountInputMethod === 'slip'} onChange={() => setAmountInputMethod('slip')} className="text-blue-600 w-4 h-4" />
                          1. ใช้สลิปธนาคาร
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                          <input type="radio" checked={amountInputMethod === 'manual'} onChange={() => setAmountInputMethod('manual')} className="text-blue-600 w-4 h-4" />
                          2. ระบุเอง
                        </label>
                      </div>
                    </div>

                    {amountInputMethod === 'slip' && (
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        อัปโหลดสลิป (ระบบจะสกัดยอดเงินให้อัตโนมัติ)
                        <input type="file" accept="image/*" onChange={handleSlipUpload} className="mt-1.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      </label>
                    )}

                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      จำนวนเงิน (บาท)
                      <div className="relative mt-1.5">
                        <input type="number" step="0.01" name="amount" value={txAmount} onChange={e => setTxAmount(e.target.value)} required placeholder="0.00" className={`w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm ${isExtracting ? 'opacity-50' : ''}`} disabled={isExtracting} />
                        {isExtracting && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 animate-pulse">กำลังอ่านสลิป...</div>}
                      </div>
                    </label>
                  </div>
                </div>

                {isAddingCustomSubCat && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col gap-3">
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      ชื่อหมวดหมู่ใหม่
                      <input type="text" value={customSubCatName} onChange={e => setCustomSubCatName(e.target.value)} required={isAddingCustomSubCat} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="เช่น ค่ากาแฟ, ค่าประกันรถ" />
                    </label>
                    {txType === 'expense' && (
                      <div className="flex flex-col">
                        <label className="flex flex-col text-sm font-medium text-slate-700">
                          จัดเข้ากลุ่มหลัก
                          <select value={customMainCat} onChange={e => setCustomMainCat(e.target.value)} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500">
                            <option value="variable">รายจ่ายผันแปร (Variable)</option>
                            <option value="fixed">รายจ่ายคงที่ (Fixed)</option>
                            <option value="debt">ภาระหนี้สิน (Debt)</option>
                          </select>
                        </label>
                        <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                          {customMainCat === 'variable' && <p><span className="font-semibold text-blue-600">ผันแปร:</span> ค่าใช้จ่ายที่ไม่แน่นอนในแต่ละเดือน สามารถลดหรือปรับเปลี่ยนได้ (เช่น ค่าอาหาร, ช้อปปิ้ง, เดินทาง)</p>}
                          {customMainCat === 'fixed' && <p><span className="font-semibold text-orange-600">คงที่:</span> ค่าใช้จ่ายที่ต้องจ่ายแน่นอนเป็นประจำทุกเดือน (เช่น ค่าเช่า, ค่าน้ำ, ค่าไฟ, อินเทอร์เน็ต)</p>}
                          {customMainCat === 'debt' && <p><span className="font-semibold text-red-600">หนี้สิน:</span> ภาระผูกพันหรือเงินที่ต้องผ่อนชำระ (เช่น บัตรเครดิต, สินเชื่อ, ผ่อนรถ)</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {showRecurrence && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      รอบการชำระ (ระบบจะตั้งเวลาล่วงหน้าให้อัตโนมัติ)
                      <select name="recurrenceType" value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500">
                        <option value="end_of_month">1. ชำระทุกสิ้นเดือน</option>
                        <option value="every_30th">2. ชำระทุกวันที่ 30 ของทุกเดือน</option>
                        <option value="every_30_days_today">3. ชำระทุกๆ 30 วันเริ่มนับวันนี้</option>
                        <option value="every_30_days_tomorrow">4. ชำระทุกๆ 30 วันเริ่มนับพรุ่งนี้</option>
                        <option value="this_month">5. ชำระเฉพาะเดือนนี้</option>
                      </select>
                    </label>
                    
                    {recurrenceType !== 'this_month' && (
                      <label className="flex flex-col text-sm font-medium text-slate-700 mt-2">
                        ระยะเวลาการชำระ
                        <select name="recurrenceDurationType" value={recurrenceDurationType} onChange={e => setRecurrenceDurationType(e.target.value)} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500">
                          <option value="custom_installments">1. กำหนดจำนวนงวด</option>
                          <option value="forever">2. ชำระทุกเดือน (ต่อเนื่อง)</option>
                        </select>
                      </label>
                    )}

                    {recurrenceType !== 'this_month' && recurrenceDurationType === 'custom_installments' && (
                       <label className="flex flex-col text-sm font-medium text-slate-700 mt-2">
                         จำนวนงวดที่ต้องชำระ
                         <input type="number" min="2" max="120" name="recurrenceCount" value={recurrenceCount} onChange={e => setRecurrenceCount(e.target.value)} required={recurrenceType !== 'this_month' && recurrenceDurationType === 'custom_installments'} className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="ระบุจำนวนงวด (เช่น 10)" />
                       </label>
                    )}
                  </div>
                )}
                
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  รายละเอียดเพิ่มเติม (Notes)
                  <textarea name="notes" placeholder="จดโน้ตกันลืม..." className="mt-1.5 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm min-h-[80px] resize-none" />
                </label>
                
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  อัปโหลดสลิป (ถ้ามี)
                  <input type="file" accept="image/*" name="receipt" className="mt-1.5 text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                </label>
                
                <button type="submit" className="mt-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-medium rounded-lg py-3 hover:from-purple-700 hover:to-orange-600 shadow-md transition-all">
                  บันทึกรายการ
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
