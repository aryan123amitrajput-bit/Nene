/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Login from './components/Login';
import ChatList from './components/ChatList';
import { fetchWithAuth, getToken } from './lib/api';

export default function App() {
  const [user, setUser] = useState<{ id: string, username: string, unique_token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchWithAuth('/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading Nudgel...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {user ? <ChatList /> : <Login onLogin={(u) => setUser(u)} />}
    </div>
  );
}
