import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { IMG } from '../services/tmdb';
import MovieModal from '../components/MovieModal';
import WatchPlayer from '../components/WatchPlayer';
import { Play, X } from 'lucide-react';

const MyList = () => {
  const { myList, removeFromList } = useAuth();
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(null);

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="pt-28 px-4 md:px-14">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">My List</h1>
        {myList.length === 0 ? (
          <div className="text-gray-400 py-16 text-center">Your list is empty. Add movies and shows from the browse page.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {myList.map(m => (
              <div key={m.tmdb_id} className="relative bg-neutral-900 rounded overflow-hidden card-hover cursor-pointer group" onClick={() => setSelected({ id: m.tmdb_id, media_type: m.media_type, title: m.title, backdrop_path: m.backdrop_path, poster_path: m.poster_path, overview: m.overview, vote_average: m.vote_average })}>
                {m.backdrop_path || m.poster_path ? <img src={IMG(m.backdrop_path || m.poster_path, 'w500')} alt={m.title} className="w-full h-40 object-cover" /> : <div className="h-40 bg-neutral-800" />}
                <button onClick={(e) => { e.stopPropagation(); removeFromList(m.tmdb_id); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4" /></button>
                <div className="p-3">
                  <div className="font-semibold text-sm mb-1 line-clamp-1">{m.title}</div>
                  <button onClick={(e) => { e.stopPropagation(); setPlaying({ id: m.tmdb_id, media_type: m.media_type, title: m.title, backdrop_path: m.backdrop_path, poster_path: m.poster_path }); }} className="bg-white text-black rounded px-2 py-1 text-xs flex items-center gap-1 mt-1"><Play className="w-3 h-3 fill-black" /> Play</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <MovieModal item={selected} onClose={() => setSelected(null)} onPlay={(item) => { setSelected(null); setPlaying(item); }} />
      <WatchPlayer item={playing} onClose={() => setPlaying(null)} />
    </div>
  );
};

export default MyList;
