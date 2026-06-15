import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ChevronLeft, Video } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminLessonsPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    video_type: 'external',
    content: '',
    order: 1,
    duration: 0
  });

  useEffect(() => {
    fetchCourseAndLessons();
  }, [courseId]);

  const fetchCourseAndLessons = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [courseRes, lessonsRes] = await Promise.all([
        axios.get(`${API}/courses/${courseId}`, { headers }),
        axios.get(`${API}/courses/${courseId}/lessons`, { headers })
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data);
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
      const headers = { Authorization: `Bearer ${token}` };

      if (editingLesson) {
        await axios.put(
          `${API}/lessons/${editingLesson.lesson_id}`,
          formData,
          { headers }
        );
        toast.success('Lección actualizada');
      } else {
        await axios.post(
          `${API}/courses/${courseId}/lessons`,
          formData,
          { headers }
        );
        toast.success('Lección creada');
      }

      setDialogOpen(false);
      setEditingLesson(null);
      setFormData({
        title: '',
        video_url: '',
        video_type: 'external',
        content: '',
        order: lessons.length + 1,
        duration: 0
      });
      fetchCourseAndLessons();
    } catch (error) {
      console.error('Lesson save error:', error);
      toast.error('Error al guardar lección');
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      video_url: lesson.video_url,
      video_type: lesson.video_type,
      content: lesson.content,
      order: lesson.order,
      duration: lesson.duration || 0
    });
    setDialogOpen(true);
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta lección?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lección eliminada');
      fetchCourseAndLessons();
    } catch (error) {
      console.error('Lesson delete error:', error);
      toast.error('Error al eliminar lección');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingLesson(null);
    setFormData({
      title: '',
      video_url: '',
      video_type: 'external',
      content: '',
      order: lessons.length + 1,
      duration: 0
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="admin-lessons-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <Link
            to="/admin/courses"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-50 mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a cursos
          </Link>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50 mb-2">
                Lecciones de {course?.title}
              </h1>
              <p className="text-zinc-600">{lessons.length} lecciones</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-lesson-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Lección
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLesson ? 'Editar Lección' : 'Crear Nueva Lección'}
                  </DialogTitle>
                  <DialogDescription>
                    Completa los detalles de la lección
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título de la Lección</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      data-testid="lesson-title-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_type">Tipo de Video</Label>
                    <Select
                      value={formData.video_type}
                      onValueChange={(value) => setFormData({ ...formData, video_type: value })}
                    >
                      <SelectTrigger data-testid="video-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external">Enlace Externo (YouTube/Vimeo)</SelectItem>
                        <SelectItem value="upload">Subir Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="video_url">URL del Video</Label>
                    <Input
                      id="video_url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                      data-testid="video-url-input"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Pega el enlace completo de YouTube o Vimeo
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="content">Contenido de la Lección</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      rows={6}
                      data-testid="lesson-content-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="order">Orden</Label>
                      <Input
                        id="order"
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                        required
                        min="1"
                        data-testid="lesson-order-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duración (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                        min="0"
                        data-testid="lesson-duration-input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="save-lesson-btn">
                      {editingLesson ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {lessons.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <Video className="h-12 w-12 text-zinc-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-heading font-semibold text-zinc-50 mb-2">
                No hay lecciones creadas
              </h3>
              <p className="text-zinc-600">Agrega tu primera lección para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.lesson_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex items-center gap-4"
                  data-testid={`admin-lesson-${lesson.lesson_id}`}
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-heading font-bold text-zinc-50">{lesson.order}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-heading font-semibold text-zinc-50 mb-1">
                      {lesson.title}
                    </h3>
                    <p className="text-sm text-zinc-600 line-clamp-1">{lesson.content}</p>
                    {lesson.duration > 0 && (
                      <p className="text-xs text-zinc-500 mt-1">{lesson.duration} minutos</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(lesson)}
                      data-testid={`edit-lesson-${lesson.lesson_id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(lesson.lesson_id)}
                      data-testid={`delete-lesson-${lesson.lesson_id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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