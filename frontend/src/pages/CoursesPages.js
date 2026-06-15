import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { SearchFilters } from '@/components/SearchFilters';
import { RatingStars } from '@/components/RatingStars';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Award, Play, CheckCircle2, Circle, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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

  const handleSearch = (filteredCourses) => {
    setCourses(filteredCourses);
  };

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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="courses-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-50 mb-2">
              Catálogo de Cursos
            </h1>
            <p className="text-zinc-600">Explora nuestra colección de cursos y comienza a aprender</p>
          </div>

          <SearchFilters onSearch={handleSearch} />

          {courses.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <BookOpen className="h-12 w-12 text-zinc-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-heading font-semibold text-zinc-50 mb-2">No hay cursos disponibles</h3>
              <p className="text-zinc-600">Próximamente nuevos cursos</p>
            </div>
          ) : (
            <div className="course-grid">
              {courses.map((course) => (
                <Link
                  key={course.course_id}
                  to={`/courses/${course.course_id}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-zinc-700 transition-all duration-200"
                  data-testid={`course-card-${course.course_id}`}
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    {course.category_name && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-500 rounded mb-2">
                        {course.category_name}
                      </span>
                    )}
                    <h3 className="text-lg font-heading font-semibold text-zinc-50 mb-2">{course.title}</h3>
                    <p className="text-sm text-zinc-600 mb-4 line-clamp-3">{course.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-zinc-500">Por {course.instructor_name}</span>
                      <span className="text-xs text-zinc-500">{course.lesson_count} lecciones</span>
                    </div>
                    {course.total_ratings > 0 && (
                      <div className="flex items-center gap-2">
                        <RatingStars rating={course.average_rating} size="small" />
                        <span className="text-sm text-zinc-500">
                          {course.average_rating.toFixed(1)} ({course.total_ratings})
                        </span>
                      </div>
                    )}
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
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);
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

  const handleSubmitRating = async () => {
    if (userRating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/courses/${courseId}/ratings`,
        { rating: userRating, review: userReview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('¡Gracias por tu valoración!');
      setShowRatingForm(false);
      fetchCourseData();
    } catch (error) {
      console.error('Rating error:', error);
      toast.error('Error al enviar valoración');
    }
  };

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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="course-detail-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full md:w-64 h-48 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold text-zinc-50 mb-2" data-testid="course-title">
                  {course.title}
                </h1>
                <p className="text-zinc-600 mb-4">{course.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-600 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                    {lessons.length} lecciones
                  </span>
                  <span>Por {course.instructor_name}</span>
                  {course.category_name && (
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs">
                      {course.category_name}
                    </span>
                  )}
                </div>
                {course.total_ratings > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <RatingStars rating={course.average_rating} />
                    <span className="text-zinc-400">
                      {course.average_rating.toFixed(1)} ({course.total_ratings} valoraciones)
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => setShowRatingForm(!showRatingForm)}
                  variant="outline"
                  size="sm"
                  className="mb-4"
                  data-testid="rate-course-btn"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Valorar curso
                </Button>
                {showRatingForm && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4" data-testid="rating-form">
                    <p className="text-sm text-zinc-300 mb-3">Tu valoración:</p>
                    <div className="mb-3">
                      <RatingStars rating={userRating} onRate={setUserRating} size="large" />
                    </div>
                    <Textarea
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Escribe tu opinión (opcional)"
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 mb-3"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSubmitRating} size="sm" data-testid="submit-rating-btn">
                        Enviar valoración
                      </Button>
                      <Button onClick={() => setShowRatingForm(false)} variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
                {progressPercent > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">Progreso del curso</span>
                      <span className="font-medium text-zinc-50">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <h2 className="text-2xl font-heading font-semibold text-zinc-50 mb-6">Contenido del Curso</h2>
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
                      className="w-full flex items-center gap-4 p-4 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 text-left"
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
                        <h3 className="font-medium text-zinc-50 mb-1">
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