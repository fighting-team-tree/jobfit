
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface ResumeAnalysis {
    skills: string[];
    experience: { company: string; role: string; }[];
    projects: any[];
    education: any[];
    certifications: string[];
    raw_text?: string;
}

export interface GapAnalysis {
    match_score: number;
    matching_skills: string[];
    missing_skills: string[];
    recommendations: string[];
    strengths: string[];
    areas_to_improve: string[];
}

export interface TodoItem {
    id: number;
    task: string;
    skill: string;
    priority: string;
    estimated_hours: number;
    resources: string[];
    completed: boolean;
}

export interface Roadmap {
    title: string;
    summary: string;
    weekly_plans: {
        week_number: number;
        theme: string;
        goals: string[];
        todos: TodoItem[];
        total_hours: number;
    }[];
    total_estimated_hours: number;
    recommended_resources: any[];
}

export const analysisAPI = {
    analyzeResume: async (text: string): Promise<ResumeAnalysis> => {
        const response = await axios.post(`${API_URL}/analyze/resume`, { resume_text: text });
        return response.data;
    },
    analyzeGap: async (profile: ResumeAnalysis, jdText: string): Promise<GapAnalysis> => {
        const response = await axios.post(`${API_URL}/analyze/gap`, { profile, jd_text: jdText });
        return response.data;
    }
};

export const roadmapAPI = {
    generate: async (gapAnalysis: GapAnalysis, hours: number = 10, weeks: number = 4): Promise<Roadmap> => {
        const response = await axios.post(`${API_URL}/roadmap/generate`, {
            gap_analysis: gapAnalysis,
            available_hours_per_week: hours,
            weeks
        });
        return response.data;
    },
    completeTodo: async (todoId: number): Promise<any> => {
        const response = await axios.post(`${API_URL}/roadmap/todo/complete`, null, {
            params: { todo_id: todoId }
        });
        return response.data;
    }
};

export interface InterviewSession {
    session_id: string;
    question: string;
    question_number: number;
    total_questions: number;
    persona: string;
}

export const interviewAPI = {
    startInterview: async (profile: any, jdText: string, persona: string, maxQuestions: number = 5): Promise<InterviewSession> => {
        const response = await axios.post(`${API_URL}/interview/start`, {
            profile,
            jd_text: jdText,
            persona,
            max_questions: maxQuestions
        });
        return response.data;
    },

    testTTS: async (text: string): Promise<Blob> => {
        const response = await axios.post(`${API_URL}/interview/test-tts`, null, {
            params: { text },
            responseType: 'blob'
        });
        return response.data;
    }
};
