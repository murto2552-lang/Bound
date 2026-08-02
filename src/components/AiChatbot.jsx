import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '../api';

const QUICK_PROMPTS = [
  '📊 ช่วยวิเคราะห์ภาพรวมการเงินของฉันหน่อย',
  '💡 มีแนวทางออมเงินให้ได้ตามเป้าหมายอย่างไรบ้าง?',
  '🛍️ สรุปหมวดหมู่รายจ่ายที่เกิดขึ้นให้หน่อย',
  '📅 เดือนนี้ฉันควรใช้จ่ายวันละเท่าไหร่ดี?'
];

export default function AiChatbot() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('bound_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      {
        id: 1,
        sender: 'bot',
        text: 'สวัสดีครับ! ผมคือ **BounD Gemini AI** ผู้ช่วยการเงินส่วนบุคคลอัจฉริยะ 🤖✨\n\nผมสามารถช่วยคุณวิเคราะห์การใช้จ่าย ให้คำแนะนำในการออมเงิน หรือสรุปภาพรวมบัญชีของคุณได้ครับ ลองพิมพ์คำถามหรือเลือกปุ่มคำแนะนำด้านล่างได้เลยครับ!',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('bound_ai_chat_history', JSON.stringify(messages));
  }, [messages]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    // Create an empty bot message that will be filled via streaming
    const botMsgId = Date.now() + 1;
    const botMsgTimestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    // Add the empty bot message bubble immediately
    setMessages((prev) => [...prev, {
      id: botMsgId,
      sender: 'bot',
      text: '',
      timestamp: botMsgTimestamp,
      source: 'gemini',
      isStreaming: true
    }]);

    try {
      // Build history payload for Gemini
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await api.sendAiChat(text, historyPayload, (chunk) => {
        // onChunk callback: update the bot message text incrementally
        setMessages((prev) => prev.map(msg =>
          msg.id === botMsgId
            ? { ...msg, text: msg.text + chunk }
            : msg
        ));
      });

      // Finalize the bot message (mark streaming complete, set source)
      setMessages((prev) => prev.map(msg =>
        msg.id === botMsgId
          ? {
              ...msg,
              text: res.reply || msg.text || 'ขออภัยครับ ไม่สามารถประมวลผลคำตอบได้ในขณะนี้',
              source: res.source,
              isStreaming: false
            }
          : msg
      ));
    } catch (err) {
      console.error(err);
      // Replace the streaming bot message with an error message
      setMessages((prev) => prev.map(msg =>
        msg.id === botMsgId
          ? {
              ...msg,
              text: '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้งครับ',
              source: 'error',
              isStreaming: false
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('คุณต้องการล้างประวัติการสนทนาทั้งหมดใช่หรือไม่?')) {
      setMessages([
        {
          id: Date.now(),
          sender: 'bot',
          text: 'รีเซ็ตการสนทนาเรียบร้อยแล้วครับ! มีเรื่องการเงินอะไรให้ BounD AI ช่วยวิเคราะห์ไหมครับ? 😊',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          source: 'gemini'
        }
      ]);
    }
  };

  const renderFormattedText = (text) => {
    // Basic Markdown formatting helper
    return text.split('\n').map((line, idx) => {
      let formattedLine = line;
      // Bold **text**
      const parts = formattedLine.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={line === '' ? 'h-2' : 'my-0.5'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="glass-card flex flex-col h-[650px] overflow-hidden p-0 relative border border-white/60 shadow-[0_8px_32px_rgba(139,92,246,0.12)]">
      {/* Chat Header */}
      <div className="p-4 md:p-5 bg-gradient-to-r from-purple-600/90 to-orange-500/90 backdrop-blur-md text-white flex justify-between items-center border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg leading-none">BounD Gemini AI</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> Powered by Gemini
              </span>
            </div>
            <p className="text-xs text-purple-100 mt-1">ผู้ช่วยวิเคราะห์และวางแผนการเงินส่วนตัว</p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
          title="ล้างประวัติการสนทนา"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : 'bg-gradient-to-r from-purple-600 to-orange-500 text-white'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[80%] md:max-w-[70%] space-y-1`}>
                <div
                  className={`p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none shadow-purple-500/5'
                  }`}
                >
                  {msg.text ? renderFormattedText(msg.text) : null}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-purple-500 rounded-sm animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
                
                <div className={`text-[10px] text-slate-400 px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && !messages.some(m => m.isStreaming && m.text.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-center"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl rounded-tl-none text-slate-500 text-sm flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>BounD AI กำลังเชื่อมต่อ...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      <div className="px-4 py-2 bg-white/60 border-t border-slate-200/60 overflow-x-auto flex gap-2 no-scrollbar">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="whitespace-nowrap px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200/60 transition-colors flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
          >
            <MessageSquare className="w-3 h-3 text-purple-500" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 md:p-4 bg-white border-t border-slate-200/80 flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="ถามคำแนะนำทางการเงินหรือวิเคราะห์รายจ่าย..."
          disabled={isLoading}
          className="flex-1 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
