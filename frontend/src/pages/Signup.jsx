import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try { await signup(email, password, name); nav('/browse'); }
    catch (e) { setErr(e.response?.data?.detail || 'Signup failed'); }
    finally { setLoading(false); }
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
          <h1 className="text-3xl font-bold mb-6">Create Account</h1>
          <form onSubmit={submit} className="space-y-4">
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="netflix-input w-full px-4 py-3 rounded" />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="netflix-input w-full px-4 py-3 rounded" />
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="netflix-input w-full px-4 py-3 rounded" />
            {err && <div className="text-red-500 text-sm">{err}</div>}
            <button disabled={loading} className="w-full bg-netflix-red text-white py-3 rounded font-semibold mt-2 disabled:opacity-60">{loading ? 'Creating…' : 'Sign Up'}</button>
          </form>
          <div className="text-gray-400 mt-8 text-sm">
            Already have an account? <Link to="/login" className="text-white hover:underline">Sign in.</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
