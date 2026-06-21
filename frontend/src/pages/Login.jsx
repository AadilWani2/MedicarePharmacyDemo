import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, Lock, Mail, Eye, EyeOff, CheckCircle, ShieldAlert } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('admin@medicarepharmacy.com');
  const [password, setPassword] = useState('Admin@MediCare2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDemoCreds, setShowDemoCreds] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleFillCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@medicarepharmacy.com');
      setPassword('Admin@MediCare2026!');
    } else {
      setEmail('aisha@medicarepharmacy.com');
      setPassword('Pharma@MediCare2026!');
    }
    setShowDemoCreds(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-2xl mb-4 shadow-xl shadow-blue-900/10 animate-pulse">
            <Pill className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            MediCare Pharmacy
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Inventory & Distribution System
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Srinagar, Jammu & Kashmir
          </div>
        </div>

        {/* Login Form Container */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl p-8 relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
          
          <h2 className="text-2xl font-bold text-white mb-1">Sign in to your account</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your details to access the system</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 pr-4 w-full bg-slate-950/40 border-2 border-slate-800/80 rounded-xl text-white text-sm py-3 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-950/40 outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 w-full bg-slate-950/40 border-2 border-slate-800/80 rounded-xl text-white text-sm py-3 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-950/40 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Accordion */}
          <div className="mt-6 border-t border-slate-800/80 pt-6">
            <button
              type="button"
              onClick={() => setShowDemoCreds(!showDemoCreds)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2 bg-slate-900/60 rounded-lg px-3 border border-slate-850"
            >
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>Need Demo Credentials?</span>
              </div>
              <span className="text-[10px] text-blue-400 uppercase tracking-wider">{showDemoCreds ? 'Hide' : 'Show'}</span>
            </button>

            {showDemoCreds && (
              <div className="mt-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-200">System Admin</p>
                    <p className="text-[11px] text-slate-500">Full Access Control</p>
                  </div>
                  <button
                    onClick={() => handleFillCredentials('admin')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-lg border border-blue-500/20 transition-all active:scale-95"
                  >
                    Auto Fill
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Pharmacist</p>
                    <p className="text-[11px] text-slate-500">Sales & Inventory Manager</p>
                  </div>
                  <button
                    onClick={() => handleFillCredentials('pharmacist')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-lg border border-emerald-500/20 transition-all active:scale-95"
                  >
                    Auto Fill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;