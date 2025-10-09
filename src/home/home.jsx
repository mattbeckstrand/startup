import React from 'react';

export function Home() {
  return (
    <main>
        <section>
        <h2>New Releases</h2>
        <div class="flex space-x-6">
            <div class="w-60 text-center">
              <img src="/Images/play.webp" alt="Play - Ed Sheeran" class="w-full rounded-lg"/>
              <p class="text-sm">Play - Ed Sheeran</p>
            </div>
            <div class="w-60 text-center">
              <img src="/Images/Swag.png" alt="Swag - Justin Bieber" class="w-full rounded-lg"/>
              <p class="text-sm">Swag - Justin Bieber</p>
            </div>
            <div class="w-60 text-center">
              <img src="/Images/blonge.jpeg" alt="Blonde - Frank Ocean" class="w-full rounded-lg"/>
              <p class="text-sm">Blonde - Frank Ocean</p>
            </div>
            <div class="w-60 text-center">
              <img src="/Images/Beloved.jpg" alt="Beloved - GIVĒON" class="w-full rounded-lg"/>
              <p class="text-sm">Beloved - GIVĒON</p>
            </div>
          </div>
          
    </section>
        <hr/>
        <div class="p-4">
            <div class="flex items-center space-x-2">
              <img src="/Images/IMG_2769.jpg" alt="Profile" class="w-10 h-10 rounded-full"/>
              <span>Matt Beckstrand</span>
            </div>
            <div class="mt-4 inline-block ">
                <img src="/Images/Swag.png" alt="Swag - Justin Bieber" class="w-60 rounded-lg"/>
                <p>Swag - Justin Bieber</p>
              </div>
              
            <p class="mt-2">★ ★ ★ ☆ ☆</p>
            <p>I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this.</p>
          </div>
        </main>
  );
}



   