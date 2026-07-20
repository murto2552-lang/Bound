import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, CreditCard, Loader2, Save, Upload, ImageIcon, CheckCircle } from 'lucide-react';
import { api } from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      if (data.qrCodeUrl) {
        setPreviewUrl(data.qrCodeUrl);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage('คุณยังไม่ได้เลือกรูปภาพใหม่');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await api.uploadQrCode(selectedFile);
      setMessage('บันทึกรูปภาพ QR Code เรียบร้อยแล้ว (Profile updated)');
      setSelectedFile(null);
      setTimeout(() => setMessage(''), 3000);
      await loadProfile();
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
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-8 text-white text-center">
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
                รูปภาพ QR Code สำหรับรับเงิน
              </label>
              
              <div 
                className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-2 text-center">
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={previewUrl} alt="QR Code Preview" className="h-48 w-48 object-contain rounded-lg border border-slate-200 shadow-sm" />
                      <p className="text-sm text-purple-600 mt-4 flex items-center gap-1 font-medium">
                        <Upload className="w-4 h-4" /> เปลี่ยนรูปภาพ
                      </p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="text-sm text-slate-600">
                        <span className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none">
                          <span>คลิกเพื่ออัปโหลด</span>
                        </span>
                        <p className="pl-1">หรือลากไฟล์มาวางที่นี่</p>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, GIF ขนาดไม่เกิน 5MB</p>
                    </>
                  )}
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                คุณสามารถบันทึกรูปภาพ QR Code จากแอปพลิเคชันธนาคาร (เช่น K PLUS, SCB EASY, หรือแม่มณี) แล้วนำมาอัปโหลดที่นี่
              </p>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('ข้อผิดพลาด') || message.includes('ยังไม่') ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'}`}
              >
                {message.includes('ข้อผิดพลาด') || message.includes('ยังไม่') ? null : <CheckCircle className="w-4 h-4" />}
                {message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={saving || !selectedFile}
              className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              อัปโหลดและบันทึก
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
