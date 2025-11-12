const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.get('/my', requireAuth, async (req, res) => {
    try{
        const userId = req.user.id
        console.log(userId)
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
    
        res.json(profile[0])
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch user reviews'})
    }
});

module.exports = router