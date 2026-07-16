import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, DollarSign, Database, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function DevDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, statsData] = await Promise.all([
          api.getAdminUsers(),
          api.getAdminStats()
        ]);
        setUsers(usersData);
        setStats(statsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl shadow-sm border border-red-100 flex items-center gap-3">
          <Database className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <main className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-8 h-8 text-purple-600" />
          Developer Dashboard
        </h2>
        <p className="text-slate-500 mt-1">System Overview & User Management</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Users</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats?.totalUsers || 0}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats?.totalTransactions || 0}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Registered Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-4 font-medium border-b border-slate-200">ID</th>
                <th className="px-6 py-4 font-medium border-b border-slate-200">Name</th>
                <th className="px-6 py-4 font-medium border-b border-slate-200">Email</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-500">No users found</td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">#{user.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{user.firstName} {user.lastName}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </main>
  );
}
