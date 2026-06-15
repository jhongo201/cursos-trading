import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }
    checkPaymentStatus();
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    const maxAttempts = 5;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/subscriptions/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        toast.success('¡Pago exitoso! Tu suscripción está activa');
      } else if (attempts < maxAttempts) {
        setTimeout(() => {
          setAttempts(attempts + 1);
          checkPaymentStatus();
        }, 2000);
      } else {
        setStatus('pending');
      }
    } catch (error) {
      console.error('Payment status error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-lg p-8 text-center">
          {status === 'checking' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-zinc-950 mx-auto mb-6"></div>
              <h2 className="text-2xl font-heading font-bold text-zinc-950 mb-2">Verificando pago...</h2>
              <p className="text-zinc-600">Por favor espera mientras confirmamos tu pago</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-6" strokeWidth={1.5} />
              <h2 className="text-2xl font-heading font-bold text-zinc-950 mb-2">¡Pago Exitoso!</h2>
              <p className="text-zinc-600 mb-6">Tu suscripción ha sido activada. Ya puedes acceder a todos los cursos.</p>
              <Button onClick={() => navigate('/dashboard')} data-testid="go-to-dashboard-btn">
                Ir al Dashboard
              </Button>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⏳</span>
              </div>
              <h2 className="text-2xl font-heading font-bold text-zinc-950 mb-2">Pago en proceso</h2>
              <p className="text-zinc-600 mb-6">Tu pago está siendo procesado. Recibirás un correo de confirmación.</p>
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Volver al Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" strokeWidth={1.5} />
              <h2 className="text-2xl font-heading font-bold text-zinc-950 mb-2">Error en el pago</h2>
              <p className="text-zinc-600 mb-6">Hubo un problema al procesar tu pago. Por favor inténtalo de nuevo.</p>
              <Button onClick={() => navigate('/pricing')}>
                Volver a Pricing
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};