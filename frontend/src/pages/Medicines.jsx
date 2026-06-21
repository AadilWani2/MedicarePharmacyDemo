import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { medicineService } from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import MedicineForm from '../components/medicines/MedicineForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useLocation } from 'react-router-dom';

const Medicines = () => {
  const location = useLocation();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    if (location.state && location.state.filter) {
      setFilter(location.state.filter);
    }
  }, [location.state]);

  useEffect(() => {
    fetchMedicines();
  }, [filter, pagination.currentPage]);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const params = { page: pagination.currentPage, limit: 10 };
      if (search) params.search = search;
      if (filter === 'low') params.stockStatus = 'low';
      if (filter === 'expiring') {
        // Fetch expiring medicines
        const { data } = await medicineService.getExpiring();
        setMedicines(data.medicines);
        setPagination({ currentPage: 1, totalPages: 1, total: data.medicines.length });
        setLoading(false);
        return;
      }
      
      const { data } = await medicineService.getAll(params);
      setMedicines(data.medicines);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchMedicines();
  };

  const handleAdd = () => {
    setSelectedMedicine(null);
    setShowForm(true);
  };

  const handleEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setShowForm(true);
  };

  const handleDeleteClick = (medicine) => {
    setDeleteConfirm({
      show: true,
      id: medicine._id,
      name: medicine.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await medicineService.delete(deleteConfirm.id);
      toast.success(`${deleteConfirm.name} deleted successfully`);
      setDeleteConfirm({ show: false, id: null, name: '' });
      fetchMedicines();
    } catch (error) {
      toast.error('Failed to delete medicine');
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSelectedMedicine(null);
    fetchMedicines();
  };

  const handleExportCSV = async () => {
    try {
      toast.loading('Preparing CSV export...', { id: 'csv-export' });
      
      const params = { page: 1, limit: 10000 };
      if (search) params.search = search;
      if (filter === 'low') params.stockStatus = 'low';
      
      let medicinesToExport = [];
      if (filter === 'expiring') {
        const { data } = await medicineService.getExpiring();
        medicinesToExport = data.medicines;
      } else {
        const { data } = await medicineService.getAll(params);
        medicinesToExport = data.medicines;
      }
      
      if (!medicinesToExport || medicinesToExport.length === 0) {
        toast.error('No medicines found to export', { id: 'csv-export' });
        return;
      }

      const csvData = medicinesToExport.map(m => ({
        'Medicine Name': m.name,
        'Generic Name': m.genericName,
        'Category': m.category,
        'Batch Number': m.batchNumber,
        'Stock Quantity': m.quantity,
        'Reorder Level': m.reorderLevel,
        'Purchase Price (INR)': m.purchasePrice,
        'Selling Price (INR)': m.sellingPrice,
        'Expiry Date': new Date(m.expiryDate).toLocaleDateString('en-IN'),
        'Requires Rx': m.requiresPrescription ? 'Yes' : 'No',
        'Storage Conditions': m.storageConditions || 'Normal'
      }));

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
      link.setAttribute('download', `medicare_inventory_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${medicinesToExport.length} items!`, { id: 'csv-export' });
    } catch (error) {
      toast.error('Failed to export CSV', { id: 'csv-export' });
    }
  };

  const getExpiryBadge = (medicine) => {
    const days = Math.ceil((new Date(medicine.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: 'Expired', class: 'bg-red-100 text-red-800 border-red-200' };
    if (days <= 30) return { text: `⚠️ ${days} days`, class: 'bg-red-100 text-red-800 border-red-200' };
    if (days <= 60) return { text: `${days} days`, class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (days <= 90) return { text: `${days} days`, class: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { text: `${days} days`, class: 'bg-green-100 text-green-800 border-green-200' };
  };

  const getStockBadge = (medicine) => {
    if (medicine.quantity === 0) return { text: 'Out of Stock', class: 'bg-red-100 text-red-800 border-red-200' };
    if (medicine.quantity <= medicine.reorderLevel) return { text: 'Low Stock', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (medicine.quantity <= medicine.reorderLevel * 2) return { text: 'Moderate', class: 'bg-blue-100 text-blue-800 border-blue-200' };
    return { text: 'In Stock', class: 'bg-green-100 text-green-800 border-green-200' };
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Tablets': 'bg-blue-100 text-blue-700',
      'Capsules': 'bg-purple-100 text-purple-700',
      'Syrups': 'bg-green-100 text-green-700',
      'Injections': 'bg-red-100 text-red-700',
      'Ointments': 'bg-yellow-100 text-yellow-700',
      'Drops': 'bg-cyan-100 text-cyan-700',
      'Powders': 'bg-pink-100 text-pink-700',
      'Medical Equipment': 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines Inventory</h1>
          <p className="text-gray-600 mt-1">
            {pagination.total} medicine{pagination.total !== 1 ? 's' : ''} in stock
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Medicine
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total Medicines</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100">
          <p className="text-xs text-yellow-600 font-medium">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">
            {medicines.filter(m => m.quantity <= m.reorderLevel && m.quantity > 0).length}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
          <p className="text-xs text-red-600 font-medium">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700 mt-1">
            {medicines.filter(m => m.quantity === 0).length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-100">
          <p className="text-xs text-orange-600 font-medium">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">
            {medicines.filter(m => {
              const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
              return days <= 30 && days > 0;
            }).length}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, generic name, or batch number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm py-2.5"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm py-2.5 px-3"
            >
              <option value="all">All Medicines</option>
              <option value="low">Low Stock</option>
              <option value="expiring">Expiring Soon</option>
            </select>
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
                setPagination({ currentPage: 1, totalPages: 1, total: 0 });
                fetchMedicines();
              }}
              className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleExportCSV}
              type="button"
              className="inline-flex items-center px-4 py-2.5 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors font-semibold gap-1.5 cursor-pointer"
              title="Export filtered medicines to CSV"
            >
              <Download className="h-4.5 w-4.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medicine</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch No.</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16">
                    <LoadingSpinner size="md" text="Loading medicines..." />
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Package className="h-16 w-16 mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500">No medicines found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {search ? 'Try adjusting your search' : 'Add your first medicine to get started'}
                      </p>
                      {!search && (
                        <button
                          onClick={handleAdd}
                          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Medicine
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                medicines.map((medicine) => {
                  const expiryBadge = getExpiryBadge(medicine);
                  const stockBadge = getStockBadge(medicine);
                  
                  return (
                    <tr key={medicine._id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Medicine Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{medicine.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{medicine.genericName}</p>
                            {medicine.requiresPrescription && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded font-medium">
                                Rx
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getCategoryColor(medicine.category)}`}>
                          {medicine.category}
                        </span>
                      </td>

                      {/* Batch Number */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {medicine.batchNumber}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{medicine.quantity}</p>
                          <p className="text-xs text-gray-400">Min: {medicine.reorderLevel}</p>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">₹{medicine.sellingPrice?.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Cost: ₹{medicine.purchasePrice?.toLocaleString()}</p>
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${expiryBadge.class}`}>
                            {expiryBadge.text}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(medicine.expiryDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Stock Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${stockBadge.class}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            medicine.quantity === 0 ? 'bg-red-500' :
                            medicine.quantity <= medicine.reorderLevel ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></span>
                          {stockBadge.text}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(medicine)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit medicine"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(medicine)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete medicine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{(pagination.currentPage - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.currentPage * 10, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> medicines
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={pagination.currentPage === 1}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="hidden sm:flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      pagination.currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Medicine Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedMedicine(null);
        }}
        title={
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {selectedMedicine ? (
                <Edit className="h-5 w-5 text-blue-600" />
              ) : (
                <Plus className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">
                {selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'}
              </p>
              <p className="text-xs text-gray-500">
                {selectedMedicine ? `Editing: ${selectedMedicine.name}` : 'Fill in the details to add a new medicine'}
              </p>
            </div>
          </div>
        }
        size="2xl"
      >
        <MedicineForm
          medicine={selectedMedicine}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setSelectedMedicine(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null, name: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Medicine"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Medicines;