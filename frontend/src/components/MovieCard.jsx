import React from 'react';
import { Play, Plus, Check, ThumbsUp, ChevronDown } from 'lucide-react';
import { IMG } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';

const MovieCard = ({ item, large, onOpen, onPlay }) => {
  const { addToList, removeFromList, inList, user } = useAuth();
  const inMy = inList(item.id);
  const path = large ? item.poster_path : (item.backdrop_path || item.poster_path);
  const size = large ? 'w500' : 'w500';
  const title = item.title || item.name;

  const toggleList = (e) => {
    e.stopPropagation();
    if (!user) return;
    if (inMy) removeFromList(item.id); else addToList(item);
  };

  return (
    <div className={`relative shrink-0 card-hover cursor-pointer group rounded overflow-hidden ${large ? 'w-[180px] h-[270px]' : 'w-[280px] h-[160px]'}`} onClick={() => onOpen && onOpen(item)}>
      {path ? (
        <img src={IMG(path, size)} alt={title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-sm px-2 text-center">{title}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <div className="text-sm font-semibold line-clamp-2 mb-2">{title}</div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); (onPlay || onOpen) && (onPlay || onOpen)(item); }} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200"><Play className="w-4 h-4 fill-black" /></button>
          <button onClick={toggleList} className="w-8 h-8 rounded-full bg-neutral-800/80 border border-gray-400 text-white flex items-center justify-center hover:border-white">
            {inMy ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
          <button className="w-8 h-8 rounded-full bg-neutral-800/80 border border-gray-400 text-white flex items-center justify-center hover:border-white"><ThumbsUp className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onOpen && onOpen(item); }} className="ml-auto w-8 h-8 rounded-full bg-neutral-800/80 border border-gray-400 text-white flex items-center justify-center hover:border-white"><ChevronDown className="w-4 h-4" /></button>
        </div>
        <div className="mt-2 text-xs text-gray-300 flex items-center gap-2">
          {item.vote_average ? <span className="text-green-500 font-semibold">{Math.round(item.vote_average * 10)}% Match</span> : null}
          <span className="border border-gray-500 px-1 text-[10px]">HD</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
