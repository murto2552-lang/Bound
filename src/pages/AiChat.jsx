import { Bot } from 'lucide-react';
import AiChatbot from '../components/AiChatbot';
import { motion } from 'framer-motion';

export default function AiChat() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="w-8 h-8 text-purple-600" />
            BounD Gemini AI
          </h2>
          <p className="text-slate-500 mt-1 text-sm">ผู้ช่วยวิเคราะห์และให้คำแนะนำทางการเงินส่วนบุคคล</p>
        </div>
      </div>
      
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <AiChatbot />
      </motion.div>
    </div>
  );
}
