import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Video, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminLiveSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    scheduled_at: '',
    duration: 60,
    max_attendees: 100
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [sessionsRes, coursesRes] = await Promise.all([
        axios.get(`${API}/live-sessions`, { headers }),
        axios.get(`${API}/courses`, { headers })
      ]);
      setSessions(sessionsRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/live-sessions`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sesión creada exitosamente');
      setDialogOpen(false);
      setFormData({ course_id: '', title: '', description: '', scheduled_at: '', duration: 60, max_attendees: 100 });
      fetchData();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Error al crear sesión');
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="admin-live-sessions-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50">
              Gestionar Sesiones en Vivo
            </h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-session-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Sesión
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                  <DialogTitle className="text-zinc-50">Crear Nueva Sesión en Vivo</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Programa una clase en vivo para tus estudiantes
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="course">Curso</Label>
                    <Select
                      value={formData.course_id}
                      onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                      required
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="course-select">
                        <SelectValue placeholder="Selecciona un curso" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        {courses.map((course) => (
                          <SelectItem key={course.course_id} value={course.course_id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Título de la Sesión</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      required
                      data-testid="session-title-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      required
                      rows={3}
                      data-testid="session-description-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduled_at">Fecha y Hora</Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        required
                        data-testid="session-datetime-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duración (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        required
                        min="15"
                        data-testid="session-duration-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="max_attendees">Capacidad Máxima</Label>
                    <Input
                      id="max_attendees"
                      type="number"
                      value={formData.max_attendees}
                      onChange={(e) => setFormData({ ...formData, max_attendees: parseInt(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      required
                      min="1"
                      data-testid="session-capacity-input"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="save-session-btn">
                      Crear Sesión
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <Video className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                No hay sesiones programadas
              </h3>
              <p className="text-zinc-500">Crea tu primera sesión en vivo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
                  data-testid={`session-${session.session_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-sm font-medium">
                          <Video className="h-4 w-4" />
                          {session.status}
                        </div>
                      </div>
                      <h3 className="text-xl font-heading font-semibold text-zinc-50 mb-2">
                        {session.title}
                      </h3>
                      <p className="text-sm text-zinc-400 mb-3">{session.course_title}</p>
                      <p className="text-zinc-300 mb-4">{session.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.scheduled_at).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                        <div>Duración: {session.duration} min</div>
                        <div>Registrados: {session.current_attendees}/{session.max_attendees}</div>
                      </div>
                      <div className="mt-3 text-xs text-zinc-500 bg-zinc-800 p-2 rounded">
                        Meeting URL: {session.meeting_url}
                      </div>
                    </div>
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