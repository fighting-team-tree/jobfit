/**
 * Global State Store using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProfileStructured, ResumeFileResponse, GapAnalysis, GitHubAnalysisResponse, Problem } from './api';
import { profileAPI } from './api';

// ============ Profile Store ============

interface ProfileState {
  // Raw inputs
  resumeText: string;
  resumeFile: File | null;
  githubUrl: string;
  jdText: string;

  // Parsed results
  profile: ProfileStructured | null;
  resumeFileResult: ResumeFileResponse | null;
  githubAnalysis: GitHubAnalysisResponse | null;
  gapAnalysis: GapAnalysis | null;

  // Server sync state
  isServerSyncing: boolean;
  serverSyncError: string | null;

  // Actions
  setResumeText: (text: string) => void;
  setResumeFile: (file: File | null) => void;
  setProfile: (profile: ProfileStructured | null) => void;
  setResumeFileResult: (result: ResumeFileResponse | null) => void;
  setGitHubUrl: (url: string) => void;
  setGitHubAnalysis: (analysis: GitHubAnalysisResponse | null) => void;
  setJdText: (text: string) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  resetProfile: () => void;
  clearAll: () => void;

  // Server sync actions
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

const initialProfileState = {
  resumeText: '',
  resumeFile: null,
  githubUrl: '',
  jdText: '',
  profile: null,
  resumeFileResult: null,
  githubAnalysis: null,
  gapAnalysis: null,
  isServerSyncing: false,
  serverSyncError: null,
};

// Debounce utility for auto-save
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (saveFn: () => Promise<void>) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveFn();
  }, 1000); // 1 second debounce
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...initialProfileState,

      setResumeText: (text) => set({ resumeText: text }),
      setResumeFile: (file) => set({ resumeFile: file }),
      setProfile: (profile) => {
        set({ profile });
        debouncedSave(() => get().saveToServer());
      },
      setResumeFileResult: (result) => {
        set({ resumeFileResult: result });
        debouncedSave(() => get().saveToServer());
      },
      setGitHubUrl: (url) => {
        set({ githubUrl: url });
        debouncedSave(() => get().saveToServer());
      },
      setGitHubAnalysis: (analysis) => {
        set({ githubAnalysis: analysis });
        debouncedSave(() => get().saveToServer());
      },
      setJdText: (text) => {
        set({ jdText: text });
        debouncedSave(() => get().saveToServer());
      },
      setGapAnalysis: (analysis) => {
        set({ gapAnalysis: analysis });
        debouncedSave(() => get().saveToServer());
      },
      resetProfile: () => set(initialProfileState),
      clearAll: () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          saveTimeout = null;
        }
        set(initialProfileState);
      },

      // Load profile from server
      loadFromServer: async () => {
        set({ isServerSyncing: true, serverSyncError: null });
        try {
          const response = await profileAPI.getMyProfile();
          set({
            profile: response.profile_data,
            resumeFileResult: response.resume_file_result,
            githubAnalysis: response.github_analysis,
            gapAnalysis: response.gap_analysis,
            jdText: response.jd_text || '',
            githubUrl: response.github_url || '',
            isServerSyncing: false,
          });
        } catch (error) {
          console.error('Failed to load profile from server:', error);
          set({
            isServerSyncing: false,
            serverSyncError: error instanceof Error ? error.message : 'Failed to load profile',
          });
        }
      },

      // Save profile to server
      saveToServer: async () => {
        const state = get();
        // Skip if no data to save
        if (!state.profile && !state.resumeFileResult && !state.githubAnalysis && !state.gapAnalysis) {
          return;
        }

        set({ isServerSyncing: true, serverSyncError: null });
        try {
          await profileAPI.saveMyProfile({
            profile_data: state.profile,
            resume_file_result: state.resumeFileResult,
            github_analysis: state.githubAnalysis,
            gap_analysis: state.gapAnalysis,
            jd_text: state.jdText || null,
            github_url: state.githubUrl || null,
          });
          set({ isServerSyncing: false });
        } catch (error) {
          console.error('Failed to save profile to server:', error);
          set({
            isServerSyncing: false,
            serverSyncError: error instanceof Error ? error.message : 'Failed to save profile',
          });
        }
      },
    }),
    {
      name: 'jobfit-profile',
      // Don't persist file objects or sync state
      partialize: (state) => ({
        resumeText: state.resumeText,
        githubUrl: state.githubUrl,
        jdText: state.jdText,
        profile: state.profile,
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

// ============ Problem Store ============

interface ProblemState {
  // 주차별 문제 저장
  weekProblems: Record<number, Problem[]>;

  // Actions
  setWeekProblems: (weekNumber: number, problems: Problem[]) => void;
  addProblems: (weekNumber: number, problems: Problem[]) => void;
  clearWeekProblems: (weekNumber: number) => void;
  clearAllProblems: () => void;
}

export const useProblemStore = create<ProblemState>()(
  persist(
    (set) => ({
      weekProblems: {},

      setWeekProblems: (weekNumber, problems) =>
        set((state) => ({
          weekProblems: {
            ...state.weekProblems,
            [weekNumber]: problems,
          },
        })),

      addProblems: (weekNumber, problems) =>
        set((state) => ({
          weekProblems: {
            ...state.weekProblems,
            [weekNumber]: [
              ...(state.weekProblems[weekNumber] || []),
              ...problems,
            ],
          },
        })),

      clearWeekProblems: (weekNumber) =>
        set((state) => {
          const newWeekProblems = { ...state.weekProblems };
          delete newWeekProblems[weekNumber];
          return { weekProblems: newWeekProblems };
        }),

      clearAllProblems: () => set({ weekProblems: {} }),
    }),
    {
      name: 'jobfit-problems',
    }
  )
);
