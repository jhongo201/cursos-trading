import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const LessonPage = () => {
  const { courseId, lessonId } = useParams();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);

  useEffect(() => {
    if (user?.subscription_status !== 'active' && user?.role !== 'admin') {
      toast.error('Necesitas una suscripción activa');
      navigate('/pricing');
      return;
    }
    fetchLessonData();
  }, [lessonId, courseId]);

  const fetchLessonData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [courseRes, lessonsRes, progressRes] = await Promise.all([
        axios.get(`${API}/courses/${courseId}`, { headers }),
        axios.get(`${API}/courses/${courseId}/lessons`, { headers }),
        axios.get(`${API}/progress/${courseId}`, { headers })
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data);
      setProgress(progressRes.data);

      const currentLesson = lessonsRes.data.find(l => l.lesson_id === lessonId);
      setLesson(currentLesson);
      setIsCompleted(progressRes.data?.completed_lessons?.includes(lessonId) || false);
    } catch (error) {
      console.error('Lesson fetch error:', error);
      toast.error('Error al cargar la lección');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        `${API}/progress/${courseId}`,
        { lesson_id: lessonId, completed: !isCompleted },
        { headers }
      );

      setIsCompleted(!isCompleted);
      toast.success(isCompleted ? 'Marcada como no completada' : '¡Lección completada!');
      fetchLessonData();
    } catch (error) {
      console.error('Progress update error:', error);
      toast.error('Error al actualizar progreso');
    }
  };

  const currentIndex = lessons.findIndex(l => l.lesson_id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

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

  if (!lesson) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600">Lección no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]" data-testid="lesson-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-950 mb-6 transition-colors"
            data-testid="back-to-course-link"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al curso
          </Link>

          <div className="bg-zinc-950 rounded-lg overflow-hidden mb-6 video-player" data-testid="video-player">
            {lesson.video_type === 'external' && lesson.video_url ? (
              <div className="aspect-video">
                {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
                  <iframe
                    src={lesson.video_url.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : lesson.video_url.includes('vimeo.com') ? (
                  <iframe
                    src={lesson.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    controls
                    className="w-full h-full"
                    src={lesson.video_url}
                  />
                )}
              </div>
            ) : lesson.video_url ? (
              <video
                ref={videoRef}
                controls
                className="w-full"
                src={`${API}/files/${lesson.video_url}`}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center text-zinc-400">
                No hay video disponible
              </div>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-8 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-zinc-950 mb-2" data-testid="lesson-title">
                  {lesson.title}
                </h1>
                <p className="text-sm text-zinc-500">Curso: {course?.title}</p>
              </div>
              <Button
                onClick={handleMarkComplete}
                variant={isCompleted ? "outline" : "default"}
                className="flex items-center gap-2"
                data-testid="mark-complete-btn"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCompleted ? 'Completada' : 'Marcar completa'}
              </Button>
            </div>

            <div className="prose max-w-none lesson-content">
              <div dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {prevLesson ? (
              <Button
                variant="outline"
                onClick={() => navigate(`/courses/${courseId}/lesson/${prevLesson.lesson_id}`)}
                className="flex items-center gap-2"
                data-testid="prev-lesson-btn"
              >
                <ChevronLeft className="h-4 w-4" />
                Lección anterior
              </Button>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Button
                onClick={() => navigate(`/courses/${courseId}/lesson/${nextLesson.lesson_id}`)}
                className="flex items-center gap-2"
                data-testid="next-lesson-btn"
              >
                Siguiente lección
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/courses/${courseId}`)}
                variant="outline"
                data-testid="finish-course-btn"
              >
                Finalizar curso
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};