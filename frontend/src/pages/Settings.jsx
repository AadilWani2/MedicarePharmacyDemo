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
    defaultGSTRate: 12,
    whatsappEnabled: false,
    whatsappRecipient: '',
    whatsappApiKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  useEffect(() => {
    fetchSettings();
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
          defaultGSTRate: data.settings.defaultGSTRate ?? 12,
          whatsappEnabled: data.settings.whatsappEnabled ?? false,
          whatsappRecipient: data.settings.whatsappRecipient || '',
          whatsappApiKey: data.settings.whatsappApiKey || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
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

  const handleSendTestAlert = async () => {
    if (!formData.whatsappRecipient || !formData.whatsappApiKey) {
      toast.error('Please enter a WhatsApp phone number and CallMeBot API key first.');
      return;
    }
    try {
      setTestingAlert(true);
      const loadingToast = toast.loading('Sending test WhatsApp message...');
      const { data } = await api.post('/settings/whatsapp/test', {
        whatsappRecipient: formData.whatsappRecipient,
        whatsappApiKey: formData.whatsappApiKey
      });
      toast.dismiss(loadingToast);
      if (data.success) {
        toast.success(data.message || 'Test alert sent successfully!');
      } else {
        toast.error(data.message || 'Failed to send test alert');
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Error sending test WhatsApp alert');
    } finally {
      setTestingAlert(false);
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
        <>
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

          {/* GST Configuration */}
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

          {/* WhatsApp Alerts Integration */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Alerts Integration
            </h3>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-850 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                CallMeBot Lightweight WhatsApp Gateway (Free & Zero-RAM)
              </p>
              <p>
                To set up instant WhatsApp alerts for low stock and daily summaries without bloating server resources, follow these simple steps:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 font-medium ml-1">
                <li>Add the CallMeBot contact <strong>+34 694 23 67 31</strong> to your phone's contact list.</li>
                <li>Send a WhatsApp message saying: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono select-all">I allow callmebot to send me messages</code> to that contact.</li>
                <li>Wait for the bot to reply with your unique <strong>API Key</strong>.</li>
                <li>Enter your phone number (with country code, e.g., <strong>919876543210</strong>) and the API Key below.</li>
              </ol>
            </div>

            <div className="space-y-6">
              {/* Enable WhatsApp Alerts Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="whatsappEnabled"
                  name="whatsappEnabled"
                  checked={formData.whatsappEnabled}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <label htmlFor="whatsappEnabled" className="text-sm font-bold text-gray-700 block">
                    Enable WhatsApp Notifications
                  </label>
                  <span className="text-xs text-gray-400 block mt-0.5">
                    Check this to route system stock updates and daily summaries to WhatsApp.
                  </span>
                </div>
              </div>

              {/* Recipient Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="text-sm font-bold text-gray-700">Recipient Phone Number</label>
                  <span className="text-xs text-gray-400 block mt-0.5">
                    Include country code (e.g. 91 for India, no spaces or + symbol).
                  </span>
                </div>
                <div className="md:col-span-2 max-w-xs">
                  <input
                    type="text"
                    name="whatsappRecipient"
                    value={formData.whatsappRecipient}
                    onChange={handleChange}
                    placeholder="e.g. 919876543210"
                    required={formData.whatsappEnabled}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold"
                  />
                </div>
              </div>

              {/* CallMeBot API Key */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="text-sm font-bold text-gray-700">CallMeBot API Key</label>
                  <span className="text-xs text-gray-400 block mt-0.5">
                    The API key provided to you by the CallMeBot bot.
                  </span>
                </div>
                <div className="md:col-span-2 max-w-xs">
                  <input
                    type="text"
                    name="whatsappApiKey"
                    value={formData.whatsappApiKey}
                    onChange={handleChange}
                    placeholder="e.g. 123456"
                    required={formData.whatsappEnabled}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-150">
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testingAlert || !formData.whatsappRecipient || !formData.whatsappApiKey}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs border border-gray-200 shadow-sm hover:shadow active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingAlert ? 'animate-spin' : ''}`} />
                <span>Send Test Alert</span>
              </button>

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
                    <span>Save WhatsApp Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
export default Settings;
