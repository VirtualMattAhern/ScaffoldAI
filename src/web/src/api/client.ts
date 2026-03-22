// In dev, Vite proxies /api to the API. In production, use VITE_API_URL (e.g. https://api.skafoldai.com/api)
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const SESSION_TOKEN_KEY = 'skafoldai_session_token';

let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(fn: (() => Promise<string | null>) | null) {
  authTokenProvider = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await authTokenProvider?.();
  if (token) return { Authorization: `Bearer ${token}` };
  try {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) return { Authorization: `Bearer ${sessionToken}` };
  } catch {}
  return {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const headers = { 'Content-Type': 'application/json', ...authHeaders, ...options?.headers } as Record<string, string>;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    me: () => request<{ id: string; email: string; displayName: string }>('/auth/me'),
    legacySession: (userId: string) =>
      request<{ user: { id: string; email: string; displayName: string }; token: string; migratedFromLegacySession: boolean }>(
        '/auth/legacy-session',
        { method: 'POST', headers: { 'X-User-Id': userId } },
      ),
  },
  goals: {
    list: () => request<{ id: string; title: string; createdAt: string }[]>('/goals'),
    create: (title: string) => request<{ id: string; title: string; createdAt: string }>('/goals', { method: 'POST', body: JSON.stringify({ title }) }),
    update: (id: string, title: string) => request<{ id: string; title: string }>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    delete: (id: string) => request<void>(`/goals/${id}`, { method: 'DELETE' }),
  },
  playbooks: {
    list: () => request<{ id: string; title: string; type: string; steps: string[]; lastUsedAt: string | null; suggestedByAi: boolean; createdAt: string }[]>('/playbooks'),
    create: (data: { title: string; type: string; steps?: string[]; suggestedByAi?: boolean }) => request('/playbooks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; type?: string; steps?: string[]; lastUsedAt?: string }) => request(`/playbooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    aiSuggest: () => request<{ playbooks: { title: string; steps: string[] }[]; explanation: string }>('/playbooks/ai-suggest', { method: 'POST' }),
    aiRefine: (id: string) => request<{ title: string; steps: string[]; explanation: string }>(`/playbooks/${id}/ai-refine`, { method: 'POST' }),
  },
  tasks: {
    list: (params?: { status?: string; type?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.type) q.set('type', params.type);
      const query = q.toString();
      return request<{ id: string; title: string; status: string; type: string; goalId?: string; dependencyTaskId?: string | null; dependencyStatus?: string | null; recurrenceRule?: 'daily' | 'weekly' | 'monthly' | null; nextStep?: string; top3Candidate: boolean; top3Rank?: number | null; colorHex?: string | null; createdAt: string }[]>(`/tasks${query ? `?${query}` : ''}`);
    },
    top3: () => request<{ id: string; title: string; status: string; dependencyTaskId?: string | null; dependencyStatus?: string | null; recurrenceRule?: 'daily' | 'weekly' | 'monthly' | null; nextStep?: string; timeboxMinutes?: number; top3Rank?: number | null; colorHex?: string | null; createdAt: string }[]>('/tasks/top3'),
    create: (data: { title: string; goalId?: string; type?: string; dependencyTaskId?: string | null; recurrenceRule?: 'daily' | 'weekly' | 'monthly' | null; nextStep?: string }) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; status?: string; dependencyTaskId?: string | null; recurrenceRule?: 'daily' | 'weekly' | 'monthly' | null; nextStep?: string; top3Candidate?: boolean; top3Rank?: number | null; colorHex?: string | null; pausedUntil?: string }) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    aiSuggestTop3: () => request<{ taskIds: string[]; explanation: string }>('/tasks/ai-suggest-top3', { method: 'POST' }),
    reprioritizeTop3: (data: { trigger: 'paused' | 'not_today'; taskId: string; lowEnergy?: boolean }) => request<{ taskIds: string[]; explanation: string }>('/tasks/ai-reprioritize-top3', { method: 'POST', body: JSON.stringify(data) }),
    weeklyReview: () => request<{ summary: string; stats: { completed: number; started: number; paused: number; top3Count: number; playbooksUsed: number } }>('/tasks/weekly-review', { method: 'POST' }),
  },
  brainDump: {
    get: () => request<{ rawText: string; convertedAt: string | null }>('/brain-dump'),
    save: (rawText: string) => request<{ rawText: string; weekStart: string }>('/brain-dump', { method: 'PUT', body: JSON.stringify({ rawText }) }),
    convert: () => request<{ message: string; goalsCreated?: number; tasksCreated?: number; explanation?: string }>('/brain-dump/convert', { method: 'POST' }),
  },
  focusSentence: {
    get: () => request<{ sentence: string }>('/focus-sentence'),
    save: (sentence: string) => request<{ sentence: string; date: string }>('/focus-sentence', { method: 'PUT', body: JSON.stringify({ sentence }) }),
    suggest: () => request<{ sentence: string }>('/focus-sentence/suggest', { method: 'POST' }),
  },
  daily: {
    helper: (params?: { activeTaskId?: string; lowEnergy?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.activeTaskId) q.set('activeTaskId', params.activeTaskId);
      if (params?.lowEnergy) q.set('lowEnergy', 'true');
      return request<{ text: string }>(`/daily/helper${q.toString() ? `?${q}` : ''}`);
    },
  },
  settings: {
    get: () => request<{ highContrast: boolean; fontSizePercent: number; dyslexiaFont: boolean; reduceMotion: boolean; focusMode: boolean; darkMode: boolean }>('/settings'),
    update: (data: { highContrast?: boolean; fontSizePercent?: number; dyslexiaFont?: boolean; reduceMotion?: boolean; focusMode?: boolean; darkMode?: boolean }) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  guided: {
    getSubSteps: (taskId: string) => request<{ steps: string[] }>(`/guided/${taskId}/substeps`),
    chat: (taskId: string, message: string, history?: { role: 'user' | 'assistant'; content: string }[]) =>
      request<{ reply: string }>(`/guided/${taskId}/chat`, { method: 'POST', body: JSON.stringify({ message, history }) }),
  },
  decisions: {
    create: (taskId: string, question: string) => request<{ id: string; question: string; options: { label: string; description: string }[] }>('/decisions', { method: 'POST', body: JSON.stringify({ taskId, question }) }),
    list: (taskId: string) => request<{ id: string; question: string; options: { label: string; description: string }[]; chosenOption: number | null; createdAt: string }[]>(`/decisions?taskId=${taskId}`),
    choose: (id: string, chosenOption: number) => request<{ id: string; chosenOption: number }>(`/decisions/${id}`, { method: 'PATCH', body: JSON.stringify({ chosenOption }) }),
  },
};
