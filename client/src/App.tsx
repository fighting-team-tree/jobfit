import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Interview from './pages/Interview'
import PlaceholderPage from './components/common/PlaceholderPage'
import Landing from './pages/onboarding/Landing'
import GoalSetting from './pages/onboarding/GoalSetting'
import Connect from './pages/onboarding/Connect'
import Import from './pages/onboarding/Import'
import Pipeline from './pages/pipeline/Pipeline'
import ApplicationDetail from './pages/pipeline/ApplicationDetail'
import Resume from './pages/resume/Resume'
import Research from './pages/research/Research'

function App() {
  return (
    <Router>
      <Routes>
        {/* Onboarding Routes - No Layout */}
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding/goal" element={<GoalSetting />} />
        <Route path="/onboarding/connect" element={<Connect />} />
        <Route path="/onboarding/import" element={<Import />} />

        {/* App Routes - With Layout */}
        <Route path="/*" element={
          <MainLayout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/pipeline/:id" element={<ApplicationDetail />} />
              <Route path="/jobs" element={<PlaceholderPage title="공고 탐색" />} />
              <Route path="/research" element={<Research />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/settings" element={<PlaceholderPage title="설정" />} />
              <Route path="/roadmap" element={<PlaceholderPage title="학습 로드맵" />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </Router>
  )
}

export default App
