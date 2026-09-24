import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, ThumbsUp } from 'lucide-react';
import { IMG, tmdb } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';

const MovieModal = ({ item, onClose, onPlay }) => {
  const [details, setDetails] = useState(null);
  const { addToList, removeFromList, inList, user } = useAuth();

  useEffect(() => {
    if (!item) return;
    const type = item.media_type || (item.first_air_date || item.name ? 'tv' : 'movie');
    tmdb.details(item.id, type).then(setDetails).catch(() => {});
  }, [item]);

  useEffect(() => {
    document.body.style.overflow = item ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [item]);

  if (!item) return null;
  const title = item.title || item.name;
  const isIn = inList(item.id);
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = details?.vote_average ? Math.round(details.vote_average * 10) : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 overflow-y-auto" onClick={onClose}>
      <div className="max-w-4xl mx-auto my-6 md:my-10 bg-[#181818] rounded-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-video bg-black">
          {item.backdrop_path && <img src={IMG(item.backdrop_path, 'original')} alt={title} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"><X className="w-5 h-5" /></button>
          <div className="absolute bottom-6 left-6 z-20 right-6 flex items-end justify-between">
            <div>
              <h2 className="text-3xl md:text-5xl font-extrabold drop-shadow-2xl">{title}</h2>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => onPlay && onPlay(item)} className="bg-white text-black px-6 py-2 rounded font-semibold flex items-center gap-2 hover:bg-gray-200"><Play className="w-5 h-5 fill-black" /> Play</button>
                {user && (
                  <button onClick={() => isIn ? removeFromList(item.id) : addToList(item)} className="w-10 h-10 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center bg-black/40">{isIn ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</button>
                )}
                <button className="w-10 h-10 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center bg-black/40"><ThumbsUp className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-10 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 text-sm mb-3">
              {rating && <span className="text-green-500 font-semibold">{rating}% Match</span>}
              {year && <span className="text-gray-300">{year}</span>}
              {details?.runtime && <span className="text-gray-300">{Math.floor(details.runtime/60)}h {details.runtime%60}m</span>}
              <span className="border border-gray-500 px-1 text-xs">HD</span>
            </div>
            <p className="text-gray-100 leading-relaxed">{item.overview}</p>
          </div>
          <div className="text-sm space-y-3">
            {details?.credits?.cast?.length > 0 && (
              <div><span className="text-gray-400">Cast: </span><span>{details.credits.cast.slice(0, 4).map(c => c.name).join(', ')}</span></div>
            )}
            {details?.genres?.length > 0 && (
              <div><span className="text-gray-400">Genres: </span><span>{details.genres.map(g => g.name).join(', ')}</span></div>
            )}
            {details?.original_language && (
              <div><span className="text-gray-400">Language: </span><span className="uppercase">{details.original_language}</span></div>
            )}
          </div>
        </div>
        {details?.similar?.results?.length > 0 && (
          <div className="px-6 md:px-10 pb-10">
            <h3 className="text-xl font-semibold mb-4">More Like This</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {details.similar.results.slice(0, 6).map(s => (
                <div key={s.id} className="bg-neutral-900 rounded overflow-hidden">
                  {s.backdrop_path ? <img src={IMG(s.backdrop_path, 'w500')} alt={s.title || s.name} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-neutral-800" />}
                  <div className="p-3">
                    <div className="font-semibold text-sm mb-1 line-clamp-1">{s.title || s.name}</div>
                    <p className="text-xs text-gray-400 line-clamp-3">{s.overview}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieModal;
