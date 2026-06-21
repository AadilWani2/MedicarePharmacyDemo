import { useState, useEffect } from 'react';
import { FileText, Download, TrendingUp, AlertTriangle, Package, Calendar, Trash2, Mail, ShieldAlert, Sparkles, Percent, Undo } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { generateInvoicePDF, generateReturnMemoPDF } from '../utils/pdfGenerator';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [report, setReport] = useState(null);
  const [returnMemos, setReturnMemos] = useState([]);
  const [expiringMedicines, setExpiringMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'returns') {
        const [memoRes, expRes] = await Promise.all([
          api.get('/reports/supplier-return-memos'),
          api.get('/reports/expiry')
        ]);
        setReturnMemos(memoRes.data.memos);
        setExpiringMedicines(expRes.data.report.medicines);
        setReport({
          generatedAt: new Date(),
          isReturns: true
        });
      } else {
        const { data } = await api.get(`/reports/${activeTab}`);
        setReport(data.report);
      }
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    try {
      const percentage = 20;
      const days = 30;
      const confirm = window.confirm(`Are you sure you want to apply a ${percentage}% discount on all medicines expiring within ${days} days? This will directly update their selling price in the database.`);
      if (!confirm) return;

      const loadingToast = toast.loading('Applying clearance discount...');
      const { data } = await api.post('/medicines/apply-discount', { percentage, days });
      toast.dismiss(loadingToast);
      toast.success(data.message || 'Expiry discount applied successfully! 🎉');
      fetchReport();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to apply discount');
    }
  };

  const handleRevertDiscount = async () => {
    try {
      const confirm = window.confirm(`Are you sure you want to revert all active expiry discounts? This will restore medicines to their original prices.`);
      if (!confirm) return;

      const loadingToast = toast.loading('Reverting prices...');
      const { data } = await api.post('/medicines/revert-discount');
      toast.dismiss(loadingToast);
      toast.success(data.message || 'Expiry discounts reverted successfully! 🔄');
      fetchReport();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to revert discounts');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/sales/${saleToDelete._id}`);
      toast.success('Sale transaction deleted and stock restored successfully! 🎉');
      setIsConfirmOpen(false);
      setSaleToDelete(null);
      fetchReport();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete sale transaction');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendEmailAlerts = async () => {
    try {
      setSendingEmail(true);
      const loadingToast = toast.loading('Sending alert email to your Gmail...');
      
      const { data } = await api.post('/reports/send-email-alerts');
      
      toast.dismiss(loadingToast);
      if (data.success) {
        toast.success(data.message || 'Alert email sent successfully to your Gmail! ✉️');
      } else {
        toast.error(data.message || 'Failed to send alert email');
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to send alert email. Check SMTP settings in .env');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = () => {
    if (!report) {
      toast.error('No report data to export');
      return;
    }
    
    let csvData = [];
    let filename = `medicare_report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    if (activeTab === 'sales') {
      if (!report.sales || report.sales.length === 0) {
        toast.error('No sales data to export');
        return;
      }
      csvData = report.sales.map(s => ({
        'Invoice Number': s.billNumber,
        'Customer Name': s.customerName,
        'Customer Phone': s.customerPhone || 'N/A',
        'Total Amount (INR)': s.subtotal,
        'Discount Applied (INR)': s.discount || 0,
        'Net Amount Paid (INR)': s.totalAmount,
        'Payment Method': s.paymentMethod?.toUpperCase(),
        'Payment Status': s.paymentStatus,
        'Sale Date': new Date(s.saleDate).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }));
    } else {
      if (!report.medicines || report.medicines.length === 0) {
        toast.error('No medicines data to export');
        return;
      }
      csvData = report.medicines.map(m => ({
        'Medicine Name': m.name,
        'Generic Name': m.genericName,
        'Category': m.category,
        'Batch Number': m.batchNumber,
        'Stock Quantity': m.quantity,
        'Reorder Level': m.reorderLevel,
        'Purchase Price (INR)': m.purchasePrice,
        'Selling Price (INR)': m.sellingPrice,
        'Expiry Date': new Date(m.expiryDate).toLocaleDateString('en-IN')
      }));
    }
    
    // CSV Generator
    const headers = Object.keys(csvData[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of csvData) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${csvData.length} records successfully!`);
  };

  const tabs = [
    { id: 'inventory', name: 'Inventory Valuation', icon: Package },
    { id: 'sales', name: 'Sales Transactions', icon: TrendingUp },
    { id: 'expiry', name: 'Expiry Alerts', icon: Calendar },
    { id: 'low-stock', name: 'Low Stock Alerts', icon: AlertTriangle },
    { id: 'returns', name: 'Expiry & Returns', icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports Ledger</h1>
        <p className="text-gray-600 mt-1">Audit pharmacy transactions, inventory valuation, and regulatory alerts</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-150 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-55/50'
            }`}
          >
            <tab.icon className="h-4.5 w-4.5 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500">Querying ledger records...</p>
          </div>
        ) : report ? (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 capitalize">
                  {activeTab.replace('-', ' ')} Summary
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Generated at {new Date(report.generatedAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {user?.role === 'admin' && activeTab !== 'returns' && (
                  <button
                    onClick={handleSendEmailAlerts}
                    disabled={sendingEmail}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Mail className="h-4.5 w-4.5 mr-2" />
                    {sendingEmail ? 'Sending Email...' : 'Send Email Alert'}
                  </button>
                )}
                {activeTab !== 'returns' && (
                  <button 
                    onClick={handleExportCSV}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    <Download className="h-4.5 w-4.5 mr-2" />
                    Export CSV
                  </button>
                )}
              </div>
            {activeTab === 'returns' ? (
              <div className="space-y-8">
                {/* 1. Visual Expiry Timeline Card & Admin controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Timeline */}
                  <div className="lg:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                      <Calendar className="h-4.5 w-4.5 text-blue-600 mr-2" />
                      Expiring Inventory Valuation & Timeline
                    </h3>
                    <div className="space-y-4">
                      {/* Critical Bucket */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-red-650 flex items-center">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                            Critical Expiry (&lt; 30 Days)
                          </span>
                          <span className="font-medium text-gray-700">
                            {expiringMedicines.filter(m => {
                              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              return days <= 30;
                            }).length} items | Value: ₹{expiringMedicines.filter(m => {
                              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              return days <= 30;
                            }).reduce((sum, m) => sum + (m.quantity * m.purchasePrice), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-250 h-2 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>

                      {/* Warning Bucket */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-yellow-600 flex items-center">
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span>
                            Warning Expiry (30 - 60 Days)
                          </span>
                          <span className="font-medium text-gray-700">
                            {expiringMedicines.filter(m => {
                              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              return days > 30 && days <= 60;
                            }).length} items | Value: ₹{expiringMedicines.filter(m => {
                              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              return days > 30 && days <= 60;
                            }).reduce((sum, m) => sum + (m.quantity * m.purchasePrice), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-255 h-2 rounded-full overflow-hidden">
                          <div className="bg-yellow-500 h-full rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>

                      {/* Good/Watchlist Bucket */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-green-600 flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                            Watchlist Expiry (60 - 90 Days)
                          </span>
                          <span className="font-medium text-gray-700">
                            {expiringMedicines.filter(m => {
                              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              return days > 60 && days <= 90;
                            }).length} items | Value: ₹{expiringMedicines.filter(m => {
                              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              return days > 60 && days <= 90;
                            }).reduce((sum, m) => sum + (m.quantity * m.purchasePrice), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-255 h-2 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: '25%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Promotion Trigger Panel */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-md flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-yellow-300" />
                        Expiry Clearance Promotions
                      </h3>
                      <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                        Expiring stock can be discounted dynamically to encourage immediate sales and minimize total inventory write-off losses.
                      </p>
                    </div>
                    {user?.role === 'admin' ? (
                      <div className="flex gap-2.5 mt-4">
                        <button
                          onClick={handleApplyDiscount}
                          className="flex-1 inline-flex items-center justify-center px-3.5 py-2.5 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all font-bold text-xs shadow-sm hover:shadow active:scale-95 cursor-pointer"
                        >
                          <Percent className="h-4 w-4 mr-1.5" />
                          Apply 20% Off
                        </button>
                        <button
                          onClick={handleRevertDiscount}
                          className="flex-1 inline-flex items-center justify-center px-3.5 py-2.5 bg-indigo-805 text-white border border-indigo-500/30 rounded-xl hover:bg-indigo-900 transition-all font-semibold text-xs shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Undo className="h-4 w-4 mr-1.5" />
                          Revert Prices
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 text-xs text-yellow-350 bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/20">
                        ⚠️ Administrator access required to trigger inventory discount clearance.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Supplier Return Memos List */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 text-red-650 mr-2" />
                    Supplier Credit Return Invoices
                  </h3>
                  
                  {returnMemos.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-slate-50">
                      <Package className="h-8 w-8 text-gray-405 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-500">No expiring stock requires supplier returns.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {returnMemos.map(memo => (
                        <div key={memo.supplier.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                              <div>
                                <h4 className="font-bold text-gray-900">{memo.supplier.name}</h4>
                                <p className="text-xs text-gray-400 mt-0.5">Terms: {memo.supplier.paymentTerms || 'Credit Note'}</p>
                              </div>
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                Claim: ₹{memo.items.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            
                            {/* Short List of Items */}
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                              {memo.items.map(item => (
                                <div key={item.medicineId} className="flex justify-between text-xs text-gray-605 bg-slate-50 p-2 rounded-lg">
                                  <div>
                                    <p className="font-bold text-slate-800">{item.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Batch: {item.batchNumber} | Expiry: {new Date(item.expiryDate).toLocaleDateString('en-IN')}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-slate-800">₹{item.totalValue.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-slate-450 font-medium">{item.quantity} units @ ₹{item.purchasePrice}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => generateReturnMemoPDF(memo)}
                            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Download Return Memo PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {activeTab === 'inventory' && (
                    <>
                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Unique Medicines</p>
                        <p className="text-3xl font-extrabold text-blue-900 mt-1">{report.totalMedicines}</p>
                      </div>
                      <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/50">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Units in Stock</p>
                        <p className="text-3xl font-extrabold text-green-900 mt-1">{report.totalStock}</p>
                      </div>
                      <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100/50">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Valuation (Retail)</p>
                        <p className="text-3xl font-extrabold text-purple-900 mt-1">₹{report.totalValue?.toLocaleString('en-IN')}</p>
                      </div>
                    </>
                  )}
                  {activeTab === 'sales' && (
                    <>
                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Completed Invoices</p>
                        <p className="text-3xl font-extrabold text-blue-900 mt-1">{report.totalSales}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Gross Ledger Revenue</p>
                        <p className="text-3xl font-extrabold text-emerald-900 mt-1">₹{report.totalRevenue?.toLocaleString('en-IN')}</p>
                      </div>
                    </>
                  )}
                  {activeTab === 'expiry' && (
                    <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100/50 col-span-3">
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wider font-bold">Medicines Expiring Within 60 Days</p>
                      <p className="text-3xl font-extrabold text-red-900 mt-1">{report.totalExpiring} items require disposal/clearance</p>
                    </div>
                  )}
                  {activeTab === 'low-stock' && (
                    <div className="bg-yellow-50/50 p-5 rounded-2xl border border-yellow-100/50 col-span-3">
                      <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wider font-bold">Low Stock Reorder Alerts</p>
                      <p className="text-3xl font-extrabold text-yellow-900 mt-1">{report.totalLowStock} items are below safety levels</p>
                    </div>
                  )}
                </div>

                {/* Table list */}
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-55">
                        {activeTab === 'sales' ? (
                          <>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Details</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Amount</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medicine</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Retail Price</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeTab === 'sales' ? (
                        report.sales?.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="px-6 py-8 text-center text-xs text-gray-400 font-medium">No sales transactions found</td>
                          </tr>
                        ) : (
                          report.sales?.map((sale) => (
                            <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{sale.billNumber}</td>
                              <td className="px-6 py-4 text-sm">
                                <div>
                                  <p className="font-bold text-gray-955">{sale.customerName}</p>
                                  <p className="text-xs text-gray-400 font-medium">{sale.customerPhone || 'Walk-in'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-605">₹{sale.subtotal?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">₹{(sale.discount || 0)?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{sale.totalAmount?.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 border border-slate-200 uppercase font-mono text-slate-650">
                                  {sale.paymentMethod}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(sale.saleDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-6 py-4 text-right text-sm space-x-2">
                                <button
                                  onClick={() => generateInvoicePDF(sale, 'download')}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                  title="Download PDF Invoice"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                {user?.role === 'admin' && (
                                  <button
                                    onClick={() => {
                                      setSaleToDelete(sale);
                                      setIsConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                    title="Delete Sale Transaction"
                                  >
                                    <Trash2 className="h-4.5 w-4.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        report.medicines?.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-xs text-gray-400 font-medium">No medicine records matched</td>
                          </tr>
                        ) : (
                          report.medicines?.map((medicine) => (
                            <tr key={medicine._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-bold text-gray-955 text-sm">{medicine.name}</p>
                                  <p className="text-xs text-gray-400 font-medium">{medicine.genericName}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 font-medium">{medicine.category}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <span className={`font-bold ${medicine.quantity <= medicine.reorderLevel ? 'text-red-650 font-extrabold' : ''}`}>
                                  {medicine.quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{medicine.sellingPrice?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(medicine.expiryDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">No report data populated</div>
        )}
      </div>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setSaleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Sale Transaction"
        message={`Are you sure you want to delete sale transaction ${saleToDelete?.billNumber}? This will restock the items back into inventory and remove the sales record. This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        type="danger"
      />
    </div>
  );
};

export default Reports;