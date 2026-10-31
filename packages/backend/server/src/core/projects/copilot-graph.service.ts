import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StateGraph, END } from '@langchain/langgraph';
import { get } from 'lodash-es';
import { ServerService, AiModelFallbackService } from '../config';

export interface CopilotContextInput {
  activeTab: 'projects' | 'documents';
  activeProjectId?: string;
  activeSubTab?: 'overview' | 'issues' | 'blueprint' | 'cycles' | 'modules' | 'releases' | 'doc';
  activeDocId?: string;
  activeDocTitle?: string;
  activeDocContent?: string;
  selectedBlockId?: string;
  selectedText?: string;
  workspaceMembers?: Array<{ id: string; name: string; email: string }>;
  projects?: Array<{ id: string; name: string }>;
  cycles?: Array<{ id: string; name: string }>;
  modules?: Array<{ id: string; name: string }>;
  releases?: Array<{ id: string; name: string }>;
  activeReleaseId?: string;
  activeReleaseName?: string;
  blueprintNodes?: Array<{ id: string; label: string; role?: string; status?: string }>;
  issues?: Array<{ id: string; title: string; status: string }>;
  categories?: string[];
}

export interface CopilotGraphState {
  userMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: CopilotContextInput;
  apiKey: string;
  model: string;
  fallbackService?: AiModelFallbackService;
  workingModel?: string;
  parsedAction: {
    action: string;
    data: Record<string, any>;
    summary?: string;
  } | null;
  clarification: string | null;
  finalMessage: string | null;
}

// Helper to invoke Gemini REST API with fallback and error handling
async function callLLM(prompt: string, apiKey: string, modelName: string, fallbackService?: AiModelFallbackService): Promise<{ text: string; workingModel: string }> {
  const runSingle = async (candidateModel: string) => {
    const cleanModel = candidateModel.startsWith('models/') ? candidateModel.substring(7) : candidateModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Gemini API returned error ${response.status}: ${errText}`);
      if (response.status === 429) {
        throw new Error(
          'Gemini API rate limit or quota exceeded. Please wait a few seconds before retrying, or contact support if the issue persists.'
        );
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(
          'Invalid or unauthorized API key. Please check your Gemini settings in Workspace Settings.'
        );
      }
      throw new Error(`AI Service HTTP ${response.status} error.`);
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  };

  if (fallbackService) {
    const { result, workingModel } = await fallbackService.executeWithFallback({
      feature: 'doc_sidebar',
      primaryModel: modelName,
      customApiKey: apiKey,
      runner: (cand) => runSingle(cand),
    });
    return { text: result, workingModel };
  }

  const text = await runSingle(modelName);
  return { text, workingModel: modelName };
}

function extractRelevantDocumentContext(
  docContent: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): { fullOrTrimmedDoc: string; searchMatches: string } {
  if (!docContent || !docContent.trim()) {
    return { fullOrTrimmedDoc: '', searchMatches: '' };
  }

  const rawDoc = docContent.trim();
  const MAX_FULL_CHARS = 16000;
  const fullOrTrimmedDoc =
    rawDoc.length <= MAX_FULL_CHARS
      ? rawDoc
      : rawDoc.slice(0, 5000) + '\n\n[... middle content truncated for length ...]\n\n' + rawDoc.slice(-5000);

  // Extract keywords from user message + last 2 history messages
  const combinedUserText = [
    userMessage,
    ...history.slice(-2).map((h) => h.content),
  ].join(' ');

  const numberWords: Record<string, string> = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    first: '1',
    second: '2',
    third: '3',
    fourth: '4',
    fifth: '5',
  };

  const normalizedQuery = combinedUserText
    .toLowerCase()
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth)\b/gi, (m) => numberWords[m.toLowerCase()] || m);

  const stopWords = new Set([
    'the', 'and', 'for', 'this', 'that', 'with', 'from', 'have', 'change', 'update', 'edit',
    'please', 'can', 'you', 'make', 'increase', 'decrease', 'modify', 'document', 'section',
    'value', 'what', 'where', 'when', 'how', 'its', "it's", 'about',
  ]);

  const rawTokens = (combinedUserText.toLowerCase() + ' ' + normalizedQuery)
    .replace(/[^a-z0-9_\-\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  const bigrams: string[] = [];
  const words = combinedUserText.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`.replace(/[^a-z0-9_\-\s]/gi, '').trim();
    if (bg.length >= 3) bigrams.push(bg);
  }

  // Also include normalized bigrams (e.g. "phase 1")
  const normWords = normalizedQuery.split(/\s+/);
  for (let i = 0; i < normWords.length - 1; i++) {
    const bg = `${normWords[i]} ${normWords[i + 1]}`.replace(/[^a-z0-9_\-\s]/gi, '').trim();
    if (bg.length >= 3) bigrams.push(bg);
  }

  const searchKeywords = Array.from(new Set([...rawTokens, ...bigrams]));

  const docLines = rawDoc.split('\n');
  const matchedLineIndices = new Set<number>();

  docLines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();
    for (const kw of searchKeywords) {
      if (lineLower.includes(kw)) {
        const start = Math.max(0, idx - 6);
        const end = Math.min(docLines.length - 1, idx + 6);
        for (let i = start; i <= end; i++) {
          matchedLineIndices.add(i);
        }
      }
    }
  });

  if (matchedLineIndices.size === 0) {
    return { fullOrTrimmedDoc, searchMatches: 'No specific keyword matches found; see full active document content.' };
  }

  const sortedIndices = Array.from(matchedLineIndices).sort((a, b) => a - b);
  const snippetBlocks: string[] = [];
  let currentBlock: string[] = [];
  let lastIdx = -1;

  sortedIndices.forEach((lineIdx) => {
    if (lastIdx !== -1 && lineIdx > lastIdx + 1) {
      snippetBlocks.push(currentBlock.join('\n'));
      currentBlock = [];
    }
    currentBlock.push(`[Line ${lineIdx + 1}]: ${docLines[lineIdx]}`);
    lastIdx = lineIdx;
  });
  if (currentBlock.length) {
    snippetBlocks.push(currentBlock.join('\n'));
  }

  const searchMatches = snippetBlocks.join('\n\n--- [Next Relevant Section] ---\n\n');
  return { fullOrTrimmedDoc, searchMatches };
}

function repairAndParseJSON(rawText: string): any {
  if (!rawText || !rawText.trim()) return null;

  let text = rawText.trim();

  // Strip markdown code fences if wrapped
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();

  // Remove leading 'json' keyword if outputted as plain text
  if (text.toLowerCase().startsWith('json\n') || text.toLowerCase().startsWith('json\r\n')) {
    text = text.replace(/^json\s*/i, '').trim();
  }

  // Find outermost JSON object boundaries { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // Attempt 1: Direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Attempt 2: Auto-repair common LLM JSON syntax artifacts
  try {
    let repaired = text;

    // 1. Remove single-line comments
    repaired = repaired.replace(/\/\/.*$/gm, '');

    // 2. Remove invalid dashes or bullets before JSON keys or array items (e.g. - "restrictedMembers": ... or • "name": ...)
    repaired = repaired.replace(/(^|[\n,\{\[])\s*[-*•]\s*([{\["0-9a-zA-Z])/gm, '$1 $2');

    // 3. Remove trailing commas before closing braces or brackets (e.g. , } or , ])
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 4. Fix missing quotes on common property names if any
    repaired = repaired.replace(/(^|[{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1 "$2":');

    return JSON.parse(repaired);
  } catch (_) {}

  // Attempt 3: Regex fallback extraction for action, data, summary
  try {
    const actionMatch = text.match(/"action"\s*:\s*"([^"]+)"/i);
    const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/i);
    if (actionMatch && actionMatch[1]) {
      const dataMatch = text.match(/"data"\s*:\s*(\{[\s\S]*?\})/i);
      let extractedData: any = {};
      if (dataMatch && dataMatch[1]) {
        try {
          const cleanData = dataMatch[1]
            .replace(/(^|[\n,\{\[])\s*[-*•]\s*([{\["0-9a-zA-Z])/gm, '$1 $2')
            .replace(/,(\s*[}\]])/g, '$1');
          extractedData = JSON.parse(cleanData);
        } catch (_) {}
      }
      return {
        action: actionMatch[1],
        data: extractedData,
        summary: summaryMatch ? summaryMatch[1] : undefined,
      };
    }
  } catch (_) {}

  return null;
}

// Node 1: Context & Guardrail Evaluator
const contextGuardrailNode = async (state: CopilotGraphState) => {
  const { context } = state;

  // Documents Tab Guardrail Check
  if (context.activeTab === 'documents' && !context.activeDocId) {
    return {
      clarification:
        'No document is currently open. Please select and open a document from the left sidebar to enable document modifications with Copilot.',
      finalMessage:
        'Please open a document from the Documents tab before requesting modifications.',
    };
  }

  return state;
};

// Node 2: Intent Classification & Parameter Validation Node
const intentAndValidationNode = async (state: CopilotGraphState) => {
  // If already flagged by guardrail, skip
  if (state.clarification && state.finalMessage) {
    return state;
  }

  const { userMessage, history, context, apiKey, model } = state;

  const historyFormatted = (history || [])
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
    .join('\n');

  const { fullOrTrimmedDoc, searchMatches } = extractRelevantDocumentContext(
    context.activeDocContent || '',
    userMessage,
    history || []
  );

  const systemPrompt = `You are the IntoAI Workspace Copilot — an expert AI partner powered by LangGraph and LangChain.
Your mission is to understand user natural language requests, evaluate context, validate parameters, and either ask for missing information OR build a structured JSON action payload for user confirmation.

CRITICAL ARCHITECTURE RULES:
1. SAFETY & HUMAN-IN-THE-LOOP: You must NEVER blindly execute actions without generating a structured action payload for user confirmation.
2. CLARIFICATION FOR MISSING/AMBIGUOUS DATA: If the user wants to create or update something (e.g. Work Item, Project, Cycle, Blueprint, Document edit) but has NOT provided all essential details or refers to names that do not match context (e.g. assignee, cycle, doc title), output the "CLARIFY" action.
3. CONTEXT AWARENESS:
   - Current Sidebar Tab: "${context.activeTab}"
   - Active Sub-Tab: "${context.activeSubTab || 'general'}"
   - Active Project: ${JSON.stringify(context.projects?.find((p) => p.id === context.activeProjectId) || null)}
   - Active Document: ${JSON.stringify({ id: context.activeDocId, title: context.activeDocTitle })}
   - Workspace Members: ${JSON.stringify(context.workspaceMembers || [])}
   - Project Categories in Workspace: ${JSON.stringify(context.categories && context.categories.length ? context.categories : ['Engineering', 'Design', 'Research', 'Operations', 'Product', 'Marketing'])}
   - Cycles/Sprints: ${JSON.stringify(context.cycles || [])}
   - Modules: ${JSON.stringify(context.modules || [])}
   - Releases: ${JSON.stringify(context.releases || [])}
   - Active Release Version: "${context.activeReleaseName || (context.releases && context.releases[0]?.name) || 'v1.0.0'}"
   - Blueprint Nodes in Canvas: ${JSON.stringify((context.blueprintNodes || []).slice(0, 30))}
   - Existing Issues Snippet: ${JSON.stringify((context.issues || []).slice(0, 10))}
   - Active Document Content:
"""
${fullOrTrimmedDoc}
"""
   - Targeted Keyword Search Results & Context Windows:
"""
${searchMatches}
"""

SUPPORTED ACTIONS & DATA SCHEMAS:

1. CREATE_PROJECT:
   Data: { "name": string, "description": string, "category": string, "projectManagerName": string, "visibility": "WorkspaceWide"|"Restricted", "restrictedMembers": string[] }

2. UPDATE_PROJECT:
   Data: { "projectId": string, "name": string, "description": string, "category": string, "projectManagerName": string, "visibility": "WorkspaceWide"|"Restricted", "restrictedMembers": string[] }

3. DELETE_PROJECT:
   Data: { "projectId": string, "projectName": string }

4. CREATE_WORK_ITEM:
   Data: { "title": string, "description": string, "type": "Task"|"Bug"|"Feature"|"Improvement", "priority": "Low"|"Medium"|"High"|"Critical", "status": "Backlog"|"Todo"|"InProgress"|"InReview"|"Testing"|"Done", "dueDate": "YYYY-MM-DD", "estimatedTime": number, "assigneeName": string, "cycleName": string, "moduleName": string, "releaseName": string }

5. UPDATE_WORK_ITEM:
   Data: { "issueTitle": string, "newTitle": string, "description": string, "type": string, "priority": string, "status": string, "dueDate": string, "estimatedTime": number, "assigneeName": string, "cycleName": string, "moduleName": string, "releaseName": string }

6. DELETE_WORK_ITEM:
   Data: { "issueTitle": string }

7. CREATE_CYCLE:
   Data: { "name": string, "goal": string, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "status": "Planned"|"Active"|"Completed" }

8. CREATE_RELEASE:
   Data: { "name": string, "description": string, "plannedDate": "YYYY-MM-DD", "status": "Planned"|"InDevelopment"|"Testing"|"Released" }

9. CREATE_MODULE:
   Data: { "name": string, "description": string, "leadName": string }

10. UPDATE_BLUEPRINT:
    Data: { "actionType": "ADD_NODE"|"UPDATE_NODE"|"DELETE_NODE"|"ADD_CONTAINER", "label": string, "role": "agent"|"tool"|"router"|"input"|"output", "status": "todo"|"inprogress"|"inreview"|"testing"|"done"|"unassigned", "description": string, "releaseName": string }

11. EDIT_DOCUMENT:
    Data: { "docId": string, "docTitle": string, "editMode": "REWRITE_BLOCK"|"APPEND_SECTION"|"INSERT_TABLE"|"REPLACE_CONTENT"|"SUMMARIZE", "targetSection": string, "newContent": string, "summary": string }

12. CLARIFY:
    Data: { "question": string }

13. GENERAL_CHAT:
    Data: { "reply": string }

RESPONSE FORMAT:
You MUST return ONLY a valid JSON object matching this interface:
{
  "action": string,
  "data": Record<string, any>,
  "summary": string
}

CRITICAL DATA INTEGRITY & PARAMETER VALIDATION RULES:
1. PROJECT CREATION, PROJECT MANAGER, CATEGORY & VISIBILITY:
   - Required: name.
   - Optional parameters: projectManagerName, category, visibility ("WorkspaceWide"|"Restricted"), restrictedMembers (list of member names or emails), description.
   - Category is strictly OPTIONAL (not a mandatory field). Copilot should suggest relevant categories (e.g. Engineering, Design, Research, Operations, Product, Marketing) as optional suggestions, but MUST NOT state or imply that category is a mandatory or required field.
   - When the user asks to create a project (e.g. "create a project named ...", "create restricted project ..."):
     - If the user has NOT provided the Project Manager:
       Output the "CLARIFY" action asking the user to choose a Project Manager from available workspace members (with their name and email, e.g. Ansan Mathew (business@intoai.ai)).
       You can suggest an optional recommended Category in your response, but explicitly note that Category is optional.
     - Visibility defaults to "WorkspaceWide" unless the user explicitly requests "restricted" or "private".
   - IMPORTANT: Words like "unrestricted", "public", "open", "workspace-wide", "all members", or standard default mean visibility MUST be "WorkspaceWide".
   - Only set visibility to "Restricted" if the user explicitly asks for "restricted", "private", or "limited to specific members".
   - When restrictedMembers are provided, match the names/emails to Workspace Members.
2. WORK ITEM / TASK CREATION & UPDATES:
   - Required: title.
   - Optional parameters: type, priority, status, assigneeName, cycleName, moduleName, releaseName, dueDate, estimatedTime.
   - If optional parameters are omitted and user has not said "use defaults", output the CLARIFY action asking if they wish to specify them or proceed with standard defaults: (Priority=Medium, Status=Todo, Type=Task).
3. CYCLE / SPRINT CREATION:
   - Required: name, startDate, endDate.
   - If startDate or endDate is missing, output the CLARIFY action asking for start and end dates.
4. RELEASE / VERSION CREATION:
   - Required: name.
5. MODULE CREATION:
   - Required: name.
   - Optional: leadName, description.
6. BLUEPRINT DIAGRAM MODIFICATIONS:
   - Required: label, actionType ("UPDATE_NODE"|"ADD_NODE"|"DELETE_NODE").
   - Optional: status ("todo"|"inprogress"|"inreview"|"testing"|"done"), role, description, releaseName.
   - ALWAYS explicitly mention and confirm the target release/version in your summary and parameters (e.g. "for release **v1.0.0**") to confirm we are updating the correct one. If no release is specified by the user, default releaseName to the Active Release Version.
   - For status changes: map "completed", "done", "finished" to "done"; "in progress" to "inprogress"; "in review" to "inreview".
7. DOCUMENT EDITING, RATES, AMOUNTS & TRANSFORMATIONS:
   - Data: { "docId": string, "docTitle": string, "editMode": "REWRITE_BLOCK"|"APPEND_SECTION"|"INSERT_TABLE"|"REPLACE_CONTENT"|"SUMMARIZE", "targetSection": string, "newContent": string, "summary": string }
   - Matching documents: If the user specifies a document title with versions/dates (e.g. 'BRD _v1 8/18/2026 07:22 PM') or base title (e.g. 'BRD', 'SRS', etc.), match it directly to the active document or document in context. Do NOT ask redundant clarification questions if the user is referring to the document currently open or active in context.
    - For renaming or title changes (e.g. "update proposal title to Hello world", "change document title to Hello world", "rename document to BRD123"):
      - In Proposal documents: the main cover title is in \`cover.title\`, the subtitle is in \`cover.subtitle\`, the platform tag is in \`cover.title_platform\`, and the short title is in \`metadata.short_title\`. When changing the proposal title: set targetSection to "cover.title" (or "title"), set newContent to "Hello world", set docTitle to "Hello world", and set summary to "Update proposal title to 'Hello world'".
      - In Quote documents: the cover title is in \`cover.title\`, subtitle in \`cover.subtitle\`, short title in \`metadata.short_title\`. Set targetSection to "cover.title" (or "title"), set newContent to the new title value.
      - In Invoice documents: the short title is in \`metadata.short_title\`. Set targetSection to "metadata.short_title" (or "title"), set newContent to the new title value.
      - In Letterhead documents: the subject is in \`subject\`, title in \`metadata.title\`. Set targetSection to "subject" or "title".
      - NEVER pass a container object like "cover" as targetSection if you only want to change a single field like title or subtitle; always target the specific leaf key ("cover.title", "cover.subtitle", "cover.prepared_for.company_name") or supply the full new value for that field.
    - For section text replacements (e.g. "change Marcus Chen to Marcus hun in distribution list"):
      Set targetSection to "Marcus Chen", newContent to "Marcus hun", and summary to "Update distribution list to change 'Marcus Chen' to 'Marcus hun'".
   - For rate, price, quantity, or numeric adjustments (e.g. "change the phase one rate by increasing 1 rs", "increase Phase 1 rate by 1 rs", "change Phase 2 amount"):
     1. Search Active Document Content and Targeted Keyword Search Results for the matching section/phase (e.g. Phase 1 / Phase 2 item).
     2. Identify the target block and current values (e.g. Phase 1 rate: 4,50,000).
     3. Compute the new value (e.g. 4,50,000 + 1 = 4,50,001).
     4. Set targetSection to the phase name or exact rate line, set newContent to the updated value/line, and provide an informative summary (e.g. "Increase Phase 1 rate by 1 ₹ from 4,50,000 to 4,50,001").
     5. Do NOT ask the user for current rates or section text if it is present in the document context.
8. NAME & MEMBER RESOLUTION:
   - If named assignees, cycle names, or module names are ambiguous or do not match workspace context, output CLARIFY asking for confirmation of the exact name.

${historyFormatted ? `Conversation History:\n${historyFormatted}\n` : ''}
User Request: "${userMessage}"`;

  try {
    const { text: rawRes, workingModel } = await callLLM(systemPrompt, apiKey, model, state.fallbackService);
    
    // Auto-repair and parse JSON from LLM response
    let parsed = repairAndParseJSON(rawRes);
    if (!parsed) {
      parsed = {
        action: 'GENERAL_CHAT',
        data: { reply: rawRes },
        summary: 'Copilot Response',
      };
    }

    if (parsed.action === 'CLARIFY') {
      return {
        clarification: parsed.data?.question || 'Could you please provide more details?',
        parsedAction: null,
        workingModel,
      };
    }

    if (parsed.action === 'GENERAL_CHAT') {
      return {
        finalMessage: parsed.data?.reply || parsed.summary || rawRes,
        parsedAction: null,
        workingModel,
      };
    }

    // Member normalization for Restricted projects
    if (parsed.action === 'CREATE_PROJECT' || parsed.action === 'UPDATE_PROJECT') {
      if (parsed.data?.restrictedMembers && Array.isArray(parsed.data.restrictedMembers)) {
        const members = context.workspaceMembers || [];
        parsed.data.restrictedMembers = parsed.data.restrictedMembers.map((item: string) => {
          if (!item) return '';
          const str = String(item).trim();
          const found = members.find(
            (m) =>
              m.id === str ||
              m.name.toLowerCase() === str.toLowerCase() ||
              m.email.toLowerCase() === str.toLowerCase() ||
              str.toLowerCase().includes(m.name.toLowerCase()) ||
              str.toLowerCase().includes(m.email.toLowerCase())
          );
          return found ? found.id : str;
        }).filter(Boolean);
      }
    }

    return {
      workingModel,
      parsedAction: {
        action: parsed.action,
        data: parsed.data || {},
        summary: parsed.summary || `Action: ${String(parsed.action).replace('_', ' ')}`,
      },
    };
  } catch (err: any) {
    return {
      finalMessage: `Copilot Error: ${err.message || 'Unable to process prompt.'}`,
      parsedAction: null,
    };
  }
};

// Define LangGraph StateGraph workflow
const workflow = new StateGraph<CopilotGraphState>({
  channels: {
    userMessage: { value: (a, b) => b ?? a, default: () => '' },
    history: { value: (a, b) => b ?? a, default: () => [] },
    context: { value: (a, b) => b ?? a, default: () => ({ activeTab: 'projects' }) },
    apiKey: { value: (a, b) => b ?? a, default: () => '' },
    model: { value: (a, b) => b ?? a, default: () => '' },
    fallbackService: { value: (a, b) => b ?? a, default: () => undefined },
    workingModel: { value: (a, b) => b ?? a, default: () => undefined },
    parsedAction: { value: (a, b) => b ?? a, default: () => null },
    clarification: { value: (a, b) => b ?? a, default: () => null },
    finalMessage: { value: (a, b) => b ?? a, default: () => null },
  },
});

workflow.addNode('guardrail', contextGuardrailNode);
workflow.addNode('intentValidator', intentAndValidationNode);

workflow.setEntryPoint('guardrail');
workflow.addEdge('guardrail', 'intentValidator');
workflow.addEdge('intentValidator', END);

const compiledCopilotGraph = workflow.compile();

@Injectable()
export class CopilotGraphService {
  private readonly logger = new Logger(CopilotGraphService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly serverService: ServerService,
    @Optional() private readonly fallbackService?: AiModelFallbackService
  ) {}

  async processCopilotRequest(
    workspaceId: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: CopilotContextInput
  ) {
    const settings = await this.prisma.workspaceGeminiSetting.findUnique({
      where: { workspaceId },
    });

    const globalConfig = this.serverService.getConfig();
    const dbOverrides = this.serverService.getDbOverrides();
    const globalGeminiKey =
      (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey ||
      globalConfig.copilot?.providers?.gemini?.apiKey;

    const projectModel =
      get(dbOverrides, 'copilot.providers.gemini.model') ||
      get(globalConfig, 'copilot.providers.gemini.model') ||
      'gemini-3.1-flash-lite';

    const apiKey =
      (settings?.apiKey && settings.apiKey.trim()) ||
      globalGeminiKey ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_GEMINI_API_KEY'] ||
      '';

    if (!apiKey) {
      return {
        reply:
          'Gemini API key is not configured. Please set your API key in Admin AI settings (/admin/ai) or workspace settings.',
        pendingAction: null,
        workingModel: projectModel,
      };
    }

    const model = projectModel;

    try {
      const state: CopilotGraphState = {
        userMessage,
        history,
        context,
        apiKey,
        model,
        fallbackService: this.fallbackService,
        workingModel: model,
        parsedAction: null,
        clarification: null,
        finalMessage: null,
      };

      const result = await compiledCopilotGraph.invoke(state);

      const usedModel = (result as any).workingModel || model;

      if (result.clarification) {
        return {
          reply: result.clarification,
          pendingAction: null,
          workingModel: usedModel,
        };
      }

      if (result.finalMessage) {
        return {
          reply: result.finalMessage,
          pendingAction: null,
          workingModel: usedModel,
        };
      }

      if (result.parsedAction) {
        return {
          reply: `I have prepared the action **${result.parsedAction.action.replace('_', ' ')}**. Please review the parameters and confirm below:`,
          pendingAction: result.parsedAction,
          workingModel: usedModel,
        };
      }

      return {
        reply: 'Processed successfully.',
        pendingAction: null,
        workingModel: usedModel,
      };
    } catch (err: any) {
      this.logger.error(`LangGraph Copilot execution error: ${err.message}`, err.stack);
      return {
        reply: `Copilot Error: ${err.message}`,
        pendingAction: null,
        workingModel: model,
      };
    }
  }
}
