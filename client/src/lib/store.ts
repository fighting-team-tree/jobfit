/**
 * Global State Store using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResumeAnalysis, ResumeFileResponse, GapAnalysis, GitHubAnalysisResponse } from './api';

// ============ Profile Store ============

interface ProfileState {
  // Raw inputs
  resumeText: string;
  resumeFile: File | null;
  githubUrl: string;
  jdText: string;
  
  // Parsed results
  resumeAnalysis: ResumeAnalysis | null;
  resumeFileResult: ResumeFileResponse | null;
  githubAnalysis: GitHubAnalysisResponse | null;
  gapAnalysis: GapAnalysis | null;
  
  // Actions
  setResumeText: (text: string) => void;
  setResumeFile: (file: File | null) => void;
  setResumeAnalysis: (analysis: ResumeAnalysis | null) => void;
  setResumeFileResult: (result: ResumeFileResponse | null) => void;
  setGitHubUrl: (url: string) => void;
  setGitHubAnalysis: (analysis: GitHubAnalysisResponse | null) => void;
  setJdText: (text: string) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  resetProfile: () => void;
  clearAll: () => void;
}

const initialProfileState = {
  resumeText: '',
  resumeFile: null,
  githubUrl: '',
  jdText: '',
  resumeAnalysis: null,
  resumeFileResult: null,
  githubAnalysis: null,
  gapAnalysis: null,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...initialProfileState,
      
      setResumeText: (text) => set({ resumeText: text }),
      setResumeFile: (file) => set({ resumeFile: file }),
      setResumeAnalysis: (analysis) => set({ resumeAnalysis: analysis }),
      setResumeFileResult: (result) => set({ resumeFileResult: result }),
      setGitHubUrl: (url) => set({ githubUrl: url }),
      setGitHubAnalysis: (analysis) => set({ githubAnalysis: analysis }),
      setJdText: (text) => set({ jdText: text }),
      setGapAnalysis: (analysis) => set({ gapAnalysis: analysis }),
      resetProfile: () => set(initialProfileState),
      clearAll: () => set(initialProfileState),
    }),
    {
      name: 'jobfit-profile',
      // Don't persist file objects
      partialize: (state) => ({
        resumeText: state.resumeText,
        githubUrl: state.githubUrl,
        jdText: state.jdText,
        resumeAnalysis: state.resumeAnalysis,
        resumeFileResult: state.resumeFileResult,
        githubAnalysis: state.githubAnalysis,
        gapAnalysis: state.gapAnalysis,
      }),
    }
  )
);

// ============ Interview Store ============

interface Message {
  role: 'interviewer' | 'user';
  content: string;
  timestamp: number;
}

interface InterviewState {
  sessionId: string | null;
  isActive: boolean;
  currentQuestion: string;
  questionNumber: number;
  totalQuestions: number;
  persona: 'professional' | 'friendly' | 'challenging';
  conversation: Message[];
  
  // Actions
  setPersona: (persona: 'professional' | 'friendly' | 'challenging') => void;
  startSession: (sessionId: string, totalQuestions: number) => void;
  setQuestion: (question: string, questionNumber: number) => void;
  addMessage: (role: 'interviewer' | 'user', content: string) => void;
  endSession: () => void;
}

export const useInterviewStore = create<InterviewState>()((set) => ({
  sessionId: null,
  isActive: false,
  currentQuestion: '',
  questionNumber: 0,
  totalQuestions: 0,
  persona: 'professional',
  conversation: [],
  
  setPersona: (persona) => set({ persona }),
  startSession: (sessionId, totalQuestions) => set({
    sessionId,
    totalQuestions,
    isActive: true,
    currentQuestion: '',
    questionNumber: 0,
    conversation: [],
  }),
  setQuestion: (question, questionNumber) => set({
    currentQuestion: question,
    questionNumber,
  }),
  addMessage: (role, content) =>
    set((state) => ({
      conversation: [...state.conversation, { role, content, timestamp: Date.now() }],
    })),
  endSession: () => set({
    sessionId: null,
    isActive: false,
    currentQuestion: '',
    questionNumber: 0,
    totalQuestions: 0,
    conversation: [],
  }),
}));
