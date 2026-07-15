import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fontBase64 } from '../utils/Sarabun-Regular-normal';
import { Chart, registerables } from 'chart.js';
import { motion } from 'framer-motion';

import DashboardCharts from '../components/DashboardCharts';
import TransactionHistory from '../components/TransactionHistory';
import TransactionFormModal from '../components/TransactionFormModal';

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

/**
 * Main Bookshelf component serving as the Dashboard.
 * Displays charts, summary metrics, and a transaction history table.
 * Uses useMemo and useCallback for React performance optimization.
 */
export default function Bookshelf() {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState('expense');
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('financeCategories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [chartView, setChartView] = useState('this_month');
  const [chartType, setChartType] = useState('line');

  const loadData = useCallback(async () => {
    const data = await api.getTransactions();
    setTransactions(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (tx) => {
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
  }, [loadData]);

  // Performance Optimization: useMemo for expensive data transformations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);
  const currentYearStr = useMemo(() => todayStr.substring(0, 4), [todayStr]);

  const sorted = useMemo(() => {
    return [...transactions.filter(t => t.date <= todayStr)].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, todayStr]);

  const getFilteredTransactionsForExport = useCallback(() => {
    let filtered = [];
    if (chartView === 'today') {
      filtered = sorted.filter(t => t.date === todayStr);
    } else if (chartView === 'this_month') {
      filtered = sorted.filter(t => t.date.startsWith(currentMonthStr));
    } else if (chartView === 'this_year') {
      filtered = sorted.filter(t => t.date.startsWith(currentYearStr));
    } else {
      filtered = [...sorted];
    }
    return filtered;
  }, [chartView, sorted, todayStr, currentMonthStr, currentYearStr]);

  const exportToExcel = useCallback(() => {
    const txs = getFilteredTransactionsForExport();
    const data = txs.map(t => ({
      'วันที่': t.date,
      'ประเภท': t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      'หมวดหมู่หลัก': t.type === 'income' ? 'รายรับ' : t.mainCategory === 'variable' ? 'รายจ่ายผันแปร' : t.mainCategory === 'fixed' ? 'รายจ่ายคงที่' : 'ภาระหนี้สิน',
      'รายการ': t.type === 'income' ? categories.income[t.subcategory]?.label : categories.expense[t.subcategory]?.label,
      'หมายเหตุ': t.notes || '',
      'จำนวนเงิน': Number(t.amount)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `BounD_Report_${chartView}.xlsx`);
  }, [getFilteredTransactionsForExport, categories, chartView]);

  const exportToPDF = useCallback(() => {
    const txs = getFilteredTransactionsForExport();
    const totalInc = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalInc - totalExp;

    const doc = new jsPDF();
    doc.addFileToVFS("Sarabun-Regular.ttf", fontBase64);
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
    doc.setFont("Sarabun");

    doc.setFontSize(18);
    doc.text("รายงานสรุปรายรับ-รายจ่าย (BounD)", 14, 20);
    
    doc.setFontSize(12);
    let viewName = 'ทั้งหมด';
    if (chartView === 'today') viewName = 'วันนี้';
    if (chartView === 'this_month') viewName = 'เดือนนี้';
    if (chartView === 'this_year') viewName = 'ปีนี้';
    
    doc.text(`มุมมอง: ${viewName}`, 14, 30);
    doc.text(`รวมรายรับ: ${totalInc.toLocaleString('th-TH')} บาท`, 14, 38);
    doc.text(`รวมรายจ่าย: ${totalExp.toLocaleString('th-TH')} บาท`, 14, 46);
    doc.text(`คงเหลือ: ${balance.toLocaleString('th-TH')} บาท`, 14, 54);

    const tableData = txs.map(t => [
      t.date,
      t.type === 'income' ? 'รายรับ' : t.mainCategory === 'variable' ? 'รายจ่ายผันแปร' : t.mainCategory === 'fixed' ? 'รายจ่ายคงที่' : 'ภาระหนี้สิน',
      t.type === 'income' ? categories.income[t.subcategory]?.label : categories.expense[t.subcategory]?.label,
      Number(t.amount).toLocaleString('th-TH')
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['วันที่', 'ประเภท', 'รายการ', 'จำนวนเงิน']],
      body: tableData,
      styles: { font: 'Sarabun', fontStyle: 'normal' },
      headStyles: { font: 'Sarabun', fontStyle: 'normal' }
    });
    doc.save(`BounD_Report_${chartView}.pdf`);
  }, [getFilteredTransactionsForExport, categories, chartView]);

  // Chart Data Calculations (Memoized)
  const expenses = useMemo(() => sorted.filter(t => t.type === 'expense'), [sorted]);
  
  const doughnutData = useMemo(() => {
    const expenseBySubcat = expenses.reduce((acc, t) => {
      acc[t.subcategory] = (acc[t.subcategory] || 0) + Number(t.amount);
      return acc;
    }, {});
    const subcatKeys = Object.keys(expenseBySubcat);
    const subcatLabels = subcatKeys.map(k => categories.expense[k]?.label || k);
    const subcatData = subcatKeys.map(k => expenseBySubcat[k]);
    const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
    
    return {
      labels: subcatLabels,
      datasets: [{
        data: subcatData,
        backgroundColor: subcatKeys.map((_, i) => colors[i % colors.length]),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [expenses, categories]);
  
  const chartConfigAndData = useMemo(() => {
    let labels = [];
    let incomeData = [];
    let expenseData = [];

    if (chartView === 'today') {
      labels = [todayStr];
      incomeData = [sorted.filter(t => t.date === todayStr && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)];
      expenseData = [sorted.filter(t => t.date === todayStr && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)];
    } else if (chartView === 'this_month') {
      const daysInMonth = new Date(parseInt(currentYearStr), parseInt(currentMonthStr.substring(5)), 0).getDate();
      labels = Array.from({ length: daysInMonth }, (_, i) => `${currentMonthStr}-${String(i + 1).padStart(2, '0')}`);
      const thisMonthTx = sorted.filter(t => t.date.startsWith(currentMonthStr));
      incomeData = labels.map(date => thisMonthTx.filter(t => t.date === date && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
      expenseData = labels.map(date => thisMonthTx.filter(t => t.date === date && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
    } else if (chartView === 'this_year') {
      labels = Array.from({ length: 12 }, (_, i) => `${currentYearStr}-${String(i + 1).padStart(2, '0')}`);
      const thisYearTx = sorted.filter(t => t.date.startsWith(currentYearStr));
      incomeData = labels.map(ym => thisYearTx.filter(t => t.date.startsWith(ym) && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
      expenseData = labels.map(ym => thisYearTx.filter(t => t.date.startsWith(ym) && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
    } else {
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

    let config = { labels, datasets: [] };
    
    if (chartType === 'waterfall') {
      config.datasets = [{
        label: 'กระแสเงินสดสะสม (Cumulative Cashflow)',
        data: waterfallData,
        backgroundColor: waterfallColors,
        borderWidth: 1,
        borderColor: waterfallColors,
      }];
    } else {
      config.datasets = [
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
    return { config, renderAsBar };
  }, [sorted, chartView, chartType, todayStr, currentMonthStr, currentYearStr]);

  const { config: chartConfig, renderAsBar } = chartConfigAndData;

  const totalIncomeValue = useMemo(() => sorted.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0), [sorted]);
  const totalExpenseValue = useMemo(() => sorted.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0), [sorted]);
  const totalBalance = totalIncomeValue - totalExpenseValue;

  const todayIncome = useMemo(() => sorted.filter(t => t.type === 'income' && t.date === todayStr).reduce((sum, t) => sum + Number(t.amount), 0), [sorted, todayStr]);
  const todayExpense = useMemo(() => sorted.filter(t => t.type === 'expense' && t.date === todayStr).reduce((sum, t) => sum + Number(t.amount), 0), [sorted, todayStr]);

  return (
    <main className="p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Bookshelf (สรุปการเงิน)</h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">ภาพรวมรายรับและหมวดหมู่รายจ่ายของคุณ</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-orange-500 text-white px-5 py-2.5 rounded-lg font-medium shadow-md"
          aria-label="บันทึกรายการใหม่"
        >
          + บันทึกรายการใหม่
        </motion.button>
      </header>

      <DashboardCharts 
        totalBalance={totalBalance}
        totalIncomeValue={totalIncomeValue}
        todayIncome={todayIncome}
        totalExpenseValue={totalExpenseValue}
        todayExpense={todayExpense}
        expenses={expenses}
        doughnutData={doughnutData}
        chartType={chartType}
        setChartType={setChartType}
        chartView={chartView}
        setChartView={setChartView}
        renderAsBar={renderAsBar}
        chartConfig={chartConfig}
      />

      <TransactionHistory 
        sortedTransactions={sorted}
        categories={categories}
        handleDelete={handleDelete}
        exportToExcel={exportToExcel}
        exportToPDF={exportToPDF}
      />

      <TransactionFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        txType={txType}
        setTxType={setTxType}
        categories={categories}
        setCategories={setCategories}
        loadData={loadData}
      />
    </main>
  );
}
