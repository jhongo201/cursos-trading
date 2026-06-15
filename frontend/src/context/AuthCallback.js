import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        localStorage.setItem('token', response.data.token);
        await checkAuth();
        navigate('/dashboard', { state: { user: response.data.user }, replace: true });
      } catch (error) {
        console.error('Session error:', error);
        navigate('/login');
      }
    };

    processSession();
  }, [location.hash, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-950 mx-auto mb-4"></div>
        <p className="text-zinc-600">Procesando autenticación...</p>
      </div>
    </div>
  );
};