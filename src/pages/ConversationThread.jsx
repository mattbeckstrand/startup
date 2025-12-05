import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { MessageBubble } from '../components/MessageBubble';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function ConversationThread() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId, isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Get conversation details from first message if available
        if (data.length > 0 && data[0].profiles) {
          // Already have profile data
        }
      } else if (response.status === 403) {
        navigate('/messages');
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: messageText.trim() })
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        setMessageText('');
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Find the other participant from messages
  const getOtherParticipant = () => {
    const otherMessage = messages.find(m => m.sender_id !== user?.id);
    return otherMessage?.profiles || null;
  };

  const otherUser = getOtherParticipant();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur-lg z-10 border-b border-gray-800">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate('/messages')} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {otherUser && (
            <Link to={`/profile/${otherUser.id}`} className="flex items-center gap-3">
              <img 
                src={otherUser.avatar_url || '/Images/ProfilePlaceholder.jpg'}
                alt={otherUser.display_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h1 className="font-semibold">{otherUser.display_name || otherUser.username}</h1>
                <p className="text-sm text-gray-400">@{otherUser.username}</p>
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No messages yet</p>
            <p className="text-gray-500 text-sm mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {messages.map((message, index) => {
              const isSent = message.sender_id === user?.id;
              const showAvatar = !isSent && (
                index === 0 || 
                messages[index - 1].sender_id !== message.sender_id
              );
              
              return (
                <div key={message.id} className="flex items-end gap-2">
                  {!isSent && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <img 
                          src={message.profiles?.avatar_url || '/Images/ProfilePlaceholder.jpg'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <MessageBubble message={message} isSent={isSent} />
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4 bg-gray-900">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-full font-medium transition-colors"
          >
            {isSending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

