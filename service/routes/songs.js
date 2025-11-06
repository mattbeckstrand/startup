const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');


router.get('/newReleases', async (req, res) => {
    try{
        const songs = [
            { id: 1, title: 'Play', artist: 'Ed Sheeran' },
            { id: 2, title: 'Swag', artist: 'Justin Bieber' },
            { id: 3, title: 'Blonde', artist: 'Frank Ocean' },
            { id: 4, title: 'Beloved', artist: 'GIVĒON' }
          ];
          res.json(songs)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch songs'})
    }
});

// Get ALL reviews (public endpoint)
router.get('/reviews', async (req, res) => {
    try{
        const allReviews = [
            {id: 1, username: 'mattbeck', userEmail: 'matt@example.com', title:'Swag', artist:'Justin Bieber', album: 'Swag', rating: 4, artworkLocation: '/Images/Swag.png', text:"I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this."},
            {id: 2, username: 'pwatts', userEmail: 'pwatts@example.com', title:'Swag II', artist:'Justin Bieber', album: 'Swag II', rating: 2, artworkLocation: '/Images/Swag.png', text:"Has some good parts but ultimately not as good as Swag I"},
            {id: 3, username: 'mattbeck', userEmail: 'matt@example.com', title:'1989', artist:'Taylor Swift', album: '1989', rating: 5, artworkLocation: '/Images/1989SwiftAlbum.webp', text:"Classic Taylor! This album is perfect for any mood."}
        ];
        
        res.json(allReviews)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch reviews'})
    }
});

router.get('/reviews/my', requireAuth, async (req, res) => {
    try{
        const userEmail = req.user.email;
        const allReviews = [
            {id: 1, username: 'mattbeck', userEmail: 'matt.beckstrand@gmail.com', title:'Dasies', artist:'Justin Bieber', album: 'Swag', rating: 4, text:"I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this."},
            {id: 2, username: 'pwatts', userEmail: 'pwatts@example.com', title:'Speed Demon', artist:'Justin Bieber', album: 'Swag II', rating: 2, text:"Has some good parts but ultimately not as good as Swag I"},
            {id: 3, username: 'mattbeck', userEmail: 'matt.beckstrand@gmail.com', title:'Blank Space', artist:'Taylor Swift', album: '1989', rating: 5, text:"Classic Taylor! This album is perfect for any mood."}
        ];
        const userReviews = allReviews.filter(review => review.userEmail === userEmail);
        res.json(userReviews)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch user reviews'})
    }
});

router.get('/samples', async (req, res) => {
    try{
        const hcSamples = [
            {title:'A Little More', album:'Play', artist:'Ed Sheeran', artworkLocation: '/Images/play.webp' },
            {title:'Daisies', album:'Swag', artist:'Justin Bieber', artworkLocation: '/Images/Swag.png' }
          ];
          res.json(hcSamples)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch reviews'})
    }
});



module.exports = router