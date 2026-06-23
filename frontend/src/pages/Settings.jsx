import { useState, useEffect } from 'react';
import { settingsService, API_BASE_URL } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Save, AlertTriangle, Calendar, Mail, RefreshCw, MessageSquare, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
 
const Settings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    lowStockThreshold: 20,
    expiryWarningDays: 60,
    emailAlertIntervalHours: 24,
    pharmacyGSTIN: '01ABCDE1234F1Z5',
    pharmacyState: '01',
    pharmacyStateName: 'Jammu & Kashmir',
    defaultGSTRate: 12
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({ status: 'disconnected', qr: null });
  const [wsConnecting, setWsConnecting] = useState(false);
 
  useEffect(() => {
    fetchSettings();
  }, []);
 
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
 
    const url = `${API_BASE_URL}/settings/whatsapp/status?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWhatsappStatus(data);
      } catch (e) {
        console.error('Failed to parse WhatsApp status:', e);
      }
    };

    eventSource.onerror = () => {
      // Reconnects automatically
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await settingsService.get();
      if (data.success && data.settings) {
        setFormData({
          lowStockThreshold: data.settings.lowStockThreshold,
          expiryWarningDays: data.settings.expiryWarningDays,
          emailAlertIntervalHours: data.settings.emailAlertIntervalHours,
          pharmacyGSTIN: data.settings.pharmacyGSTIN || '01ABCDE1234F1Z5',
          pharmacyState: data.settings.pharmacyState || '01',
          pharmacyStateName: data.settings.pharmacyStateName || 'Jammu & Kashmir',
          defaultGSTRate: data.settings.defaultGSTRate ?? 12
        });
      }
    } catch (error) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? Number(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await settingsService.update(formData);
      if (data.success) {
        toast.success(data.message || 'System settings updated successfully! ⚙️');
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings. Check connection.');
    } finally {
      setSaving(false);
    }
  };
  const handleConnectWhatsApp = async () => {
    try {
      setWsConnecting(true);
      const loadingToast = toast.loading('Initializing WhatsApp client...');
      await api.post('/settings/whatsapp/connect');
      toast.dismiss(loadingToast);
      toast.success('Connection initialized! Please wait for connection or QR Code.');
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Failed to initialize WhatsApp connection');
    } finally {
      setWsConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const confirm = window.confirm('Are you sure you want to disconnect WhatsApp and log out? You will need to scan the QR code again to reconnect.');
      if (!confirm) return;

      const loadingToast = toast.loading('Disconnecting WhatsApp client...');
      await api.post('/settings/whatsapp/disconnect');
      toast.dismiss(loadingToast);
      toast.success('WhatsApp client disconnected successfully! 🔌');
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Failed to disconnect WhatsApp client');
    }
  };
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-650">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 max-w-sm">
          You do not have the necessary permissions to access this page. Only System Administrators can adjust thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-7 w-7 text-blue-600" />
          System Settings
        </h1>
        <p className="text-gray-600 mt-1">Configure global warning thresholds, expiry alerts, and automated job schedules</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2 bg-white rounded-2xl border border-gray-150 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-gray-500">Retrieving config settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
            Inventory Warning Thresholds
          </h3>

          <div className="space-y-6">
            {/* Low Stock Threshold */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-yellow-500" />
                  Low Stock Threshold
                </label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  Mark medicine as "Low Stock" when quantity drops below this limit.
                </span>
              </div>
              <div className="md:col-span-2 relative max-w-xs">
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">units</span>
              </div>
            </div>

            {/* Expiry Warning Days */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-red-500" />
                  Expiry Alert Days
                </label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  Mark medicine as "Expiring Soon" when within this many days of expiry.
                </span>
              </div>
              <div className="md:col-span-2 relative max-w-xs">
                <input
                  type="number"
                  name="expiryWarningDays"
                  value={formData.expiryWarningDays}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">days</span>
              </div>
            </div>

            {/* Email Alert Interval */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail className="h-4.5 w-4.5 text-indigo-500" />
                  Email Check Schedule
                </label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  How frequently the background job sends reports to your Gmail.
                </span>
              </div>
              <div className="md:col-span-2 relative max-w-xs">
                <input
                  type="number"
                  name="emailAlertIntervalHours"
                  value={formData.emailAlertIntervalHours}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">hours</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-150">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  <span>Save Configurations</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* GST Configuration */}
      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-green-600" />
            GST Configuration
          </h3>

          <div className="space-y-6">
            {/* Pharmacy GSTIN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm font-bold text-gray-700">Pharmacy GSTIN</label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  Your 15-digit GST Identification Number.
                </span>
              </div>
              <div className="md:col-span-2 max-w-xs">
                <input
                  type="text"
                  name="pharmacyGSTIN"
                  value={formData.pharmacyGSTIN}
                  onChange={handleChange}
                  placeholder="e.g. 01ABCDE1234F1Z5"
                  maxLength={15}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-mono font-semibold tracking-wider uppercase"
                />
              </div>
            </div>

            {/* Pharmacy State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm font-bold text-gray-700">State / UT</label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  Your pharmacy state for CGST/SGST vs IGST calculation.
                </span>
              </div>
              <div className="md:col-span-2 flex gap-3 max-w-xs">
                <input
                  type="text"
                  name="pharmacyState"
                  value={formData.pharmacyState}
                  onChange={handleChange}
                  placeholder="01"
                  maxLength={2}
                  className="w-16 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-3 outline-none font-mono font-semibold text-center"
                />
                <input
                  type="text"
                  name="pharmacyStateName"
                  value={formData.pharmacyStateName}
                  onChange={handleChange}
                  placeholder="Jammu & Kashmir"
                  className="flex-1 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold"
                />
              </div>
            </div>

            {/* Default GST Rate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm font-bold text-gray-700">Default GST Rate</label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  Applied to new medicines. Most pharma products use 12%.
                </span>
              </div>
              <div className="md:col-span-2 max-w-xs">
                <select
                  name="defaultGSTRate"
                  value={formData.defaultGSTRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold bg-white"
                >
                  <option value={0}>0% — Exempt</option>
                  <option value={5}>5% — Life-saving drugs</option>
                  <option value={12}>12% — Most formulations (Recommended)</option>
                  <option value={18}>18% — Medical devices</option>
                  <option value={28}>28% — Luxury / non-essential</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-150">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  <span>Save GST Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* WhatsApp Status Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-6">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          WhatsApp Alerts Integration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${
                whatsappStatus.status === 'ready' ? 'bg-green-500 animate-pulse' :
                whatsappStatus.status === 'qr' ? 'bg-yellow-500 animate-pulse' :
                whatsappStatus.status === 'connecting' ? 'bg-blue-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-sm font-bold text-gray-700 capitalize">
                Status: {
                  whatsappStatus.status === 'ready' ? 'Connected & Ready' :
                  whatsappStatus.status === 'qr' ? 'Action Required: Scan QR Code' :
                  whatsappStatus.status === 'connecting' ? 'Initializing Client...' :
                  'Disconnected'
                }
              </span>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              When connected, the pharmacy system will automatically dispatch inventory alerts and PDF spreadsheets directly to the administrator's WhatsApp number.
            </p>
            
            <div className="flex gap-3 pt-2">
              {whatsappStatus.status === 'disconnected' && (
                <button
                  type="button"
                  onClick={handleConnectWhatsApp}
                  disabled={wsConnecting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                >
                  Connect WhatsApp
                </button>
              )}
              {whatsappStatus.status !== 'disconnected' && (
                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  className="inline-flex items-center px-4 py-2 bg-red-650 hover:bg-red-755 text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                >
                  Disconnect & Log Out
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[200px]">
            {whatsappStatus.status === 'qr' && whatsappStatus.qr ? (
              <div className="space-y-3 text-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(whatsappStatus.qr)}`} 
                  alt="WhatsApp QR Code" 
                  className="border border-slate-200 rounded-xl p-1 bg-white mx-auto shadow-sm"
                />
                <p className="text-[10px] font-semibold text-slate-500">Scan this QR Code with WhatsApp</p>
              </div>
            ) : whatsappStatus.status === 'ready' ? (
              <div className="space-y-2 text-center text-green-700">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Successfully Connected!</p>
                <p className="text-[10px] text-green-600 max-w-[160px] mx-auto leading-relaxed">System alerts are streaming to your device.</p>
              </div>
            ) : whatsappStatus.status === 'connecting' ? (
              <div className="space-y-2 text-center text-blue-700">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm font-semibold">Booting Browser...</p>
                <p className="text-[10px] text-blue-600 max-w-[160px] mx-auto leading-relaxed">Launching Puppeteer session in background.</p>
              </div>
            ) : (
              <div className="space-y-2 text-center text-slate-400">
                <svg className="w-10 h-10 mx-auto text-slate-350 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-xs font-semibold">Client Inactive</p>
                <p className="text-[9px] max-w-[150px] mx-auto leading-relaxed">WhatsApp client is shut down. Click connect to initialize.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
