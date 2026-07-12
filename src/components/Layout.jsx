import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, PieChart, Sparkles, LogOut, Wallet, CalendarDays, Trash2 } from 'lucide-react';
import { api } from '../api';

export default function Layout() {
  const location = useLocation();

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

  const navItems = [
    { name: 'Bookshelf', path: '/', icon: <PieChart size={20} /> },
    { name: 'Calendar', path: '/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Present Assistant', path: '/assistant', icon: <Sparkles size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="flex items-center gap-3 px-2 mb-8 mt-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-700 to-orange-400 rounded-xl flex items-center justify-center text-white shadow-md font-extrabold text-2xl italic pb-0.5 pr-0.5">
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
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
