/**
 * API Client for JobFit Backend
 */

// 배포 환경에서는 상대 경로 사용, 로컬 개발에서는 localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

// ============ Types ============

export interface ProfileContact {
  email?: string;
  phone?: string;
  github?: string;
  blog?: string;
}

export interface ProfileExperience {
  company: string;
  role?: string;
  duration?: string;
  description?: string;
}

export interface ProfileEducation {
  school: string;
  degree?: string;
  major?: string;
  year?: string;
  gpa?: string;
}

export interface ProfileProject {
  name: string;
  description?: string;
  tech_stack?: string[];
  role?: string;
}

export interface ProfileStructured {
  name?: string;
  contact?: ProfileContact;
  skills: string[];
  experience: ProfileExperience[];
  education: ProfileEducation[];
  projects: ProfileProject[];
  certifications: string[];
  awards?: string[];
}

export interface ResumeAnalysis extends ProfileStructured {
  raw_text?: string;
  parse_error?: boolean;
}

export interface GitHubAnalysisResponse {
  type: 'user_profile' | 'repository';
  username?: string;
  repo?: string;
  description?: string;
  stars?: number;
  total_repos?: number;
  repos_analyzed?: Array<{
    name: string;
    language?: string;
    stars: number;
  }>;
  languages?: Record<string, number>;
  dependencies?: {
    python: string[];
    javascript: string[];
    other?: string[];
  };
  topics?: string[];
  primary_language?: string;
  frameworks?: string[];
  skill_level?: string;
  skills_identified?: string[];
  code_patterns?: string[];
  summary?: string;
}

export interface ResumeFileResponse {
  markdown: string;
  structured: ProfileStructured | null;
  pages: number;
  success: boolean;
  error?: string;
  structured_parse_error?: boolean;
}

export interface GapAnalysis {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  strengths: string[];
  areas_to_improve: string[];
  jd_analysis?: {
    required_skills?: string[];
    preferred_skills?: string[];
  };
  profile_skills?: string[];
  matching_required?: string[];
  missing_required?: string[];
  matching_preferred?: string[];
  missing_preferred?: string[];
  score_breakdown?: {
    required_matched?: number;
    required_total?: number;
    preferred_matched?: number;
    preferred_total?: number;
    required_score?: number;
    preferred_score?: number;
  };
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

// Common fetch options with credentials
const fetchOptions = {
  credentials: 'include' as RequestCredentials,
};

export interface FixtureProfile {
  name: string;
  skills_count: number;
}

export interface FixturesResponse {
  profiles: FixtureProfile[];
  test_mode: boolean;
}

export interface FixtureJD {
  title: string;
  company: string;
}

export interface FixtureJDsResponse {
  jds: FixtureJD[];
  test_mode: boolean;
}

export interface FixtureJDDetailResponse {
  title: string;
  company: string;
  raw_text: string;
  success: boolean;
}

export const analysisAPI = {
  /**
   * [TEST_MODE] Get available fixture profiles
   */
  async getFixtures(): Promise<FixturesResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/fixtures`, fetchOptions);
    return handleResponse<FixturesResponse>(response);
  },

  /**
   * [TEST_MODE] Load a fixture profile by name (no file upload needed)
   */
  async loadFixture(name: string): Promise<ResumeFileResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/fixtures/${encodeURIComponent(name)}`, fetchOptions);
    return handleResponse<ResumeFileResponse>(response);
  },

  /**
   * [TEST_MODE] Get available fixture JDs
   */
  async getFixtureJDs(): Promise<FixtureJDsResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/fixtures/jd`, fetchOptions);
    return handleResponse<FixtureJDsResponse>(response);
  },

  /**
   * [TEST_MODE] Load a fixture JD by title
   */
  async loadFixtureJD(title: string): Promise<FixtureJDDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/fixtures/jd/detail?title=${encodeURIComponent(title)}`, fetchOptions);
    return handleResponse<FixtureJDDetailResponse>(response);
  },

  /**
   * Analyze resume text
   */
  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    const response = await fetch(`${API_BASE_URL}/analyze/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText }),
      ...fetchOptions,
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

    const url = `${API_BASE_URL}/analyze/resume/file?extract_structured=${extractStructured}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      ...fetchOptions,
    });
    return handleResponse<ResumeFileResponse>(response);
  },

  /**
   * Perform gap analysis between profile and JD
   */
  async analyzeGap(profile: ProfileStructured, jdText: string): Promise<GapAnalysis> {
    const response = await fetch(`${API_BASE_URL}/analyze/gap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, jd_text: jdText }),
      ...fetchOptions,
    });
    return handleResponse<GapAnalysis>(response);
  },

  /**
   * Analyze GitHub repository or profile
   */
  async analyzeGitHub(repoUrl: string): Promise<GitHubAnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl }),
      ...fetchOptions,
    });
    return handleResponse<GitHubAnalysisResponse>(response);
  },

  /**
   * Scrape job description from URL
   */
  async scrapeJD(url: string): Promise<JDScrapedResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/jd/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      ...fetchOptions,
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
    const response = await fetch(`${API_BASE_URL}/interview/`, fetchOptions);
    return handleResponse(response);
  },
  /**
   * Start interview session
   */
  async startInterview(
    profile: ProfileStructured,
    jdText: string,
    persona: 'professional' | 'friendly' | 'challenging' = 'professional',
    maxQuestions: number = 5
  ): Promise<InterviewSession> {
    const response = await fetch(`${API_BASE_URL}/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        jd_text: jdText,
        persona,
        max_questions: maxQuestions,
      }),
      ...fetchOptions,
    });
    return handleResponse<InterviewSession>(response);
  },
  /**
   * Respond to current question
   */
  async respond(sessionId: string, answer: string): Promise<InterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/interview/${sessionId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
      ...fetchOptions,
    });
    return handleResponse<InterviewResponse>(response);
  },
  /**
   * Get interview feedback
   */
  async getFeedback(sessionId: string): Promise<InterviewFeedback> {
    const response = await fetch(`${API_BASE_URL}/interview/${sessionId}/feedback`, fetchOptions);
    return handleResponse<InterviewFeedback>(response);
  },
  /**
   * End Agent-mode session and create server-side session for feedback
   */
  async endSession(
    conversation: Array<{ role: string; content: string; timestamp: string }>,
    profile: Record<string, unknown> = {},
    jdText: string = '',
    persona: string = 'professional',
  ): Promise<{ session_id: string }> {
    const response = await fetch(`${API_BASE_URL}/interview/end-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation,
        profile,
        jd_text: jdText,
        persona,
      }),
      ...fetchOptions,
    });
    return handleResponse<{ session_id: string }>(response);
  },
};

export interface InterviewSession {
  session_id: string;
  question: string;
  question_number: number;
  total_questions: number;
  persona: string;
}

export interface InterviewResponse {
  session_id: string;
  status: 'in_progress' | 'completed';
  message?: string;
  question?: string;
  question_number?: number;
  total_questions?: number;
}

export interface InterviewFeedback {
  session_id: string;
  total_questions: number;
  duration_seconds: number;
  conversation: Array<{ role: string; content: string; timestamp: string }>;
  feedback_summary: string;
  scores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  sample_answers: Array<{ question: string; suggestion: string }>;
}

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
        available_hours_per_week: hoursPerWeek,
        weeks,
      }),
      ...fetchOptions,
    });
    return handleResponse<Roadmap>(response);
  },

  /**
   * Mark a todo as completed
   */
  async completeTodo(todoId: number): Promise<RoadmapTodoCompleteResponse> {
    const url = `${API_BASE_URL}/roadmap/todo/complete?todo_id=${todoId}`;
    const response = await fetch(url, {
      method: 'POST',
      ...fetchOptions,
    });
    return handleResponse<RoadmapTodoCompleteResponse>(response);
  },
};

export interface RoadmapTodoCompleteResponse {
  status: string;
  message: string;
  todo_id: number;
}

// ============ Problem Types ============

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'coding' | 'quiz' | 'practical';
  starter_code?: string;
  language?: string;
  hints?: string[];
  skill?: string;
  week_number?: number;
  solution?: string;
  explanation?: string;
}

export interface EvaluationResult {
  success: boolean;
  feedback: string;
  score?: number;
  test_results?: {
    passed: number;
    failed: number;
    details?: string[];
  };
}

export interface GenerateProblemsRequest {
  week_number: number;
  skills: string[];
  count?: number;
}

export const problemAPI = {
  /**
   * Get a specific problem by ID
   */
  async getProblem(problemId: string): Promise<Problem> {
    const response = await fetch(`${API_BASE_URL}/roadmap/problem/${problemId}`, {
      method: 'GET',
      ...fetchOptions,
    });
    return handleResponse<Problem>(response);
  },

  /**
   * Evaluate a solution for a problem
   * @param problem - 문제 정보 (서버에 문제가 없을 경우 사용)
   */
  async evaluateSolution(problemId: string, code: string, problem?: Problem): Promise<EvaluationResult> {
    const response = await fetch(`${API_BASE_URL}/roadmap/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_id: problemId,
        solution: code,
        problem: problem ? {
          title: problem.title,
          description: problem.description,
          skill: problem.skill,
          difficulty: problem.difficulty,
          hints: problem.hints,
        } : undefined,
      }),
      ...fetchOptions,
    });
    return handleResponse<EvaluationResult>(response);
  },

  /**
   * Generate problems for a specific week
   */
  async generateProblems(request: GenerateProblemsRequest): Promise<Problem[]> {
    const response = await fetch(`${API_BASE_URL}/roadmap/problems/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      ...fetchOptions,
    });
    return handleResponse<Problem[]>(response);
  },
};

// ============ Profile Types ============

export interface ProfileSaveRequest {
  profile_data?: ProfileStructured | null;
  resume_file_result?: ResumeFileResponse | null;
  github_analysis?: GitHubAnalysisResponse | null;
  gap_analysis?: GapAnalysis | null;
  jd_text?: string | null;
  github_url?: string | null;
}

export interface ProfileResponse {
  user_id: string;
  profile_data: ProfileStructured | null;
  resume_file_result: ResumeFileResponse | null;
  github_analysis: GitHubAnalysisResponse | null;
  gap_analysis: GapAnalysis | null;
  jd_text: string | null;
  github_url: string | null;
}

export const profileAPI = {
  /**
   * Get current user's profile from server
   */
  async getMyProfile(): Promise<ProfileResponse> {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      method: 'GET',
      ...fetchOptions,
    });
    return handleResponse<ProfileResponse>(response);
  },

  /**
   * Save current user's profile to server
   */
  async saveMyProfile(data: ProfileSaveRequest): Promise<ProfileResponse> {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...fetchOptions,
    });
    return handleResponse<ProfileResponse>(response);
  },
};

export default { analysisAPI, interviewAPI, roadmapAPI, profileAPI, problemAPI };
