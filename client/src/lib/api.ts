/**
 * API Client for JobFit Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ============ Types ============

export interface ResumeAnalysis {
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    major?: string;
    year?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    tech_stack: string[];
  }>;
  certifications: string[];
  raw_text?: string;
  parse_error?: boolean;
}

export interface ResumeFileResponse {
  markdown: string;
  structured: {
    name?: string;
    contact?: {
      email?: string;
      phone?: string;
      github?: string;
      blog?: string;
    };
    skills?: string[];
    experience?: Array<{
      company: string;
      role: string;
      duration?: string;
      description?: string;
    }>;
    education?: Array<{
      school: string;
      degree?: string;
      major?: string;
      year?: string;
      gpa?: string;
    }>;
    projects?: Array<{
      name: string;
      description?: string;
      tech_stack?: string[];
      role?: string;
    }>;
    certifications?: string[];
    awards?: string[];
  } | null;
  pages: number;
  success: boolean;
  error?: string;
}

export interface GapAnalysis {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  strengths: string[];
  areas_to_improve: string[];
}

// ============ API Functions ============

class APIError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      response.status,
      errorData.detail || `HTTP error: ${response.status}`
    );
  }
  return response.json();
}

export const analysisAPI = {
  /**
   * Analyze resume text
   */
  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    const response = await fetch(`${API_BASE_URL}/analyze/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText }),
    });
    return handleResponse<ResumeAnalysis>(response);
  },

  /**
   * Upload and analyze resume file (PDF/image)
   */
  async analyzeResumeFile(
    file: File, 
    extractStructured: boolean = true
  ): Promise<ResumeFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = new URL(`${API_BASE_URL}/analyze/resume/file`);
    url.searchParams.set('extract_structured', String(extractStructured));
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ResumeFileResponse>(response);
  },

  /**
   * Perform gap analysis between profile and JD
   */
  async analyzeGap(profile: object, jdText: string): Promise<GapAnalysis> {
    const response = await fetch(`${API_BASE_URL}/analyze/gap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, jd_text: jdText }),
    });
    return handleResponse<GapAnalysis>(response);
  },

  /**
   * Scrape job description from URL
   */
  async scrapeJD(url: string): Promise<JDScrapedResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/jd/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return handleResponse<JDScrapedResponse>(response);
  },
};

export interface JDScrapedResponse {
  url: string;
  title: string;
  raw_text: string;
  success: boolean;
  error?: string;
  method: 'httpx' | 'playwright';
}


export const interviewAPI = {
  /**
   * Health check
   */
  async healthCheck(): Promise<{ module: string; status: string }> {
    const response = await fetch(`${API_BASE_URL}/interview/`);
    return handleResponse(response);
  },
};

// ============ Roadmap Types ============

export interface TodoItem {
  id: number;
  task: string;
  skill: string;
  priority: 'high' | 'medium' | 'low';
  estimated_hours: number;
  resources: string[];
  completed: boolean;
}

export interface WeeklyPlan {
  week_number: number;
  theme: string;
  goals: string[];
  total_hours: number;
  todos: TodoItem[];
}

export interface Roadmap {
  title: string;
  summary: string;
  total_estimated_hours: number;
  weekly_plans: WeeklyPlan[];
}

export const roadmapAPI = {
  /**
   * Generate learning roadmap from gap analysis
   */
  async generate(
    gapAnalysis: GapAnalysis,
    hoursPerWeek: number = 10,
    weeks: number = 4
  ): Promise<Roadmap> {
    const response = await fetch(`${API_BASE_URL}/roadmap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gap_analysis: gapAnalysis,
        hours_per_week: hoursPerWeek,
        weeks,
      }),
    });
    return handleResponse<Roadmap>(response);
  },

  /**
   * Mark a todo as completed
   */
  async completeTodo(todoId: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/roadmap/todo/${todoId}/complete`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
};

export default { analysisAPI, interviewAPI, roadmapAPI };
