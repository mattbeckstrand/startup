const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

router.get('/my', requireAuth, async (req, res) => {
    try{
        const userId = req.user.id
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
    
        res.json(profile[0])
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch user reviews'})
    }
});

router.get('/follow-counts', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const token = req.headers.authorization.split(' ')[1];
      const supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
      
      const { data, error } = await supabaseClient
        .rpc('get_follow_counts', { p_user_id: userId });
      console.log('RPC Response data:', data)
      console.log('RPC Response error:', error)
      if (error) {
        console.error('RPC Error details:', error);
        throw error;
      }
      res.json(data[0]); 
    } catch (error) {
      console.error('Catch block error:', error);
      res.status(500).json({ error: 'Failed to get follow counts' });
    }
  });

module.exports = router