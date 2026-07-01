import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import AppLayout from './components/layout/AppLayout';

import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import PushPage from './pages/PushPage';
import HistoryPage from './pages/HistoryPage';
import AccountPage from './pages/AccountPage';
import PlatformsPage from './pages/PlatformsPage';

export default function App() {
  return (
    <ToastProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/push" element={<PushPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/platforms/:platform" element={<PlatformsPage />} />
        </Routes>
      </AppLayout>
    </ToastProvider>
  );
}
