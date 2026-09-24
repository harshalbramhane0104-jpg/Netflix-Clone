import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav(loc.state?.from || '/browse');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0">
        <img src="https://assets.nflxext.com/ffe/siteui/vlv3/dc1cf82d-97c9-409f-b7c8-6ac1718946d6/14a8fe85-b6f4-4c06-8eaf-eccf3276d557/IN-en-20230911-popsignuptwoweeks-perspective_alpha_website_medium.jpg" alt="bg" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative z-10">
        <div className="px-6 md:px-16 py-5">
          <Link to="/" className="brand-font text-4xl netflix-red font-bold">NETFLIX</Link>
        </div>
        <div className="max-w-md mx-auto bg-black/75 p-8 md:p-14 rounded-md mt-4">
          <h1 className="text-3xl font-bold mb-6">Sign In</h1>
          <form onSubmit={submit} className="space-y-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="netflix-input w-full px-4 py-3 rounded" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="netflix-input w-full px-4 py-3 rounded" />
            {err && <div className="text-red-500 text-sm">{err}</div>}
            <button disabled={loading} className="w-full bg-netflix-red text-white py-3 rounded font-semibold mt-2 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
          <div className="text-gray-400 mt-8 text-sm">
            New to Netflix? <Link to="/signup" className="text-white hover:underline">Sign up now.</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
