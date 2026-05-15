import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Copy, LogOut } from 'lucide-react';
import { fetchWithAuth, clearToken } from '../lib/api';

export default function Settings() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetchWithAuth('/me');
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
  }, []);

  if (!profile) return <div className="text-white p-6">Loading profile...</div>;

  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-md mx-auto h-screen p-6 bg-gray-950 text-white"
    >
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="bg-gray-900 p-6 rounded-3xl flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <User size={48} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">{profile.username}</h2>
        
        <div className="w-full bg-gray-950 p-4 rounded-xl flex items-center justify-between mt-4">
            <div className='flex flex-col'>
                <span className="text-xs text-gray-500">Your Unique Token</span>
                <span className="text-lg font-mono text-purple-400">{profile.unique_token}</span>
            </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(profile.unique_token);
              alert("Copied to clipboard!");
            }}
            className="text-gray-400 hover:text-white"
          >
            <Copy size={20} />
          </button>
        </div>
      </div>
      <button 
        onClick={handleLogout}
        className="w-full mt-6 flex items-center justify-center gap-2 p-4 bg-red-900/20 text-red-500 rounded-xl hover:bg-red-900/40 transition"
      >
        <LogOut size={20} />
        Logout
      </button>
    </motion.div>
  );
}
