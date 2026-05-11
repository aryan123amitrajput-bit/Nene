import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { User, Copy, Info } from 'lucide-react';

export default function Settings() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users/' + auth.currentUser!.uid);
      }
    };
    fetchProfile();
  }, []);

  if (!profile) return <div className="text-white p-6">Loading profile...</div>;

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
        <h2 className="text-xl font-bold">{profile.displayName}</h2>
        <p className="text-gray-400">{profile.email}</p>
        
        <div className="w-full bg-gray-950 p-4 rounded-xl flex items-center justify-between mt-4">
            <div className='flex flex-col'>
                <span className="text-xs text-gray-500">Your Unique Token</span>
                <span className="text-lg font-mono text-purple-400">{profile.uniqueToken}</span>
            </div>
          <button 
            onClick={() => navigator.clipboard.writeText(profile.uniqueToken)}
            className="text-gray-400 hover:text-white"
          >
            <Copy size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
