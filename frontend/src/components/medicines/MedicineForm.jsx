import { useState, useEffect } from 'react';
import { 
  Save, Pill, Calendar, Hash, DollarSign, 
  Package, AlertTriangle, FileText, Activity,
  CheckCircle2, ShieldAlert, Sparkles, TrendingUp,
  Percent, ArrowRight, BookOpen, ThermometerSnowflake
} from 'lucide-react';
import { medicineService } from '../../services/api';
import toast from 'react-hot-toast';
import medicineSuggestions from './medicineSuggestions';

const MedicineForm = ({ medicine, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: 'Tablets',
    manufacturer: '',
    batchNumber: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    reorderLevel: 50,
    expiryDate: '',
    dosage: '',
    description: '',
    requiresPrescription: false,
    storageConditions: '',
    hsnCode: '30049099',
    gstRate: 12
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || '',
        genericName: medicine.genericName || '',
        category: medicine.category || 'Tablets',
        manufacturer: medicine.manufacturer || '',
        batchNumber: medicine.batchNumber || '',
        purchasePrice: medicine.purchasePrice || '',
        sellingPrice: medicine.sellingPrice || '',
        quantity: medicine.quantity || '',
        reorderLevel: medicine.reorderLevel || 50,
        expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split('T')[0] : '',
        dosage: medicine.dosage || '',
        description: medicine.description || '',
        requiresPrescription: medicine.requiresPrescription || false,
        storageConditions: medicine.storageConditions || '',
        hsnCode: medicine.hsnCode || '30049099',
        gstRate: medicine.gstRate !== undefined ? medicine.gstRate : 12
      });
    }
  }, [medicine]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }

    if (value.trim().length >= 1) {
      const filtered = medicineSuggestions.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      genericName: suggestion.genericName || prev.genericName,
      category: suggestion.category || prev.category,
      manufacturer: suggestion.manufacturer || prev.manufacturer,
      dosage: suggestion.dosage || prev.dosage,
      requiresPrescription: suggestion.requiresPrescription !== undefined ? suggestion.requiresPrescription : prev.requiresPrescription
    }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Medicine name is required';
    if (!formData.genericName.trim()) newErrors.genericName = 'Generic name is required';
    if (!formData.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required';
    if (!formData.batchNumber.trim()) newErrors.batchNumber = 'Batch number is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    if (!formData.purchasePrice || Number(formData.purchasePrice) <= 0) newErrors.purchasePrice = 'Valid purchase price required';
    if (!formData.sellingPrice || Number(formData.sellingPrice) <= 0) newErrors.sellingPrice = 'Valid selling price required';
    if (formData.quantity === '' || Number(formData.quantity) < 0) newErrors.quantity = 'Quantity is required';
    
    if (Number(formData.sellingPrice) < Number(formData.purchasePrice)) {
      newErrors.sellingPrice = 'Selling price should not be less than purchase price';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: Number(formData.quantity),
        reorderLevel: Number(formData.reorderLevel),
        gstRate: Number(formData.gstRate)
      };

      if (medicine) {
        await medicineService.update(medicine._id, data);
        toast.success('Medicine updated successfully! 💊');
      } else {
        await medicineService.create(data);
        toast.success('New medicine added to inventory! 🎉');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save medicine');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'Tablets', icon: '💊' },
    { value: 'Capsules', icon: '💊' },
    { value: 'Syrups', icon: '🧪' },
    { value: 'Injections', icon: '💉' },
    { value: 'Ointments', icon: '🧴' },
    { value: 'Drops', icon: '💧' },
    { value: 'Powders', icon: '⚗️' },
    { value: 'Medical Equipment', icon: '🏥' },
  ];

  // Financial Calculations
  const unitCost = Number(formData.purchasePrice) || 0;
  const unitPrice = Number(formData.sellingPrice) || 0;
  const qty = Number(formData.quantity) || 0;

  const profitPerUnit = unitPrice - unitCost;
  const marginPercent = unitCost > 0 ? ((profitPerUnit / unitCost) * 100).toFixed(1) : 0;
  const totalStockValue = qty * unitPrice;
  const totalCostValue = qty * unitCost;
  const expectedReturn = totalCostValue > 0 ? ((totalStockValue - totalCostValue) / totalCostValue * 100).toFixed(1) : 0;

  // Health and Warning status
  const isLoss = profitPerUnit < 0;
  const isZeroProfit = profitPerUnit === 0 && unitCost > 0;
  const isHealthyMargin = marginPercent >= 20;

  const daysUntilExpiry = formData.expiryDate
    ? Math.ceil((new Date(formData.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FORM FIELDS (occupies 2/3 of grid) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Basic Information */}
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-6">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <Pill className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Medicine Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Pill className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    onFocus={() => {
                      if (formData.name.trim().length >= 1) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-3 ${
                      errors.name 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                    placeholder="e.g., Paracetamol 500mg"
                  />

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1.5 shadow-2xl max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(sug)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">{sug.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{sug.genericName} • {sug.category}</p>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            Auto-fill
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.name}
                  </p>
                )}
              </div>

              {/* Generic Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Generic Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="genericName"
                  required
                  value={formData.genericName}
                  onChange={handleChange}
                  className={`w-full rounded-xl border-2 transition-all text-sm py-3 px-4 ${
                    errors.genericName 
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                  }`}
                  placeholder="e.g., Acetaminophen"
                />
                {errors.genericName && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.genericName}
                  </p>
                )}
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3 px-4 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manufacturer */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Manufacturer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  required
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className={`w-full rounded-xl border-2 transition-all text-sm py-3 px-4 ${
                    errors.manufacturer 
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                  }`}
                  placeholder="e.g., Cipla Ltd"
                />
                {errors.manufacturer && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.manufacturer}
                  </p>
                )}
              </div>

              {/* Requires Prescription (Rx) */}
              <div className="flex items-center pt-2 md:pt-0">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="requiresPrescription"
                    checked={formData.requiresPrescription}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-100"></div>
                  <div className="ms-3">
                    <span className="text-sm font-semibold text-gray-700 block">
                      Prescription Required
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5">
                      Mark as prescription-only (Rx)
                    </span>
                  </div>
                </label>
              </div>

            </div>
          </div>

          {/* Section 2: Logistics & Expiry */}
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-6">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Logistics & Expiry</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Batch Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Batch Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="batchNumber"
                    required
                    value={formData.batchNumber}
                    onChange={handleChange}
                    className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-3 ${
                      errors.batchNumber 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                    placeholder="e.g., BATCH-2026"
                  />
                </div>
                {errors.batchNumber && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.batchNumber}
                  </p>
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-3 ${
                      errors.expiryDate 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                  />
                </div>
                {errors.expiryDate && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.expiryDate}
                  </p>
                )}
              </div>

              {/* HSN Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  HSN/SAC Code
                </label>
                <input
                  type="text"
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3 px-4 font-mono"
                  placeholder="e.g., 30049099"
                />
              </div>

              {/* GST Rate */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  GST Rate (%)
                </label>
                <select
                  name="gstRate"
                  value={formData.gstRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3 px-4 bg-white"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% (Life-saving)</option>
                  <option value="12">12% (Standard Formulations)</option>
                  <option value="18">18% (Devices/Other)</option>
                  <option value="28">28% (Luxury/Special)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 3: Pricing & Quantity */}
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-6">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Pricing & Stock</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Purchase Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Purchase Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="purchasePrice"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-3 ${
                      errors.purchasePrice 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.purchasePrice && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.purchasePrice}
                  </p>
                )}
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="sellingPrice"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-3 ${
                      errors.sellingPrice 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.sellingPrice && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.sellingPrice}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Initial Stock Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={handleChange}
                    className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-3 ${
                      errors.quantity 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                    placeholder="0"
                  />
                </div>
                {errors.quantity && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {errors.quantity}
                  </p>
                )}
              </div>

              {/* Reorder Level */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Reorder Level Alert Threshold
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <AlertTriangle className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="reorderLevel"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3"
                    placeholder="50"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 4: Clinical Usage & Storage */}
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-6">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Clinical & Storage Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Dosage Instructions */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Dosage Instructions
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 pt-3.5 items-start pointer-events-none">
                    <BookOpen className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    name="dosage"
                    rows="2"
                    value={formData.dosage}
                    onChange={handleChange}
                    className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3 px-4"
                    placeholder="e.g., 1 tablet twice daily after food, or as directed by physician"
                  />
                </div>
              </div>

              {/* Storage Conditions */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Storage Conditions
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <ThermometerSnowflake className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="storageConditions"
                    value={formData.storageConditions}
                    onChange={handleChange}
                    className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3"
                    placeholder="e.g., Store in a cool, dry place below 25°C. Keep away from direct light."
                  />
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Description / General Notes
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-3 px-4"
                  placeholder="Enter medical description, packaging specifications, or extra notes..."
                />
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: FINANCIAL INSPECTOR & INSIGHTS (occupies 1/3 of grid) */}
        <div className="space-y-6">
          
          {/* Live Inspector Dashboard */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
            
            <div className="relative space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  <span className="font-bold text-sm tracking-wide text-slate-200">Financial Inspector</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Real-time
                </span>
              </div>

              {/* Main Margin Display */}
              <div className="text-center py-4 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Unit Profit Margin</p>
                <div className="flex items-center justify-center mt-2 space-x-1.5">
                  <Percent className="h-5 w-5 text-slate-500" />
                  <span className={`text-4xl font-extrabold tracking-tight ${
                    isLoss ? 'text-red-500' :
                    isZeroProfit ? 'text-slate-400' :
                    isHealthyMargin ? 'text-emerald-400' : 'text-yellow-400'
                  }`}>
                    {marginPercent}%
                  </span>
                </div>
                
                {/* Health Badge */}
                <div className="mt-3 flex justify-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    isLoss ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    isZeroProfit ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                    isHealthyMargin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {isLoss ? '🔴 Selling at a Loss' :
                     isZeroProfit ? '⚪ Zero Profit' :
                     isHealthyMargin ? '🟢 Healthy Margin' : '🟡 Low Profit Margin'}
                  </span>
                </div>
              </div>

              {/* Profit Margin Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Margin Progress</span>
                  <span>{Math.max(0, Math.min(100, parseFloat(marginPercent)))}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLoss ? 'bg-red-500' :
                      isHealthyMargin ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`} 
                    style={{ width: `${Math.max(0, Math.min(100, parseFloat(marginPercent)))}%` }}
                  ></div>
                </div>
              </div>

              {/* Financial Metrics List */}
              <div className="divide-y divide-slate-800/60 pt-2 text-sm">
                
                {/* Profit per Unit */}
                <div className="flex justify-between py-3">
                  <span className="text-slate-400">Profit per Unit</span>
                  <span className={`font-semibold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isLoss ? '-' : '+'}₹{Math.abs(profitPerUnit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total Inventory Value */}
                <div className="flex justify-between py-3">
                  <span className="text-slate-400">Stock Valuation (Retail)</span>
                  <span className="font-semibold text-slate-200">
                    ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total Stock Cost */}
                <div className="flex justify-between py-3">
                  <span className="text-slate-400">Total Stock Cost</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    ₹{totalCostValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Return on Investment (ROI) */}
                <div className="flex justify-between py-3">
                  <span className="text-slate-400">Expected ROI</span>
                  <span className={`font-bold ${parseFloat(expectedReturn) >= 20 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {parseFloat(expectedReturn) > 0 ? '+' : ''}{expectedReturn}%
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* Actionable Insights Panel */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-blue-100/60 pb-2">
              <Sparkles className="h-4.5 w-4.5 text-blue-600" />
              <span className="font-bold text-sm text-blue-800">Dynamic Warnings & Tips</span>
            </div>
            
            <div className="space-y-3.5 text-xs text-blue-800/90 font-medium">
              
              {/* Loss / Zero margin warning */}
              {isLoss && (
                <div className="flex items-start space-x-2.5 bg-red-100/80 text-red-800 p-3 rounded-xl border border-red-200">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Pricing Alert:</strong> Your selling price is less than the purchase price. Selling this medicine will result in a financial loss.
                  </p>
                </div>
              )}

              {isZeroProfit && (
                <div className="flex items-start space-x-2.5 bg-yellow-100/80 text-yellow-800 p-3 rounded-xl border border-yellow-200">
                  <ShieldAlert className="h-4.5 w-4.5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Zero Profit Margin:</strong> Selling price matches purchase price. You are making no profit on this medicine.
                  </p>
                </div>
              )}

              {/* Expiry Warning */}
              {daysUntilExpiry !== null && daysUntilExpiry <= 90 && (
                <div className="flex items-start space-x-2.5 bg-orange-100/80 text-orange-800 p-3 rounded-xl border border-orange-200">
                  <ShieldAlert className="h-4.5 w-4.5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Expiry Warning:</strong> This medicine expires in {daysUntilExpiry} days. Consider lowering stock quantity or accelerating sales.
                  </p>
                </div>
              )}

              {/* Expiry Error */}
              {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                <div className="flex items-start space-x-2.5 bg-red-100/80 text-red-800 p-3 rounded-xl border border-red-200">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Expired Medicine:</strong> The expiry date provided is in the past. You cannot sell expired stock!
                  </p>
                </div>
              )}

              {/* Stock Value Insights */}
              {qty > 0 && unitPrice > 0 && !isLoss && (
                <div className="flex items-start space-x-2">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Adding this medicine increases your total retail inventory value by <strong>₹{totalStockValue.toLocaleString()}</strong>, with an expected net return of <strong>₹{(totalStockValue - totalCostValue).toLocaleString()}</strong>.
                  </p>
                </div>
              )}

              {/* General Tips */}
              <div className="flex items-start space-x-2 text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p>Ensure the batch number matches the manufacturer label exactly to prevent audit tracking errors.</p>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between pt-6 mt-8 border-t border-gray-100">
        <div className="text-xs text-gray-400 font-medium">
          {medicine ? 'Modifying existing medicine details' : 'Adding new medicine item to Srinagar node'}
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 active:scale-95 shadow-md"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Save className="h-4.5 w-4.5" />
                <span>{medicine ? 'Save Changes' : 'Add to Inventory'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MedicineForm;