import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AuthCallback } from '@/context/AuthCallback';
import { ProtectedRoute } from '@/context/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { DashboardPage } from '@/pages/DashboardPage';
import { CoursesPage, CourseDetailPage } from '@/pages/CoursesPages';
import { LessonPage } from '@/pages/LessonPage';
import { PricingPage } from '@/pages/PricingPage';
import { PaymentSuccessPage } from '@/pages/PaymentPages';
import { CertificatesPage } from '@/pages/CertificatesPage';
import { AdminCoursesPage } from '@/pages/AdminCoursesPage';
import { AdminLessonsPage } from '@/pages/AdminLessonsPage';
import { AdminLiveSessionsPage } from '@/pages/AdminLiveSessionsPage';
import { AdminPlansPage } from '@/pages/AdminPlansPage';
import { AdminAchievementsPage } from '@/pages/AdminAchievementsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { LiveSessionsPage } from '@/pages/LiveSessionsPage';
import '@/App.css';

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <CoursesPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/courses/:courseId"
        element={
          <ProtectedRoute>
            <CourseDetailPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/courses/:courseId/lesson/:lessonId"
        element={
          <ProtectedRoute>
            <LessonPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/pricing"
        element={
          <ProtectedRoute>
            <PricingPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/payment/success"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <CertificatesPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <AchievementsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/live-sessions"
        element={
          <ProtectedRoute>
            <LiveSessionsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCoursesPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/courses/:courseId/lessons"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLessonsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requireAdmin>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/live-sessions"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLiveSessionsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/plans"
        element={
          <ProtectedRoute requireAdmin>
            <AdminPlansPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/achievements"
        element={
          <ProtectedRoute requireAdmin>
            <AdminAchievementsPage />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
