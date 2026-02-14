import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/auth'

// Route-based code splitting: each page loads on demand
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const InterviewPage = lazy(() => import('./pages/InterviewPage'))
const InterviewFeedbackPage = lazy(() => import('./pages/InterviewFeedbackPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const ProblemPage = lazy(() => import('./pages/ProblemPage'))
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'))

const queryClient = new QueryClient()

const PageLoader = (
  <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={PageLoader}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/interview/feedback/:sessionId" element={<InterviewFeedbackPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/problem/:id" element={<ProblemPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
