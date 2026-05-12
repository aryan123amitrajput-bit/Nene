import { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';
import { MessageSquareText } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Login failed', error);
      if (error.code === 'auth/unauthorized-domain') {
         alert('Google Login failed: Domain not authorized. Please add your Vercel domain to Firebase Console -> Authentication -> Settings -> Authorized Domains.');
      } else {
         alert('Google Login failed: ' + error.message);
      }
    }
  };

  const handleEmailAuth = async () => {
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('Auth failed', error);
      alert('Auth failed: ' + (error as Error).message);
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
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input 
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        
        <button 
          onClick={handleEmailAuth}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:opacity-90 transition"
        >
          {isRegistering ? 'Create Account' : 'Login'}
        </button>

        <div className="text-gray-500 my-6">or</div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full border border-gray-800 text-white font-semibold py-4 rounded-xl hover:bg-gray-900 transition flex items-center justify-center gap-2"
        >
          Continue with Google
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
