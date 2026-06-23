import { useState, useEffect } from 'react';
import { ScrollText, Filter, ChevronDown, ChevronRight, User, Calendar, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-violet-100 text-violet-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
  SETTINGS_CHANGE: 'bg-amber-100 text-amber-700'
};

const ENTITY_ICONS = {
  Medicine: '💊',
  Sale: '🛒',
  Purchase: '📦',
  Supplier: '🏭',
  User: '👤',
  Settings: '⚙️'
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [expandedRow, setExpandedRow] = useState(null);
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 25 });
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.action) params.append('action', filters.action);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const { data } = await api.get(`/audit?${params.toString()}`);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/audit/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch audit stats');
    }
  };

  const handleFilter = () => {
    fetchLogs(1);
  };

  const clearFilters = () => {
    setFilters({ entity: '', action: '', search: '', startDate: '', endDate: '' });
    setTimeout(() => fetchLogs(1), 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const renderChanges = (changes) => {
    if (!changes) return null;
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Field Changes</p>
        <div className="grid gap-2">
          {Object.entries(changes).map(([field, { from, to }]) => (
            <div key={field} className="flex items-start gap-3 text-xs bg-slate-50 rounded-lg p-2.5">
              <span className="font-semibold text-slate-700 min-w-[120px] capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-mono line-through">
                  {String(from ?? 'empty')}
                </span>
                <span className="text-slate-400">→</span>
                <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded font-mono">
                  {String(to ?? 'empty')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-indigo-500" />
            Audit Log
          </h1>
          <p className="text-gray-600 mt-1">Track all system activity and changes</p>
        </div>
        <button
          onClick={() => { fetchLogs(1); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Entries</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalLogs?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Last 7 Days</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.last7Days?.toLocaleString()}</p>
          </div>
          {stats.actionBreakdown?.slice(0, 2).map(item => (
            <div key={item._id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Top Action</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{item._id}</p>
              <p className="text-xs text-slate-500">{item.count} events (7d)</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full px-5 py-3.5 text-sm font-medium text-slate-700 cursor-pointer"
        >
          <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters && (
          <div className="px-5 pb-4 space-y-3 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Entity</label>
                <select
                  value={filters.entity}
                  onChange={e => setFilters({ ...filters, entity: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Entities</option>
                  {['Medicine', 'Sale', 'Purchase', 'Supplier', 'User', 'Settings'].map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={e => setFilters({ ...filters, action: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Actions</option>
                  {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SETTINGS_CHANGE'].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Name or details..."
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleFilter}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No audit logs found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log._id} className="hover:bg-slate-50/50 transition-colors">
                <button
                  onClick={() => setExpandedRow(expandedRow === log._id ? null : log._id)}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-4 cursor-pointer"
                >
                  <div className="text-lg shrink-0">{ENTITY_ICONS[log.entity] || '📝'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{log.entityName || log.entity}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs font-medium text-slate-700 flex items-center gap-1 justify-end">
                      <User className="h-3 w-3" /> {log.userName}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                      <Calendar className="h-3 w-3" /> {formatDate(log.timestamp)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {log.changes ? (
                      expandedRow === log._id 
                        ? <ChevronDown className="h-4 w-4 text-slate-400" /> 
                        : <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <div className="w-4" />
                    )}
                  </div>
                </button>
                {/* Mobile date/user row */}
                <div className="sm:hidden px-5 pb-2 flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {log.userName}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(log.timestamp)}</span>
                </div>
                {/* Expanded Changes */}
                {expandedRow === log._id && log.changes && (
                  <div className="px-5 pb-4">
                    {renderChanges(log.changes)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} entries)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchLogs(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => fetchLogs(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
