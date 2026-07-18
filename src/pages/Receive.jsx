import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import { Wallet, Loader2, Info, Share, Copy } from 'lucide-react';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function Receive() {
  const [amount, setAmount] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrPayload, setQrPayload] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      if (data.promptpayId) {
        // Generate initial QR without amount
        setQrPayload(generatePayload(data.promptpayId, { amount: 0 }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.promptpayId) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        setQrPayload(generatePayload(profile.promptpayId, { amount: numAmount }));
      } else {
        setQrPayload(generatePayload(profile.promptpayId, { amount: 0 }));
      }
    }
  }, [amount, profile]);

  const handleCopy = () => {
    if (profile?.promptpayId) {
      navigator.clipboard.writeText(profile.promptpayId);
      alert('คัดลอกหมายเลขพร้อมเพย์แล้ว');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!profile?.promptpayId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ยังไม่ได้ตั้งค่าพร้อมเพย์</h2>
          <p className="text-slate-500 mb-6">คุณต้องตั้งค่าหมายเลขพร้อมเพย์ในหน้าโปรไฟล์ก่อน ถึงจะสามารถสร้าง QR Code รับเงินได้ครับ</p>
          <Link to="/profile" className="inline-block px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors">
            ไปที่หน้าโปรไฟล์
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto w-full pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative"
      >
        {/* Header decoration */}
        <div className="h-32 bg-gradient-to-br from-indigo-900 to-purple-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full -ml-8 -mb-8 blur-lg"></div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              รับเงิน (Receive)
            </h2>
          </div>
        </div>

        <div className="p-6 md:p-8 relative -mt-6 bg-white rounded-t-3xl text-center">
          
          <div className="mb-6">
            <p className="text-sm text-slate-500 font-medium">ชื่อผู้รับ</p>
            <p className="text-lg font-bold text-slate-800">{profile.firstName} {profile.lastName}</p>
          </div>

          {/* QR Code Area */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mb-6 shadow-inner">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              {qrPayload ? (
                <QRCodeSVG value={qrPayload} size={200} level="M" includeMargin={false} />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* PromptPay Info */}
          <div className="flex items-center justify-center gap-2 mb-8 bg-purple-50 text-purple-700 py-2 px-4 rounded-full w-fit mx-auto cursor-pointer hover:bg-purple-100 transition-colors" onClick={handleCopy}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/PromptPay-logo.png/1200px-PromptPay-logo.png" alt="PromptPay" className="h-4 object-contain" />
            <span className="font-bold font-mono tracking-wider">{profile.promptpayId}</span>
            <Copy className="w-4 h-4 text-purple-500" />
          </div>

          {/* Amount Input */}
          <div className="text-left">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ระบุจำนวนเงิน (บาท) - ไม่บังคับ
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">฿</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-xl font-bold text-slate-800 placeholder-slate-300"
              />
            </div>
          </div>

        </div>
        
        {/* Warning Note */}
        <div className="bg-orange-50 p-4 border-t border-orange-100 text-sm text-orange-800 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-orange-500 mt-0.5" />
          <p>
            ระบบนี้เป็นเพียงการสร้าง QR Code ด้วยไลบรารี <strong>ไม่สามารถตรวจสอบสถานะการโอนเงินอัตโนมัติได้</strong> กรุณาตรวจสอบยอดเงินเข้าในแอปธนาคารของคุณเสมอ
          </p>
        </div>
      </motion.div>
    </div>
  );
}
