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
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<ProfileState> | undefined;
        return {
          ...initialProfileState,
          githubUrl: state?.githubUrl || '',
        };
      },
      // Keep PII-heavy profile/JD/resume data in memory/server only.
      partialize: (state) => ({
        githubUrl: state.githubUrl,
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
  jdText: string;
  profileData: Record<string, unknown> | null;

  // Actions
  setPersona: (persona: 'professional' | 'friendly' | 'challenging') => void;
  setInterviewContext: (profile: Record<string, unknown>, jdText: string) => void;
  startSession: (sessionId: string, totalQuestions: number) => void;
  setQuestion: (question: string, questionNumber: number) => void;
  addMessage: (role: 'interviewer' | 'user', content: string) => void;
  endSession: () => void;
  clearConversation: () => void;
}

export const useInterviewStore = create<InterviewState>()((set) => ({
  sessionId: null,
  isActive: false,
  currentQuestion: '',
  questionNumber: 0,
  totalQuestions: 0,
  persona: 'professional',
  conversation: [],
  jdText: '',
  profileData: null,

  setPersona: (persona) => set({ persona }),
  setInterviewContext: (profile, jdText) => set({ profileData: profile, jdText }),
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
    // conversation 유지 (피드백 전송용)
  }),
  clearConversation: () => set({ conversation: [], jdText: '', profileData: null }),
}));

// ============ Interview History Store ============

export interface InterviewHistoryEntry {
  id: string;
  sessionId: string;
  date: string;
  interviewType: string;
  persona: string;
  scores: Record<string, number>;
  totalQuestions: number;
  durationSeconds: number;
  companyName?: string;
  feedbackSummary?: string;
}

const INTERVIEW_HISTORY_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const MAX_PERSISTED_INTERVIEW_HISTORY = 25;

const isWithinTtl = (timestamp: number, ttlMs: number, now = Date.now()) =>
  Number.isFinite(timestamp) && timestamp > 0 && now - timestamp <= ttlMs;

const sanitizeInterviewHistoryEntries = (entries: InterviewHistoryEntry[] = [], now = Date.now()) =>
  entries
    .filter((entry) => isWithinTtl(Date.parse(entry.date), INTERVIEW_HISTORY_TTL_MS, now))
    .map((entry) => ({
      id: entry.id,
      sessionId: entry.sessionId,
      date: entry.date,
      interviewType: entry.interviewType,
      persona: entry.persona,
      scores: entry.scores,
      totalQuestions: entry.totalQuestions,
      durationSeconds: entry.durationSeconds,
      companyName: entry.companyName,
    }))
    .slice(0, MAX_PERSISTED_INTERVIEW_HISTORY);

interface InterviewHistoryState {
  entries: InterviewHistoryEntry[];
  addEntry: (entry: InterviewHistoryEntry) => void;
  getEntries: () => InterviewHistoryEntry[];
  clearHistory: () => void;
}

export const useInterviewHistoryStore = create<InterviewHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => {
          const freshEntries = sanitizeInterviewHistoryEntries(state.entries);
          // 중복 방지: 같은 sessionId가 이미 있으면 추가하지 않음
          if (freshEntries.some((e) => e.sessionId === entry.sessionId)) {
            return { entries: freshEntries };
          }
          return { entries: sanitizeInterviewHistoryEntries([entry, ...freshEntries]) };
        }),

      getEntries: () => sanitizeInterviewHistoryEntries(get().entries),

      clearHistory: () => set({ entries: [] }),
    }),
    {
      name: 'jobfit-interview-history',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<InterviewHistoryState> | undefined;
        return { entries: sanitizeInterviewHistoryEntries(state?.entries || []) };
      },
      partialize: (state) => ({
        entries: sanitizeInterviewHistoryEntries(state.entries),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.entries = sanitizeInterviewHistoryEntries(state.entries);
        }
      },
    }
  )
);

// ============ Problem Store ============

interface ProblemState {
  // 주차별 문제 저장
  weekProblems: Record<number, Problem[]>;
  weekProblemCachedAt: Record<number, number>;

  // Actions
  setWeekProblems: (weekNumber: number, problems: Problem[]) => void;
  addProblems: (weekNumber: number, problems: Problem[]) => void;
  clearWeekProblems: (weekNumber: number) => void;
  clearAllProblems: () => void;
}

const PROBLEM_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_PERSISTED_PROBLEM_WEEKS = 12;
const MAX_PROBLEMS_PER_WEEK = 20;

const sanitizeProblemCache = (
  weekProblems: Record<number, Problem[]> = {},
  weekProblemCachedAt: Record<number, number> = {},
  now = Date.now()
) => {
  const sortedWeeks = Object.keys(weekProblems)
    .map(Number)
    .filter((weekNumber) => Number.isInteger(weekNumber))
    .filter((weekNumber) => isWithinTtl(weekProblemCachedAt[weekNumber], PROBLEM_CACHE_TTL_MS, now))
    .sort((a, b) => (weekProblemCachedAt[b] || 0) - (weekProblemCachedAt[a] || 0))
    .slice(0, MAX_PERSISTED_PROBLEM_WEEKS);

  return sortedWeeks.reduce(
    (acc, weekNumber) => {
      acc.weekProblems[weekNumber] = (weekProblems[weekNumber] || []).slice(0, MAX_PROBLEMS_PER_WEEK);
      acc.weekProblemCachedAt[weekNumber] = weekProblemCachedAt[weekNumber];
      return acc;
    },
    { weekProblems: {} as Record<number, Problem[]>, weekProblemCachedAt: {} as Record<number, number> }
  );
};

export const useProblemStore = create<ProblemState>()(
  persist(
    (set) => ({
      weekProblems: {},
      weekProblemCachedAt: {},

      setWeekProblems: (weekNumber, problems) =>
        set((state) =>
          sanitizeProblemCache(
            {
              ...state.weekProblems,
              [weekNumber]: problems,
            },
            {
              ...state.weekProblemCachedAt,
              [weekNumber]: Date.now(),
            }
          )
        ),

      addProblems: (weekNumber, problems) =>
        set((state) =>
          sanitizeProblemCache(
            {
              ...state.weekProblems,
              [weekNumber]: [
                ...(state.weekProblems[weekNumber] || []),
                ...problems,
              ],
            },
            {
              ...state.weekProblemCachedAt,
              [weekNumber]: Date.now(),
            }
          )
        ),

      clearWeekProblems: (weekNumber) =>
        set((state) => {
          const newWeekProblems = { ...state.weekProblems };
          const newWeekProblemCachedAt = { ...state.weekProblemCachedAt };
          delete newWeekProblems[weekNumber];
          delete newWeekProblemCachedAt[weekNumber];
          return { weekProblems: newWeekProblems, weekProblemCachedAt: newWeekProblemCachedAt };
        }),

      clearAllProblems: () => set({ weekProblems: {}, weekProblemCachedAt: {} }),
    }),
    {
      name: 'jobfit-problems',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<ProblemState> | undefined;
        return sanitizeProblemCache(state?.weekProblems || {}, state?.weekProblemCachedAt || {});
      },
      partialize: (state) => sanitizeProblemCache(state.weekProblems, state.weekProblemCachedAt),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const sanitized = sanitizeProblemCache(state.weekProblems, state.weekProblemCachedAt);
          state.weekProblems = sanitized.weekProblems;
          state.weekProblemCachedAt = sanitized.weekProblemCachedAt;
        }
      },
    }
  )
);
