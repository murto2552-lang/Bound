import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, DollarSign, Database, Loader2, Lock, LogOut } from 'lucide-react';

const API_BASE = 'http://localhost:3000/v1/admin';

export default function App() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('admin_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async (key) => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'X-Admin-Key': key };
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/users`, { headers }),
        fetch(`${API_BASE}/stats`, { headers })
      ]);

      if (!usersRes.ok || !statsRes.ok) {
        throw new Error('Invalid Admin Key or Server Error');
      }

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      
      setUsers(usersData);
      setStats(statsData);
      setIsAuthenticated(true);
      localStorage.setItem('admin_key', key);
    } catch (err) {
      setError(err.message);
      setIsAuthenticated(false);
      localStorage.removeItem('admin_key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchDashboardData(adminKey);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setAdminKey(keyInput);
    fetchDashboardData(keyInput);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminKey('');
    localStorage.removeItem('admin_key');
    setUsers([]);
    setStats(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BounD Admin Portal</h1>
            <p className="text-slate-400 mt-2">Restricted Access Only</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20 text-center">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                placeholder="Enter Admin Key..."
              />
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Access Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-red-500" />
          <h1 className="text-lg font-bold">BounD Admin</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
          <LogOut className="w-4 h-4" />
          Lock Session
        </button>
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total Users</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats?.totalUsers || 0}</h3>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats?.totalTransactions || 0}</h3>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">System Cashflow</p>
                  <h3 className="text-2xl font-bold text-slate-800">฿{(stats?.totalAmount || 0).toLocaleString()}</h3>
                </div>
              </motion.div>
            </div>

            {/* Users Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Registered Users Directory</h3>
                <button onClick={() => fetchDashboardData(adminKey)} className="text-sm text-slate-500 hover:text-slate-800">
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-slate-400 text-sm border-b border-slate-100">
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Email Account</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-slate-500">No registered users</td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-mono">#{user.id}</td>
                          <td className="px-6 py-4 font-medium text-slate-700">{user.firstName} {user.lastName}</td>
                          <td className="px-6 py-4 text-slate-500">{user.email}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
