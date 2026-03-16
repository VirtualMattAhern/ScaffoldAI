// In dev, Vite proxies /api to the API. In production, use VITE_API_URL (e.g. https://api.skafoldai.com/api)
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(fn: (() => Promise<string | null>) | null) {
  authTokenProvider = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await authTokenProvider?.();
  if (token) return { Authorization: `Bearer ${token}` };
  try {
    const raw = localStorage.getItem('skafoldai_user');
    if (!raw) return {};
    const u = JSON.parse(raw) as { id?: string };
    if (u?.id) return { 'X-User-Id': u.id };
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
  },
  goals: {
    list: () => request<{ id: string; title: string; createdAt: string }[]>('/goals'),
    create: (title: string) => request<{ id: string; title: string; createdAt: string }>('/goals', { method: 'POST', body: JSON.stringify({ title }) }),
    update: (id: string, title: string) => request<{ id: string; title: string }>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    delete: (id: string) => request<void>(`/goals/${id}`, { method: 'DELETE' }),
  },
  playbooks: {
    list: () => request<{ id: string; title: string; type: string; steps: string[]; lastUsedAt: string | null; suggestedByAi: boolean; createdAt: string }[]>('/playbooks'),
    create: (data: { title: string; type: string; steps?: string[] }) => request('/playbooks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; type?: string; steps?: string[] }) => request(`/playbooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  tasks: {
    list: (status?: string) => request<{ id: string; title: string; status: string; type: string; goalId?: string; nextStep?: string; top3Candidate: boolean; createdAt: string }[]>(`/tasks${status ? `?status=${status}` : ''}`),
    top3: () => request<{ id: string; title: string; status: string; nextStep?: string; timeboxMinutes?: number; createdAt: string }[]>('/tasks/top3'),
    create: (data: { title: string; goalId?: string; type?: string; nextStep?: string }) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { status?: string; nextStep?: string; top3Candidate?: boolean; pausedUntil?: string }) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    aiSuggestTop3: () => request<{ taskIds: string[]; explanation: string }>('/tasks/ai-suggest-top3', { method: 'POST' }),
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
    helper: (activeTaskId?: string) => request<{ text: string }>(`/daily/helper${activeTaskId ? `?activeTaskId=${activeTaskId}` : ''}`),
  },
  settings: {
    get: () => request<{ highContrast: boolean; fontSizePercent: number; dyslexiaFont: boolean }>('/settings'),
    update: (data: { highContrast?: boolean; fontSizePercent?: number; dyslexiaFont?: boolean }) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  },
};
