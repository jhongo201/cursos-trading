import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: ''
  });
  const navigate = useNavigate();

  const thumbnails = [
    'https://images.pexels.com/photos/7078411/pexels-photo-7078411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/34133564/pexels-photo-34133564.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.unsplash.com/photo-1709626011485-6fe000ea2dbc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMG1pbmltYWx8ZW58MHx8fHwxNzgxNDg3MTIwfDA&ixlib=rb-4.1.0&q=85'
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Courses fetch error:', error);
      toast.error('Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingCourse) {
        await axios.put(
          `${API}/courses/${editingCourse.course_id}`,
          formData,
          { headers }
        );
        toast.success('Curso actualizado');
      } else {
        await axios.post(`${API}/courses`, formData, { headers });
        toast.success('Curso creado');
      }

      setDialogOpen(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', thumbnail: '' });
      fetchCourses();
    } catch (error) {
      console.error('Course save error:', error);
      toast.error('Error al guardar curso');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail
    });
    setDialogOpen(true);
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('¿Estás seguro de eliminar este curso?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Curso eliminado');
      fetchCourses();
    } catch (error) {
      console.error('Course delete error:', error);
      toast.error('Error al eliminar curso');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setFormData({ title: '', description: '', thumbnail: '' });
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="admin-courses-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50">
              Gestionar Cursos
            </h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-course-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}
                  </DialogTitle>
                  <DialogDescription>
                    Completa los detalles del curso
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título del Curso</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      data-testid="course-title-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={4}
                      data-testid="course-description-input"
                    />
                  </div>
                  <div>
                    <Label>Imagen del Curso</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {thumbnails.map((thumb, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, thumbnail: thumb })}
                          className={`border-2 rounded-lg overflow-hidden transition-all ${
                            formData.thumbnail === thumb
                              ? 'border-zinc-950 ring-2 ring-zinc-950'
                              : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-24 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="save-course-btn">
                      {editingCourse ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {courses.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <BookOpen className="h-12 w-12 text-zinc-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-heading font-semibold text-zinc-50 mb-2">
                No hay cursos creados
              </h3>
              <p className="text-zinc-600">Crea tu primer curso para comenzar</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.course_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
                  data-testid={`admin-course-${course.course_id}`}
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-lg font-heading font-semibold text-zinc-50 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-zinc-600 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <p className="text-xs text-zinc-500 mb-4">
                      {course.lesson_count} lecciones
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/courses/${course.course_id}/lessons`)}
                        className="flex-1"
                        data-testid={`manage-lessons-${course.course_id}`}
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Lecciones
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(course)}
                        data-testid={`edit-course-${course.course_id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(course.course_id)}
                        data-testid={`delete-course-${course.course_id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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