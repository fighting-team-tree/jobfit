/**
 * Global State Store using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResumeAnalysis, ResumeFileResponse, GapAnalysis } from './api';

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
  gapAnalysis: GapAnalysis | null;
  
  // Actions
  setResumeText: (text: string) => void;
  setResumeFile: (file: File | null) => void;
  setResumeAnalysis: (analysis: ResumeAnalysis | null) => void;
  setResumeFileResult: (result: ResumeFileResponse | null) => void;
  setGitHubUrl: (url: string) => void;
  setJdText: (text: string) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  resetProfile: () => void;
}

const initialProfileState = {
  resumeText: '',
  resumeFile: null,
  githubUrl: '',
  jdText: '',
  resumeAnalysis: null,
  resumeFileResult: null,
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
      setJdText: (text) => set({ jdText: text }),
      setGapAnalysis: (analysis) => set({ gapAnalysis: analysis }),
      resetProfile: () => set(initialProfileState),
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
  isActive: boolean;
  persona: 'professional' | 'friendly' | 'challenging';
  messages: Message[];
  
  // Actions
  setIsActive: (active: boolean) => void;
  setPersona: (persona: 'professional' | 'friendly' | 'challenging') => void;
  addMessage: (role: 'interviewer' | 'user', content: string) => void;
  clearMessages: () => void;
}

export const useInterviewStore = create<InterviewState>()((set) => ({
  isActive: false,
  persona: 'professional',
  messages: [],
  
  setIsActive: (active) => set({ isActive: active }),
  setPersona: (persona) => set({ persona }),
  addMessage: (role, content) =>
    set((state) => ({
      messages: [...state.messages, { role, content, timestamp: Date.now() }],
    })),
  clearMessages: () => set({ messages: [] }),
}));
