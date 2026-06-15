import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Users, DollarSign, BookOpen, TrendingUp, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="analytics-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-amber-500 mb-8">
            Panel de Análisis
          </h1>

          {analytics && (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-zinc-900 border-zinc-800 p-6" data-testid="stat-users">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-amber-500/10 rounded-lg p-2">
                      <Users className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Usuarios</span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-zinc-50">{analytics.total_users}</p>
                  <p className="text-sm text-zinc-500 mt-1">{analytics.active_subscriptions} activos</p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6" data-testid="stat-revenue">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-emerald-500/10 rounded-lg p-2">
                      <DollarSign className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Ingresos</span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-zinc-50">${analytics.total_revenue}</p>
                  <p className="text-sm text-zinc-500 mt-1">Total acumulado</p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6" data-testid="stat-courses">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-500/10 rounded-lg p-2">
                      <BookOpen className="h-5 w-5 text-blue-500" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Cursos</span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-zinc-50">{analytics.total_courses}</p>
                  <p className="text-sm text-zinc-500 mt-1">{analytics.total_lessons} lecciones</p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6" data-testid="stat-conversion">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-500/10 rounded-lg p-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Conversión</span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-zinc-50">{analytics.conversion_rate}%</p>
                  <p className="text-sm text-zinc-500 mt-1">Tasa de conversión</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h2 className="text-xl font-heading font-semibold text-zinc-50 mb-4">Distribución de Ingresos</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-400">Plan Mensual</span>
                        <span className="text-zinc-50 font-medium">${analytics.monthly_revenue}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500" 
                          style={{ width: `${(analytics.monthly_revenue / analytics.total_revenue * 100) || 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-400">Plan Anual</span>
                        <span className="text-zinc-50 font-medium">${analytics.annual_revenue}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(analytics.annual_revenue / analytics.total_revenue * 100) || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h2 className="text-xl font-heading font-semibold text-zinc-50 mb-4">Usuarios Recientes</h2>
                  <div className="space-y-3">
                    {analytics.recent_users.map((user, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-semibold">
                          {user.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-50 truncate">{user.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                        {user.subscription_status === 'active' && (
                          <Award className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};