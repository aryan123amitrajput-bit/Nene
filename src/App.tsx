/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, createUserProfile } from './firebase';
import Login from './components/Login';
import ChatList from './components/ChatList';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        createUserProfile(currentUser);
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading Nudgel...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {user ? <ChatList /> : <Login />}
    </div>
  );
}
