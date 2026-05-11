import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';
import { MessageSquareText } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed');
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
          placeholder="+91 Enter your phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input 
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        
        <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:opacity-90 transition">
          Login
        </button>

        <div className="text-gray-500 my-6">or</div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full border border-gray-800 text-white font-semibold py-4 rounded-xl hover:bg-gray-900 transition flex items-center justify-center gap-2"
        >
          {/* Need a Google logo here, will use a placeholder for now */}
          Continue with Google
        </button>

        <p className="text-gray-400 mt-6">New to Nudgel? <span className="text-purple-400 cursor-pointer">Create account</span></p>
      </div>
    </motion.div>
  );
}
