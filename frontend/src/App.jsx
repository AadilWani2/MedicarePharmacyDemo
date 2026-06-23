import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="medicines" element={<Medicines />} />
            <Route path="sales" element={<Sales />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;