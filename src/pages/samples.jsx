import React, { useEffect, useState} from 'react';
import { useSongs } from '../hooks/useSongs';

export function Samples() {
  const { songs, loading: samplesLoading} = useSongs();

  return (
    <main>
      <div className="text-center">
        <h1 className="text-3xl">Samples</h1>
      </div>
      {samplesLoading ? (
          <p>Samples Loading</p>
        ) : ( songs.map((song) => {
          return(
            <div>
              <div className='flex justify-center'>
              <img src={song.artworkUrl} alt={song.title + ' - ' + song.artist} width="350" className="rounded-lg" />
              </div>
              <br/>
              <div className='text-center'>
              {song.title + ' - ' + song.artist}
              <p>▶</p>
              <p>Add to library +</p>
              </div>
            </div>
          )})
        )}
    </main>
  );
}

