import { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    loadData();
    const savedCats = localStorage.getItem('financeCategories');
    if (savedCats) {
      setCategories(JSON.parse(savedCats));
    }
  }, []);

  const loadData = async () => {
    const data = await api.getTransactions();
    setTransactions(data);
  };

  const handleDelete = async (id, dayTx, day, month, year) => {
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      try {
        await api.deleteTransaction(id);
        const newData = await api.getTransactions();
        setTransactions(newData);
        const newDayTx = dayTx.filter(t => t.id !== id);
        setSelectedDate({ day, month, year, transactions: newDayTx });
      } catch (err) {
        console.error('Failed to delete transaction', err);
        alert('เกิดข้อผิดพลาดในการลบรายการ');
      }
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null); // Empty slots before the 1st
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  const getTransactionsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return transactions.filter(t => t.date === dateStr);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getCategoryLabel = (tx) => {
    if (!categories) return tx.subcategory;
    const catGroup = tx.type === 'income' ? categories.income : categories.expense;
    return catGroup[tx.subcategory]?.label || tx.subcategory;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarIcon className="text-purple-600" size={28} />
            ปฏิทินรายรับ-รายจ่าย
          </h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">ติดตามกระแสเงินสดและกำหนดชำระหนี้</p>
        </div>
        
        <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 md:w-48 text-center font-bold text-lg text-slate-800">
            {monthNames[month]} {year + 543}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
            <div key={i} className="py-3 text-center text-sm font-semibold text-slate-500">
              {d}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, index) => {
            const isToday = day && `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr;
            const dayTx = getTransactionsForDay(day);
            const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
            const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
            
            // Pending checks for Fixed/Debt
            const hasPending = dayTx.some(t => 
              t.type === 'expense' && 
              (t.mainCategory === 'fixed' || t.mainCategory === 'debt') && 
              t.date > todayStr
            );

            return (
              <div 
                key={index} 
                onClick={() => day && setSelectedDate({ day, month, year, transactions: dayTx })}
                className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-b border-r border-slate-100 relative group transition-colors ${day ? 'cursor-pointer hover:bg-purple-50/50' : 'bg-slate-50/50'} ${index % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-right text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                      <span className={isToday ? 'bg-blue-100 px-2 py-0.5 rounded-full' : ''}>{day}</span>
                    </div>
                    
                    <div className="space-y-1.5 flex flex-col items-end">
                      {income > 0 && (
                        <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-md text-xs font-medium text-green-700 border border-green-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          +{income.toLocaleString('th-TH')}
                        </div>
                      )}
                      
                      {expense > 0 && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${hasPending ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {hasPending ? <Clock size={10} className="text-orange-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                          -{expense.toLocaleString('th-TH')}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setSelectedDate(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                รายการวันที่ {selectedDate.day} {monthNames[selectedDate.month]} {selectedDate.year + 543}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedDate.transactions.length === 0 ? (
                <div className="text-center text-slate-500 py-8">ไม่มีรายการในวันนี้</div>
              ) : (
                <div className="space-y-4">
                  {selectedDate.transactions.map((tx, idx) => {
                    const isPending = tx.type === 'expense' && (tx.mainCategory === 'fixed' || tx.mainCategory === 'debt') && tx.date > todayStr;
                    return (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{getCategoryLabel(tx)}</span>
                          {tx.notes && <span className="text-xs text-slate-500 mt-0.5">{tx.notes}</span>}
                          
                          <div className="flex gap-2 mt-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              tx.type === 'income' ? 'bg-green-100 text-green-700' :
                              tx.mainCategory === 'variable' ? 'bg-blue-100 text-blue-700' :
                              tx.mainCategory === 'fixed' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {tx.type === 'income' ? 'รายรับ' : 
                              tx.mainCategory === 'variable' ? 'ผันแปร' :
                              tx.mainCategory === 'fixed' ? 'คงที่' : 'หนี้สิน'}
                            </span>
                            
                            {isPending && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                                <Clock size={10} /> รอชำระ
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                            {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('th-TH')} ฿
                          </div>
                          <button onClick={() => handleDelete(tx.id, selectedDate.transactions, selectedDate.day, selectedDate.month, selectedDate.year)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors" title="ลบรายการ">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
