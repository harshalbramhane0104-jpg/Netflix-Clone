import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, Film, Tv } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tmdb, IMG } from '../services/tmdb';

const NAV_ITEMS = [
  { label: 'Home', path: '/browse' },
  { label: 'TV Shows', path: '/browse?cat=tv' },
  { label: 'Movies', path: '/browse?cat=movies' },
  { label: 'New & Popular', path: '/browse?cat=new' },
  { label: 'My List', path: '/mylist' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the suggestions dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced live suggestions as the user types
  useEffect(() => {
    const term = q.trim();
    if (!term) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(() => {
      tmdb.search(term).then(results => {
        const filtered = results.filter(i => i.backdrop_path || i.poster_path).slice(0, 6);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setActiveIndex(-1);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const goToResult = (item) => {
    const title = item.title || item.name;
    setShowSuggestions(false);
    setQ(title);
    nav(`/search?q=${encodeURIComponent(title)}`);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToResult(suggestions[activeIndex]);
      return;
    }
    setShowSuggestions(false);
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-14 py-3 flex items-center justify-between ${scrolled ? 'nav-scrolled' : 'nav-transparent'}`}>
      <div className="flex items-center gap-8">
        <Link to="/browse" className="brand-font text-3xl md:text-4xl netflix-red font-bold tracking-wider">NETFLIX</Link>
        <ul className="hidden md:flex items-center gap-5 text-sm">
          {NAV_ITEMS.map(item => (
            <li key={item.label}>
              <Link to={item.path} className={`hover:text-gray-300 transition-colors ${loc.pathname + loc.search === item.path ? 'text-white font-semibold' : 'text-gray-200'}`}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-4">
        <div ref={searchRef} className="relative">
          <form onSubmit={submitSearch} className={`flex items-center border transition-all ${searchOpen ? 'border-white bg-black/70 px-2 w-56 md:w-72' : 'border-transparent w-9 justify-center'} h-9 rounded-sm`}>
            <button type="button" onClick={() => setSearchOpen(s => !s)} aria-label="search"><Search className="w-5 h-5" /></button>
            {searchOpen && (
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={onKeyDown}
                placeholder="Titles, people, genres"
                className="bg-transparent outline-none px-2 text-sm flex-1"
              />
            )}
          </form>
          {searchOpen && showSuggestions && (
            <div className="absolute right-0 mt-2 w-72 md:w-80 bg-black/95 border border-neutral-800 rounded shadow-2xl overflow-hidden text-sm">
              {suggestions.map((item, i) => {
                const title = item.title || item.name;
                const path = item.poster_path || item.backdrop_path;
                const year = (item.release_date || item.first_air_date || '').slice(0, 4);
                return (
                  <button
                    key={`${item.media_type}-${item.id}`}
                    type="button"
                    onMouseDown={() => goToResult(item)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${activeIndex === i ? 'bg-neutral-800' : 'hover:bg-neutral-800'}`}
                  >
                    {path ? (
                      <img src={IMG(path, 'w92')} alt={title} className="w-9 h-12 object-cover rounded-sm flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-12 bg-neutral-800 rounded-sm flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{title}</div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        {item.media_type === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                        <span className="capitalize">{item.media_type}</span>
                        {year && <span>· {year}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button aria-label="notifications" className="hidden md:block"><Bell className="w-5 h-5" /></button>
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold uppercase">{user?.name?.[0] || 'U'}</div>
            <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-black/95 border border-neutral-800 rounded shadow-2xl py-2 text-sm">
              <div className="px-4 py-2 border-b border-neutral-800">
                <div className="font-semibold">{user?.name}</div>
                <div className="text-gray-400 text-xs truncate">{user?.email}</div>
              </div>
              <button onClick={() => { setMenuOpen(false); nav('/account'); }} className="w-full text-left px-4 py-2 hover:bg-neutral-800 flex items-center gap-2"><User className="w-4 h-4" /> Account</button>
              <button onClick={() => { setMenuOpen(false); nav('/mylist'); }} className="w-full text-left px-4 py-2 hover:bg-neutral-800">My List</button>
              <div className="border-t border-neutral-800 my-1" />
              <button onClick={() => { logout(); nav('/'); }} className="w-full text-left px-4 py-2 hover:bg-neutral-800 flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign out of Netflix</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
