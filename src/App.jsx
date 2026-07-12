import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Bookshelf from './pages/Bookshelf';
import Assistant from './pages/Assistant';
import CalendarView from './pages/CalendarView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Bookshelf />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="assistant" element={<Assistant />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
