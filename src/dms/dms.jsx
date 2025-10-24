import React, { useEffect, useState } from 'react';

export function Dms() {
  const [dms, setDms] = useState([])

  const hcDms = [
    {username:'spencer', message:'Dude your last review was so sick! I loved how you talked ab...'},
    {username:'parker', message:'Bro your music taste sucks!'}
  ]

  useEffect(() => {
    setDms(hcDms)
  }, [])

  return (
    <main className="p-4">
      <h2 className="text-2xl mb-4">Messages</h2>
      {dms.map((dm) => {
        return(
          <div className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg mb-2 cursor-pointer">
            <div className="flex items-center space-x-3">
              <img src="/Images/ProfileIcon.webp" alt="Profile" width="40" height="40" className="rounded-full" />
              <div className="flex-1">
                <p className="font-semibold">{dm.username}</p>
                <p className="text-gray-300 text-sm">{dm.message}</p>
              </div>
            </div>
          </div>
        )
      })
      }
    </main>
  );
}

