import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../App';

const AuthCallback = () => {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      let token = null;

      const tokenFromHash = hash.match(/[#&]token=([^&]+)/);
      const tokenFromQuery = search.match(/[?&]token=([^&]+)/);
      if (tokenFromHash) token = decodeURIComponent(tokenFromHash[1]);
      else if (tokenFromQuery) token = decodeURIComponent(tokenFromQuery[1]);

      if (token) {
        try {
          localStorage.setItem('token', token);
          setToken(token);
          const response = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          setUser(response.data);
          window.dispatchEvent(new Event('swp-login'));
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/dashboard', { replace: true });
          return;
        } catch (err) {
          console.error('Auth callback error:', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }

      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      if (sessionIdMatch) {
        try {
          const response = await api.post('/auth/session', { session_id: sessionIdMatch[1] }, { withCredentials: true });
          setUser(response.data);
          window.dispatchEvent(new Event('swp-login'));
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/dashboard', { replace: true });
          return;
        } catch (error) {
          console.error('Auth callback error:', error);
        }
      }

      const error = new URLSearchParams(search).get('error') || new URLSearchParams(hash.slice(1)).get('error');
      navigate('/login' + (error ? `?error=${encodeURIComponent(error)}` : ''), { replace: true });
    };

    processAuth();
  }, [navigate, setToken, setUser]);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
