import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Send } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface ChatInterfaceProps {
  chatId: string;
  otherUser: any;
  onBack: () => void;
}

export default function ChatInterface({ chatId, otherUser, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [gistIds, setGistIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to chat metadata (gistIds)
  useEffect(() => {
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.gistIds) {
          setGistIds(data.gistIds);
        }
      }
    });
    return () => unsubscribe();
  }, [chatId]);

  // Fetch messages from gists
  useEffect(() => {
    let active = true;
    const fetchMessages = async () => {
      try {
         let allMsgs: any[] = [];
         // Simple fetch: just fetch the latest gist for now (for performance)
         // In a robust implementation, we'd lazy load older ones.
         for (const gid of gistIds) {
            const res = await fetch(`/api/messages/${gid}`);
            if (res.ok) {
              const data = await res.json();
              allMsgs = allMsgs.concat(data.messages);
            }
         }
         
         if (!active) return;
         setMessages(allMsgs);
         setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
         }, 100);
      } catch (err) {
         console.error("Failed to fetch messages from gist:", err);
      }
    };
    
    if (gistIds.length > 0) {
       fetchMessages();
       // Poll the latest gist every 3 seconds for new messages.
       // In a real app we might use websockets, but polling gists works here.
       const interval = setInterval(fetchMessages, 3000);
       return () => {
         active = false;
         clearInterval(interval);
       };
    }
  }, [gistIds]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Optimistic update
    const optimisticMsg = {
        text: messageText,
        senderId: auth.currentUser.uid,
        createdAt: Date.now()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    try {
      const currentGistId = gistIds.length > 0 ? gistIds[gistIds.length - 1] : null;
      const res = await fetch(`/api/messages/${chatId}`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            message: optimisticMsg,
            currentGistId
         })
      });
      if (!res.ok) throw new Error("Failed to post message");
      const { gistId } = await res.json();
      
      // If a new gist was created, add it to Firestore
      if (gistId !== currentGistId) {
         const chatRef = doc(db, 'chats', chatId);
         await updateDoc(chatRef, {
            gistIds: arrayUnion(gistId)
         });
      }
    } catch (error) {
      console.error(error);
      // Revert optimistic update ideally, but keep it simple
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-gray-950 z-20 flex flex-col"
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center px-4 gap-4 bg-gray-900">
        <button onClick={onBack} className="text-gray-400 p-2 hover:text-white transition rounded-full hover:bg-gray-800">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {otherUser.displayName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-white">{otherUser.displayName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
           const isMine = msg.senderId === auth.currentUser?.uid;
           return (
             <div key={msg.id || msg.createdAt || index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl p-3 ${isMine ? 'bg-purple-600 rounded-tr-sm text-white' : 'bg-gray-800 rounded-tl-sm text-white'}`}>
                    {msg.text}
                </div>
             </div>
           );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <form onSubmit={sendMessage} className="flex gap-2">
            <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..." 
                className="flex-1 bg-gray-950 border border-gray-800 rounded-full px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={20} className="mr-1" />
            </button>
        </form>
      </div>
    </motion.div>
  );
}
