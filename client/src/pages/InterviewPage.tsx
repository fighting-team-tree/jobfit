import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Phone, PhoneOff, Volume2, Loader2, AlertCircle, Settings, Clock, MessageSquare, User, FileText, ChevronDown, X, FlaskConical, Plus, Target } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { analysisAPI, interviewAPI } from '../lib/api';
import { useProfileStore, useInterviewStore } from '../lib/store';

const API_BASE = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

// ============ 유틸리티 함수 ============

function formatProfileForAgent(profile: Record<string, unknown>): string {
    const parts: string[] = [];
    if (profile.name) parts.push(`이름: ${profile.name}`);
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        parts.push(`보유 기술: ${profile.skills.join(', ')}`);
    }
    if (Array.isArray(profile.experience) && profile.experience.length > 0) {
        const expSummary = profile.experience.map((exp: any) =>
            `${exp.company || ''} ${exp.role || ''} (${exp.duration || ''})`
        ).join(' / ');
        parts.push(`경력: ${expSummary}`);
    }
    if (Array.isArray(profile.projects) && profile.projects.length > 0) {
        const projSummary = profile.projects.map((p: any) =>
            `${p.name || ''}(${Array.isArray(p.tech_stack) ? p.tech_stack.join(',') : ''})`
        ).join(' / ');
        parts.push(`프로젝트: ${projSummary}`);
    }
    if (Array.isArray(profile.certifications) && profile.certifications.length > 0) {
        parts.push(`자격증: ${profile.certifications.join(', ')}`);
    }
    if (Array.isArray(profile.education) && profile.education.length > 0) {
        const eduSummary = profile.education.map((e: any) =>
            `${e.school || ''} ${e.major || ''}`
        ).join(' / ');
        parts.push(`학력: ${eduSummary}`);
    }
    return parts.length > 0 ? parts.join('\n') : JSON.stringify(profile).slice(0, 500);
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface FocusTopic {
    label: string;
    category: 'skill' | 'project' | 'experience';
}

function extractTopicsFromProfile(profile: Record<string, unknown>): FocusTopic[] {
    const topics: FocusTopic[] = [];
    if (Array.isArray(profile.skills)) {
        profile.skills.slice(0, 8).forEach((skill: string) => {
            topics.push({ label: skill, category: 'skill' });
        });
    }
    if (Array.isArray(profile.projects)) {
        profile.projects.slice(0, 4).forEach((p: any) => {
            if (p.name) topics.push({ label: p.name, category: 'project' });
        });
    }
    if (Array.isArray(profile.experience)) {
        profile.experience.slice(0, 3).forEach((e: any) => {
            const expLabel = [e.role, e.company].filter(Boolean).join(' @ ');
            if (expLabel) topics.push({ label: expLabel, category: 'experience' });
        });
    }
    return topics;
}

type InterviewType = 'technical' | 'behavioral' | 'comprehensive';

const INTERVIEW_TYPES: { value: InterviewType; label: string; description: string }[] = [
    { value: 'comprehensive', label: '종합 면접', description: '기술 + 행동 질문을 골고루' },
    { value: 'technical', label: '기술 면접', description: '기술 역량과 문제 해결력 중심' },
    { value: 'behavioral', label: '행동 면접', description: '경험, 협업, 상황 대처 중심' },
];

// ============ 메인 컴포넌트 ============

export default function InterviewPage() {
    const navigate = useNavigate();
    const { profile: resumeAnalysis, setProfile } = useProfileStore();
    const {
        startSession, endSession, addMessage, clearConversation,
        conversation: chatHistory, persona, jdText, profileData,
    } = useInterviewStore();

    const [status, setStatus] = useState<string>('준비');
    const [agentIdInput, setAgentIdInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [isAutoLoading, setIsAutoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEnding, setIsEnding] = useState(false);

    // TEST_MODE 상태
    const [testMode, setTestMode] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);

    // 면접 유형 선택
    const [interviewType, setInterviewType] = useState<InterviewType>('comprehensive');
    // 집중 질문 주제
    const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
    const [customTopic, setCustomTopic] = useState('');
    const [customTopics, setCustomTopics] = useState<string[]>([]);
    // [신규] 면접 전 미리보기 확인 단계
    const [showPreview, setShowPreview] = useState(false);
    // [신규] 종료 확인 모달
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    // [신규] 경과 시간 타이머
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    // [신규] 자동 스크롤
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolled, setIsUserScrolled] = useState(false);

    // 프로필 결정: InterviewStore 우선, 없으면 ProfileStore
    const effectiveProfile = profileData || resumeAnalysis;

    // 면접관 메시지 수 (질문 수 추정)
    const questionCount = chatHistory.filter(m => m.role === 'interviewer').length;

    // 프로필에서 주제 후보 추출
    const availableTopics = effectiveProfile ? extractTopicsFromProfile(effectiveProfile) : [];

    const toggleTopic = (label: string) => {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const addCustomTopic = () => {
        const trimmed = customTopic.trim();
        if (trimmed && !customTopics.includes(trimmed)) {
            setCustomTopics(prev => [...prev, trimmed]);
            setSelectedTopics(prev => new Set(prev).add(trimmed));
            setCustomTopic('');
        }
    };

    // ElevenLabs Conversation Hook (useEffect보다 먼저 선언)
    const conversation = useConversation({
        onConnect: () => {
            console.log('[ElevenLabs] Connected');
            setStatus('연결됨');
            setError(null);
        },
        onDisconnect: () => {
            console.log('[ElevenLabs] Disconnected');
            setStatus('연결 종료');
        },
        onMessage: (message) => {
            console.log('[ElevenLabs] Message:', message);
            if (message.source === 'user' || message.source === 'ai') {
                addMessage(
                    message.source === 'ai' ? 'interviewer' : 'user',
                    message.message
                );
            }
        },
        onError: (err: unknown) => {
            console.error('[ElevenLabs] Error:', err);
            setError(`연결 오류: ${err instanceof Error ? err.message : String(err)}`);
            setStatus('에러');
        },
    });

    // TEST_MODE 감지 + 프로필 없으면 fixture 자동 로드
    useEffect(() => {
        analysisAPI.getFixtures().then(async (res) => {
            setTestMode(res.test_mode);
            if (!effectiveProfile && res.test_mode && res.profiles.length > 0) {
                setIsAutoLoading(true);
                try {
                    const result = await analysisAPI.loadFixture(res.profiles[0].name);
                    if (result.structured) {
                        setProfile(result.structured);
                    }
                } catch {
                    // fixture 로드 실패 시 기존 동작 유지
                } finally {
                    setIsAutoLoading(false);
                }
            }
        }).catch(() => {});
    }, [effectiveProfile, setProfile]);

    // 경과 시간 타이머
    useEffect(() => {
        if (conversation.status !== 'connected') return;
        if (!startTimeRef.current) startTimeRef.current = Date.now();

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
            setElapsedTime(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [conversation.status]);

    // 대화 자동 스크롤
    useEffect(() => {
        if (!isUserScrolled && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isUserScrolled]);

    const handleChatScroll = () => {
        const el = chatContainerRef.current;
        if (!el) return;
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        setIsUserScrolled(!isAtBottom);
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setIsUserScrolled(false);
    };

    // [신규] 면접 시작 전 미리보기 → 확인 후 실제 시작
    const handlePreStartInterview = () => {
        setShowPreview(true);
    };

    // Start Interview Handler
    const handleStartInterview = async () => {
        setShowPreview(false);
        try {
            setError(null);
            setStatus('인증 토큰 요청 중...');

            const response = await fetch(`${API_BASE}/interview/agent-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            let agentId = data.agent_id;
            const signedUrl = data.signed_url;

            if (!agentId && agentIdInput) {
                agentId = agentIdInput;
            }

            if (!agentId) {
                setError('Agent ID가 설정되지 않았습니다. 설정 버튼을 눌러 ID를 입력하거나 서버 .env의 ELEVENLABS_AGENT_ID를 확인하세요.');
                setStatus('설정 필요');
                return;
            }

            setStatus('연결 중...');

            // 프로필/JD를 동적 변수로 주입
            const profileSummary = effectiveProfile
                ? formatProfileForAgent(effectiveProfile)
                : '프로필 정보 없음';
            const jdSummary = jdText || '채용공고 정보 없음';

            // 면접 유형에 따른 추가 지시
            const typeInstruction = interviewType === 'technical'
                ? '기술 면접입니다. 기술 역량, 코딩 능력, 시스템 설계, 문제 해결력 위주로 질문하세요.'
                : interviewType === 'behavioral'
                ? '행동 면접입니다. 과거 경험, 팀 협업, 갈등 해결, 리더십 위주로 질문하세요. STAR 기법으로 답변을 유도하세요.'
                : '종합 면접입니다. 기술 질문과 행동 질문을 균형 있게 섞어서 질문하세요.';

            // signedUrl이 있으면 사용 (private agent), 없으면 agentId로 연결 (public agent)
            const startOptions: any = signedUrl
                ? { signedUrl }
                : { agentId };

            // 선택된 집중 주제
            const allSelectedTopics = [...selectedTopics];
            const focusSection = allSelectedTopics.length > 0
                ? `\n\n## 집중 질문 주제 (지원자 선택)\n다음 주제를 반드시 1개 이상 질문에 포함하세요. 지원자가 직접 선택한 주제이므로 프로필 내용을 깊이 파고드세요:\n${allSelectedTopics.map(t => `- ${t}`).join('\n')}`
                : '';

            // 시스템 프롬프트를 코드에서 직접 override
            const systemPrompt = `You are a senior technical interviewer at a leading Korean IT company. Your name is 김면접. You conduct interviews in Korean.

## Your Role
- You are interviewing a candidate for a software engineering position.
- You are professional, calm, and thorough.
- Your goal is to accurately assess the candidate's technical skills, problem-solving ability, and cultural fit.

## Interview Type
${typeInstruction}

## Interview Structure (5 questions total)
Follow this structure naturally — do NOT announce the phases.
1. Opening (1 question): Warm greeting → self-introduction and motivation
2. Technical / Behavioral Deep-dive (2-3 questions): Based on profile and JD
3. Closing (1 question): Wrap up professionally

## Candidate Profile
${profileSummary}

## Job Description
${jdSummary}
${focusSection}

## Priority Rules
- ALWAYS base your questions on the candidate's profile above. Reference their specific skills, projects, and experience.
- When asking about a skill from the profile, ask HOW they used it, not IF they know it.
- Avoid generic questions. Every question should connect to something in the profile or JD.

## Rules
- Speak ONLY in Korean (한국어). Technical terms in English are OK.
- Ask ONE question at a time. Wait for the response before proceeding.
- Keep questions concise (2-3 sentences max).
- Listen actively — reference what the candidate just said in follow-ups.
- If answer is vague: "조금 더 구체적으로 설명해주실 수 있을까요?"
- Do NOT reveal evaluation during the interview.
- After 5 questions: "오늘 면접은 여기까지입니다. 수고하셨습니다."
- Keep speaking turns short — this is a voice conversation.`;

            // overrides로 시스템 프롬프트 + 첫 메시지 주입
            startOptions.overrides = {
                agent: {
                    prompt: { prompt: systemPrompt },
                    firstMessage: '안녕하세요, 오늘 면접을 담당하게 된 김면접입니다. 편하게 대화하듯 진행하겠습니다. 먼저 간단한 자기소개와 함께 이번 포지션에 지원하신 동기를 말씀해주시겠어요?',
                },
            };

            await conversation.startSession(startOptions);

            startTimeRef.current = Date.now();
            setElapsedTime(0);
            startSession('agent-session', 5);
            setStatus('면접 진행 중');

        } catch (e: any) {
            console.error(e);
            setError(`면접 시작에 실패했습니다: ${e.message}`);
            setStatus('시작 실패');
        }
    };

    // [신규] 종료 확인 후 실제 종료
    const handleEndInterview = async () => {
        setShowEndConfirm(false);
        setIsEnding(true);
        try {
            await conversation.endSession();

            // 대화 기록을 서버에 전송하여 세션 생성
            if (chatHistory.length > 0) {
                const serverConversation = chatHistory.map(m => ({
                    role: m.role === 'interviewer' ? 'interviewer' : 'candidate',
                    content: m.content,
                    timestamp: new Date(m.timestamp).toISOString(),
                }));

                const result = await interviewAPI.endSession(
                    serverConversation,
                    effectiveProfile || {},
                    jdText,
                    persona,
                );

                endSession();
                startTimeRef.current = null;
                navigate(`/interview/feedback/${result.session_id}`);
                return;
            }

            endSession();
            startTimeRef.current = null;
        } catch (e: any) {
            console.error('End session failed:', e);
            endSession();
            setError('면접 종료 처리 중 오류가 발생했습니다.');
        } finally {
            setIsEnding(false);
        }
    };

    // TEST_MODE: 면접 건너뛰고 바로 피드백 화면으로
    const handleSkipToFeedback = async () => {
        setIsSkipping(true);
        try {
            const mockConversation = [
                { role: 'interviewer', content: '안녕하세요, 간단한 자기소개와 지원 동기를 말씀해주세요.', timestamp: new Date().toISOString() },
                { role: 'candidate', content: '안녕하세요, 3년차 백엔드 개발자입니다. Python과 FastAPI를 주로 사용하고, 최근에는 React로 풀스택 개발도 하고 있습니다. 이 포지션에서 제 백엔드 경험을 살리면서 새로운 기술 스택도 배울 수 있을 것 같아 지원했습니다.', timestamp: new Date().toISOString() },
                { role: 'interviewer', content: 'FastAPI를 사용한 프로젝트에서 가장 어려웠던 기술적 문제가 있었나요?', timestamp: new Date().toISOString() },
                { role: 'candidate', content: '실시간 데이터 처리가 필요한 프로젝트에서 WebSocket과 비동기 처리를 구현할 때 메모리 누수 문제가 있었습니다. asyncio와 connection pool 관리를 최적화해서 해결했습니다.', timestamp: new Date().toISOString() },
                { role: 'interviewer', content: '팀에서 기술적 의견 충돌이 있었을 때 어떻게 해결하셨나요?', timestamp: new Date().toISOString() },
                { role: 'candidate', content: '데이터를 기반으로 의사결정하자고 제안했습니다. 벤치마크 테스트를 돌려 성능 비교 결과를 공유하고, 팀원들과 함께 최적의 방안을 선택했습니다.', timestamp: new Date().toISOString() },
                { role: 'interviewer', content: '마지막으로 저희 팀이나 포지션에 대해 궁금한 점이 있으신가요?', timestamp: new Date().toISOString() },
                { role: 'candidate', content: '팀의 코드 리뷰 문화와 기술 스택 선택 과정이 궁금합니다. 또한 신규 입사자 온보딩 프로세스가 어떻게 되는지 알고 싶습니다.', timestamp: new Date().toISOString() },
            ];

            const result = await interviewAPI.endSession(
                mockConversation,
                effectiveProfile || {},
                jdText || '백엔드 개발자 채용. 자격요건: Python, FastAPI, PostgreSQL, Docker. 우대사항: React, TypeScript, AWS.',
                persona,
            );

            navigate(`/interview/feedback/${result.session_id}`);
        } catch (e: any) {
            setError(`피드백 생성 실패: ${e.message}`);
        } finally {
            setIsSkipping(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        setStatus('준비');
        clearConversation();
        startTimeRef.current = null;
        setElapsedTime(0);
    };

    // Check prerequisites
    if (!effectiveProfile) {
        if (isAutoLoading) {
            return (
                <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
                        <h1 className="text-xl font-bold mb-2">테스트 프로필 로딩 중...</h1>
                        <p className="text-neutral-400 text-sm">TEST MODE: fixture 프로필을 자동으로 불러오고 있습니다.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">프로필 설정이 필요합니다</h1>
                    <Link to="/profile" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg mt-4 inline-block">
                        프로필 설정으로 이동
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="font-bold text-xl tracking-tight">JobFit AI</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        {/* 면접 중 진행 상태 표시 */}
                        {conversation.status === 'connected' && (
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5 text-neutral-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-neutral-400">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>질문 {questionCount}개</span>
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                            </div>
                        )}
                        <button onClick={() => setShowSettings(!showSettings)} className="text-neutral-400 hover:text-white">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute top-16 right-6 bg-neutral-800 p-4 rounded-lg border border-white/10 z-50 w-80 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">설정</h3>
                        <button onClick={() => setShowSettings(false)} className="text-neutral-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <label className="block text-xs text-neutral-400 mb-1">Agent ID</label>
                    <input
                        type="text"
                        value={agentIdInput}
                        onChange={(e) => setAgentIdInput(e.target.value)}
                        placeholder="ElevenLabs Agent ID 입력"
                        className="w-full bg-neutral-900 border border-white/20 rounded px-2 py-1 text-sm mb-2"
                    />
                    <p className="text-xs text-neutral-500">
                        * 서버 .env에 ELEVENLABS_AGENT_ID를 설정하면 자동 로드됩니다.
                    </p>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="mx-6 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                    <button
                        onClick={handleRetry}
                        className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                    >
                        다시 시도
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                {conversation.status !== 'connected' ? (
                    // ============ Start Screen ============
                    <div className="text-center w-full max-w-2xl">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-violet-500/20 flex items-center justify-center animate-pulse-slow">
                            <Mic className="w-12 h-12 text-violet-400" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4">AI 실시간 면접</h1>
                        <p className="text-neutral-400 mb-8">
                            ElevenLabs Conversational AI가 면접을 진행합니다.<br />
                            자연스럽게 대화하고, 언제든 말을 끊을 수 있습니다.
                        </p>

                        {/* [신규] 면접 유형 선택 */}
                        <div className="mb-8 max-w-md mx-auto">
                            <p className="text-sm text-neutral-400 mb-3">면접 유형</p>
                            <div className="grid grid-cols-3 gap-2">
                                {INTERVIEW_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setInterviewType(type.value)}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            interviewType === type.value
                                                ? 'border-violet-500 bg-violet-500/10 text-white'
                                                : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20'
                                        }`}
                                    >
                                        <p className="text-sm font-medium">{type.label}</p>
                                        <p className="text-xs mt-1 opacity-70">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 집중 질문 주제 선택 */}
                        {availableTopics.length > 0 && (
                            <div className="mb-8 max-w-lg mx-auto text-left">
                                <p className="text-sm text-neutral-400 mb-3">집중 질문 주제 <span className="text-neutral-600">(선택사항)</span></p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {availableTopics.map((topic) => {
                                        const isSelected = selectedTopics.has(topic.label);
                                        const categoryStyle = topic.category === 'skill'
                                            ? 'border-violet-500/40 bg-violet-500/10'
                                            : topic.category === 'project'
                                            ? 'border-blue-500/40 bg-blue-500/10'
                                            : 'border-emerald-500/40 bg-emerald-500/10';
                                        return (
                                            <button
                                                key={topic.label}
                                                onClick={() => toggleTopic(topic.label)}
                                                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                                                    isSelected
                                                        ? `${categoryStyle} text-white ring-1 ring-white/20`
                                                        : 'border-white/10 bg-white/5 text-neutral-500 hover:text-neutral-300 hover:border-white/20'
                                                }`}
                                            >
                                                {topic.label}
                                            </button>
                                        );
                                    })}
                                    {customTopics.map((ct) => (
                                        <button
                                            key={ct}
                                            onClick={() => {
                                                toggleTopic(ct);
                                                if (selectedTopics.has(ct)) {
                                                    setCustomTopics(prev => prev.filter(t => t !== ct));
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                                                selectedTopics.has(ct)
                                                    ? 'border-amber-500/40 bg-amber-500/10 text-white ring-1 ring-white/20'
                                                    : 'border-white/10 bg-white/5 text-neutral-500'
                                            }`}
                                        >
                                            {ct}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customTopic}
                                        onChange={(e) => setCustomTopic(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomTopic()}
                                        placeholder="직접 입력 (예: 시스템 설계, 동시성 처리)"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
                                    />
                                    <button
                                        onClick={addCustomTopic}
                                        disabled={!customTopic.trim()}
                                        className="px-3 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-30 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                {selectedTopics.size > 0 && (
                                    <p className="text-xs text-violet-400 mt-2">{selectedTopics.size}개 주제 선택됨 — 면접관이 이 주제를 중심으로 질문합니다</p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handlePreStartInterview}
                            disabled={conversation.status === 'connecting'}
                            className="px-8 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-700 rounded-xl font-medium text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            {conversation.status === 'connecting' ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    연결 중...
                                </>
                            ) : (
                                <>
                                    <Phone className="w-6 h-6" />
                                    면접 시작하기
                                </>
                            )}
                        </button>
                        <p className="mt-4 text-sm text-neutral-500">{status}</p>

                        {/* TEST_MODE: 면접 건너뛰기 버튼 */}
                        {testMode && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <button
                                    onClick={handleSkipToFeedback}
                                    disabled={isSkipping}
                                    className="px-6 py-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 disabled:opacity-50 rounded-xl text-sm text-amber-300 flex items-center gap-2 mx-auto transition-colors"
                                >
                                    {isSkipping ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            피드백 생성 중...
                                        </>
                                    ) : (
                                        <>
                                            <FlaskConical className="w-4 h-4" />
                                            면접 건너뛰기 → 피드백 미리보기
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-neutral-600 mt-2">TEST MODE: 샘플 대화로 피드백 화면을 바로 확인합니다</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // ============ Active Session ============
                    <div className="w-full max-w-6xl flex gap-6 h-[80vh]">
                        {/* Visualizer */}
                        <div className="flex-1 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border border-white/5">
                            {/* 진행 상태 바 */}
                            <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                                </div>
                                <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((questionCount / 5) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-neutral-500 font-mono">{questionCount}/5</span>
                            </div>

                            <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${conversation.isSpeaking ? 'bg-violet-500 shadow-[0_0_80px_rgba(139,92,246,0.6)] scale-110' : 'bg-neutral-800'}`}>
                                <Volume2 className={`w-20 h-20 text-white ${conversation.isSpeaking ? 'animate-bounce' : ''}`} />
                            </div>
                            <div className="mt-8">
                                <span className={`px-3 py-1 rounded-full text-sm ${conversation.isSpeaking ? 'bg-violet-500/20 text-violet-300' : 'bg-neutral-800 text-neutral-400'}`}>
                                    {conversation.isSpeaking ? 'AI가 말하는 중...' : '듣고 있음...'}
                                </span>
                            </div>

                            <button
                                onClick={() => setShowEndConfirm(true)}
                                disabled={isEnding}
                                className="absolute bottom-8 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                {isEnding ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        종료 중...
                                    </>
                                ) : (
                                    <>
                                        <PhoneOff className="w-4 h-4" />
                                        면접 종료
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Transcript */}
                        <div className="w-full max-w-md bg-white/5 rounded-2xl border border-white/10 flex flex-col">
                            <div className="p-4 border-b border-white/10 bg-neutral-900/50 flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-neutral-300">실시간 대화</h3>
                                <span className="text-xs text-neutral-500">{chatHistory.length}개 메시지</span>
                            </div>
                            <div
                                className="flex-1 overflow-y-auto p-4 space-y-4 relative"
                                ref={chatContainerRef}
                                onScroll={handleChatScroll}
                            >
                                {chatHistory.map((msg: any, i: number) => (
                                    <div key={i} className={`flex ${msg.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'interviewer'
                                            ? 'bg-neutral-800 text-neutral-200 rounded-tl-none'
                                            : 'bg-violet-600 text-white rounded-tr-none'
                                            }`}>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            {/* 새 메시지 스크롤 버튼 */}
                            {isUserScrolled && chatHistory.length > 0 && (
                                <button
                                    onClick={scrollToBottom}
                                    className="absolute bottom-20 right-8 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-full shadow-lg flex items-center gap-1 transition-colors"
                                >
                                    <ChevronDown className="w-3 h-3" />
                                    새 메시지
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* ============ [신규] 프로필/JD 미리보기 모달 ============ */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-lg font-bold">면접 정보 확인</h2>
                            <p className="text-sm text-neutral-400 mt-1">아래 내용을 기반으로 면접이 진행됩니다.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* 면접 유형 */}
                            <div>
                                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>면접 유형</span>
                                </div>
                                <p className="text-sm text-white bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-2">
                                    {INTERVIEW_TYPES.find(t => t.value === interviewType)?.label} — {INTERVIEW_TYPES.find(t => t.value === interviewType)?.description}
                                </p>
                            </div>

                            {/* 프로필 요약 */}
                            <div>
                                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                                    <User className="w-4 h-4" />
                                    <span>지원자 프로필</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-neutral-200 space-y-1">
                                    {effectiveProfile && (
                                        <>
                                            {(effectiveProfile as any).name && <p><span className="text-neutral-500">이름:</span> {(effectiveProfile as any).name}</p>}
                                            {Array.isArray((effectiveProfile as any).skills) && (effectiveProfile as any).skills.length > 0 && (
                                                <p><span className="text-neutral-500">기술:</span> {(effectiveProfile as any).skills.slice(0, 10).join(', ')}{(effectiveProfile as any).skills.length > 10 ? ` 외 ${(effectiveProfile as any).skills.length - 10}개` : ''}</p>
                                            )}
                                            {Array.isArray((effectiveProfile as any).experience) && (effectiveProfile as any).experience.length > 0 && (
                                                <p><span className="text-neutral-500">경력:</span> {(effectiveProfile as any).experience.map((e: any) => `${e.company || ''} ${e.role || ''}`).join(', ')}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* JD 요약 */}
                            <div>
                                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                                    <FileText className="w-4 h-4" />
                                    <span>채용공고</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-neutral-200 max-h-32 overflow-y-auto">
                                    {jdText ? (
                                        <p className="whitespace-pre-line">{jdText.slice(0, 500)}{jdText.length > 500 ? '...' : ''}</p>
                                    ) : (
                                        <p className="text-neutral-500">채용공고 없음 (일반 면접으로 진행)</p>
                                    )}
                                </div>
                            </div>
                            {/* 선택된 집중 주제 */}
                            {selectedTopics.size > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                                        <Target className="w-4 h-4" />
                                        <span>집중 질문 주제</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[...selectedTopics].map((topic) => (
                                            <span key={topic} className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 rounded-lg text-xs text-violet-300">
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-white/10 flex gap-3">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleStartInterview}
                                className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                면접 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ [신규] 종료 확인 모달 ============ */}
            {showEndConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <PhoneOff className="w-7 h-7 text-red-400" />
                            </div>
                            <h2 className="text-lg font-bold mb-2">면접을 종료하시겠습니까?</h2>
                            <p className="text-sm text-neutral-400">
                                {questionCount > 0
                                    ? `${questionCount}개의 질문을 진행했습니다. 종료 후 AI 피드백을 받을 수 있습니다.`
                                    : '아직 질문이 시작되지 않았습니다.'}
                            </p>
                            <p className="text-xs text-neutral-500 mt-2">경과 시간: {formatTime(elapsedTime)}</p>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm transition-colors"
                            >
                                계속 진행
                            </button>
                            <button
                                onClick={handleEndInterview}
                                disabled={isEnding}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                {isEnding ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        분석 중...
                                    </>
                                ) : (
                                    '종료하기'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
