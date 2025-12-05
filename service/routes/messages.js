const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Get conversation list
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    // Enrich with participant profiles and last message
    const enrichedConversations = await Promise.all((conversations || []).map(async (conv) => {
      // Get other participant's profile
      const otherParticipantId = conv.participant_ids.find(id => id !== userId);
      
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherParticipantId)
        .single();

      // Get last message
      const { data: lastMessage } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conv.id)
        .neq('sender_id', userId)
        .eq('is_read', false);

      return {
        ...conv,
        other_participant: otherUser,
        last_message: lastMessage,
        unread_count: unreadCount || 0
      };
    }));

    res.json(enrichedConversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create or get conversation with a user
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { participant_id } = req.body;

    if (!participant_id) {
      return res.status(400).json({ error: 'participant_id is required' });
    }

    if (participant_id === userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId, participant_id]);

    // Find the one with exactly these two participants
    const existingConv = existing?.find(conv => 
      conv.participant_ids.length === 2 &&
      conv.participant_ids.includes(userId) &&
      conv.participant_ids.includes(participant_id)
    );

    if (existingConv) {
      // Get other participant's profile
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', participant_id)
        .single();

      return res.json({
        ...existingConv,
        other_participant: otherUser,
        is_new: false
      });
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        participant_ids: [userId, participant_id]
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Get other participant's profile
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', participant_id)
      .single();

    res.status(201).json({
      ...newConv,
      other_participant: otherUser,
      is_new: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // For pagination

    // Verify user is part of conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single();

    if (!conv || !conv.participant_ids.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    let query = supabase
      .from('direct_messages')
      .select(`
        *,
        profiles!sender_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('timestamp', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark messages as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    // Return in chronological order
    res.json((messages || []).reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content, message_type, attachment } = req.body;

    // Verify user is part of conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single();

    if (!conv || !conv.participant_ids.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to send to this conversation' });
    }

    if (!content && !attachment) {
      return res.status(400).json({ error: 'Content or attachment is required' });
    }

    // Create message
    const { data: message, error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content?.trim() || null,
        message_type: message_type || 'text',
        attachment: attachment || null
      })
      .select(`
        *,
        profiles!sender_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Create notification for other participant
    const otherParticipantId = conv.participant_ids.find(id => id !== userId);
    
    const { data: sender } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', userId)
      .single();

    await supabase.from('notifications').insert({
      user_id: otherParticipantId,
      type: 'message',
      title: 'New message',
      message: `${sender?.display_name || sender?.username}: ${content?.substring(0, 50) || 'Sent an attachment'}`,
      actor_id: userId,
      actor_username: sender?.username,
      actor_avatar_url: sender?.avatar_url,
      content_type: 'conversation',
      content_id: conversationId
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.put('/:messageId/read', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      return res.status(500).json({ error: 'Failed to mark as read' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Get total unread message count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user's conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [userId]);

    if (!conversations?.length) {
      return res.json({ unread_count: 0 });
    }

    const conversationIds = conversations.map(c => c.id);

    const { count } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact' })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    res.json({ unread_count: count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;

