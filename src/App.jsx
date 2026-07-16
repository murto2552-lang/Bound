import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Bookshelf from './pages/Bookshelf';
import Assistant from './pages/Assistant';
import CalendarView from './pages/CalendarView';
import Auth from './pages/Auth';
import DevDashboard from './pages/DevDashboard';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('bound_token');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Bookshelf />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="dev" element={<DevDashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
