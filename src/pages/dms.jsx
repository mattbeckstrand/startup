import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { FullPageLoader } from '../components/LoadingSpinner';

export function Dms() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    fetchConversations();
    
    // Poll for new messages
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users for new message
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/profiles/search/users?q=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.filter(u => u.id !== user?.id));
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartConversation = async (userId) => {
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participant_id: userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        navigate(`/messages/${data.id}`);
      }
    } catch (error) {
      console.error('Start conversation error:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur-lg z-10 border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Messages</h1>
          <button
            onClick={() => setShowNewMessage(true)}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        {conversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-400">No messages yet</h2>
            <p className="text-gray-500 mt-2">Start a conversation with someone!</p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="mt-4 px-6 py-2 bg-purple-600 rounded-full font-medium hover:bg-purple-700 transition-colors"
            >
              New Message
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {conversations.map(conv => (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="relative">
                  <img 
                    src={conv.other_participant?.avatar_url || '/Images/ProfilePlaceholder.jpg'}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-white' : 'text-gray-200'}`}>
                      {conv.other_participant?.display_name || conv.other_participant?.username}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message?.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                    {conv.last_message?.sender_id === user?.id && (
                      <span className="text-gray-400">You: </span>
                    )}
                    {conv.last_message?.content || 
                     (conv.last_message?.message_type === 'song' ? '🎵 Shared a song' :
                      conv.last_message?.message_type === 'album' ? '💿 Shared an album' :
                      conv.last_message?.message_type === 'review' ? '📝 Shared a review' : '')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-gray-900 w-full max-w-lg rounded-t-2xl md:rounded-2xl max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">New Message</h2>
              <button 
                onClick={() => {
                  setShowNewMessage(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search input */}
            <div className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for someone..."
                className="w-full bg-gray-800 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>
            
            {/* Search results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching && (
                <div className="text-center py-8 text-gray-400">Searching...</div>
              )}
              
              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-400">No users found</div>
              )}
              
              {searchResults.map(userResult => (
                <button
                  key={userResult.id}
                  onClick={() => handleStartConversation(userResult.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-800 transition-colors"
                >
                  <img 
                    src={userResult.avatar_url || '/Images/ProfilePlaceholder.jpg'}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <h3 className="font-semibold">{userResult.display_name || userResult.username}</h3>
                    <p className="text-gray-400 text-sm">@{userResult.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
