import { Link, useLocation, useOutlet } from 'react-router-dom';
import { Home, PieChart, Sparkles, LogOut, Wallet, CalendarDays, Trash2, QrCode, User } from 'lucide-react';
import { api } from '../api';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';
export default function Layout() {
  const location = useLocation();
  const currentOutlet = useOutlet();

  const handleReset = async () => {
    if (window.confirm('⚠️ คำเตือน: คุณต้องการล้างประวัติการทำรายการและหมวดหมู่ที่ตั้งไว้ทั้งหมดใช่หรือไม่?\n\nข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้ (เหมาะสำหรับการเริ่มใช้งานใหม่)')) {
      try {
        await api.resetDatabase();
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
      }
    }
  };

  const handleLogout = () => {
    api.logout();
    window.location.reload();
  };

  const navItems = [
    { name: 'Bookshelf', path: '/', icon: <PieChart size={20} /> },
    { name: 'Calendar', path: '/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Receive', path: '/receive', icon: <QrCode size={20} /> },
    { name: 'Assistant', path: '/assistant', icon: <Sparkles size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-sm font-extrabold text-xl italic pb-0.5 pr-0.5">B</div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">BounD</h1>
        </div>
        <div className="flex gap-1">
          <button onClick={handleLogout} className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg transition-colors" aria-label="ออกจากระบบ">
            <LogOut size={20} />
          </button>
          <button onClick={handleReset} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" aria-label="รีเซ็ตข้อมูล">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shadow-sm z-20">
        <div className="flex items-center gap-3 px-2 mb-8 mt-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md font-extrabold text-2xl italic pb-0.5 pr-0.5">
            B
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">BounD</h1>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive 
                    ? 'bg-purple-50 text-purple-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 flex flex-col gap-2">
          <button onClick={handleReset} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={20} />
            ล้างข้อมูลทั้งหมด
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 relative w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            {currentOutlet}
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-2 py-1 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.25rem)' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full py-2 transition-all ${
                isActive ? 'text-purple-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className={`${isActive ? 'bg-purple-100 p-1.5 rounded-xl' : 'p-1.5'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.name.replace('Present ', '')}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
