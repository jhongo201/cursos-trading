import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Trophy, Award, Star, Sun, Share2, Lock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Trophy: Trophy,
  Award: Award,
  Star: Star,
  Sun: Sun,
  Share2: Share2
};

export const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [allRes, userRes] = await Promise.all([
        axios.get(`${API}/achievements`, { headers }),
        axios.get(`${API}/achievements/user`, { headers })
      ]);

      setAchievements(allRes.data);
      setUserAchievements(userRes.data);
    } catch (error) {
      console.error('Achievements fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasEarned = (achievementId) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getEarnedDate = (achievementId) => {
    const ua = userAchievements.find(ua => ua.achievement_id === achievementId);
    return ua ? new Date(ua.earned_at).toLocaleDateString('es-ES') : null;
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="achievements-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-amber-500 mb-2">
            Logros y Badges
          </h1>
          <p className="text-zinc-400 mb-8">
            Completa desafíos y desbloquea logros especiales
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => {
              const earned = hasEarned(achievement.achievement_id);
              const Icon = iconMap[achievement.icon] || Trophy;
              
              return (
                <div
                  key={achievement.achievement_id}
                  className={`relative bg-zinc-900 border rounded-lg p-6 transition-all ${
                    earned
                      ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'border-zinc-800 opacity-60'
                  }`}
                  data-testid={`achievement-${achievement.achievement_id}`}
                >
                  {!earned && (
                    <div className="absolute top-3 right-3">
                      <Lock className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                  
                  <div className={`inline-flex p-3 rounded-lg mb-4 ${
                    earned ? 'bg-amber-500/10' : 'bg-zinc-800'
                  }`}>
                    <Icon className={`h-8 w-8 ${
                      earned ? 'text-amber-500' : 'text-zinc-600'
                    }`} strokeWidth={1.5} />
                  </div>
                  
                  <h3 className={`text-xl font-heading font-semibold mb-2 ${
                    earned ? 'text-zinc-50' : 'text-zinc-500'
                  }`}>
                    {achievement.name}
                  </h3>
                  
                  <p className={`text-sm mb-3 ${
                    earned ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {achievement.description}
                  </p>
                  
                  {earned ? (
                    <div className="text-xs text-amber-500 font-medium">
                      Desbloqueado el {getEarnedDate(achievement.achievement_id)}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-600">
                      {achievement.condition_type === 'courses_completed' && 
                        `Completa ${achievement.condition_value} curso${achievement.condition_value > 1 ? 's' : ''}`}
                      {achievement.condition_type === 'live_sessions' && 
                        `Asiste a ${achievement.condition_value} sesión${achievement.condition_value > 1 ? 'es' : ''} en vivo`}
                      {achievement.condition_type === 'shares' && 
                        `Comparte ${achievement.condition_value} certificado${achievement.condition_value > 1 ? 's' : ''}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {userAchievements.length > 0 && (
            <div className="mt-12 text-center">
              <p className="text-zinc-400">
                Has desbloqueado <span className="text-amber-500 font-bold text-2xl">{userAchievements.length}</span> de <span className="font-bold">{achievements.length}</span> logros
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};