import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import InboxPage from './pages/InboxPage';
import ContactsPage from './pages/ContactsPage';
import ProductsPage from './pages/ProductsPage';
import TriggersPage from './pages/TriggersPage';
import DashboardPage from './pages/DashboardPage';
import './index.css';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('pulseig_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  const { loadFromStorage } = useAuthStore();
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="triggers" element={<TriggersPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
