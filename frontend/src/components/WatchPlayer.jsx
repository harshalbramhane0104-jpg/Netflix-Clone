import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Volume2, VolumeX, Film } from 'lucide-react';
import { tmdb, IMG } from '../services/tmdb';

// TMDB watch/providers data is region-keyed. US has the most complete
// free/ads-supported coverage, so we check there first.
const REGION = 'US';

const WatchPlayer = ({ item, onClose }) => {
  const [status, setStatus] = useState('loading'); // loading | free | trailer | none
  const [freeInfo, setFreeInfo] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [muted, setMuted] = useState(false);

  const type = item ? (item.media_type || (item.first_air_date || item.name ? 'tv' : 'movie')) : 'movie';
  const title = item ? (item.title || item.name) : '';

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setStatus('loading');
    setFreeInfo(null);
    setTrailerKey(null);

    (async () => {
      // 1. Is it available to watch for free (or free-with-ads) anywhere?
      const providers = await tmdb.watchProviders(item.id, type);
      const region = providers?.[REGION];
      const free = [...(region?.free || []), ...(region?.ads || [])];
      if (cancelled) return;

      if (free.length > 0) {
        setFreeInfo({ providers: free, link: region.link });
        setStatus('free');
        return;
      }

      // 2. Otherwise fall back to the trailer.
      const key = await tmdb.trailerKey(item.id, type);
      if (cancelled) return;
      if (key) { setTrailerKey(key); setStatus('trailer'); }
      else setStatus('none');
    })();

    return () => { cancelled = true; };
  }, [item, type]);

  useEffect(() => {
    document.body.style.overflow = item ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [item]);

  const watchTrailerInstead = async () => {
    setStatus('loading');
    const key = await tmdb.trailerKey(item.id, type);
    if (key) { setTrailerKey(key); setStatus('trailer'); }
    else setStatus('none');
  };

  if (!item) return null;

  const yt = trailerKey
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1`
    : null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-black/90 shrink-0">
        <div className="font-semibold text-sm md:text-base truncate pr-4">{title}</div>
        <div className="flex items-center gap-3">
          {status === 'trailer' && (
            <button onClick={() => setMuted(m => !m)} className="w-9 h-9 rounded-full border border-gray-500 hover:border-white flex items-center justify-center" aria-label="toggle sound">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="close"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-y-auto">
        {status === 'loading' && (
          <div className="text-gray-400 text-sm flex items-center gap-2"><Film className="w-4 h-4 animate-pulse" /> Loading…</div>
        )}

        {status === 'free' && freeInfo && (
          <div className="max-w-md text-center px-6 py-10">
            {item.backdrop_path && <img src={IMG(item.backdrop_path, 'w780')} alt={title} className="rounded mb-6 w-full object-cover aspect-video" />}
            <h3 className="text-xl font-semibold mb-2">Good news — this is free to watch</h3>
            <p className="text-gray-400 text-sm mb-6">
              {title} is available to stream free, with ads, on {freeInfo.providers.map(p => p.provider_name).join(', ')}. We can't stream another service's video inside this app, but one tap takes you straight there.
            </p>
            <a href={freeInfo.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded font-semibold hover:bg-gray-200">
              <ExternalLink className="w-4 h-4" /> Watch free now
            </a>
            <button onClick={watchTrailerInstead} className="block mx-auto mt-4 text-sm text-gray-400 hover:text-white underline">
              Watch trailer instead
            </button>
          </div>
        )}

        {status === 'trailer' && yt && (
          <iframe title="trailer" src={yt} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        )}

        {status === 'none' && (
          <div className="text-gray-400 text-sm text-center px-6">
            No trailer or free stream is available for {title} right now.
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchPlayer;
