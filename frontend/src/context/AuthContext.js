import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nf_token'));
  const [loading, setLoading] = useState(true);
  const [myList, setMyList] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        setUser(data);
        await refreshList(token);
      } catch (e) {
        localStorage.removeItem('nf_token');
        setToken(null);
      } finally { setLoading(false); }
    };
    load();
  }, [token]);

  const refreshList = async (t = token) => {
    if (!t) return;
    try {
      const { data } = await axios.get(`${API}/mylist`, { headers: { Authorization: `Bearer ${t}` } });
      setMyList(data);
    } catch (e) { /* noop */ }
  };

  const signup = async (email, password, name) => {
    const { data } = await axios.post(`${API}/auth/signup`, { email, password, name });
    localStorage.setItem('nf_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('nf_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await refreshList(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('nf_token');
    setToken(null);
    setUser(null);
    setMyList([]);
  };

  const addToList = async (item) => {
    if (!token) return;
    const payload = {
      tmdb_id: item.id,
      media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
      title: item.title || item.name,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview,
      vote_average: item.vote_average
    };
    try {
      await axios.post(`${API}/mylist`, payload, { headers: { Authorization: `Bearer ${token}` } });
      await refreshList();
    } catch (e) { /* noop */ }
  };

  const removeFromList = async (tmdbId) => {
    if (!token) return;
    try {
      await axios.delete(`${API}/mylist/${tmdbId}`, { headers: { Authorization: `Bearer ${token}` } });
      await refreshList();
    } catch (e) { /* noop */ }
  };

  const inList = (id) => myList.some(m => m.tmdb_id === id);

  return (
    <AuthCtx.Provider value={{ user, token, loading, signup, login, logout, myList, addToList, removeFromList, inList, refreshList }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
