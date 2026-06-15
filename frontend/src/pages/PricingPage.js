import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PricingPage = () => {
  const [loading, setLoading] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const plans = [
    {
      id: 'monthly',
      name: 'Plan Mensual',
      price: '$29.99',
      interval: '/mes',
      features: [
        'Acceso a todos los cursos',
        'Certificados de finalización',
        'Soporte prioritario',
        'Contenido actualizado'
      ]
    },
    {
      id: 'annual',
      name: 'Plan Anual',
      price: '$299.99',
      interval: '/año',
      badge: 'Ahorra 2 meses',
      features: [
        'Acceso a todos los cursos',
        'Certificados de finalización',
        'Soporte prioritario',
        'Contenido actualizado',
        'Ahorra $60 al año'
      ]
    }
  ];

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.error('Debes iniciar sesión primero');
      navigate('/login');
      return;
    }

    setLoading(planId);

    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;

      const response = await axios.post(
        `${API}/subscriptions/checkout`,
        { plan_id: planId, origin_url: originUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Error al procesar el pago');
      setLoading('');
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="pricing-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50 mb-4">
              Elige tu Plan
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Selecciona el plan que mejor se adapte a tus necesidades de aprendizaje
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-700 transition-all duration-200 relative"
                data-testid={`plan-${plan.id}`}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-2xl font-heading font-bold text-zinc-50 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-heading font-bold text-zinc-50">{plan.price}</span>
                  <span className="text-zinc-600">{plan.interval}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-zinc-600">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className="w-full"
                  data-testid={`subscribe-${plan.id}-btn`}
                >
                  {loading === plan.id ? 'Procesando...' : 'Suscribirse'}
                </Button>
              </div>
            ))}
          </div>

          {user?.subscription_status === 'active' && (
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg">
                <Check className="h-5 w-5" />
                Ya tienes una suscripción activa
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};