import { Link } from 'react-router-dom';
import { BookOpen, Award, Video, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LandingPage = () => {
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="glass border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-zinc-950" strokeWidth={1.5} />
            <span className="text-2xl font-heading font-bold text-zinc-950">Cursos</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" data-testid="nav-login-btn">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button data-testid="nav-register-btn">
                Registrarse
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32" data-testid="hero-section">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold tracking-tighter leading-none text-zinc-950 mb-6">
            Aprende a tu ritmo con los mejores cursos
          </h1>
          <p className="text-lg text-zinc-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Accede a una plataforma completa de cursos en línea. Aprende nuevas habilidades, obtén certificados y avanza en tu carrera profesional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto" data-testid="hero-cta-btn">
                Comenzar Ahora
              </Button>
            </Link>
            <Link to="/courses">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="explore-courses-btn">
                Explorar Cursos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20" data-testid="features-section">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-8 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300 transition-all duration-200">
            <div className="bg-zinc-50 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-zinc-950" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">Cursos Variados</h3>
            <p className="text-zinc-600">Accede a una amplia biblioteca de cursos en diferentes áreas de conocimiento.</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-8 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300 transition-all duration-200">
            <div className="bg-zinc-50 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Video className="h-6 w-6 text-zinc-950" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">Video Lecciones</h3>
            <p className="text-zinc-600">Aprende con contenido en video de alta calidad y bien estructurado.</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-8 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300 transition-all duration-200">
            <div className="bg-zinc-50 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-zinc-950" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">Seguimiento</h3>
            <p className="text-zinc-600">Rastrea tu progreso y completa los cursos a tu propio ritmo.</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-8 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300 transition-all duration-200">
            <div className="bg-zinc-50 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Award className="h-6 w-6 text-zinc-950" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">Certificados</h3>
            <p className="text-zinc-600">Recibe certificados al completar tus cursos para destacar tus logros.</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20" data-testid="cta-section">
        <div className="bg-zinc-950 rounded-lg p-12 md:p-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            ¿Listo para comenzar tu viaje de aprendizaje?
          </h2>
          <p className="text-zinc-300 text-lg mb-8 max-w-2xl mx-auto">
            Únete a miles de estudiantes que ya están mejorando sus habilidades con nuestra plataforma.
          </p>
          <Link to="/pricing">
            <Button size="lg" className="bg-white text-zinc-950 hover:bg-zinc-100" data-testid="cta-pricing-btn">
              Ver Planes
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-600">
          <p>© 2026 Cursos. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};