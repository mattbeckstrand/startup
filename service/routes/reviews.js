const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.get('/my', requireAuth, async (req, res) => {
    try{
        const userId = req.user.id
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                profiles!user_id (
                username,
                avatar_url
                )`)
            .order('created_at', {ascending: false})
            .eq('user_id', userId)
        res.json(reviews)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch user reviews'})
    }
});

router.get('/', async (req, res) => {
    try{
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                profiles!user_id (
                username,
                avatar_url
                )`)
            .order('created_at', {ascending: false})
            .limit(50)
            
        console.log(reviews)
        res.json(reviews)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch user reviews'})
    }
});

module.exports = router