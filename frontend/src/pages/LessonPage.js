import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, CheckCircle2, MessageCircle, Trash2 } from 'lucide-react';
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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
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
    fetchComments();
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

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/lessons/${lessonId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data);
    } catch (error) {
      console.error('Comments fetch error:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoadingComments(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/lessons/${lessonId}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      toast.success('Comentario agregado');
      fetchComments();
    } catch (error) {
      console.error('Comment add error:', error);
      toast.error('Error al agregar comentario');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Comentario eliminado');
      fetchComments();
    } catch (error) {
      console.error('Comment delete error:', error);
      toast.error('Error al eliminar comentario');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
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
    <div className="flex h-screen bg-[#0A0A0A]" data-testid="lesson-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-50 mb-6 transition-colors"
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

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-zinc-50 mb-2" data-testid="lesson-title">
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

          {/* Comments Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 mt-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-heading font-semibold text-zinc-50">
                Comentarios ({comments.length})
              </h2>
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe tu comentario..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 mb-3"
                rows={3}
                data-testid="comment-input"
              />
              <Button
                type="submit"
                disabled={loadingComments || !newComment.trim()}
                data-testid="submit-comment-btn"
              >
                {loadingComments ? 'Enviando...' : 'Comentar'}
              </Button>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.comment_id}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                    data-testid={`comment-${comment.comment_id}`}
                  >
                    <div className="flex items-start gap-3">
                      {comment.user_picture ? (
                        <img
                          src={comment.user_picture}
                          alt={comment.user_name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-semibold">
                          {comment.user_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-medium text-zinc-100">
                              {comment.user_name}
                            </span>
                            <span className="text-xs text-zinc-500 ml-2">
                              {new Date(comment.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {(comment.user_id === user?.user_id || user?.role === 'admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.comment_id)}
                              className="text-zinc-500 hover:text-red-500"
                              data-testid={`delete-comment-${comment.comment_id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-zinc-300">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};