import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Home, GraduationCap, Award, CreditCard, LogOut, Settings, Plus, TrendingUp, Video, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/courses', icon: GraduationCap, label: 'Cursos', testId: 'nav-courses' },
    { path: '/live-sessions', icon: Video, label: 'Sesiones en Vivo', testId: 'nav-live-sessions' },
    { path: '/achievements', icon: Trophy, label: 'Logros', testId: 'nav-achievements' },
    { path: '/certificates', icon: Award, label: 'Certificados', testId: 'nav-certificates' },
    { path: '/pricing', icon: CreditCard, label: 'Planes', testId: 'nav-pricing' },
  ];

  const adminNavItems = [
    { path: '/admin/courses', icon: Settings, label: 'Gestionar Cursos', testId: 'nav-admin-courses' },
    { path: '/admin/live-sessions', icon: Video, label: 'Gestionar Sesiones', testId: 'nav-admin-sessions' },
    { path: '/admin/plans', icon: CreditCard, label: 'Gestionar Planes', testId: 'nav-admin-plans' },
    { path: '/admin/achievements', icon: Trophy, label: 'Gestionar Logros', testId: 'nav-admin-achievements' },
    { path: '/admin/analytics', icon: TrendingUp, label: 'Análisis', testId: 'nav-admin-analytics' },
  ];

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen" data-testid="sidebar">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
            <span className="text-2xl font-heading font-bold text-zinc-50">Cursos</span>
          </Link>
          {user && <NotificationBell />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-500 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
                data-testid={item.testId}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <>
              <div className="h-px bg-zinc-800 my-4" />
              <div className="px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Admin</span>
              </div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-500 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                    }`}
                    data-testid={item.testId}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-zinc-800">
        {user && (
          <div className="mb-4 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-semibold">
                  {user.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-50 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            {user.subscription_status === 'active' ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                Suscripción activa
              </div>
            ) : (
              <Link to="/pricing">
                <div className="text-xs text-zinc-400 hover:text-zinc-100">
                  Sin suscripción activa
                </div>
              </Link>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut className="h-5 w-5 mr-3" strokeWidth={1.5} />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};