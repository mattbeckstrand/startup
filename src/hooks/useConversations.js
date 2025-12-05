import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/authContext';

export function useConversations() {
  const { token, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        setTotalUnread(data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
      }
    } catch (error) {
      console.error('Fetch conversations error:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchConversations();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const startConversation = useCallback(async (participantId) => {
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participant_id: participantId })
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchConversations();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Start conversation error:', error);
      return null;
    }
  }, [token, fetchConversations]);

  const refresh = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    totalUnread,
    loading,
    startConversation,
    refresh
  };
}

export function useMessages(conversationId) {
  const { user, token, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated || !conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, token, isAuthenticated]);

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content, messageType = 'text', attachment = null) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, message_type: messageType, attachment })
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        return newMessage;
      }
      return null;
    } catch (error) {
      console.error('Send message error:', error);
      return null;
    }
  }, [conversationId, token]);

  const refresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    refresh
  };
}

