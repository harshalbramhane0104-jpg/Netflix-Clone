import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Account = () => {
  const { user, logout, myList } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="pt-28 px-4 md:px-14 max-w-4xl mx-auto">
        <div className="border-b border-neutral-800 pb-6 mb-6">
          <div className="text-sm text-gray-400 mb-1">ACCOUNT</div>
          <h1 className="text-3xl md:text-4xl font-bold">Membership & Billing</h1>
        </div>
        <div className="grid md:grid-cols-3 gap-6 py-6 border-b border-neutral-800">
          <div className="text-sm text-gray-400">Profile</div>
          <div className="md:col-span-2 space-y-2">
            <div className="font-semibold text-lg">{user?.name}</div>
            <div className="text-gray-300">{user?.email}</div>
            <div className="text-gray-400 text-sm">Password: ••••••••</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 py-6 border-b border-neutral-800">
          <div className="text-sm text-gray-400">Plan Details</div>
          <div className="md:col-span-2">
            <div className="font-semibold">Premium</div>
            <div className="text-gray-400 text-sm">Ultra HD · 4 screens</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 py-6 border-b border-neutral-800">
          <div className="text-sm text-gray-400">My List</div>
          <div className="md:col-span-2">
            <div className="font-semibold">{myList.length} title{myList.length === 1 ? '' : 's'} saved</div>
            <button onClick={() => nav('/mylist')} className="text-blue-400 hover:underline text-sm mt-1">View my list</button>
          </div>
        </div>
        <div className="py-6">
          <button onClick={() => { logout(); nav('/'); }} className="bg-neutral-800 hover:bg-neutral-700 px-6 py-2 rounded font-semibold">Sign Out</button>
        </div>
      </div>
    </div>
  );
};

export default Account;
