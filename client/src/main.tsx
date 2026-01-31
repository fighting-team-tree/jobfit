import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import InterviewPage from './pages/InterviewPage.tsx'
import InterviewFeedbackPage from './pages/InterviewFeedbackPage.tsx'
import RoadmapPage from './pages/RoadmapPage.tsx'
import CompaniesPage from './pages/CompaniesPage.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/interview/feedback/:sessionId" element={<InterviewFeedbackPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

