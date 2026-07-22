import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Bookshelf from './pages/Bookshelf';
import Assistant from './pages/Assistant';
import CalendarView from './pages/CalendarView';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Receive from './pages/Receive';
import { AuthProvider, useAuth } from './context/AuthContext';

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Bookshelf />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="profile" element={<Profile />} />
            <Route path="receive" element={<Receive />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
