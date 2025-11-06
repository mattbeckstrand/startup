import React, { useEffect, useState} from 'react';

export function Samples() {
  const [samples, setSamples] = useState([])

  const hcSamples = [
    {title:'Play', album:'Play', artist:'Ed Sheeran', artworkLocation: '/Images/play.webp' },
    {title:'Swag', album:'Swag', artist:'Justin Bieber', artworkLocation: '/Images/Swag.png' }
  ]

  useEffect(() => {
    return(
      setSamples(hcSamples)
    )
  }, [])

  return (
    <main>
      <div className="text-center">
        <h1 className="text-3xl">Samples</h1>
      </div>
      {samples.map((sample) => {
        return(
          <div>
            <div className='flex justify-center'>
            <img src={sample.artworkLocation} alt={sample.title + ' - ' + sample.artist} width="350" className="rounded-lg" />
            </div>
            <br/>
            <div className='text-center'>
            {sample.title + ' - ' + sample.artist}
            <p>▶</p>
            <p>Add to library +</p>
            </div>
          </div>
        )})
        }
    </main>
  );
}

