import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Trophy, Award, Star, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconOptions = [
  { value: '🏆', label: 'Trofeo' },
  { value: '⭐', label: 'Estrella' },
  { value: '🎯', label: 'Diana' },
  { value: '🔥', label: 'Fuego' },
  { value: '💎', label: 'Diamante' },
  { value: '👑', label: 'Corona' },
  { value: '🎓', label: 'Graduación' },
  { value: '🚀', label: 'Cohete' }
];

export const AdminAchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏆',
    condition_type: 'courses_completed',
    condition_value: 1
  });

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/achievements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAchievements(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Error al cargar logros');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (achievement = null) => {
    if (achievement) {
      setEditingAchievement(achievement);
      setFormData({
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        condition_type: achievement.condition_type,
        condition_value: achievement.condition_value
      });
    } else {
      setEditingAchievement(null);
      setFormData({
        name: '',
        description: '',
        icon: '🏆',
        condition_type: 'courses_completed',
        condition_value: 1
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        condition_type: formData.condition_type,
        condition_value: parseInt(formData.condition_value)
      };

      if (editingAchievement) {
        await axios.put(`${API}/achievements/${editingAchievement.achievement_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Logro actualizado exitosamente');
      } else {
        await axios.post(`${API}/achievements`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Logro creado exitosamente');
      }

      setDialogOpen(false);
      setEditingAchievement(null);
      fetchAchievements();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Error al guardar logro');
    }
  };

  const handleDelete = async (achievementId) => {
    if (!window.confirm('¿Estás seguro de eliminar este logro?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/achievements/${achievementId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Logro eliminado exitosamente');
      fetchAchievements();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar logro');
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="admin-achievements-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50">
              Gestionar Logros y Badges
            </h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} data-testid="create-achievement-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Logro
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                  <DialogTitle className="text-zinc-50">
                    {editingAchievement ? 'Editar Logro' : 'Crear Nuevo Logro'}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Define el logro que los estudiantes pueden desbloquear
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre del Logro</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      required
                      data-testid="achievement-name-input"
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
                      data-testid="achievement-description-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">Icono</Label>
                    <Select
                      value={formData.icon}
                      onValueChange={(value) => setFormData({ ...formData, icon: value })}
                      required
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="icon-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            <span className="flex items-center gap-2">
                              <span className="text-2xl">{icon.value}</span>
                              <span>{icon.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="condition_type">Tipo de Condición</Label>
                      <Select
                        value={formData.condition_type}
                        onValueChange={(value) => setFormData({ ...formData, condition_type: value })}
                        required
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="condition-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                          <SelectItem value="courses_completed">Cursos Completados</SelectItem>
                          <SelectItem value="lessons_completed">Lecciones Completadas</SelectItem>
                          <SelectItem value="certificates_earned">Certificados Obtenidos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="condition_value">Cantidad Requerida</Label>
                      <Input
                        id="condition_value"
                        type="number"
                        value={formData.condition_value}
                        onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        required
                        min="1"
                        data-testid="condition-value-input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="save-achievement-btn">
                      {editingAchievement ? 'Actualizar' : 'Crear'} Logro
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {achievements.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                No hay logros configurados
              </h3>
              <p className="text-zinc-500">Crea el primer logro para gamificación</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <div
                  key={achievement.achievement_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:-translate-y-1 hover:border-zinc-700 transition-all duration-200"
                  data-testid={`achievement-${achievement.achievement_id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDialog(achievement)}
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                        data-testid={`edit-achievement-${achievement.achievement_id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(achievement.achievement_id)}
                        className="h-8 w-8 text-zinc-400 hover:text-red-500"
                        data-testid={`delete-achievement-${achievement.achievement_id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-zinc-50 mb-2">
                    {achievement.name}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">{achievement.description}</p>
                  <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full">
                    <Target className="h-3 w-3" />
                    <span>
                      {achievement.condition_value} {achievement.condition_type.replace('_', ' ')}
                    </span>
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
