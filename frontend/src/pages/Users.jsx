import { useState, useEffect } from 'react';
import { Shield, UserCheck, UserX, Plus, Edit, User, Mail, Lock, Phone, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/common/Modal';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (userId) => {
    try {
      await api.patch(`/users/${userId}/toggle-status`);
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      phone: ''
    });
    setErrors({});
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Password is not sent when editing
      role: user.role || 'staff',
      phone: user.phone || ''
    });
    setErrors({});
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!selectedUser) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      if (selectedUser) {
        // Edit User details (omit password if empty)
        const { password, ...updateData } = formData;
        await api.put(`/users/${selectedUser._id}`, updateData);
        toast.success(`Account for "${formData.name}" updated successfully!`);
      } else {
        // Add User (register)
        await api.post('/auth/register', formData);
        toast.success(`New account for "${formData.name}" registered successfully! 👥`);
      }
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save staff account');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      pharmacist: 'bg-blue-100 text-blue-800 border-blue-200',
      staff: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${colors[role] || colors.staff}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Directory</h1>
          <p className="text-gray-600 mt-1">Manage accounts, roles, and system permission access</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-semibold active:scale-95 cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Staff Member
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Access</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login Session</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-105">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                      <p className="text-sm text-gray-500">Loading staff records...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">No staff members registered</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="font-bold text-gray-950 text-sm">{user.name}</p>
                          <p className="text-xs text-gray-400 font-medium">ID: {user._id?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{user.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        user.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {user.isActive ? 'Active Access' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Never logged in'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit member details"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(user._id)}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            user.isActive
                              ? 'text-red-650 hover:bg-red-50'
                              : 'text-emerald-650 hover:bg-emerald-50'
                          }`}
                          title={user.isActive ? 'Deactivate account' : 'Activate account'}
                        >
                          {user.isActive ? <UserX className="h-4.5 w-4.5 text-red-500" /> : <UserCheck className="h-4.5 w-4.5 text-emerald-500" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <UserPlus className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{selectedUser ? 'Edit Staff Credentials' : 'Register Staff Account'}</p>
            <p className="text-xs text-gray-500">Setup credentials and permission levels</p>
          </div>
        </div>
      } size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-2.5 px-4 outline-none ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                }`}
                placeholder="e.g. Aisha Khan"
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-2.5 px-4 outline-none ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                }`}
                placeholder="e.g. aisha@medicarepharmacy.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>}
          </div>

          {/* Password (Only show for Add User) */}
          {!selectedUser && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`pl-11 w-full rounded-xl border-2 transition-all text-sm py-2.5 px-4 outline-none ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                  }`}
                  placeholder="Minimum 8 characters"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              System Permission Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none bg-white font-semibold"
            >
              <option value="staff">Staff (Sales Counter Access)</option>
              <option value="pharmacist">Pharmacist (Inventory & Orders)</option>
              <option value="admin">Administrator (Full Systems Access)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <div className="relative group">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="pl-11 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm py-2.5 px-4 outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-150 mt-6">
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
                <span>{selectedUser ? 'Save Changes' : 'Register Member'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;