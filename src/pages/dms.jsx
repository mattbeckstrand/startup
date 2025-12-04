import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/authContext';

export function Dms() {
  const [dms, setDms] = useState([]);
  const [socket, setSocket] = useState(null);
  const [messageText, setMessageText] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // Use secure wss:// in production, ws:// for local development
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected!');
      if (user?.id) {
        ws.send(JSON.stringify({ 
          type: 'connect', 
          userId: user.id 
        }));
      }
    };

    ws.onmessage = async (event) => {
      let messageText = event.data;
      if (event.data instanceof Blob) {
        messageText = await event.data.text();
      }
      const message = JSON.parse(messageText);
      setDms(prev => [...prev, message]);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };
  
    setSocket(ws);

    return () => ws.close();
  }, [user]);

  const sendMessage = () => {
    if (socket && user && messageText.trim()) {
      const msg = { 
        type: 'dm',
        from: user.id,
        message: messageText,
        timestamp: new Date().toISOString()
      };
      socket.send(JSON.stringify(msg));
      setDms(prev => [...prev, msg]);
      setMessageText('');
    }
  };

  return (
    <main className="p-4">
      <h2 className="text-2xl mb-4">Messages</h2>
      
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded bg-gray-700 text-white"
        />
        <button 
          onClick={() => sendMessage()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Send
        </button>
      </div>

      {dms.map((dm, index) => (
        <div key={index} className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg mb-2 cursor-pointer">
          <div className="flex items-center space-x-3">
            <img 
              src="/Images/ProfileIcon.webp" 
              alt="Profile" 
              width="40" 
              height="40" 
              className="rounded-full" 
            />
            <div className="flex-1">
              <p className="font-semibold">{dm.from || dm.username}</p>
              <p className="text-gray-300 text-sm">{dm.message}</p>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}