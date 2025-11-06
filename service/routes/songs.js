const express = require('express');
const router = express.Router();


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

router.get('/reviews', async (req, res) => {
    try{
        const hcReviews = [
            {id: 1, username: 'mattbeck', title:'Swag', artist:'Justin Bieber', album: 'Swag', rating: 4, artworkLocation: '/Images/Swag.png', text:"I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this."},
            {id: 2, username: 'pwatts', title:'Swag II', artist:'Justin Bieber', album: 'Swag II', rating: 2, artworkLocation: '/Images/Swag.png', text:"Has some good parts but ultimately not as good as Swag I"}
          ];
          res.json(hcReviews)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch reviews'})
    }
});

module.exports = router