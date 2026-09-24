import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { tmdb, IMG } from '../services/tmdb';
import MovieModal from '../components/MovieModal';
import WatchPlayer from '../components/WatchPlayer';
import { Play, Plus, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') || '';
  const [term, setTerm] = useState(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(null);
  const { addToList, removeFromList, inList } = useAuth();

  useEffect(() => { setTerm(q); }, [q]);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    setLoading(true);
    tmdb.search(q).then(r => setResults(r.filter(i => i.backdrop_path || i.poster_path))).finally(() => setLoading(false));
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    setParams(term ? { q: term } : {});
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="pt-24 px-4 md:px-14">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <form onSubmit={submit} className="mb-6 max-w-xl">
          <input autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Search titles, people, genres…" className="netflix-input w-full px-4 py-3 rounded" />
        </form>
        {q && <h2 className="text-xl md:text-2xl font-semibold mb-4">Results for “{q}”</h2>}
        {loading && <div className="text-gray-400">Searching…</div>}
        {!loading && q && results.length === 0 && <div className="text-gray-400">No results found.</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map(item => {
            const path = item.backdrop_path || item.poster_path;
            const title = item.title || item.name;
            const inMy = inList(item.id);
            return (
              <div key={`${item.media_type}-${item.id}`} className="bg-neutral-900 rounded overflow-hidden card-hover cursor-pointer" onClick={() => setSelected(item)}>
                {path ? <img src={IMG(path, 'w500')} alt={title} className="w-full h-40 object-cover" /> : <div className="h-40 bg-neutral-800" />}
                <div className="p-3">
                  <div className="font-semibold text-sm mb-1 line-clamp-1">{title}</div>
                  <div className="text-xs text-gray-400 mb-2 uppercase">{item.media_type}</div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setPlaying(item); }} className="bg-white text-black rounded px-2 py-1 text-xs flex items-center gap-1"><Play className="w-3 h-3 fill-black" /> Play</button>
                    <button onClick={(e) => { e.stopPropagation(); inMy ? removeFromList(item.id) : addToList(item); }} className="border border-gray-500 rounded px-2 py-1 text-xs flex items-center gap-1">{inMy ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />} List</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <MovieModal item={selected} onClose={() => setSelected(null)} onPlay={(item) => { setSelected(null); setPlaying(item); }} />
      <WatchPlayer item={playing} onClose={() => setPlaying(null)} />
    </div>
  );
};

export default SearchPage;
