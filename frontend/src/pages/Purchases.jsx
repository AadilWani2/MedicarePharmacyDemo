import { useState, useEffect } from 'react';
import { Plus, Truck, Search, Trash2, Calendar, DollarSign, Tag, Clock, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { medicineService } from '../services/api';
import Modal from '../components/common/Modal';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [formData, setFormData] = useState({
    supplier: '',
    items: [],
    discount: 0,
    paymentMethod: 'bank_transfer',
    notes: ''
  });
  const [searchMed, setSearchMed] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchMedicines();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data } = await api.get('/purchases');
      setPurchases(data.purchases);
    } catch (error) {
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers', { limit: 100 });
      setSuppliers(data.suppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchMedicines = async () => {
    try {
      const { data } = await medicineService.getAll({ limit: 100 });
      setMedicines(data.medicines);
    } catch (error) {
      console.error('Failed to fetch medicines');
    }
  };

  const addItem = (medicine) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        medicine: medicine._id,
        medicineName: medicine.name,
        batchNumber: '',
        quantity: 1,
        purchasePrice: medicine.purchasePrice,
        sellingPrice: medicine.sellingPrice,
        expiryDate: '',
        totalPrice: medicine.purchasePrice
      }]
    }));
    setSearchMed('');
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'purchasePrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].purchasePrice;
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const netAmount = totalAmount - formData.discount;

  const handleSubmit = async () => {
    if (!formData.supplier || formData.items.length === 0) {
      toast.error('Select supplier and add items');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/purchases', formData);
      toast.success('Purchase recorded successfully');
      setShowForm(false);
      setFormData({ supplier: '', items: [], discount: 0, paymentMethod: 'bank_transfer', notes: '' });
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases Ledger</h1>
          <p className="text-gray-600 mt-1">Record and manage stock purchases from suppliers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-semibold active:scale-95 cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Purchase Order
        </button>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice / Bill</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items Volume</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                      <p className="text-sm text-gray-500">Loading purchase transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Truck className="h-14 w-14 text-gray-300 mb-3" />
                      <p className="text-base font-semibold text-gray-500">No purchases found</p>
                      <p className="text-xs text-gray-400 mt-1">Record your first supplier purchase to begin</p>
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-mono font-bold text-gray-900">{purchase.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-905">{purchase.supplier?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{purchase.supplier?.contactPerson}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {purchase.items.reduce((sum, item) => sum + item.quantity, 0)} units ({purchase.items.length} meds)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      ₹{purchase.netAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center w-fit px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${
                          purchase.paymentStatus === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${purchase.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {purchase.paymentStatus}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-mono">{purchase.paymentMethod?.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Record Purchase Inward</p>
            <p className="text-xs text-gray-500">Log incoming stock from vendor into database</p>
          </div>
        </div>
      } size="xl">
        <div className="space-y-6">
          {/* Top Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Supplier Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 bg-white"
                required
              >
                <option value="">Select supplier vendor...</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.contactPerson})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Payment Channel
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 bg-white"
              >
                <option value="bank_transfer">🏛️ Bank Transfer / RTGS</option>
                <option value="cash">💵 Cash In Hand</option>
                <option value="cheque">📄 Cheque Payment</option>
                <option value="upi">📱 UPI / QR Scan</option>
              </select>
            </div>
          </div>

          {/* Add Medicines Search */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Search & Add Medicines to Purchase Invoice
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchMed}
                onChange={(e) => setSearchMed(e.target.value)}
                className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 outline-none bg-white"
                placeholder="Search inventory medicine by name to add..."
              />
              
              {searchMed && (
                <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl mt-2 shadow-2xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {medicines
                    .filter(m => m.name.toLowerCase().includes(searchMed.toLowerCase()) || m.genericName.toLowerCase().includes(searchMed.toLowerCase()))
                    .slice(0, 5)
                    .map((med) => (
                      <button
                        key={med._id}
                        onClick={() => addItem(med)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">{med.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{med.genericName} • Stock: {med.quantity}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Price: ₹{med.purchasePrice}
                        </span>
                      </button>
                    ))}
                  {medicines.filter(m => m.name.toLowerCase().includes(searchMed.toLowerCase()) || m.genericName.toLowerCase().includes(searchMed.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 font-medium">
                      No medicines matched. Add as a new medicine in inventory first.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items List */}
          {formData.items.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Purchase Invoice Line Items ({formData.items.length})
              </label>
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                {formData.items.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-150 p-4 rounded-xl space-y-3 relative hover:border-blue-200 transition-colors">
                    <button 
                      onClick={() => removeItem(index)} 
                      className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                    
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.medicineName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Math.max(1, Number(e.target.value)))}
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm py-1.5 px-2.5 mt-1 font-semibold"
                          min="1"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Purchase Price (₹)</label>
                        <div className="relative mt-1">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-gray-400">₹</span>
                          <input
                            type="number"
                            value={item.purchasePrice}
                            onChange={(e) => updateItem(index, 'purchasePrice', Math.max(0.01, Number(e.target.value)))}
                            className="w-full rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm py-1.5 pl-6 pr-2 mt-0 font-semibold"
                            step="0.01"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Batch No.</label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm py-1.5 px-2.5 mt-1 font-mono font-semibold"
                          placeholder="e.g. B-982"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Line Total</label>
                        <span className="inline-block mt-2.5 font-extrabold text-slate-800 text-sm">
                          ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals & Notes Section */}
          {formData.items.length > 0 && (
            <div className="border-t border-gray-150 pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Purchase Order Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2 px-3 h-20"
                    placeholder="Enter invoice details, delivery tracking details, or payments remarks..."
                  />
                </div>
                
                {/* Calculations Panel */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 text-sm">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Gross Inward Total</span>
                    <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="flex justify-between items-center font-medium text-slate-600">
                    <span>Inward Discount (₹)</span>
                    <div className="relative w-28">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-gray-400">₹</span>
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount: Math.max(0, Number(e.target.value)) }))}
                        className="pl-6 pr-2 w-full text-right font-bold rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 py-1.5 text-xs bg-white"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-slate-800">Net Payable Amount</span>
                    <span className="text-xl font-extrabold text-blue-600">
                      ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={processing || !formData.supplier || formData.items.length === 0}
            className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{processing ? 'Processing Record...' : `Record Stock Inward - ₹${netAmount.toLocaleString('en-IN')}`}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Purchases;