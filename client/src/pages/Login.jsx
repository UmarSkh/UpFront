import { useState } from 'react';
import { ArrowRight, Mail, KeyRound, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const [devOtp, setDevOtp] = useState(null);
  const [devNote, setDevNote] = useState(null);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) return alert('Please enter your email');
    
    setLoading(true);
    setDevOtp(null);
    setDevNote(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      if (res.ok) {
        if (data.devOtp) {
          setDevOtp(data.devOtp);
          setDevNote(data.devNote);
        }
        setStep(2);
      } else {
        alert(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) return alert('Please enter the OTP');

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('storage'));
        navigate('/');
      } else {
        alert(data.message || 'Invalid OTP');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 relative z-10 border border-white/50">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
            <span className="text-3xl font-bold text-white">U</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to UpFront</h1>
          <p className="text-gray-500">The premier public task exchange network.</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span>Earn 50 Moral Credits immediately on sign up!</span>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-purple-600 text-white p-3 font-semibold transition-all duration-300 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Sending...' : 'Send OTP'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {devOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm animate-pulse">
                <p className="font-bold flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4" /> Development Fallback
                </p>
                <p>{devNote}: <span className="font-mono font-bold text-lg select-all">{devOtp}</span></p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP sent to {email}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white tracking-widest text-center text-lg font-bold"
                  maxLength="6"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-indigo-600 text-white p-3 font-semibold transition-all duration-300 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-purple-600 text-center mt-2">
              Back to email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
