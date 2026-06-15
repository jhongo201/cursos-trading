import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Award, Play, CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/courses`);
      setCourses(response.data);
    } catch (error) {
      console.error('Courses fetch error:', error);
      toast.error('Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-950"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]" data-testid="courses-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-950 mb-2">
              Catálogo de Cursos
            </h1>
            <p className="text-zinc-600">Explora nuestra colección de cursos y comienza a aprender</p>
          </div>

          {courses.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center">
              <BookOpen className="h-12 w-12 text-zinc-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">No hay cursos disponibles</h3>
              <p className="text-zinc-600">Próximamente nuevos cursos</p>
            </div>
          ) : (
            <div className="course-grid">
              {courses.map((course) => (
                <Link
                  key={course.course_id}
                  to={`/courses/${course.course_id}`}
                  className="bg-white border border-zinc-200 rounded-lg overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-zinc-300 transition-all duration-200"
                  data-testid={`course-card-${course.course_id}`}
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-lg font-heading font-semibold text-zinc-950 mb-2">{course.title}</h3>
                    <p className="text-sm text-zinc-600 mb-4 line-clamp-3">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Por {course.instructor_name}</span>
                      <span className="text-xs text-zinc-500">{course.lesson_count} lecciones</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CourseDetailPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const courseRes = await axios.get(`${API}/courses/${courseId}`, { headers });
      setCourse(courseRes.data);
      setLessons(courseRes.data.lessons || []);

      try {
        const progressRes = await axios.get(`${API}/progress/${courseId}`, { headers });
        setProgress(progressRes.data);
      } catch (error) {
        console.log('No progress yet');
      }
    } catch (error) {
      console.error('Course fetch error:', error);
      toast.error('Error al cargar el curso');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLesson = (lessonId) => {
    if (user?.subscription_status !== 'active' && user?.role !== 'admin') {
      toast.error('Necesitas una suscripción activa para acceder al contenido');
      navigate('/pricing');
      return;
    }
    navigate(`/courses/${courseId}/lesson/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-950"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600">Curso no encontrado</p>
        </div>
      </div>
    );
  }

  const progressPercent = progress?.progress_percentage || 0;
  const completedLessons = progress?.completed_lessons || [];

  return (
    <div className="flex h-screen bg-[#FAFAFA]" data-testid="course-detail-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <div className="bg-white border border-zinc-200 rounded-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full md:w-64 h-48 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold text-zinc-950 mb-2" data-testid="course-title">
                  {course.title}
                </h1>
                <p className="text-zinc-600 mb-4">{course.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-600 mb-6">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                    {lessons.length} lecciones
                  </span>
                  <span>Por {course.instructor_name}</span>
                </div>
                {progressPercent > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">Progreso del curso</span>
                      <span className="font-medium text-zinc-950">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-8">
            <h2 className="text-2xl font-heading font-semibold text-zinc-950 mb-6">Contenido del Curso</h2>
            {lessons.length === 0 ? (
              <p className="text-zinc-600 text-center py-8">No hay lecciones disponibles aún</p>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const isCompleted = completedLessons.includes(lesson.lesson_id);
                  return (
                    <button
                      key={lesson.lesson_id}
                      onClick={() => handleStartLesson(lesson.lesson_id)}
                      className="w-full flex items-center gap-4 p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 text-left"
                      data-testid={`lesson-item-${lesson.lesson_id}`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
                        ) : (
                          <Circle className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-950 mb-1">
                          {index + 1}. {lesson.title}
                        </h3>
                        {lesson.duration > 0 && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.duration} min
                          </span>
                        )}
                      </div>
                      <Play className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};