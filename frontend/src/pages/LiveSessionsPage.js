import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Clock, Users, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return 'Disponible ahora';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Disponible en ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `Disponible en ${hours}h ${minutes}m`;
  }
  return `Disponible en ${minutes}m`;
};

export const LiveSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState(new Set());
  const [registeringSession, setRegisteringSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [sessionsRes, regsRes] = await Promise.all([
        axios.get(`${API}/live-sessions?status=scheduled`),
        axios.get(`${API}/live-sessions/my-registrations`, { headers })
      ]);
      
      setSessions(sessionsRes.data);
      
      // Create a Set of session IDs the user is registered for
      const regSet = new Set(regsRes.data.map(reg => reg.session_id));
      setRegistrations(regSet);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (sessionId) => {
    setRegisteringSession(sessionId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/live-sessions/${sessionId}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('¡Registrado exitosamente! Recibirás una notificación antes de la sesión.');
      
      // Add to registrations set
      setRegistrations(prev => new Set([...prev, sessionId]));
      
      // Refresh data to get updated attendee count
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
    } finally {
      setRegisteringSession(null);
    }
  };

  const handleJoinSession = (meetingUrl) => {
    if (meetingUrl) {
      window.open(meetingUrl, '_blank');
    } else {
      toast.error('El enlace de la sesión no está disponible aún');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0A0A0A]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="live-sessions-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50 mb-2">
            Sesiones en Vivo
          </h1>
          <p className="text-zinc-400 mb-8">
            Participa en clases en vivo con instructores expertos
          </p>

          {sessions.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <Video className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                No hay sesiones programadas
              </h3>
              <p className="text-zinc-500">Vuelve pronto para nuevas sesiones en vivo</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-amber-500/50 transition-all"
                  data-testid={`session-${session.session_id}`}
                >
                  <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-6 border-b border-zinc-800">
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-sm font-medium mb-3">
                      <Video className="h-4 w-4" />
                      En Vivo
                    </div>
                    <h3 className="text-xl font-heading font-semibold text-zinc-50 mb-2">
                      {session.title}
                    </h3>
                    <p className="text-sm text-zinc-400">{session.course_title}</p>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-zinc-300 mb-4 line-clamp-2">
                      {session.description}
                    </p>
                    
                    <div className="space-y-2 mb-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.scheduled_at).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {new Date(session.scheduled_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {session.duration} min
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {session.current_attendees}/{session.max_attendees} registrados
                      </div>
                    </div>
                    
                    <div className="text-sm text-zinc-500 mb-4">
                      Con: {session.instructor_name}
                    </div>
                    
                    {registrations.has(session.session_id) ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">Ya estás registrado</span>
                        </div>
                        
                        {session.meeting_url_available ? (
                          <Button
                            onClick={() => handleJoinSession(session.meeting_url)}
                            variant="default"
                            className="w-full"
                            disabled={!session.meeting_url}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Unirse a la Sesión
                            {session.meeting_type === 'jitsi' && (
                              <span className="ml-2 text-xs opacity-75">(Jitsi)</span>
                            )}
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              className="w-full cursor-not-allowed opacity-60"
                              disabled
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Enlace no disponible aún
                            </Button>
                            <p className="text-xs text-center text-zinc-500">
                              {formatTimeRemaining(session.time_until_available)}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleRegister(session.session_id)}
                        className="w-full"
                        disabled={session.current_attendees >= session.max_attendees || registeringSession === session.session_id}
                        data-testid={`register-${session.session_id}`}
                      >
                        {registeringSession === session.session_id
                          ? 'Registrando...'
                          : session.current_attendees >= session.max_attendees
                          ? 'Sesión Llena'
                          : 'Registrarse Ahora'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};