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
    // Send both user and session (session contains the access_token)
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
    // Send both user and session (session contains the access_token)
    res.send({user: data.user, session: data.session});
})

module.exports = router;

