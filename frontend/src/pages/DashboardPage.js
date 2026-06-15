import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { BookOpen, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DashboardPage = () => {
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [coursesRes, certsRes] = await Promise.all([
        axios.get(`${API}/courses`, { headers }),
        axios.get(`${API}/certificates`, { headers })
      ]);

      setCourses(coursesRes.data);
      setCertificates(certsRes.data);

      const progressData = {};
      for (const course of coursesRes.data) {
        try {
          const progRes = await axios.get(`${API}/progress/${course.course_id}`, { headers });
          progressData[course.course_id] = progRes.data;
        } catch (error) {
          console.error('Progress fetch error:', error);
        }
      }
      setProgress(progressData);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrolledCourses = courses.filter(course => 
    progress[course.course_id] && progress[course.course_id].progress_percentage > 0
  );

  const completedCount = enrolledCourses.filter(course => 
    progress[course.course_id]?.progress_percentage >= 100
  ).length;

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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="dashboard-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50 mb-8">
            Mi Panel
          </h1>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6" data-testid="stat-enrolled">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-zinc-900 rounded-lg p-2">
                  <BookOpen className="h-5 w-5 text-zinc-50" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Cursos Activos</span>
              </div>
              <p className="text-3xl font-heading font-bold text-zinc-50">{enrolledCourses.length}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6" data-testid="stat-completed">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-zinc-900 rounded-lg p-2">
                  <Award className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Completados</span>
              </div>
              <p className="text-3xl font-heading font-bold text-zinc-50">{completedCount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6" data-testid="stat-certificates">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-zinc-900 rounded-lg p-2">
                  <Award className="h-5 w-5 text-zinc-50" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Certificados</span>
              </div>
              <p className="text-3xl font-heading font-bold text-zinc-50">{certificates.length}</p>
            </div>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="mb-12">
              <h2 className="text-2xl font-heading font-semibold text-zinc-50 mb-6">Continuar Aprendiendo</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => {
                  const courseProgress = progress[course.course_id];
                  const progressPercent = courseProgress?.progress_percentage || 0;

                  return (
                    <Link
                      key={course.course_id}
                      to={`/courses/${course.course_id}`}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-zinc-700 transition-all duration-200"
                      data-testid={`enrolled-course-${course.course_id}`}
                    >
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-6">
                        <h3 className="text-lg font-heading font-semibold text-zinc-50 mb-2">{course.title}</h3>
                        <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{course.description}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-600">Progreso</span>
                            <span className="font-medium text-zinc-50">{Math.round(progressPercent)}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center mb-12">
              <BookOpen className="h-12 w-12 text-zinc-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-heading font-semibold text-zinc-50 mb-2">No hay cursos activos</h3>
              <p className="text-zinc-600 mb-6">Explora nuestro catálogo y comienza a aprender</p>
              <Link to="/courses">
                <Button data-testid="explore-courses-empty-state">
                  Explorar Cursos
                </Button>
              </Link>
            </div>
          )}

          {certificates.length > 0 && (
            <div>
              <h2 className="text-2xl font-heading font-semibold text-zinc-50 mb-6">Mis Certificados</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert.certificate_id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
                    data-testid={`certificate-${cert.certificate_id}`}
                  >
                    <Award className="h-10 w-10 text-emerald-500 mb-4" strokeWidth={1.5} />
                    <h3 className="text-lg font-heading font-semibold text-zinc-50 mb-1">{cert.course_title}</h3>
                    <p className="text-sm text-zinc-600 mb-2">Por {cert.instructor_name}</p>
                    <p className="text-xs text-zinc-500">
                      Emitido: {new Date(cert.issued_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};