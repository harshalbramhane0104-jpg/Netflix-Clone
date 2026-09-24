import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Row from '../components/Row';
import MovieModal from '../components/MovieModal';
import WatchPlayer from '../components/WatchPlayer';
import { rowConfigByCategory } from '../services/tmdb';

const CATEGORY_HEADINGS = {
  tv: 'TV Shows',
  movies: 'Movies',
  new: 'New & Popular',
};

const Browse = () => {
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [params] = useSearchParams();
  const cat = params.get('cat') || 'home';
  const rows = rowConfigByCategory[cat] || rowConfigByCategory.home;

  return (
    <div className="bg-[#141414] min-h-screen pb-20">
      <Navbar />
      <Hero category={cat} onPlay={setPlaying} onInfo={setSelected} />
      <div className="-mt-24 md:-mt-32 relative z-20">
        {CATEGORY_HEADINGS[cat] && (
          <h1 className="px-4 md:px-14 text-2xl md:text-3xl font-bold mb-4">{CATEGORY_HEADINGS[cat]}</h1>
        )}
        {rows.map(r => (
          <Row key={r.key} title={r.title} fetcher={r.fetch} large={r.large} onOpen={setSelected} onPlay={setPlaying} />
        ))}
      </div>
      <MovieModal item={selected} onClose={() => setSelected(null)} onPlay={(item) => { setSelected(null); setPlaying(item); }} />
      <WatchPlayer item={playing} onClose={() => setPlaying(null)} />
      <footer className="px-4 md:px-14 pt-8 text-gray-500 text-sm">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">Questions? Contact us.</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="#" className="hover:underline">FAQ</a>
            <a href="#" className="hover:underline">Help Center</a>
            <a href="#" className="hover:underline">Account</a>
            <a href="#" className="hover:underline">Media Centre</a>
            <a href="#" className="hover:underline">Investor Relations</a>
            <a href="#" className="hover:underline">Jobs</a>
            <a href="#" className="hover:underline">Ways to Watch</a>
            <a href="#" className="hover:underline">Terms of Use</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Cookie Preferences</a>
            <a href="#" className="hover:underline">Corporate Information</a>
            <a href="#" className="hover:underline">Contact Us</a>
          </div>
          <div className="mt-6 text-xs">Netflix Clone · Built as a demo</div>
        </div>
      </footer>
    </div>
  );
};

export default Browse;
