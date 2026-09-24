import React, { useEffect, useState } from 'react';
import { Play, Info, Plus, Check } from 'lucide-react';
import { IMG, tmdb } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';

const FETCH_BY_CATEGORY = {
  home: () => tmdb.netflixOriginals(),
  tv: () => tmdb.popularTv(),
  movies: () => tmdb.popularMovies(),
  new: () => tmdb.trending(),
};

const Hero = ({ onPlay, onInfo, category = 'home' }) => {
  const [item, setItem] = useState(null);
  const { addToList, removeFromList, inList } = useAuth();

  useEffect(() => {
    setItem(null);
    const fetcher = FETCH_BY_CATEGORY[category] || FETCH_BY_CATEGORY.home;
    fetcher().then(list => {
      const filtered = list.filter(i => i.backdrop_path && i.overview);
      setItem(filtered[Math.floor(Math.random() * Math.min(filtered.length, 8))]);
    }).catch(() => {});
  }, [category]);

  if (!item) return <div className="h-[85vh] bg-black" />;
  const title = item.title || item.name;
  const overview = item.overview?.length > 220 ? item.overview.slice(0, 220) + '…' : item.overview;
  const isIn = inList(item.id);

  return (
    <div className="relative h-[92vh] w-full">
      <img src={IMG(item.backdrop_path, 'original')} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 hero-side-gradient" />
      <div className="absolute inset-0 hero-gradient" />
      <div className="relative z-10 h-full flex flex-col justify-end pb-40 md:pb-48 px-4 md:px-14 max-w-3xl">
        <div className="text-red-600 font-semibold flex items-center gap-2 mb-2"><span className="brand-font text-2xl">N</span> SERIES</div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-2xl">{title}</h1>
        <p className="text-base md:text-lg text-gray-200 mb-6 drop-shadow-lg">{overview}</p>
        <div className="flex gap-3">
          <button onClick={() => onPlay && onPlay(item)} className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded font-semibold flex items-center gap-2 hover:bg-gray-200 transition"><Play className="w-5 h-5 fill-black" /> Play</button>
          <button onClick={() => onInfo && onInfo(item)} className="bg-gray-500/60 text-white px-6 md:px-8 py-2 md:py-3 rounded font-semibold flex items-center gap-2 hover:bg-gray-500/80 transition"><Info className="w-5 h-5" /> More Info</button>
          <button onClick={() => isIn ? removeFromList(item.id) : addToList(item)} className="bg-gray-500/60 text-white w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:bg-gray-500/80 transition">{isIn ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
