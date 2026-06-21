import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Star, Truck, Building2, User, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: { street: '', city: 'Srinagar', state: 'Jammu & Kashmir', pincode: '' },
    gstNumber: '',
    drugLicenseNumber: '',
    paymentTerms: '',
    rating: 3,
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formTab, setFormTab] = useState('basic');

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search) params.search = search;
      const { data } = await api.get('/suppliers', { params });
      console.log(`✅ Loaded ${data.suppliers.length} suppliers from server`);
      setSuppliers(data.suppliers);
    } catch (error) {
      console.error('❌ Fetch error:', error);
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const clearSearch = () => {
    setSearch('');
  };

  const handleAdd = () => {
    setSelectedSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: { street: '', city: 'Srinagar', state: 'Jammu & Kashmir', pincode: '' },
      gstNumber: '',
      drugLicenseNumber: '',
      paymentTerms: '',
      rating: 3,
      notes: ''
    });
    setFormTab('basic');
    setShowForm(true);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      alternatePhone: supplier.alternatePhone || '',
      address: {
        street: supplier.address?.street || '',
        city: supplier.address?.city || 'Srinagar',
        state: supplier.address?.state || 'Jammu & Kashmir',
        pincode: supplier.address?.pincode || ''
      },
      gstNumber: supplier.gstNumber || '',
      drugLicenseNumber: supplier.drugLicenseNumber || '',
      paymentTerms: supplier.paymentTerms || '',
      rating: supplier.rating || 3,
      notes: supplier.notes || ''
    });
    setFormTab('basic');
    setShowForm(true);
  };

  const handleDeleteClick = (supplier) => {
    console.log('🗑️ Opening delete confirm for:', supplier._id);
    setDeleteConfirm({
      show: true,
      id: supplier._id,
      name: supplier.name
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    
    setDeleting(true);
    try {
      console.log('📡 Sending DELETE for:', deleteConfirm.id);
      
      const response = await api.delete(`/suppliers/${deleteConfirm.id}`);
      console.log('✅ Server response:', response.data);
      
      // IMPORTANT: Remove from state BEFORE closing dialog
      setSuppliers(prevSuppliers => {
        const updated = prevSuppliers.filter(s => s._id !== deleteConfirm.id);
        console.log(`📊 State updated: ${prevSuppliers.length} → ${updated.length} suppliers`);
        return updated;
      });
      
      toast.success(`"${deleteConfirm.name}" deleted successfully`);
      
      // Close dialog
      setDeleteConfirm({ show: false, id: null, name: '' });
      
    } catch (error) {
      console.error('❌ Delete failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contactPerson || !formData.phone) {
      toast.error('Name, contact person, and phone are required');
      return;
    }

    setSaving(true);
    try {
      if (selectedSupplier) {
        await api.put(`/suppliers/${selectedSupplier._id}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added successfully');
      }
      setShowForm(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Save error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Loading...' : `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSuppliers}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm py-2.5"
            />
            {search && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="submit" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
            Search
          </button>
        </form>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading suppliers..." />
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No suppliers found</p>
          <button onClick={handleAdd} className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier._id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              <div className="p-5 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                      <div className="flex mt-1">{renderStars(supplier.rating)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" /> {supplier.contactPerson}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" /> {supplier.phone}
                </div>
                {supplier.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" /> {supplier.email}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 bg-gray-50 rounded-b-xl border-t flex justify-between items-center">
                <span className="text-xs text-gray-400">ID: {supplier._id?.slice(-6)}</span>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(supplier)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteClick(supplier)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{selectedSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}</p>
            <p className="text-xs text-gray-500">Configure business relationships and regulatory tags</p>
          </div>
        </div>
      } size="lg">
        {/* Tab Header Bar */}
        <div className="flex border-b border-gray-150 mb-6 text-sm">
          {[
            { id: 'basic', label: 'Company Info' },
            { id: 'regulatory', label: 'Regulatory & Address' },
            { id: 'relationship', label: 'Terms & Notes' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormTab(t.id)}
              className={`flex-1 pb-3 text-center font-bold transition-all border-b-2 cursor-pointer ${
                formTab === t.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: BASIC & CONTACT INFO */}
          {formTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="e.g. Acme Healthcare Inc."
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="contactPerson" 
                  required 
                  value={formData.contactPerson} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="phone" 
                  required 
                  value={formData.phone} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Alternate Phone
                </label>
                <input 
                  type="text" 
                  name="alternatePhone" 
                  value={formData.alternatePhone} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="e.g. +91 194 244585"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="e.g. contact@acmehealth.com"
                />
              </div>
            </div>
          )}

          {/* TAB 2: REGULATORY & ADDRESS */}
          {formTab === 'regulatory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  GSTIN Number
                </label>
                <input 
                  type="text" 
                  name="gstNumber" 
                  value={formData.gstNumber} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-mono uppercase" 
                  placeholder="e.g. 01ABCDE1234F1Z5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Drug License Number
                </label>
                <input 
                  type="text" 
                  name="drugLicenseNumber" 
                  value={formData.drugLicenseNumber} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-mono uppercase" 
                  placeholder="e.g. JK/PHARMA/2026/4587"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Street Address
                </label>
                <input 
                  type="text" 
                  name="address.street" 
                  value={formData.address.street} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="e.g. Residency Road, near SBI Bank"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Pincode
                </label>
                <input 
                  type="text" 
                  name="address.pincode" 
                  value={formData.address.pincode} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none font-mono" 
                  placeholder="e.g. 190001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  City
                </label>
                <input 
                  type="text" 
                  name="address.city" 
                  value={formData.address.city} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="Srinagar"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  State / UT
                </label>
                <input 
                  type="text" 
                  name="address.state" 
                  value={formData.address.state} 
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none" 
                  placeholder="Jammu & Kashmir"
                />
              </div>
            </div>
          )}

          {/* TAB 3: RELATIONSHIP, PAYMENT & RATINGS */}
          {formTab === 'relationship' && (
            <div className="grid grid-cols-1 gap-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none bg-white"
                >
                  <option value="">Select terms...</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="Advance">Advance Payment</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Vendor Trust Rating
                </label>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rating: starVal }))}
                      className="p-1 rounded-lg hover:bg-slate-100 transition-all hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 transition-all ${
                          starVal <= formData.rating 
                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm' 
                            : 'text-gray-300 hover:text-gray-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Internal Notes
                </label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange}
                  rows="3"
                  className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2 px-3 outline-none" 
                  placeholder="Record historical reliability notes, contact schedules, or distribution details..."
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-150">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-205 rounded-xl hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 shadow-md cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Supplier</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => {
          if (!deleting) setDeleteConfirm({ show: false, id: null, name: '' });
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Permanently delete "${deleteConfirm.name}"? This cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        type="danger"
      />
    </div>
  );
};

export default Suppliers;