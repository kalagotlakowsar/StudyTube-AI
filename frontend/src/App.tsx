import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudyPage } from './pages/StudyPage';
import { LibraryPage } from './pages/LibraryPage';
import { ComparePage } from './pages/ComparePage';
import { ProfilePage } from './pages/ProfilePage';
import { videoApi } from './api/client';
import { useToast } from './components/Toast';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const { toast } = useToast();

  // If user is authenticated and is on landing, move to dashboard by default
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && currentPage === 'landing') {
        // Check if there was a pending URL
        const pendingUrl = sessionStorage.getItem('pending_study_url');
        if (pendingUrl) {
          sessionStorage.removeItem('pending_study_url');
          startVideoProcessing(pendingUrl);
        } else {
          setCurrentPage('dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading]);

  const handleNavigate = (page: string) => {
    // If trying to access protected route without auth, redirect to login
    const protectedPages = ['dashboard', 'study', 'library', 'compare', 'profile'];
    if (protectedPages.includes(page) && !isAuthenticated) {
      setCurrentPage('login');
      toast('Please sign in to access your study materials', 'info');
      return;
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startVideoProcessing = async (url: string) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('pending_study_url', url);
      setCurrentPage('login');
      toast('Please log in or create an account to process this video', 'info');
      return;
    }

    setIsProcessingVideo(true);
    try {
      const response = await videoApi.processUrl({
        youtube_url: url,
        study_mode: 'detailed',
        language: 'English',
      });
      setCurrentVideoId(response.video.id);
      setCurrentPage('study');
      toast('Study material generated successfully! 🎉', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.response?.data?.detail || 'Failed to process YouTube video. Please try again.', 'error');
      setCurrentPage('dashboard');
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const handleOpenVideo = (videoId: number) => {
    setCurrentVideoId(videoId);
    setCurrentPage('study');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = () => {
    const pendingUrl = sessionStorage.getItem('pending_study_url');
    if (pendingUrl) {
      sessionStorage.removeItem('pending_study_url');
      startVideoProcessing(pendingUrl);
    } else {
      setCurrentPage('dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />

      <main className="flex-1">
        {/* Processing Modal Overlay */}
        {isProcessingVideo && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <ProcessingPipeline />
          </div>
        )}

        {/* Dynamic Page Views */}
        {currentPage === 'landing' && (
          <LandingPage
            onStartStudy={startVideoProcessing}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentPage === 'register' && (
          <RegisterPage
            onNavigate={handleNavigate}
            onRegisterSuccess={handleLoginSuccess}
          />
        )}

        {currentPage === 'forgot-password' && (
          <ForgotPasswordPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'dashboard' && (
          <DashboardPage
            onStartStudy={startVideoProcessing}
            onOpenVideo={handleOpenVideo}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'study' && currentVideoId && (
          <StudyPage
            videoId={currentVideoId}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'library' && (
          <LibraryPage
            onOpenVideo={handleOpenVideo}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'compare' && <ComparePage />}

        {currentPage === 'profile' && <ProfilePage />}
      </main>

      <Footer />
    </div>
  );
};
