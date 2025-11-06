const { supabase } = require('../supabaseClient');

const express = require('express');
const router = express.Router();

router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    })

    if (error) {
        return res.status(400).send({error: error.message});
    }
    res.send({user: data.user, session: data.session});
})

router.post('/signup', async(req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    })
    if (error) {
        return res.status(400).send({error: error.message});
    }
    res.send({user: data.user, session: data.session});
})

router.post('/logout', async(req, res) => {
    supabase.auth.signOut()
    res.send({ message: 'Logged out successfully' });
})

module.exports = router;

