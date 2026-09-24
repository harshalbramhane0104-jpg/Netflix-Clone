import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

const Row = ({ title, fetcher, large, onOpen, onPlay }) => {
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetcher().then(list => { if (mounted) setItems(list.filter(i => i.backdrop_path || i.poster_path)); }).catch(() => {});
    return () => { mounted = false; };
  }, [fetcher]);

  const scroll = (dir) => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <div className="px-4 md:px-14 mb-8 group/row">
      <h2 className="text-white text-lg md:text-xl font-semibold mb-2">{title}</h2>
      <div className="relative">
        <button onClick={() => scroll(-1)} className="absolute left-0 top-0 bottom-0 w-10 z-10 bg-black/40 hover:bg-black/70 opacity-0 group-hover/row:opacity-100 transition flex items-center justify-center"><ChevronLeft className="w-8 h-8" /></button>
        <div ref={ref} className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-6">
          {items.map(item => <MovieCard key={item.id} item={item} large={large} onOpen={onOpen} onPlay={onPlay} />)}
        </div>
        <button onClick={() => scroll(1)} className="absolute right-0 top-0 bottom-0 w-10 z-10 bg-black/40 hover:bg-black/70 opacity-0 group-hover/row:opacity-100 transition flex items-center justify-center"><ChevronRight className="w-8 h-8" /></button>
      </div>
    </div>
  );
};

export default Row;
