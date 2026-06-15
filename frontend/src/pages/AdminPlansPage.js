import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminPlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    interval: 'monthly',
    features: ['']
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/subscriptions/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: plan.price.toString(),
        interval: plan.interval,
        features: plan.features
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        price: '',
        interval: 'monthly',
        features: ['']
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
        price: parseFloat(formData.price),
        interval: formData.interval,
        features: formData.features.filter(f => f.trim() !== '')
      };

      if (editingPlan) {
        await axios.put(`${API}/subscriptions/plans/${editingPlan.plan_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Plan actualizado exitosamente');
      } else {
        await axios.post(`${API}/subscriptions/plans`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Plan creado exitosamente');
      }

      setDialogOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar plan');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('¿Estás seguro de eliminar este plan?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/subscriptions/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Plan eliminado exitosamente');
      fetchPlans();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar plan');
    }
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="admin-plans-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50">
              Gestionar Planes de Suscripción
            </h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} data-testid="create-plan-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-zinc-50">
                    {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Define los detalles del plan de suscripción
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre del Plan</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      required
                      data-testid="plan-name-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Precio (USD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        required
                        min="0"
                        data-testid="plan-price-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interval">Intervalo</Label>
                      <Select
                        value={formData.interval}
                        onValueChange={(value) => setFormData({ ...formData, interval: value })}
                        required
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="interval-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Características</Label>
                    <div className="space-y-2">
                      {formData.features.map((feature, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={feature}
                            onChange={(e) => updateFeature(index, e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            placeholder="Ej: Acceso ilimitado"
                            data-testid={`feature-input-${index}`}
                          />
                          {formData.features.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFeature(index)}
                              className="text-zinc-400 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFeature}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Característica
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="save-plan-btn">
                      {editingPlan ? 'Actualizar' : 'Crear'} Plan
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {plans.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <CreditCard className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                No hay planes configurados
              </h3>
              <p className="text-zinc-500">Crea tu primer plan de suscripción</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.plan_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:-translate-y-1 hover:border-zinc-700 transition-all duration-200"
                  data-testid={`plan-${plan.plan_id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-amber-500" />
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        {plan.interval}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDialog(plan)}
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                        data-testid={`edit-plan-${plan.plan_id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(plan.plan_id)}
                        className="h-8 w-8 text-zinc-400 hover:text-red-500"
                        data-testid={`delete-plan-${plan.plan_id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-zinc-50 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-amber-500">${plan.price}</span>
                    <span className="text-zinc-400 ml-1">USD</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
