import { useState, useRef } from 'react';
import { api } from '../api';

/**
 * A modal component containing the transaction form.
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open.
 * @param {Function} props.onClose - Function to close the modal.
 * @param {string} props.txType - The current transaction type ('income' or 'expense').
 * @param {Function} props.setTxType - Setter for txType.
 * @param {Object} props.categories - The categories configuration.
 * @param {Function} props.setCategories - Setter for categories.
 * @param {Function} props.loadData - Function to reload transactions after submission.
 */
export default function TransactionFormModal({
  isOpen,
  onClose,
  txType,
  setTxType,
  categories,
  setCategories,
  loadData
}) {
  const [isAddingCustomSubCat, setIsAddingCustomSubCat] = useState(false);
  const [customSubCatName, setCustomSubCatName] = useState('');
  const [customMainCat, setCustomMainCat] = useState('variable');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('this_month');
  const [recurrenceDurationType, setRecurrenceDurationType] = useState('custom_installments');
  const [recurrenceCount, setRecurrenceCount] = useState('');
  const [salarySchedule, setSalarySchedule] = useState('end_of_month');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [amountInputMethod, setAmountInputMethod] = useState('manual');
  const [isExtracting, setIsExtracting] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const formRef = useRef(null);

  if (!isOpen) return null;

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
          const matches = text.match(/[\d,]+\.\d{2}/g);
          if (matches && matches.length > 0) {
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
        else iterations = 24; 
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
    
    onClose();
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

  let currentMainCat = 'variable';
  if (txType === 'expense') {
    if (selectedSubCat === 'add_new') currentMainCat = customMainCat;
    else if (categories.expense[selectedSubCat]) currentMainCat = categories.expense[selectedSubCat].type;
  }
  const showRecurrence = txType === 'expense' && (currentMainCat === 'fixed' || currentMainCat === 'debt');
  const isRecurringType = (txType === 'expense' && (currentMainCat === 'fixed' || currentMainCat === 'debt')) || (txType === 'income' && selectedSubCat === 'salary');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-full">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 id="modal-title" className="text-lg font-bold text-slate-800">บันทึกรายการใหม่</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl" aria-label="ปิดหน้าต่าง">&times;</button>
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
                    {isExtracting && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 animate-pulse" aria-live="polite">กำลังอ่านสลิป...</div>}
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
  );
}
