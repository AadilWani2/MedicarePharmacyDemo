import { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Pill, Package, AlertTriangle, TrendingDown, 
  ShoppingCart, IndianRupee, Users, Activity,
  BarChart2, PieChart as PieIcon, LineChart as LineIcon
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 backdrop-blur-md text-xs">
        <p className="font-semibold mb-1 border-b border-slate-700 pb-1">{label}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.color || pld.fill }} className="font-medium my-0.5">
            {pld.name}: {pld.name.includes('Revenue') || pld.name.includes('Profit') ? `₹${pld.value.toLocaleString()}` : pld.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAnalytics()
      ]);
      setStats(statsRes.data.stats);
      setAnalytics(analyticsRes.data.analytics);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const cards = [
    { name: 'Total Medicines', value: stats?.totalMedicines || 0, icon: Pill, color: 'bg-blue-500', bgColor: 'bg-blue-50', link: '/medicines', filter: 'all' },
    { name: 'Total Stock', value: stats?.totalStock || 0, icon: Package, color: 'bg-green-500', bgColor: 'bg-green-50', link: '/medicines', filter: 'all' },
    { name: 'Low Stock', value: stats?.lowStock || 0, icon: AlertTriangle, color: 'bg-yellow-500', bgColor: 'bg-yellow-50', link: '/medicines', filter: 'low' },
    { name: 'Expiring Soon', value: stats?.expiringSoon || 0, icon: TrendingDown, color: 'bg-red-500', bgColor: 'bg-red-50', link: '/medicines', filter: 'expiring' },
    { name: "Today's Sales", value: `₹${stats?.todaySales?.toLocaleString() || 0}`, icon: IndianRupee, color: 'bg-purple-500', bgColor: 'bg-purple-50', link: '/sales' },
    { name: 'Transactions', value: stats?.todayTransactions || 0, icon: Activity, color: 'bg-indigo-500', bgColor: 'bg-indigo-50', link: '/sales' },
    { name: 'Monthly Revenue', value: `₹${stats?.monthlyRevenue?.toLocaleString() || 0}`, icon: ShoppingCart, color: 'bg-pink-500', bgColor: 'bg-pink-50', link: '/reports' },
    { name: 'Suppliers', value: stats?.totalSuppliers || 0, icon: Users, color: 'bg-teal-500', bgColor: 'bg-teal-50', link: '/suppliers' },
  ];

  const salesTrendData = analytics?.salesTrend || [];
  const categoryData = analytics?.categoryDistribution || [];
  const topMedicinesData = analytics?.topSellingMedicines || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to MediCare Pharmacy, Srinagar</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div 
            key={card.name} 
            onClick={() => card.link && navigate(card.link, { state: { filter: card.filter } })}
            className={`${card.bgColor} rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Quick Alerts</h3>
          <div className="space-y-3">
            {stats?.expiringSoon > 0 && (
              <div 
                onClick={() => navigate('/medicines', { state: { filter: 'expiring' } })}
                className="flex items-center p-3 bg-red-50 rounded-lg hover:bg-red-100/80 cursor-pointer transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                <p className="text-sm text-red-700 font-medium">
                  {stats.expiringSoon} medicines expiring within the dynamic expiry threshold
                </p>
              </div>
            )}
            {stats?.lowStock > 0 && (
              <div 
                onClick={() => navigate('/medicines', { state: { filter: 'low' } })}
                className="flex items-center p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100/80 cursor-pointer transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                <p className="text-sm text-yellow-700 font-medium">
                  {stats.lowStock} medicines need reordering (below threshold)
                </p>
              </div>
            )}
            {stats?.expiringSoon === 0 && stats?.lowStock === 0 && (
              <p className="text-green-600 font-medium">✅ All systems good!</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Pharmacy Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">GST Number</span>
              <span className="font-medium text-slate-800">01ABCDE1234F1Z5</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Drug License</span>
              <span className="font-medium text-slate-800">JK/PHARMA/2026/4587</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Contact</span>
              <span className="font-medium text-slate-800">+91 98765 43210</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Address</span>
              <span className="font-medium text-slate-800 text-right">Residency Road, Srinagar, J&K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Trend Area Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sales & Profit Trend</h3>
              <p className="text-sm text-gray-500">Revenue vs. Estimated Profit over the last 7 days</p>
            </div>
            <LineIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="h-80 w-full">
            {salesTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" tick={{ fill: '#475569', fontSize: 12 }} />
                  <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" name="Estimated Profit" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm">No sales data recorded in the last 7 days.</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Category Share</h3>
              <p className="text-sm text-gray-500">Sales distribution by medicine category</p>
            </div>
            <PieIcon className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="h-80 w-full relative flex flex-col justify-between">
            {categoryData.length > 0 ? (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} units`, 'Sales']} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs overflow-y-auto max-h-24 px-2">
                  {categoryData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 truncate">{entry.name}</span>
                      <span className="font-semibold text-gray-800">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm">No sales data recorded in the last 30 days.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top-Selling Medicines Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Top-Selling Medicines</h3>
            <p className="text-sm text-gray-500">Highest performing products by sales volume & revenue (Last 30 Days)</p>
          </div>
          <BarChart2 className="h-5 w-5 text-violet-500" />
        </div>
        <div className="h-80 w-full">
          {topMedicinesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMedicinesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" tickLine={false} axisLine={false} tick={{ fill: '#6366f1', fontSize: 11 }} label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft', fill: '#6366f1', fontSize: 11, offset: 0 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#14b8a6', fontSize: 11 }} label={{ value: 'Quantity Sold', angle: 90, position: 'insideRight', fill: '#14b8a6', fontSize: 11, offset: 0 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" tick={{ fill: '#475569', fontSize: 12 }} />
                <Bar yAxisId="left" name="Revenue (₹)" dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="right" name="Quantity Sold" dataKey="sales" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-sm">No sales data recorded in the last 30 days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;