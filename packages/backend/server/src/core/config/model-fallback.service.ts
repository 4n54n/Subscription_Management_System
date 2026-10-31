import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { get } from 'lodash-es';

import { Models } from '../../models';
import { ServerService } from './service';

export type AiFeatureType = 'meeting' | 'doc_sidebar' | 'copilot_pill' | 'phish';

export interface ModelWorkedLog {
  id: string;
  feature: AiFeatureType;
  selectedModel: string;
  workingModel: string;
  fallbackOccurred: boolean;
  success: boolean;
  latencyMs: number;
  timestamp: string;
  error?: string;
}

export interface ModelStats {
  successCount: number;
  errorCount: number;
  score: number; // Bounded trust score: 0 to 4
  cooldownUntil?: number; // Timestamp in ms when circuit breaker cooldown expires
  lastSuccess?: string;
  lastError?: string;
}

const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000; // 60-second cooldown on failure
const MAX_TRUST_SCORE = 4; // Max trust score cap

const DEFAULT_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const EXCLUDED_NON_TEXT_KEYWORDS = [
  'image',
  'vision',
  'audio',
  'video',
  'embedding',
  'imagen',
  'veo',
  'tts',
  'clip',
  'lyria',
  'robotics',
  'computer-use',
  'sonar',
  'gpt',
  'claude',
  'gemini-1.0-pro',
];

@Injectable()
export class AiModelFallbackService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiModelFallbackService.name);
  private readonly workedLogs: ModelWorkedLog[] = [];
  private readonly modelStats = new Map<string, ModelStats>();
  private saveDebounceTimer?: NodeJS.Timeout;
  private isHydrated = false;

  constructor(
    private readonly serverService: ServerService,
    @Optional() private readonly models?: Models
  ) {}

  getDbOverrides() {
    return this.serverService.getDbOverrides();
  }

  getApiKey(customApiKey?: string): string {
    const dbOverrides = this.serverService.getDbOverrides();
    const dbKey = (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey;
    const config = this.serverService.getConfig();
    const configKey = (config as any)?.copilot?.providers?.gemini?.apiKey;
    return (
      (customApiKey && customApiKey.trim()) ||
      (dbKey && String(dbKey).trim()) ||
      (configKey && String(configKey).trim()) ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_GEMINI_API_KEY'] ||
      process.env['GOOGLE_GENERATIVE_AI_API_KEY'] ||
      ''
    );
  }

  async onApplicationBootstrap() {
    this.hydrateFromStorage();
  }

  /**
   * Hydrate saved model scores and worked logs from database on startup
   */
  hydrateFromStorage() {
    try {
      const dbOverrides = this.serverService.getDbOverrides();
      const savedStats = get(dbOverrides, 'copilot.modelStats');
      if (savedStats && typeof savedStats === 'object') {
        Object.entries(savedStats).forEach(([model, stats]: [string, any]) => {
          if (stats && typeof stats === 'object') {
            this.modelStats.set(model, {
              successCount: Number(stats.successCount) || 0,
              errorCount: Number(stats.errorCount) || 0,
              score: Math.min(MAX_TRUST_SCORE, Math.max(0, Number(stats.score) || 0)),
              // Reset any stale cooldown timestamp on boot
              cooldownUntil: undefined,
              lastSuccess: stats.lastSuccess,
              lastError: stats.lastError,
            });
          }
        });
        this.logger.log(`Hydrated ${this.modelStats.size} AI model fallback stats from persistent storage.`);
      }

      const savedLogs = get(dbOverrides, 'copilot.workedLogs');
      if (Array.isArray(savedLogs) && savedLogs.length > 0) {
        this.workedLogs.length = 0;
        this.workedLogs.push(...savedLogs.slice(0, 150));
        this.logger.log(`Hydrated ${this.workedLogs.length} AI model worked logs from persistent storage.`);
      }
      this.isHydrated = true;
    } catch (err) {
      this.logger.warn('Failed to hydrate model fallback stats from storage', err);
    }
  }

  /**
   * Debounced background persistence to DB so AI requests remain 0ms RAM fast
   */
  private schedulePersist() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.persistToStorage().catch(err => {
        this.logger.warn('Background AI model stats persist failed', err);
      });
    }, 1500);
  }

  async persistToStorage() {
    if (!this.models?.appConfig) return;
    try {
      const statsObj = Object.fromEntries(this.modelStats.entries());
      const logsArr = this.workedLogs.slice(0, 100);

      await this.models.appConfig.save('system', [
        { key: 'copilot.modelStats', value: statsObj },
        { key: 'copilot.workedLogs', value: logsArr },
      ]);
    } catch (e) {
      this.logger.warn('Failed to save AI model stats to database', e);
    }
  }

  /**
   * Check whether Intelligent Model Fallback toggle is enabled in Admin AI settings.
   */
  isIntelligentFallbackEnabled(): boolean {
    // 1. Check live database overrides first
    const dbOverrides = this.serverService.getDbOverrides();
    let val: any = get(dbOverrides, 'copilot.intelligentFallbackEnabled');
    if (val === undefined || val === null) {
      val = get(dbOverrides, 'copilot.providers.gemini.intelligentFallbackEnabled');
    }

    if (val === false || val === 'false' || val === 0 || val === '0') {
      return false;
    }
    if (val === true || val === 'true' || val === 1 || val === '1') {
      return true;
    }

    // 2. Check base config factory
    const config = this.serverService.getConfig();
    val = get(config, 'copilot.intelligentFallbackEnabled');
    if (val === undefined || val === null) {
      val = get(config, 'copilot.providers.gemini.intelligentFallbackEnabled');
    }

    if (val === false || val === 'false' || val === 0 || val === '0') {
      return false;
    }
    if (val === true || val === 'true' || val === 1 || val === '1') {
      return true;
    }

    return true; // Default to true if not explicitly set
  }

  /**
   * Log execution outcome to in-memory audit logs and update model health stats
   */
  logExecution(
    feature: AiFeatureType,
    selectedModel: string,
    workingModel: string,
    fallbackOccurred: boolean,
    success: boolean,
    latencyMs: number,
    error?: string
  ) {
    if (!this.isHydrated) {
      this.hydrateFromStorage();
    }

    const logItem: ModelWorkedLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      feature,
      selectedModel: selectedModel || 'unknown',
      workingModel: workingModel || selectedModel || 'unknown',
      fallbackOccurred,
      success,
      latencyMs,
      timestamp: new Date().toISOString(),
      error,
    };

    this.workedLogs.unshift(logItem);
    if (this.workedLogs.length > 150) {
      this.workedLogs.pop();
    }

    // Update model stats with bounded score (0-4) and circuit breaker cooldown
    const stats = this.modelStats.get(logItem.workingModel) || {
      successCount: 0,
      errorCount: 0,
      score: 0,
    };

    if (success) {
      stats.successCount += 1;
      stats.score = Math.min(MAX_TRUST_SCORE, (stats.score ?? 0) + 1);
      stats.lastSuccess = logItem.timestamp;
      // Clear cooldown when model successfully responds
      stats.cooldownUntil = undefined;
    } else {
      stats.errorCount += 1;
      stats.score = Math.max(0, (stats.score ?? 0) - 1);
      stats.lastError = logItem.timestamp;
      // Set 60-second circuit breaker cooldown
      stats.cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    }
    this.modelStats.set(logItem.workingModel, stats);

    // Schedule background async persistence to DB
    this.schedulePersist();

    if (success) {
      this.logger.log(
        `[AI_WORKED_MODEL_LOG] Feature: ${feature} | Selected: ${selectedModel} | Worked: ${workingModel} (Score: ${stats.score}/4) | Fallback: ${fallbackOccurred} | Latency: ${latencyMs}ms`
      );
    } else {
      this.logger.warn(
        `[AI_FAILED_MODEL_LOG] Feature: ${feature} | Model: ${workingModel} (Score: ${stats.score}/4, Cooldown: 60s) | Error: ${error}`
      );
    }
  }

  /**
   * Calculate dynamic priority model fallback list based on logged working models & text generation capacity.
   * 1. Active healthy models sorted by bounded trust score (4 -> 1), then recency.
   * 2. Standby models (score 0, not in cooldown).
   * 3. Cooling down models (temporarily placed at the bottom until cooldown expires).
   * Optionally excludes a model (e.g. the primary model that already failed).
   */
  getPriorityModels(excludeModel?: string): string[] {
    if (!this.isHydrated) {
      this.hydrateFromStorage();
    }
    const cleanExclude = (excludeModel || '').replace(/^models\//i, '').trim().toLowerCase();

    const config = this.serverService.getConfig();
    const dbOverrides = this.serverService.getDbOverrides();
    const syncedModels: Array<{ name: string; displayName: string }> =
      get(dbOverrides, 'copilot.availableTextModels') ||
      get(config, 'copilot.availableTextModels') ||
      [];

    const now = Date.now();
    const candidateSet = new Set<string>();

    const activeHealthyModels: Array<{ model: string; score: number; lastSuccessTime: number }> = [];
    const coolingDownModels: Array<{ model: string; score: number; cooldownUntil: number }> = [];

    this.modelStats.forEach((stats, model) => {
      const clean = (model || '').replace(/^models\//i, '').trim();
      if (!clean || clean.toLowerCase() === cleanExclude) return;

      const isCoolingDown = stats.cooldownUntil && stats.cooldownUntil > now;
      if (isCoolingDown) {
        coolingDownModels.push({
          model: clean,
          score: stats.score ?? 0,
          cooldownUntil: stats.cooldownUntil!,
        });
      } else if ((stats.score ?? 0) > 0) {
        const lastSuccessTime = stats.lastSuccess ? new Date(stats.lastSuccess).getTime() : 0;
        activeHealthyModels.push({
          model: clean,
          score: stats.score ?? 0,
          lastSuccessTime,
        });
      }
    });

    // 1. Add active healthy models sorted by score DESC (4 -> 1), then lastSuccessTime DESC
    activeHealthyModels
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.lastSuccessTime - a.lastSuccessTime;
      })
      .forEach(item => candidateSet.add(item.model));

    // 2. Add synced models from Google Gemini API (standby, not cooling down and not already added)
    syncedModels.forEach(m => {
      const name = (m.name || '').replace(/^models\//i, '').trim();
      if (name && name.toLowerCase() !== cleanExclude) {
        const stats = this.modelStats.get(name);
        const isCoolingDown = stats?.cooldownUntil && stats.cooldownUntil > now;
        if (!isCoolingDown) {
          candidateSet.add(name);
        }
      }
    });

    // 3. If no synced models in DB yet, fallback to default text models
    if (syncedModels.length === 0) {
      DEFAULT_TEXT_MODELS.forEach(m => {
        if (m && m.toLowerCase() !== cleanExclude) {
          const stats = this.modelStats.get(m);
          const isCoolingDown = stats?.cooldownUntil && stats.cooldownUntil > now;
          if (!isCoolingDown) {
            candidateSet.add(m);
          }
        }
      });
    }

    // 4. Add cooling-down models at the bottom (sorted by earliest cooldown expiration first)
    coolingDownModels
      .sort((a, b) => a.cooldownUntil - b.cooldownUntil)
      .forEach(item => candidateSet.add(item.model));

    const isExcluded = (m: string) => {
      const lower = (m || '').toLowerCase();
      if (!lower.startsWith('gemini-') && !lower.includes('gemini')) return true;
      return EXCLUDED_NON_TEXT_KEYWORDS.some(kw => lower.includes(kw));
    };

    const filtered = Array.from(candidateSet).filter(m => !isExcluded(m));
    if (filtered.length === 0) {
      return DEFAULT_TEXT_MODELS.filter(m => m.toLowerCase() !== cleanExclude);
    }
    return filtered;
  }

  /**
   * Execute non-streaming text generation with intelligent fallback support.
   * 1. Attempts the feature's explicitly selected primary model first.
   * 2. If the primary model fails (and intelligent fallback is enabled), iterates through
   *    the dynamic fallback priority chain (ranked by most worked / reliable).
   */
  async executeWithFallback<T>(opts: {
    feature: AiFeatureType;
    primaryModel?: string;
    customApiKey?: string;
    runner: (modelName: string) => Promise<T>;
  }): Promise<{ result: T; workingModel: string; fallbackOccurred: boolean }> {
    const startTime = Date.now();
    const fallbackEnabled = this.isIntelligentFallbackEnabled();
    const cleanPrimary = (opts.primaryModel || 'gemini-2.5-flash')
      .replace(/^models\//i, '')
      .trim();

    // 1. First attempt the primary selected model
    try {
      const result = await opts.runner(cleanPrimary);
      const latencyMs = Date.now() - startTime;
      this.logExecution(opts.feature, cleanPrimary, cleanPrimary, false, true, latencyMs);
      return { result, workingModel: cleanPrimary, fallbackOccurred: false };
    } catch (primaryErr: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = primaryErr?.message || String(primaryErr);
      this.logExecution(opts.feature, cleanPrimary, cleanPrimary, false, false, latencyMs, errMsg);

      // If fallback is disabled, throw immediately
      if (!fallbackEnabled) {
        throw primaryErr;
      }

      this.logger.warn(
        `[PRIMARY_MODEL_FAILED] Feature: ${opts.feature} | Primary model '${cleanPrimary}' failed (${errMsg}). Triggering dynamic fallback priority chain...`
      );

      // 2. Iterate through the fallback priority chain (excluding the failed primary model)
      const fallbackList = this.getPriorityModels(cleanPrimary);
      let lastError: any = primaryErr;

      for (let i = 0; i < fallbackList.length; i++) {
        const candidateModel = fallbackList[i];
        const modelStartTime = Date.now();
        try {
          const result = await opts.runner(candidateModel);
          const candidateLatencyMs = Date.now() - modelStartTime;

          this.logExecution(
            opts.feature,
            cleanPrimary,
            candidateModel,
            true,
            true,
            candidateLatencyMs
          );

          return {
            result,
            workingModel: candidateModel,
            fallbackOccurred: true,
          };
        } catch (err: any) {
          lastError = err;
          const candidateLatencyMs = Date.now() - modelStartTime;
          const candidateErrMsg = err?.message || String(err);
          this.logExecution(
            opts.feature,
            cleanPrimary,
            candidateModel,
            true,
            false,
            candidateLatencyMs,
            candidateErrMsg
          );
          this.logger.warn(
            `[FALLBACK_RETRY] ${opts.feature} fallback model '${candidateModel}' failed (${candidateErrMsg}). Trying next priority model...`
          );
        }
      }

      throw lastError || new Error(`All fallback AI models failed for ${opts.feature}`);
    }
  }

  /**
   * Execute streaming text generation with intelligent fallback support.
   * 1. Attempts the primary selected model.
   * 2. If it fails before emitting chunks and fallback is enabled, falls back through the priority chain.
   */
  async *executeStreamWithFallback(opts: {
    feature: AiFeatureType;
    primaryModel?: string;
    customApiKey?: string;
    streamRunner: (modelName: string) => AsyncIterable<string>;
  }): AsyncGenerator<{ chunk: string; workingModel: string }, void, unknown> {
    const fallbackEnabled = this.isIntelligentFallbackEnabled();
    const cleanPrimary = (opts.primaryModel || 'gemini-2.5-flash')
      .replace(/^models\//i, '')
      .trim();

    const priorityList = fallbackEnabled
      ? [cleanPrimary, ...this.getPriorityModels(cleanPrimary)]
      : [cleanPrimary];
    let lastError: any = null;

    for (let i = 0; i < priorityList.length; i++) {
      const candidateModel = priorityList[i];
      const startTime = Date.now();
      let hasEmittedChunk = false;

      try {
        const generator = opts.streamRunner(candidateModel);
        for await (const chunk of generator) {
          if (!hasEmittedChunk) {
            hasEmittedChunk = true;
            const latencyMs = Date.now() - startTime;
            this.logExecution(
              opts.feature,
              cleanPrimary,
              candidateModel,
              candidateModel !== cleanPrimary,
              true,
              latencyMs
            );
          }
          yield { chunk, workingModel: candidateModel };
        }

        if (hasEmittedChunk) {
          return; // Successfully finished stream
        }
      } catch (err: any) {
        lastError = err;
        const latencyMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        this.logExecution(
          opts.feature,
          cleanPrimary,
          candidateModel,
          candidateModel !== cleanPrimary,
          false,
          latencyMs,
          errMsg
        );

        if (!fallbackEnabled) {
          throw err;
        }

        this.logger.warn(
          `[STREAM_FALLBACK_RETRY] ${opts.feature} stream model '${candidateModel}' failed (${errMsg}). Trying next model...`
        );
      }
    }

    if (lastError) throw lastError;
  }

  /**
   * Sync available text models directly from Google Gemini API and store in AppConfig
   */
  async syncAvailableTextModels(
    user: string,
    customApiKey?: string
  ): Promise<Array<{ name: string; displayName: string }>> {
    const key = this.getApiKey(customApiKey);
    if (!key) {
      throw new Error('Gemini API key is not configured. Cannot sync models.');
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google API returned ${response.status}: ${text}`);
      }

      const data = (await response.json()) as any;
      if (data && Array.isArray(data.models)) {
        const filtered = data.models
          .filter((m: any) => {
            const nameLower = (m.name ?? '').toLowerCase();
            const displayNameLower = (m.displayName ?? '').toLowerCase();
            const methods: string[] = m.supportedGenerationMethods ?? m.supported_actions ?? [];

            // Must support text generation
            const supportsText =
              methods.includes('generateContent') ||
              methods.includes('countTokens') ||
              methods.includes('createCachedContent');

            if (!supportsText) return false;

            // Must NOT match excluded non-text keywords
            if (
              EXCLUDED_NON_TEXT_KEYWORDS.some(
                kw => nameLower.includes(kw) || displayNameLower.includes(kw)
              )
            ) {
              return false;
            }

            return true;
          })
          .map((m: any) => {
            const name = (m.name || '').startsWith('models/')
              ? m.name.substring(7)
              : m.name;
            return {
              name,
              displayName: m.displayName || name,
            };
          });

        if (filtered.length > 0) {
          try {
            await this.serverService.updateConfig(user, [
              {
                module: 'copilot',
                key: 'availableTextModels',
                value: filtered,
              },
            ]);
          } catch {
            if (this.models) {
              await this.models.appConfig.save('system', [
                {
                  key: 'copilot.availableTextModels',
                  value: filtered,
                },
              ]);
            }
          }
          this.logger.log(`Successfully synced ${filtered.length} live Gemini models from ModelService.ListModels.`);
          return filtered;
        }
      }
    } catch (e: any) {
      this.logger.error('Failed to sync Gemini text models', e);
      throw e;
    }

    const fallbackList = DEFAULT_TEXT_MODELS.map(m => ({
      name: m,
      displayName: m.replace(/^gemini-/i, 'Gemini ').replace(/-/g, ' '),
    }));
    try {
      await this.serverService.updateConfig(user, [
        {
          module: 'copilot',
          key: 'availableTextModels',
          value: fallbackList,
        },
      ]);
    } catch {
      if (this.models) {
        await this.models.appConfig.save('system', [
          {
            key: 'copilot.availableTextModels',
            value: fallbackList,
          },
        ]);
      }
    }
    return fallbackList;
  }

  /**
   * Return debug information and live worked logs for Admin UI
   */
  getFallbackInfo(feature?: string) {
    if (!this.isHydrated) {
      this.hydrateFromStorage();
    }
    const enabled = this.isIntelligentFallbackEnabled();
    const config = this.serverService.getConfig();
    const dbOverrides = this.serverService.getDbOverrides();

    const docModel =
      get(dbOverrides, 'copilot.researchDocModel') ||
      get(config, 'copilot.researchDocModel') ||
      'gemini-3.5-flash';

    const projectModel =
      get(dbOverrides, 'copilot.providers.gemini.model') ||
      get(config, 'copilot.providers.gemini.model') ||
      'gemini-3.5-flash';

    const phishModel =
      get(dbOverrides, 'phish.model') ||
      get(config, 'phish.model') ||
      'gemini-2.5-flash';

    let selectedModel = projectModel;
    if (feature === 'research' || feature === 'doc') {
      selectedModel = docModel;
    } else if (feature === 'phish') {
      selectedModel = phishModel;
    }

    const cleanPrimary = String(selectedModel).replace(/^models\//i, '').trim();

    const syncedModels: Array<{ name: string; displayName: string }> =
      get(dbOverrides, 'copilot.availableTextModels') ||
      get(config, 'copilot.availableTextModels') ||
      [];

    return {
      intelligentFallbackEnabled: enabled,
      selectedPrimaryModel: cleanPrimary,
      projectModel: String(projectModel).replace(/^models\//i, '').trim(),
      researchDocModel: String(docModel).replace(/^models\//i, '').trim(),
      phishModel: String(phishModel).replace(/^models\//i, '').trim(),
      requestedFeature: feature || 'project',
      priorityModels: enabled ? this.getPriorityModels() : [cleanPrimary],
      syncedModels: syncedModels.length > 0 ? syncedModels : DEFAULT_TEXT_MODELS.map(m => ({ name: m, displayName: m.replace(/^gemini-/i, 'Gemini ').replace(/-/g, ' ') })),
      workedLogs: enabled ? this.workedLogs.slice(0, 50) : [],
      stats: enabled ? Object.fromEntries(this.modelStats.entries()) : {},
    };
  }

  /**
   * Dynamically query Google's ModelService.ListModels and determine if the given model (or active Document Canvas model) supports Search Grounding
   */
  async checkModelSearchGroundingSupport(
    modelName?: string
  ): Promise<{ supported: boolean; model: string; methods: string[] }> {
    const key = this.getApiKey();
    const effectiveModel = (
      modelName ||
      (this.getDbOverrides() as any)?.copilot?.researchDocModel ||
      (this.getDbOverrides() as any)?.copilot?.providers?.gemini?.model ||
      'gemini-2.5-flash'
    )
      .replace(/^models\//i, '')
      .trim();

    if (!key) {
      const nameLower = effectiveModel.toLowerCase();
      const isExcluded = EXCLUDED_NON_TEXT_KEYWORDS.some(kw => nameLower.includes(kw));
      return {
        supported: !isExcluded,
        model: effectiveModel,
        methods: ['generateContent'],
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );

      if (!response.ok) {
        const nameLower = effectiveModel.toLowerCase();
        const isExcluded = EXCLUDED_NON_TEXT_KEYWORDS.some(kw => nameLower.includes(kw));
        return {
          supported: !isExcluded,
          model: effectiveModel,
          methods: ['generateContent'],
        };
      }

      const data = (await response.json()) as any;
      if (data && Array.isArray(data.models)) {
        const found = data.models.find((m: any) => {
          const rawName = (m.name || '').replace(/^models\//i, '').trim().toLowerCase();
          return rawName === effectiveModel.toLowerCase();
        });

        if (found) {
          const methods: string[] = found.supportedGenerationMethods ?? found.supported_actions ?? [];
          const nameLower = (found.name ?? '').toLowerCase();
          const displayNameLower = (found.displayName ?? '').toLowerCase();

          const hasGenerateContent = methods.includes('generateContent');
          const isExcluded = EXCLUDED_NON_TEXT_KEYWORDS.some(
            kw => nameLower.includes(kw) || displayNameLower.includes(kw)
          );

          return {
            supported: hasGenerateContent && !isExcluded,
            model: effectiveModel,
            methods,
          };
        }
      }

      const nameLower = effectiveModel.toLowerCase();
      const isExcluded = EXCLUDED_NON_TEXT_KEYWORDS.some(kw => nameLower.includes(kw));
      return {
        supported: !isExcluded,
        model: effectiveModel,
        methods: ['generateContent'],
      };
    } catch {
      const nameLower = effectiveModel.toLowerCase();
      const isExcluded = EXCLUDED_NON_TEXT_KEYWORDS.some(kw => nameLower.includes(kw));
      return {
        supported: !isExcluded,
        model: effectiveModel,
        methods: ['generateContent'],
      };
    }
  }
}
