import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Clock, Package, X, RefreshCw } from 'lucide-react';
import { medicineService } from '../../services/api';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh fallback every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);

    // Live SSE notifications
    const token = localStorage.getItem('accessToken');
    let eventSource = null;

    if (token) {
      const url = `http://localhost:5000/api/reports/notifications/stream?token=${token}`;
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const newAlert = JSON.parse(event.data);
          
          // Toast message in UI
          const toastMsg = `${newAlert.title}: ${newAlert.message}`;
          if (newAlert.priority === 'critical') {
            toast.error(toastMsg, { duration: 5000 });
          } else {
            toast(toastMsg, { icon: '⚠️', duration: 4000 });
          }

          // Add to notifications list
          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === newAlert.id)) return prev;
            return [newAlert, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
        } catch (e) {
          console.error('Failed to parse SSE notification:', e);
        }
      };

      eventSource.onerror = () => {
        // EventSource automatically handles reconnection
      };
    }

    return () => {
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [expiringRes, lowStockRes] = await Promise.all([
        medicineService.getExpiring(),
        medicineService.getLowStock()
      ]);

      const alerts = [];

      // Expiry alerts
      if (expiringRes.data.medicines) {
        expiringRes.data.medicines.forEach(med => {
          const daysLeft = Math.ceil((new Date(med.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `expiry-${med._id}`,
            type: 'expiry',
            priority: daysLeft <= 30 ? 'critical' : 'warning',
            title: 'Expiry Alert',
            message: `${med.name} expires in ${daysLeft} days`,
            details: `Batch: ${med.batchNumber} | Stock: ${med.quantity} units`,
            date: med.expiryDate,
            icon: AlertTriangle,
            medicineId: med._id
          });
        });
      }

      // Low stock alerts
      if (lowStockRes.data.medicines) {
        lowStockRes.data.medicines.forEach(med => {
          alerts.push({
            id: `lowstock-${med._id}`,
            type: 'lowstock',
            priority: med.quantity === 0 ? 'critical' : 'warning',
            title: 'Low Stock Alert',
            message: `${med.name} - Only ${med.quantity} units left`,
            details: `Reorder Level: ${med.reorderLevel} | Category: ${med.category}`,
            date: med.updatedAt || new Date(),
            icon: Package,
            medicineId: med._id
          });
        });
      }

      // Sort by priority (critical first, then by date)
      alerts.sort((a, b) => {
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (a.priority !== 'critical' && b.priority === 'critical') return 1;
        return new Date(b.date) - new Date(a.date);
      });

      setNotifications(alerts);
      setUnreadCount(alerts.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50 hover:bg-red-100',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          dot: 'bg-red-500',
          badge: 'bg-red-100 text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 hover:bg-yellow-100',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          dot: 'bg-yellow-500',
          badge: 'bg-yellow-100 text-yellow-700'
        };
      default:
        return {
          bg: 'hover:bg-gray-50',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          dot: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const criticalCount = notifications.filter(n => n.priority === 'critical').length;
  const warningCount = notifications.filter(n => n.priority === 'warning').length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
        title="Notifications"
      >
        <Bell className="h-6 w-6" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 transform transition-all">
          {/* Arrow */}
          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount > 0 
                  ? `${unreadCount} alert${unreadCount !== 1 ? 's' : ''}`
                  : 'No alerts'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">All Clear!</p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  No alerts or warnings. Everything is running smoothly.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const styles = getPriorityStyles(notification.priority);
                const IconComponent = typeof notification.icon === 'string'
                  ? (notification.icon === 'Package' ? Package : AlertTriangle)
                  : (notification.icon || Bell);
                
                return (
                  <div
                    key={notification.id}
                    className={`px-5 py-4 border-b border-gray-50 last:border-b-0 cursor-pointer transition-colors ${styles.bg}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
                        <IconComponent className={`h-5 w-5 ${styles.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </p>
                          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${styles.dot}`}></span>
                        </div>
                        
                        <p className="text-sm text-gray-700">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.details}
                        </p>
                        
                        <div className="flex items-center mt-2 space-x-2">
                          <div className="flex items-center text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="text-xs">{getTimeAgo(notification.date)}</span>
                          </div>
                          
                          {notification.priority === 'critical' && (
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles.badge}`}>
                              Action Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Summary */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {criticalCount > 0 && (
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="text-xs text-gray-600">
                        {criticalCount} Critical
                      </span>
                    </div>
                  )}
                  {warningCount > 0 && (
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span className="text-xs text-gray-600">
                        {warningCount} Warning{criticalCount > 0 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={dismissAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Dismiss All
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;