import { useState, useEffect } from 'react';
import { ShoppingCart, IndianRupee, Plus, Minus, Trash2, User, Phone, Percent, Coins, CreditCard, QrCode, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import MedicineSearchAutocomplete from '../components/medicines/MedicineSearchAutocomplete';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data } = await api.get('/sales');
      setSales(data.sales);
    } catch (error) {
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  // Handle medicine selection from autocomplete
  const handleMedicineSelect = (medicine) => {
    // Check if already in cart
    const existing = cart.find(item => item.medicine === medicine._id);
    
    if (existing) {
      // Increase quantity if already in cart
      setCart(cart.map(item =>
        item.medicine === medicine._id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
      toast.success(`Added another ${medicine.name}`);
    } else {
      // Add new item to cart
      setCart([...cart, {
        medicine: medicine._id,
        medicineName: medicine.name,
        batchNumber: medicine.batchNumber || '',
        quantity: 1,
        unitPrice: medicine.sellingPrice,
        totalPrice: medicine.sellingPrice,
        stockAvailable: medicine.quantity
      }]);
      toast.success(`${medicine.name} added to cart`);
    }
  };

  const updateQuantity = (index, qty) => {
    const newCart = [...cart];
    const item = newCart[index];
    
    // Check stock
    if (qty > item.stockAvailable) {
      toast.error(`Only ${item.stockAvailable} units available`);
      return;
    }
    
    if (qty < 1) return;
    
    newCart[index].quantity = qty;
    newCart[index].totalPrice = qty * item.unitPrice;
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal - (discount || 0);

  const handleCloseSuccessModal = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscount(0);
    setCompletedSale(null);
  };

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast.error('Add items to cart first');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await api.post('/sales', {
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        items: cart.map(item => ({
          medicine: item.medicine,
          medicineName: item.medicineName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        discount,
        paymentMethod
      });
      
      toast.success('Sale completed successfully! 🎉');
      setCompletedSale(data.sale);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Counter</h1>
        <p className="text-gray-600 mt-1">Create new retail sale transactions and invoices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Customer & Cart (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Information Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Customer Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 outline-none"
                    placeholder="Walk-in Customer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 outline-none"
                    placeholder="Optional (10-digit)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medicine Search Autocomplete */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Add Items to Invoice
            </h3>
            <MedicineSearchAutocomplete onSelect={handleMedicineSelect} hideOutOfStock={true} />
          </div>

          {/* Cart Items List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
              Cart Items ({cart.length} item{cart.length !== 1 ? 's' : ''})
            </h3>
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium">Your sales cart is empty</p>
                <p className="text-xs mt-1">Search and select medicines above to build invoice</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-xl gap-4 hover:border-blue-200 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.medicineName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px]">
                          Batch: {item.batchNumber}
                        </span>
                        <span>₹{item.unitPrice} per unit</span>
                        <span className={item.stockAvailable <= 20 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                          Available: {item.stockAvailable}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-200 bg-white rounded-lg p-1.5 shadow-sm">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 rounded text-slate-500 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-bold text-sm w-10 text-center select-none text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 rounded text-slate-500 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Total Item Price */}
                      <span className="font-bold text-base text-gray-950 w-24 text-right">
                        ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Summary (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 sticky top-24 space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-blue-600" />
              Bill Summary
            </h3>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Subtotal</span>
                <span className="text-gray-955">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-medium">Discount (₹)</span>
                <div className="relative w-28">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                    <Percent className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="pl-7 pr-2.5 w-full text-right font-bold rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-1.5"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-gray-800">Total Payable</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method Cards */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Coins, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-500 text-amber-900' },
                  { id: 'card', label: 'Card', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-500 text-indigo-900' },
                  { id: 'upi', label: 'UPI', icon: QrCode, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-500 text-emerald-900' }
                ].map((method) => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        isActive
                          ? `${method.bg} shadow-sm font-bold scale-[1.02]`
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                      <Icon className={`h-5 w-5 mb-1.5 ${isActive ? 'text-current' : method.color}`} />
                      <span className="text-xs">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCreateSale}
              disabled={processing || cart.length === 0}
              className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-4 rounded-xl hover:shadow-lg hover:shadow-emerald-500/10 transition-all font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>{processing ? 'Processing Sale...' : `Complete Sale - ₹${total.toLocaleString('en-IN')}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Invoice Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-6 text-center transform transition-all scale-100">
            
            {/* Emerald Success Checkmark Ring */}
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20 text-emerald-600">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">Sale Completed! 🎉</h3>
              <p className="text-sm text-slate-500">Tax Invoice generated successfully.</p>
            </div>

            {/* Invoice summary cards */}
            <div className="bg-slate-50 rounded-xl p-4 text-left text-sm border border-slate-100 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice No:</span>
                <span className="font-mono font-bold text-slate-850">{completedSale.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2.5">
                <span className="font-medium text-slate-700">Total Paid:</span>
                <span className="font-extrabold text-blue-600 text-base">
                  ₹{completedSale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Print/Download Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => generateInvoicePDF(completedSale, 'download')}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors font-semibold text-sm cursor-pointer"
              >
                Download PDF
              </button>
              <button
                onClick={() => generateInvoicePDF(completedSale, 'print')}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:shadow-blue-500/10 transition-all font-semibold text-sm cursor-pointer"
              >
                Print Receipt
              </button>
            </div>

            <button
              onClick={handleCloseSuccessModal}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-semibold text-sm cursor-pointer"
            >
              New Sale Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;