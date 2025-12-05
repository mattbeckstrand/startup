import React from 'react';
import { BrowserRouter, NavLink, Route, Routes, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './input.css';

// Context providers
import { AuthProvider, useAuth } from './context/authContext';
import { ProfileProvider, useProfile } from './context/profileContext';
import { ToastProvider } from './components/Toast';

// Create a query client with caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus (can be annoying)
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy load pages for code splitting
import { lazy, Suspense } from 'react';

const SignIn = lazy(() => import('./pages/signin').then(m => ({ default: m.SignIn })));
const Dms = lazy(() => import('./pages/dms').then(m => ({ default: m.Dms })));
const Profile = lazy(() => import('./pages/profile').then(m => ({ default: m.Profile })));
const Samples = lazy(() => import('./pages/samples').then(m => ({ default: m.Samples })));
const Home = lazy(() => import('./pages/home').then(m => ({ default: m.Home })));
const CreateReview = lazy(() => import('./pages/CreateReview').then(m => ({ default: m.CreateReview })));
const ReviewDetail = lazy(() => import('./pages/ReviewDetail').then(m => ({ default: m.ReviewDetail })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Discover = lazy(() => import('./pages/Discover').then(m => ({ default: m.Discover })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const ConversationThread = lazy(() => import('./pages/ConversationThread').then(m => ({ default: m.ConversationThread })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(31, 38, 42)' }}>
      <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Components
import { BottomNav } from './components/BottomNav';

function AppContent() {
  const { isAuthenticated, logout, loading } = useAuth();
  const { profile } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(31, 38, 42)' }}>
        <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-white" style={{ background: 'rgb(31, 38, 42)' }}>
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 w-full" style={{ background: 'rgb(31, 38, 42)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex items-center justify-between gap-6 p-4">
            <Link to="/" className="text-2xl font-bold" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
              Snare
            </Link>
            
            <div className="flex items-center gap-6">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `hover:text-white transition-colors ${isActive ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`
                }
              >
                Home
              </NavLink>
              <NavLink 
                to="/discover" 
                className={({ isActive }) => 
                  `hover:text-white transition-colors ${isActive ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`
                }
              >
                Discover
              </NavLink>
              <NavLink 
                to="/search" 
                className={({ isActive }) => 
                  `hover:text-white transition-colors ${isActive ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`
                }
              >
                Search
              </NavLink>
              
              {isAuthenticated ? (
                <>
                  <NavLink 
                    to="/messages" 
                    className={({ isActive }) => 
                      `hover:text-white transition-colors ${isActive ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`
                    }
                  >
                    Messages
                  </NavLink>
                  <NavLink 
                    to="/notifications" 
                    className={({ isActive }) => 
                      `hover:text-white transition-colors ${isActive ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`
                    }
                  >
                    Notifications
                  </NavLink>
                  <NavLink 
                    to="/profile"
                    className={({ isActive }) => 
                      `flex items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-70'}`
                    }
                  >
                    <img 
                      src={profile?.avatar_url || '/Images/ProfilePlaceholder.jpg'} 
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </NavLink>
                  <Link 
                    to="/create"
                    className="px-4 py-2 bg-[#007AFF] rounded-full font-medium hover:opacity-90 transition-opacity"
                  >
                    + Review
                  </Link>
                </>
              ) : (
                <>
                  <NavLink 
                    to="/signin" 
                    className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
                  >
                    Sign In
                  </NavLink>
                  <NavLink 
                    to="/signin" 
                    className="px-4 py-2 bg-[#007AFF] text-white rounded-full font-medium hover:opacity-90 transition-colors"
                  >
                    Get Started
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Header - iOS style */}
      <header className="md:hidden sticky top-0 z-50 pt-safe" style={{ background: 'rgb(31, 38, 42)' }}>
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/" className="text-[32px] font-bold" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
            Snare
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <Link to="/notifications" className="p-2 text-white relative">
                  {/* Lightbulb icon for tips/discover */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </Link>
                <Link to="/messages" className="p-2 text-white relative">
                  {/* Paper airplane icon for DMs */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full">
        <div className="max-w-2xl mx-auto md:max-w-4xl md:px-4">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/search" element={<Search />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/review/:reviewId" element={<ReviewDetail />} />
            
            {/* Protected routes */}
            <Route path="/create" element={<CreateReview />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Dms />} />
            <Route path="/messages/:conversationId" element={<ConversationThread />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/samples" element={<Samples />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </div>
      </main>

      {/* Footer - Desktop only */}
      <footer className="hidden md:block mt-auto w-full" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-4">
            <span>© 2024 Snare</span>
            <a href="https://github.com/mattbeckstrand/startup" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
          <div>
            <span>Made by Matt Beckstrand</span>
          </div>
        </div>
      </footer>

      {/* Bottom Nav - Mobile only */}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-24 h-24 mb-6 rounded-full bg-gray-800 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-gray-400 mb-6">This page doesn't exist</p>
      <Link 
        to="/"
        className="px-6 py-2 bg-purple-600 rounded-full font-medium hover:bg-purple-700 transition-colors"
      >
        Go Home
      </Link>
    </main>
  );
}
