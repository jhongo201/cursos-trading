import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Mail, Lock, User, Chrome } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/30938848/pexels-photo-30938848.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/50 to-zinc-950/30" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8" data-testid="login-form-container">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <BookOpen className="h-8 w-8 text-zinc-50" strokeWidth={1.5} />
            <span className="text-2xl font-heading font-bold text-zinc-50">Cursos</span>
          </Link>

          <h1 className="text-3xl font-heading font-bold text-zinc-50 mb-2">Iniciar Sesión</h1>
          <p className="text-zinc-600 mb-8">Accede a tu cuenta para continuar aprendiendo</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-zinc-500">O continuar con</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
          >
            <Chrome className="h-5 w-5 mr-2" />
            Google
          </Button>

          <p className="text-center text-zinc-600 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-zinc-50 font-medium hover:underline" data-testid="go-to-register-link">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(email, password, name);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/30938848/pexels-photo-30938848.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/50 to-zinc-950/30" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8" data-testid="register-form-container">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <BookOpen className="h-8 w-8 text-zinc-50" strokeWidth={1.5} />
            <span className="text-2xl font-heading font-bold text-zinc-50">Cursos</span>
          </Link>

          <h1 className="text-3xl font-heading font-bold text-zinc-50 mb-2">Crear Cuenta</h1>
          <p className="text-zinc-600 mb-8">Comienza tu viaje de aprendizaje hoy</p>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <Label htmlFor="name">Nombre Completo</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="register-name-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="register-email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-zinc-500">O continuar con</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            data-testid="google-register-btn"
          >
            <Chrome className="h-5 w-5 mr-2" />
            Google
          </Button>

          <p className="text-center text-zinc-600 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-zinc-50 font-medium hover:underline" data-testid="go-to-login-link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};