/**
 * AI service - Azure OpenAI integration.
 * Falls back to placeholder responses when not configured.
 */

import { logWarn } from '../observability/logger.js';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function isConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  );
}

async function chat(messages: ChatMessage[]): Promise<string> {
  if (!isConfigured()) {
    return '';
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const useV1 = process.env.AZURE_OPENAI_USE_V1 === 'true';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

  // Extract resource name for endpoint fallbacks (e.g. SkafoldAI-resource from cognitiveservices.azure.com)
  const match = endpoint.match(/https?:\/\/([^.]+)\.(openai|cognitive|services)\.(azure\.com|ai\.azure\.com)/i);
  const resourceName = match?.[1] ?? endpoint.replace(/https?:\/\//, '').split('.')[0];
  const altEndpoint = `https://${resourceName}.openai.azure.com`;

  async function doRequest(base: string, v1Format: boolean): Promise<Response> {
    const url = v1Format
      ? `${base}/openai/v1/chat/completions`
      : `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const body = v1Format
      ? { model: deployment, messages, max_tokens: 1000, temperature: 0.7 }
      : { messages, max_tokens: 1000, temperature: 0.7 };

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(body),
    });
  }

  const attempts: { base: string; v1: boolean }[] = [
    { base: endpoint, v1: useV1 },
    { base: endpoint, v1: !useV1 },
    { base: altEndpoint, v1: false },
    { base: altEndpoint, v1: true },
  ];

  let lastRes: Response | null = null;
  let lastErr = '';
  let lastUrl = '';

  for (const { base, v1 } of attempts) {
    const url = v1
      ? `${base}/openai/v1/chat/completions`
      : `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    lastUrl = url;

    const res = await doRequest(base, v1);
    lastRes = res;

    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content?.trim() ?? '';
    }

    lastErr = await res.text();
    if (res.status === 404) {
      logWarn('ai.request_retry_404', {
        statusCode: res.status,
        urlPreview: url.slice(0, 120),
      });
    } else {
      break;
    }
  }

  const hint = lastRes?.status === 404
    ? ' Check deployment name in Foundry (Build → Models) and try AZURE_OPENAI_USE_V1=true or AZURE_OPENAI_ENDPOINT=https://skafoldai-ai.openai.azure.com in .env'
    : '';
  throw new Error(`Azure OpenAI error: ${lastRes?.status ?? 'unknown'} ${lastErr}${hint}`);
}

/**
 * Convert brain dump text into goals and tasks.
 * Returns structured JSON for the frontend to create goals/tasks.
 */
export async function convertBrainDump(rawText: string): Promise<{
  goals: { title: string }[];
  tasks: { title: string; goal?: string; type: string }[];
  explanation?: string;
}> {
  if (!isConfigured()) {
    return {
      goals: [],
      tasks: [],
      explanation: 'Azure OpenAI not configured. Add your keys to src/api/.env',
    };
  }

  const systemPrompt = `You are a helpful assistant that converts a business owner's brain dump into structured goals and tasks.
Given raw notes or bullet points, output a JSON object with:
- "goals": array of { "title": string } - higher-level objectives (e.g., "Grow business", "Pay vendors")
- "tasks": array of { "title": string, "goal": string (optional, matches a goal title), "type": "one_off" | "repeat" | "playbook" }
- "explanation": brief plain-language explanation of what you did and why (1-2 sentences)

Keep goals broad. Match tasks to goals when obvious. Use "one_off" for most tasks.
Output ONLY valid JSON, no markdown or extra text.`;

  const userPrompt = `Convert this brain dump into goals and tasks:\n\n${rawText}`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    const parsed = JSON.parse(content) as { goals?: { title: string }[]; tasks?: { title: string; goal?: string; type: string }[]; explanation?: string };
    return {
      goals: parsed.goals ?? [],
      tasks: parsed.tasks ?? [],
      explanation: parsed.explanation,
    };
  } catch {
    return { goals: [], tasks: [], explanation: content || 'Parse error' };
  }
}

/**
 * Suggest a focus sentence for today based on top tasks.
 */
export async function suggestFocusSentence(taskTitles: string[]): Promise<string> {
  if (!isConfigured()) {
    return "Today is for: moving the business forward without overload";
  }

  const systemPrompt = `You suggest a short, encouraging focus sentence for a business owner's day.
Given their top tasks, write ONE sentence that captures the theme (e.g., "Today is for: inventory, content, and staying on top of customer questions").
Keep it under 15 words. Be concrete and reassuring. No fluff.`;

  const userPrompt = `Top tasks for today: ${taskTitles.join(', ') || 'None yet'}`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return content || "Today is for: moving the business forward without overload";
}

/**
 * Suggest which 3 tasks should be today's "Top 3" based on the weekly list.
 */
export async function suggestTop3(
  tasks: { id: string; title: string; status: string; type: string; createdAt: string }[]
): Promise<{ taskIds: string[]; explanation: string }> {
  if (!isConfigured()) {
    const open = tasks.filter((t) => t.status === 'open').slice(0, 3);
    return {
      taskIds: open.map((t) => t.id),
      explanation: 'Azure OpenAI not configured. Showing first 3 open tasks.',
    };
  }

  const systemPrompt = `You help prioritize a business owner's weekly tasks into their "Top 3" for today.
Given a list of tasks with id, title, status, type, and age, pick the 3 that would have the highest impact today.
Consider: business impact, urgency, dependencies, and how long tasks have been open.
Output a JSON object with:
- "taskIds": array of exactly 3 task ids (or fewer if less than 3 open tasks)
- "explanation": 1-2 sentences explaining why you picked these (plain language, reassuring tone)

Output ONLY valid JSON.`;

  const taskList = tasks
    .filter((t) => t.status === 'open')
    .map((t) => `id: ${t.id}, title: ${t.title}, type: ${t.type}, created: ${t.createdAt}`)
    .join('\n');

  const userPrompt = `Tasks:\n${taskList || 'No open tasks'}`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    const parsed = JSON.parse(content) as { taskIds?: string[]; explanation?: string };
    return {
      taskIds: parsed.taskIds ?? [],
      explanation: parsed.explanation ?? 'Selected based on impact and urgency.',
    };
  } catch {
    return { taskIds: [], explanation: content || 'Could not parse suggestion.' };
  }
}

export async function reprioritizeTop3(input: {
  trigger: 'paused' | 'not_today';
  taskId: string;
  lowEnergy?: boolean;
  currentTop3: { id: string; title: string; status: string; type: string; createdAt: string }[];
  availableTasks: { id: string; title: string; status: string; type: string; createdAt: string }[];
}): Promise<{ taskIds: string[]; explanation: string }> {
  const remaining = input.availableTasks.filter((task) => task.id !== input.taskId && task.status === 'open');
  if (!isConfigured()) {
    const fallback = remaining.slice(0, 3);
    return {
      taskIds: fallback.map((task) => task.id),
      explanation:
        input.trigger === 'not_today'
          ? 'I swapped in the next open tasks so your Top 3 stays realistic for today.'
          : 'I rebalanced your Top 3 after that pause so you still have a clear next path.',
    };
  }

  const energyHint = input.lowEnergy ? 'The user marked low energy today, so prefer lighter or clearer tasks first.' : '';
  const systemPrompt = `You help rebalance today's Top 3 when someone pauses or skips a task.
Given the current Top 3, the triggering event, and the remaining open tasks, return a JSON object with:
- "taskIds": up to 3 task ids in the new recommended order
- "explanation": 1-2 short sentences explaining the reshuffle in plain reassuring language

Keep the list realistic, reduce overload, and keep momentum. ${energyHint}
Output ONLY valid JSON.`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Trigger: ${input.trigger}\nChanged task id: ${input.taskId}\nCurrent Top 3:\n${input.currentTop3.map((task) => `${task.id} | ${task.title} | ${task.status}`).join('\n')}\n\nAvailable open tasks:\n${remaining.map((task) => `${task.id} | ${task.title} | ${task.type} | ${task.createdAt}`).join('\n')}`,
    },
  ]);

  try {
    const parsed = JSON.parse(content) as { taskIds?: string[]; explanation?: string };
    return {
      taskIds: (parsed.taskIds ?? []).slice(0, 3),
      explanation: parsed.explanation ?? 'I rebalanced the list to keep today realistic.',
    };
  } catch {
    return {
      taskIds: remaining.slice(0, 3).map((task) => task.id),
      explanation: content || 'I rebalanced the list to keep today realistic.',
    };
  }
}

/**
 * Suggest contextual helper text for the Daily screen.
 * - No active task: which task to start first and why
 * - With active task: task-specific guidance for that task
 */
export async function suggestDailyHelper(
  taskTitles: string[],
  activeTaskTitle?: string,
  lowEnergy?: boolean
): Promise<string> {
  if (!isConfigured()) {
    return taskTitles.length > 0
      ? `Start with the first task. You've got this.`
      : `Add tasks in Weekly Planning, then use AI Suggest Top 3.`;
  }

  const energyHint = lowEnergy ? ' The user indicated low energy — suggest the easiest or quickest task first.' : '';

  const systemPrompt = activeTaskTitle
    ? `You give brief, practical guidance for someone working on a specific task.
Given the task title, write 1-2 sentences of encouragement and a concrete tip. Match the task's domain (e.g., music/creative, retail, admin). No generic inventory/sales advice unless the task is about that.
Be specific to the task. No fluff.${energyHint}`
    : `You suggest which task to start first from a list of today's tasks.
Write 1-2 sentences: which task to start and why (e.g., "Start with X—it unblocks the next step" or "X first, then Y flows naturally").
Match the tasks' domain. No generic inventory/sales language unless the tasks are about that. Be concrete and reassuring.${energyHint}`;

  const userPrompt = activeTaskTitle
    ? `Active task: ${activeTaskTitle}`
    : `Today's tasks: ${taskTitles.join(', ') || 'None'}`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return content || (taskTitles.length > 0 ? 'Start with the first task.' : 'Add tasks in Weekly Planning.');
}

/**
 * Task-scoped chat: in-context AI help for a specific task.
 */
export async function taskChat(
  taskTitle: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  if (!isConfigured()) {
    return "AI isn't configured. Try breaking the task into smaller steps yourself.";
  }

  const systemPrompt = `You help someone working on a specific task. They can ask for advice, clarification, or encouragement.
Task: ${taskTitle}
Keep responses brief (2-4 sentences). Be concrete and actionable. No fluff.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: userMessage },
  ];

  return chat(messages) || "I'm not sure how to help with that. Try breaking it into smaller steps.";
}

export async function suggestWeeklyReview(input: {
  completedTasks: string[];
  startedCount: number;
  pausedCount: number;
  top3Count: number;
  playbooksUsed: number;
}): Promise<string> {
  if (!isConfigured()) {
    if (input.completedTasks.length === 0) return 'No completed tasks yet this week. Keep going.';
    return `This week you completed ${input.completedTasks.length} tasks. Wins included: ${input.completedTasks.slice(0, 3).join(', ')}.`;
  }

  const systemPrompt = `You write a short weekly wins summary for a neurodivergent-friendly productivity app.
Keep it concrete, encouraging, and non-judgmental. Mention wins, patterns, and one gentle suggestion.
Keep it to 3-4 sentences max.`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Completed tasks: ${input.completedTasks.join(', ') || 'None'}\nStarted count: ${input.startedCount}\nPaused count: ${input.pausedCount}\nTop 3 count: ${input.top3Count}\nPlaybooks used: ${input.playbooksUsed}`,
    },
  ]);

  return content || 'Your week is taking shape. Notice what helped, keep what worked, and simplify the next step.';
}

export async function generateSubSteps(taskTitle: string): Promise<string[]> {
  if (!isConfigured()) {
    return ['Start working on this task', 'Focus on the most important part first', 'Review and wrap up'];
  }

  const systemPrompt = `You break down a business task into 3-5 actionable sub-steps.
Given a task title, output a JSON array of strings — each is a clear, concrete sub-step.
Keep steps specific to the task domain. Each step should take 5-15 minutes.
Output ONLY a valid JSON array of strings, no markdown or extra text.`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Break down this task into sub-steps: ${taskTitle}` },
  ]);

  try {
    const parsed = JSON.parse(content) as string[];
    return Array.isArray(parsed) ? parsed : ['Start working on this task', 'Focus on the most important part first', 'Review and wrap up'];
  } catch {
    return ['Start working on this task', 'Focus on the most important part first', 'Review and wrap up'];
  }
}

/**
 * Suggest playbooks from completed task patterns.
 * Analyzes done tasks and suggests reusable playbooks.
 */
export async function suggestPlaybooksFromTasks(
  tasks: { id: string; title: string; type: string; completedAt: string | null }[]
): Promise<{ playbooks: { title: string; steps: string[] }[]; explanation: string }> {
  if (!isConfigured()) {
    return {
      playbooks: [],
      explanation: 'Azure OpenAI not configured. Add your keys to src/api/.env',
    };
  }

  const doneTasks = tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
    .slice(-50); // last 50 completed

  if (doneTasks.length < 3) {
    return {
      playbooks: [],
      explanation: 'Complete more tasks to detect patterns. I need at least 3 completed tasks to suggest playbooks.',
    };
  }

  const systemPrompt = `You help a business owner turn repeated task patterns into reusable playbooks.
Given a list of completed tasks (with title, type, completion order), identify 1-3 workflows that repeat.
For each pattern, output a playbook with:
- "title": short name (e.g., "Weekly inventory check")
- "steps": array of 3-6 concrete steps (each a clear action)

Output a JSON object:
- "playbooks": array of { "title": string, "steps": string[] }
- "explanation": 1-2 sentences in plain language explaining what patterns you found

Keep steps specific and actionable. Output ONLY valid JSON, no markdown.`;

  const taskList = doneTasks.map((t) => `title: ${t.title}, type: ${t.type}`).join('\n');
  const userPrompt = `Completed tasks (most recent last):\n${taskList}`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    const parsed = JSON.parse(content) as { playbooks?: { title: string; steps: string[] }[]; explanation?: string };
    const playbooks = Array.isArray(parsed.playbooks)
      ? parsed.playbooks.filter((p) => p?.title && Array.isArray(p.steps))
      : [];
    return {
      playbooks,
      explanation: parsed.explanation ?? 'I found some patterns in your completed tasks.',
    };
  } catch {
    return { playbooks: [], explanation: content || 'Could not parse suggestions.' };
  }
}

export async function refinePlaybookWithAi(input: {
  title: string;
  steps: string[];
  relatedTasks: string[];
}): Promise<{ title: string; steps: string[]; explanation: string }> {
  if (!isConfigured()) {
    return {
      title: input.title,
      steps: input.steps,
      explanation: 'AI is not configured, so I kept the current playbook as-is.',
    };
  }

  const systemPrompt = `You improve an existing playbook based on how related tasks have been completed.
Return a JSON object with:
- "title": an improved concise title
- "steps": array of 3-8 refined steps
- "explanation": 1-2 sentences explaining what changed

Keep the structure simple and actionable. Output ONLY valid JSON.`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Current playbook title: ${input.title}\nCurrent steps:\n${input.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nRecent related completed tasks:\n${input.relatedTasks.join('\n') || 'None'}`,
    },
  ]);

  try {
    const parsed = JSON.parse(content) as { title?: string; steps?: string[]; explanation?: string };
    return {
      title: parsed.title || input.title,
      steps: Array.isArray(parsed.steps) && parsed.steps.length > 0 ? parsed.steps : input.steps,
      explanation: parsed.explanation || 'I tightened the playbook based on how you seem to use it.',
    };
  } catch {
    return {
      title: input.title,
      steps: input.steps,
      explanation: content || 'I reviewed the playbook and kept it simple.',
    };
  }
}

export async function generateDecisionOptions(taskTitle: string, question: string): Promise<{ label: string; description: string }[]> {
  if (!isConfigured()) {
    return [
      { label: 'Conservative', description: 'Lower risk, steady progress — play it safe for now' },
      { label: 'Balanced', description: 'Moderate risk — a good middle ground' },
      { label: 'Bold', description: 'Higher risk, faster progress — go for it' },
    ];
  }

  const systemPrompt = `You help a business owner make a decision by simplifying it into exactly 3 clear options.
Given a task and a decision question, output a JSON array of exactly 3 objects with:
- "label": short name for the option (2-4 words)
- "description": one sentence explaining this option and its trade-offs

Keep options concrete, specific to the task. Avoid generic advice.
Output ONLY valid JSON array, no markdown.`;

  const content = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Task: ${taskTitle}\nDecision: ${question}` },
  ]);

  try {
    const parsed = JSON.parse(content) as { label: string; description: string }[];
    return Array.isArray(parsed) && parsed.length >= 3 ? parsed.slice(0, 3) : [
      { label: 'Option A', description: 'Conservative approach' },
      { label: 'Option B', description: 'Balanced approach' },
      { label: 'Option C', description: 'Bold approach' },
    ];
  } catch {
    return [
      { label: 'Option A', description: 'Conservative approach' },
      { label: 'Option B', description: 'Balanced approach' },
      { label: 'Option C', description: 'Bold approach' },
    ];
  }
}
