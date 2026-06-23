import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Pill, ShoppingCart, Truck, 
  FileText, Users, Shield, LogOut, Menu, X,
  Settings as SettingsIcon, ScrollText
} from 'lucide-react';
import NotificationBell from '../common/NotificationBell';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Medicines', href: '/medicines', icon: Pill },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Purchases', href: '/purchases', icon: Truck },
    { name: 'Suppliers', href: '/suppliers', icon: Users },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Staff', href: '/users', icon: Shield },
  ];

  const navigation = user?.role === 'admin' 
    ? [...baseNavigation, 
        { name: 'Audit Log', href: '/audit', icon: ScrollText },
        { name: 'Settings', href: '/settings', icon: SettingsIcon }
      ]
    : baseNavigation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
            <div className="flex items-center justify-between h-16 px-4 bg-blue-600">
              <div className="flex items-center">
                <Pill className="h-8 w-8 text-white" />
                <span className="ml-3 text-xl font-bold text-white">MediCare</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex items-center h-16 px-6 bg-blue-600">
            <Pill className="h-8 w-8 text-white" />
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">MediCare</h1>
              <p className="text-xs text-blue-100">Pharmacy System</p>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">📍 Residency Road, Srinagar</p>
              <p>📞 +91 98765 43210</p>
              <p>GST: 01ABCDE1234F1Z5</p>
              <p>Lic: JK/PHARMA/2026/4587</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-gray-900">
                MediCare Pharmacy
              </h2>
              <p className="text-xs text-gray-500">Srinagar, Jammu & Kashmir</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* 🔔 NOTIFICATION BELL */}
              <NotificationBell />
              
              {/* Divider */}
              <div className="h-8 w-px bg-gray-200"></div>
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-8rem)]">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t bg-white px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
            <p>© 2026 MediCare Pharmacy. All rights reserved.</p>
            <p>Drug License: JK/PHARMA/2026/4587 | GST: 01ABCDE1234F1Z5</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;