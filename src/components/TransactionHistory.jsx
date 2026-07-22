import { Download, Trash2 } from 'lucide-react';

/**
 * A component to display the history of transactions with export options.
 * @param {Object} props
 * @param {Array} props.sortedTransactions - The sorted transactions to display.
 * @param {Object} props.categories - The categories configuration.
 * @param {Function} props.handleDelete - Function to delete a transaction.
 * @param {Function} props.exportToExcel - Function to export data to Excel.
 * @param {Function} props.exportToPDF - Function to export data to PDF.
 */
export default function TransactionHistory({ 
  sortedTransactions, 
  categories, 
  handleDelete, 
  exportToExcel, 
  exportToPDF 
}) {
  return (
    <section className="glass-card" aria-labelledby="history-heading">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 id="history-heading" className="text-lg font-semibold text-slate-700">ประวัติล่าสุด</h3>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors" aria-label="ดาวน์โหลดเป็น Excel">
            <Download size={16} aria-hidden="true" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors" aria-label="ดาวน์โหลดเป็น PDF">
            <Download size={16} aria-hidden="true" /> PDF
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm whitespace-nowrap">
              <th className="px-6 py-3 font-medium">วันที่</th>
              <th className="px-6 py-3 font-medium">รายการ</th>
              <th className="px-6 py-3 font-medium">หมวดหมู่หลัก</th>
              <th className="px-6 py-3 font-medium text-right">จำนวนเงิน</th>
              <th className="px-4 py-3 font-medium w-16" aria-label="การจัดการ"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTransactions.slice().reverse().map((tx, idx) => (
              <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                <td className="px-6 py-4 text-slate-600 text-sm">{tx.date}</td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">
                    {tx.type === 'income' ? categories.income[tx.subcategory]?.label : categories.expense[tx.subcategory]?.label}
                  </div>
                  {tx.title && <div className="text-xs font-semibold text-blue-600 mt-0.5">{tx.title}</div>}
                  {tx.notes && <div className="text-xs text-slate-500 mt-1 whitespace-normal max-w-xs">{tx.notes}</div>}
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
                  <button onClick={() => handleDelete(tx)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" aria-label={`ลบรายการ ${tx.notes || ''}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {sortedTransactions.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">ยังไม่มีประวัติการทำรายการ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
