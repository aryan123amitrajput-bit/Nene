import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Edit2, UserPlus, Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import Settings from './Settings';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export default function ChatList() {
  const [activeTab, setActiveTab] = useState<'chats' | 'settings'>('chats');
  const [showAddModal, setShowAddModal] = useState(false);
  const [token, setToken] = useState('');

  const addPerson = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uniqueToken', '==', token.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const targetUser = querySnapshot.docs[0].data();
        // Create chat
        await addDoc(collection(db, 'chats'), {
          participants: [auth.currentUser!.uid, targetUser.uid]
        });
        alert('Chat started with ' + targetUser.displayName);
        setShowAddModal(false);
      } else {
        alert('User not found');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chats');
    }
  };

  if (activeTab === 'settings') {
    return (
        <div className="h-screen flex flex-col">
            <Settings />
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex justify-around items-center">
                <button onClick={() => setActiveTab('chats')} className="text-gray-400"><MessageSquare /></button>
                <button onClick={() => setActiveTab('settings')} className="text-purple-400"><SettingsIcon /></button>
            </div>
        </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-md mx-auto h-screen flex flex-col pt-6 pb-20 bg-gray-950"
    >
      <div className="px-6 flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Nudgel</h1>
        <div className="flex gap-4 text-gray-400">
          <button onClick={() => setShowAddModal(true)}><UserPlus size={22} /></button>
          <Search size={22} />
          <Edit2 size={22} />
        </div>
      </div>
      
      {showAddModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 p-6">
          <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">Add Person</h2>
            <input 
              type="text"
              placeholder="Enter unique token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white mb-4"
            />
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 p-4 bg-gray-800 rounded-xl">Cancel</button>
              <button onClick={addPerson} className="flex-1 p-4 bg-purple-600 rounded-xl">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ... rest of chat list ... */}
      <div className="flex-1 px-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-900/50 backdrop-blur-md shadow-lg border border-white/5">
            <div className="w-14 h-14 rounded-full bg-gray-700"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-semibold text-white">Contact {i}</span>
                <span className="text-xs text-gray-500">9:40 AM</span>
              </div>
              <p className="text-sm text-gray-400">Hey! How are you doing?</p>
            </div>
          </div>
        ))}
      </div>

        <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex justify-around items-center">
            <button onClick={() => setActiveTab('chats')} className="text-purple-400"><MessageSquare /></button>
            <button onClick={() => setActiveTab('settings')} className="text-gray-400"><SettingsIcon /></button>
        </div>
    </motion.div>
  );
}
