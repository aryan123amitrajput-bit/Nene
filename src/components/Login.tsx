import { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquareText } from 'lucide-react';
import { fetchWithAuth, setToken } from '../lib/api';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      const endpoint = isRegistering ? '/signup' : '/login';
      const res = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Auth failed');
        return;
      }
      setToken(data.token);
      onLogin(data.user);
    } catch (error: any) {
      console.error('Auth request failed', error);
      alert('Internal Server Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col items-center justify-center h-screen bg-gray-950 p-6"
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-3xl shadow-2xl mb-6">
          <MessageSquareText size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Nudgel</h1>
        <p className="text-gray-400 mb-8">Message. Connect. Anywhere.</p>
        
        <input 
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input 
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        
        <button 
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Login')}
        </button>

        <p className="text-gray-400 mt-6">
          {isRegistering ? 'Already have an account?' : 'New to Nudgel?'} 
          <span className="text-purple-400 cursor-pointer ml-1" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Login' : 'Create account'}
          </span>
        </p>
      </div>
    </motion.div>
  );
}
