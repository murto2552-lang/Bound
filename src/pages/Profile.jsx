import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, CreditCard, Loader2, Save } from 'lucide-react';
import { api } from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promptpayId, setPromptpayId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setPromptpayId(data.promptpayId || '');
    } catch (err) {
      console.error(err);
      setMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.updateProfile({ promptpayId });
      setMessage('บันทึกข้อมูลเรียบร้อยแล้ว (Profile updated)');
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-700 to-indigo-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/40 shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
          <p className="text-purple-100 mt-1">{profile?.email}</p>
        </div>

        <div className="p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-purple-600" />
            ข้อมูลการรับเงิน (Payment Settings)
          </h3>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                หมายเลขพร้อมเพย์ (PromptPay ID)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={promptpayId}
                  onChange={(e) => setPromptpayId(e.target.value)}
                  placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                ใช้สำหรับสร้าง QR Code เพื่อรับเงินจากเพื่อนหรือลูกค้า
              </p>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className={`p-3 rounded-lg text-sm ${message.includes('ข้อผิดพลาด') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}
              >
                {message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกข้อมูล
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
