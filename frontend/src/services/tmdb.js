import axios from 'axios';

const API_KEY = '9e43f45f94705cc8e1d5a0400d19a7b7';
const BASE = 'https://api.themoviedb.org/3';

export const IMG = (path, size = 'original') => path ? `https://image.tmdb.org/t/p/${size}${path}` : '';

const client = axios.create({ baseURL: BASE, params: { api_key: API_KEY, language: 'en-US' } });

export const tmdb = {
  trending: (window = 'day') => client.get(`/trending/all/${window}`).then(r => r.data.results),
  netflixOriginals: () => client.get('/discover/tv', { params: { with_networks: 213 } }).then(r => r.data.results),
  topRated: () => client.get('/movie/top_rated').then(r => r.data.results),
  actionMovies: () => client.get('/discover/movie', { params: { with_genres: 28 } }).then(r => r.data.results),
  comedyMovies: () => client.get('/discover/movie', { params: { with_genres: 35 } }).then(r => r.data.results),
  horrorMovies: () => client.get('/discover/movie', { params: { with_genres: 27 } }).then(r => r.data.results),
  romanceMovies: () => client.get('/discover/movie', { params: { with_genres: 10749 } }).then(r => r.data.results),
  documentaries: () => client.get('/discover/movie', { params: { with_genres: 99 } }).then(r => r.data.results),
  scifi: () => client.get('/discover/movie', { params: { with_genres: 878 } }).then(r => r.data.results),
  animation: () => client.get('/discover/movie', { params: { with_genres: 16 } }).then(r => r.data.results),
  popularTv: () => client.get('/tv/popular').then(r => r.data.results),
  popularMovies: () => client.get('/movie/popular').then(r => r.data.results),
  nowPlayingMovies: () => client.get('/movie/now_playing').then(r => r.data.results),
  upcomingMovies: () => client.get('/movie/upcoming').then(r => r.data.results),
  onTheAirTv: () => client.get('/tv/on_the_air').then(r => r.data.results),
  airingTodayTv: () => client.get('/tv/airing_today').then(r => r.data.results),
  topRatedTv: () => client.get('/tv/top_rated').then(r => r.data.results),
  actionTv: () => client.get('/discover/tv', { params: { with_genres: 10759 } }).then(r => r.data.results),
  comedyTv: () => client.get('/discover/tv', { params: { with_genres: 35 } }).then(r => r.data.results),
  crimeTv: () => client.get('/discover/tv', { params: { with_genres: 80 } }).then(r => r.data.results),
  scifiTv: () => client.get('/discover/tv', { params: { with_genres: 10765 } }).then(r => r.data.results),
  kidsTv: () => client.get('/discover/tv', { params: { with_genres: 10762 } }).then(r => r.data.results),
  search: (q) => q ? client.get('/search/multi', { params: { query: q, include_adult: false } }).then(r => r.data.results.filter(x => x.media_type !== 'person')) : Promise.resolve([]),
  details: (id, type = 'movie') => client.get(`/${type}/${id}`, { params: { append_to_response: 'videos,credits,similar' } }).then(r => r.data),
  trailerKey: async (id, type = 'movie') => {
    try {
      const { data } = await client.get(`/${type}/${id}/videos`);
      const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || data.results.find(v => v.site === 'YouTube');
      return trailer ? trailer.key : null;
    } catch { return null; }
  },
  // Free/ads-supported watch options, region-keyed (e.g. results.US.free / results.US.ads / results.US.link)
  watchProviders: async (id, type = 'movie') => {
    try {
      const { data } = await client.get(`/${type}/${id}/watch/providers`);
      return data.results || {};
    } catch { return {}; }
  }
};

// Default "Home" mix — a bit of everything
export const rowConfig = [
  { key: 'trending', title: 'Trending Now', fetch: () => tmdb.trending() },
  { key: 'originals', title: 'Netflix Originals', fetch: () => tmdb.netflixOriginals(), large: true },
  { key: 'topRated', title: 'Top Rated', fetch: () => tmdb.topRated() },
  { key: 'action', title: 'Action Movies', fetch: () => tmdb.actionMovies() },
  { key: 'comedy', title: 'Comedy Movies', fetch: () => tmdb.comedyMovies() },
  { key: 'horror', title: 'Horror Movies', fetch: () => tmdb.horrorMovies() },
  { key: 'romance', title: 'Romance', fetch: () => tmdb.romanceMovies() },
  { key: 'scifi', title: 'Sci-Fi', fetch: () => tmdb.scifi() },
  { key: 'animation', title: 'Animation', fetch: () => tmdb.animation() },
  { key: 'docs', title: 'Documentaries', fetch: () => tmdb.documentaries() },
];

// "TV Shows" nav tab — TV-only rows
export const rowConfigTv = [
  { key: 'tv-popular', title: 'Popular TV Shows', fetch: () => tmdb.popularTv() },
  { key: 'tv-originals', title: 'Netflix Originals', fetch: () => tmdb.netflixOriginals(), large: true },
  { key: 'tv-airing', title: 'On The Air', fetch: () => tmdb.onTheAirTv() },
  { key: 'tv-today', title: 'Airing Today', fetch: () => tmdb.airingTodayTv() },
  { key: 'tv-top', title: 'Top Rated TV', fetch: () => tmdb.topRatedTv() },
  { key: 'tv-action', title: 'Action & Adventure', fetch: () => tmdb.actionTv() },
  { key: 'tv-comedy', title: 'TV Comedies', fetch: () => tmdb.comedyTv() },
  { key: 'tv-crime', title: 'Crime TV', fetch: () => tmdb.crimeTv() },
  { key: 'tv-scifi', title: 'Sci-Fi & Fantasy', fetch: () => tmdb.scifiTv() },
  { key: 'tv-kids', title: 'Kids TV', fetch: () => tmdb.kidsTv() },
];

// "Movies" nav tab — Movie-only rows
export const rowConfigMovies = [
  { key: 'mv-popular', title: 'Popular Movies', fetch: () => tmdb.popularMovies() },
  { key: 'mv-now', title: 'Now Playing', fetch: () => tmdb.nowPlayingMovies() },
  { key: 'mv-top', title: 'Top Rated', fetch: () => tmdb.topRated() },
  { key: 'mv-action', title: 'Action Movies', fetch: () => tmdb.actionMovies() },
  { key: 'mv-comedy', title: 'Comedy Movies', fetch: () => tmdb.comedyMovies() },
  { key: 'mv-horror', title: 'Horror Movies', fetch: () => tmdb.horrorMovies() },
  { key: 'mv-romance', title: 'Romance', fetch: () => tmdb.romanceMovies() },
  { key: 'mv-scifi', title: 'Sci-Fi', fetch: () => tmdb.scifi() },
  { key: 'mv-animation', title: 'Animation', fetch: () => tmdb.animation() },
  { key: 'mv-docs', title: 'Documentaries', fetch: () => tmdb.documentaries() },
  { key: 'mv-upcoming', title: 'Coming Soon', fetch: () => tmdb.upcomingMovies() },
];

// "New & Popular" nav tab — freshest / trending across movies & TV
export const rowConfigNew = [
  { key: 'new-trending', title: 'Trending Now', fetch: () => tmdb.trending(), large: true },
  { key: 'new-now', title: 'New Movies', fetch: () => tmdb.nowPlayingMovies() },
  { key: 'new-upcoming', title: 'Coming Soon', fetch: () => tmdb.upcomingMovies() },
  { key: 'new-tv-today', title: 'Airing Today', fetch: () => tmdb.airingTodayTv() },
  { key: 'new-tv-air', title: 'New TV Episodes', fetch: () => tmdb.onTheAirTv() },
  { key: 'new-tv-popular', title: 'Popular TV Shows', fetch: () => tmdb.popularTv() },
  { key: 'new-mv-popular', title: 'Popular Movies', fetch: () => tmdb.popularMovies() },
];

export const rowConfigByCategory = {
  home: rowConfig,
  tv: rowConfigTv,
  movies: rowConfigMovies,
  new: rowConfigNew,
};
