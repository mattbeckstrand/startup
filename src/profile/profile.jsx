import React from 'react';

export function Profile() {
  return (
    <main className="p-4">
      <div className="flex items-center space-x-6 mb-6">
        <img src="/Images/IMG_2769.jpg" alt="Profile" className="w-20 h-20 rounded-full" />
        <div>
          <h2 className="text-2xl font-bold">Matt Beckstrand</h2>
          <p className="text-gray-300">matt.beckstrand</p>
        </div>
        <div className="flex space-x-6 ml-auto">
          <span>Followers 10</span>
          <span>Following 3</span>
          <span>Listening History</span>
        </div>
      </div>
      <hr />
      <div className="mt-4">
        <div className="flex items-center space-x-2 mb-3">
          <img src="/Images/ProfileIcon.webp" alt="Profile" width="26" height="26" className="rounded-full" />
          <span className="font-semibold">Matt Beckstrand</span>
        </div>
        <img src="/Images/Swag.png" alt="Swag - Justin Bieber" width="200" className="rounded-lg mb-2" />
        <p className="font-semibold">Swag - Justin Bieber</p>
        <p className="text-yellow-400">★ ★ ★ ☆ ☆</p>
        <p className="text-gray-300">I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this.</p>
      </div>
    </main>
  );
}

