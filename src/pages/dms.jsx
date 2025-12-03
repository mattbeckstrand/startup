import React, { useEffect, useState } from 'react';

export function Dms() {
  const [dms, setDms] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {

    const ws = new WebSocket('ws://localhost:4000/ws');
    ws.binaryType = 'text';

    ws.onopen = () => {
      console.log('✅ WebSocket connected!');
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
  }, []);


  const sendMessage = () => {
    console.log('send socket')
    if (socket) {
      const msg = { username: 'You', message: 'Test message!' };
      socket.send(JSON.stringify(msg));
    }
  };

  return (
    <main className="p-4">
      <h2 className="text-2xl mb-4">Messages</h2>
      <button  className="border border-color-white" onClick={sendMessage}>Send Test Message</button>
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
            <p className="font-semibold">{dm.username}</p>
            <p className="text-gray-300 text-sm">{dm.message}</p>
          </div>
        </div>
      </div>
      ))}
    </main>
  );
}