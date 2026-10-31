import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StateGraph, END } from '@langchain/langgraph';
import { ServerService, AiModelFallbackService } from '../config';

// Helper function to call Gemini REST API
async function callGemini(
  prompt: string,
  apiKey: string,
  model: string,
  fallbackService?: AiModelFallbackService
): Promise<string> {
  const runSingle = async (candModel: string) => {
    const cleanModel = candModel.startsWith('models/') ? candModel.substring(7) : candModel;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${text}`);
    }
    const data = (await response.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return rawText.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
  };

  if (fallbackService) {
    const { result } = await fallbackService.executeWithFallback({
      feature: 'doc_sidebar',
      primaryModel: model,
      customApiKey: apiKey,
      runner: (cand) => runSingle(cand),
    });
    return result;
  }

  return runSingle(model);
}

// Define the state interface for LangGraph
interface ProposalState {
  text: string;
  action: string;
  instructions: string;
  apiKey: string;
  model: string;
  fallbackService?: AiModelFallbackService;
  result: string;
}

// Node functions
const rewriteNode = async (state: ProposalState) => {
  const prompt = `You are an expert consulting partner writing a premium project proposal. Rewrite the following text to make it sound highly professional, executive-grade, persuasive, and clear, while strictly preserving all facts and details. Return ONLY the rewritten text, without any introductory or concluding remarks, and without markdown code block wraps.
Text to rewrite:
"${state.text}"
${state.instructions ? `Special instructions: ${state.instructions}` : ''}`;

  const res = await callGemini(prompt, state.apiKey, state.model, state.fallbackService);
  return { result: res };
};

const expandNode = async (state: ProposalState) => {
  const prompt = `You are an expert consulting partner writing a premium project proposal. Elaborate and expand the following outline or short text into rich, comprehensive consulting-grade content. Use clear paragraphs, bullet points, and corporate terminology to describe the context and value. Maintain a professional tone. Return ONLY the expanded text, without any introductory or concluding remarks, and without markdown code block wraps.
Outline/text to expand:
"${state.text}"
${state.instructions ? `Special instructions: ${state.instructions}` : ''}`;

  const res = await callGemini(prompt, state.apiKey, state.model, state.fallbackService);
  return { result: res };
};

const tableNode = async (state: ProposalState) => {
  const prompt = `You are an expert consulting partner writing a premium project proposal. The proposal design system uses beautiful glassmorphism style. Convert the following text/data into a clean, premium HTML table. Use standard HTML <table>, <thead>, <tbody>, <tr>, <th>, <td> tags.
Ensure to:
1. Create structured columns and rows.
2. The HTML elements should NOT contain any inline CSS style attributes. Use the class name "proposal-table" on the table element.
3. Return ONLY the raw HTML table markup, no wrapping markdown code blocks (do NOT wrap with \`\`\`html or similar).
Input data to format:
"${state.text}"
${state.instructions ? `Special instructions: ${state.instructions}` : ''}`;

  const res = await callGemini(prompt, state.apiKey, state.model, state.fallbackService);
  return { result: res };
};

// Define router node to serve as entry point in Graph
const routerNode = async (state: ProposalState) => {
  return state;
};

// Create state graph with channels matching ProposalState
const workflow = new StateGraph<ProposalState>({
  channels: {
    text: {
      value: (_a: string, b: string) => b,
      default: () => '',
    },
    action: {
      value: (_a: string, b: string) => b,
      default: () => '',
    },
    instructions: {
      value: (_a: string, b: string) => b,
      default: () => '',
    },
    apiKey: {
      value: (_a: string, b: string) => b,
      default: () => '',
    },
    model: {
      value: (_a: string, b: string) => b,
      default: () => '',
    },
    fallbackService: {
      value: (_a: any, b: any) => b,
      default: () => undefined,
    },
    result: {
      value: (_a: string, b: string) => b,
      default: () => '',
    },
  }
});

workflow.addNode('router', routerNode);
workflow.addNode('rewrite', rewriteNode);
workflow.addNode('expand', expandNode);
workflow.addNode('table', tableNode);

workflow.setEntryPoint('router');

workflow.addConditionalEdges(
  'router',
  (state: ProposalState) => {
    if (state.action === 'expand') return 'expand';
    if (state.action === 'table') return 'table';
    return 'rewrite';
  },
  {
    expand: 'expand',
    table: 'table',
    rewrite: 'rewrite',
  }
);

workflow.addEdge('rewrite', END);
workflow.addEdge('expand', END);
workflow.addEdge('table', END);

const compiledApp = workflow.compile();

@Injectable()
export class ProposalCopilotService {
  private readonly logger = new Logger(ProposalCopilotService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly serverService: ServerService,
    @Optional() private readonly fallbackService?: AiModelFallbackService
  ) { }

  async executeCopilotAction(
    workspaceId: string,
    action: string,
    text: string,
    instructions?: string
  ): Promise<string> {
    // 1. Retrieve Workspace Gemini settings & global fallback
    const settings = await this.prisma.workspaceGeminiSetting.findUnique({
      where: { workspaceId },
    });

    const globalConfig = this.serverService.getConfig();
    const dbOverrides = this.serverService.getDbOverrides();
    const globalGeminiKey =
      (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey ||
      globalConfig.copilot?.providers?.gemini?.apiKey;
    const globalGeminiModel =
      (dbOverrides as any)?.copilot?.researchDocModel ||
      globalConfig.copilot?.researchDocModel ||
      (dbOverrides as any)?.copilot?.providers?.gemini?.model ||
      globalConfig.copilot?.providers?.gemini?.model;

    const apiKey =
      (settings?.apiKey && settings.apiKey.trim()) ||
      globalGeminiKey ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_GEMINI_API_KEY'] ||
      '';

    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured. Please set your API key in Admin AI settings (/admin/ai) or workspace settings.'
      );
    }

    const model =
      globalGeminiModel ||
      settings?.model ||
      'gemini-3.5-flash';

    // 2. Execute LangGraph workflow
    try {
      const inputs = {
        text,
        action,
        instructions: instructions || '',
        apiKey,
        model,
        fallbackService: this.fallbackService,
        result: '',
      };

      const outputs = await compiledApp.invoke(inputs);
      return outputs.result;
    } catch (e: any) {
      this.logger.error(`Failed to execute copilot action: ${e.message}`, e.stack);
      throw e;
    }
  }
}
