import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Loader2, Info, ArrowDownToLine } from 'lucide-react';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function Receive() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = () => {
    if (profile?.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = profile.qrCodeUrl;
      link.download = 'My_QR_Code.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!profile?.qrCodeUrl) {
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
          <h2 className="text-xl font-bold text-slate-800 mb-2">ยังไม่ได้ตั้งค่ารูปภาพ QR Code</h2>
          <p className="text-slate-500 mb-6">คุณต้องไปอัปโหลดรูปภาพ QR Code รับเงินของคุณเองในหน้าโปรไฟล์ก่อนครับ</p>
          <Link to="/profile" className="inline-block px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors">
            ไปอัปโหลดในหน้าโปรไฟล์
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
        className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative"
      >
        {/* Header decoration */}
        <div className="h-32 bg-gradient-to-r from-purple-600 to-orange-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full -ml-8 -mb-8 blur-lg"></div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              รับเงิน (Receive)
            </h2>
          </div>
        </div>

        <div className="p-6 md:p-8 relative -mt-6 bg-white rounded-t-2xl text-center">
          
          <div className="mb-6">
            <p className="text-sm text-slate-500 font-medium">แสกนเพื่อโอนเงินให้</p>
            <p className="text-lg font-bold text-slate-800">{profile.firstName} {profile.lastName}</p>
          </div>

          {/* QR Code Area */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mb-6 shadow-inner w-full max-w-[280px]">
            <div className="bg-white p-2 rounded-xl shadow-sm overflow-hidden">
              <img 
                src={profile.qrCodeUrl} 
                alt="My QR Code" 
                className="w-full h-auto object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = 'https://via.placeholder.com/250?text=Image+Not+Found';
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center mb-4">
            <button 
              onClick={handleSaveImage}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
            >
              <ArrowDownToLine className="w-4 h-4" />
              บันทึกรูปภาพ
            </button>
          </div>

        </div>
        
        {/* Note */}
        <div className="bg-purple-50 p-4 border-t border-purple-100 text-sm text-purple-800 flex gap-3 text-left">
          <Info className="w-5 h-5 flex-shrink-0 text-purple-600 mt-0.5" />
          <p>
            ผู้โอนสามารถสแกน QR Code นี้เพื่อชำระเงินได้ทันที <strong>กรุณาให้ผู้โอนระบุจำนวนเงินด้วยตนเอง</strong> และตรวจสอบยอดเงินเข้าในแอปธนาคารของคุณเพื่อยืนยันเสมอ
          </p>
        </div>
      </motion.div>
    </div>
  );
}
