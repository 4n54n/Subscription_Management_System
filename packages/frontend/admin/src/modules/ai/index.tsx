import { Button } from '@affine/admin/components/ui/button';
import { Input } from '@affine/admin/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@affine/admin/components/ui/select';
import { Switch } from '@affine/admin/components/ui/switch';
import { cn } from '@affine/admin/utils';
import { notify } from '@affine/component';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { get } from 'lodash-es';
import { CheckIcon, Cpu, Key, RefreshCw, Layers, Zap, CheckCircle2, Clock, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Header } from '../header';
import { useAppConfig } from '../settings/use-app-config';

const FALLBACK_TEXT_MODELS = [
  { name: 'gemini-3.5-flash', displayName: 'Gemini 3.5 Flash' },
  { name: 'gemini-3.5-pro', displayName: 'Gemini 3.5 Pro' },
  { name: 'gemini-3.0-pro', displayName: 'Gemini 3.0 Pro' },
  { name: 'gemini-3.0-flash', displayName: 'Gemini 3.0 Flash' },
  { name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
  { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  { name: 'gemini-2.0-pro-exp-02-05', displayName: 'Gemini 2.0 Pro (Experimental)' },
  { name: 'gemini-2.0-flash-thinking-exp-01-21', displayName: 'Gemini 2.0 Flash Thinking' },
  { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { name: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash-Lite' },
  { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
  { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
  { name: 'gemini-1.5-flash-8b', displayName: 'Gemini 1.5 Flash 8B' },
];

function AiPage() {
  const { update, save, updates, patchedAppConfig } = useAppConfig();

  const disableSave = Object.keys(updates).length === 0;

  const handleSave = useCallback(() => {
    if (disableSave) return;
    save();
  }, [save, disableSave]);

  const geminiApiKey = String(get(patchedAppConfig, 'copilot.providers.gemini.apiKey', '') || '');
  const researchDocModel = String(get(patchedAppConfig, 'copilot.researchDocModel', 'gemini-3.5-flash') || 'gemini-3.5-flash');
  const projectModel = String(get(patchedAppConfig, 'copilot.providers.gemini.model', 'gemini-3.5-flash') || 'gemini-3.5-flash');
  const phishModel = String(get(patchedAppConfig, 'phish.model', 'gemini-2.5-flash-lite') || 'gemini-2.5-flash-lite');
  const intelligentFallbackEnabled = Boolean(get(patchedAppConfig, 'copilot.intelligentFallbackEnabled', true));

  // Local state
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [textModels, setTextModels] = useState<Array<{ name: string; displayName: string }>>(FALLBACK_TEXT_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isSyncingModels, setIsSyncingModels] = useState(false);
  const [showPriorityInfo, setShowPriorityInfo] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState<any>(null);

  const EXCLUDED_NON_TEXT = [
    'imagen',
    'veo',
    'tts',
    'clip',
    'lyria',
    'robotics',
    'audio',
    'video',
    'embedding',
    'sonar',
    'gpt',
    'claude',
    'gemini-1.0-pro',
  ];

  // Guarantee that any active selected model is present in the options list so Radix UI Select never breaks
  const availableModels = useMemo(() => {
    const list = [...textModels].filter(m => {
      const name = (m.name || '').toLowerCase();
      return name.startsWith('gemini-') && !EXCLUDED_NON_TEXT.some(kw => name.includes(kw));
    });
    const selected = [researchDocModel, projectModel, phishModel];
    selected.forEach(val => {
      const lower = (val || '').toLowerCase();
      const isExcluded = !lower.startsWith('gemini-') || EXCLUDED_NON_TEXT.some(kw => lower.includes(kw));
      if (val && !isExcluded && !list.some(m => m.name === val)) {
        const formatted = val.replace(/^gemini-/i, 'Gemini ').replace(/-/g, ' ');
        list.unshift({ name: val, displayName: formatted });
      }
    });
    return list;
  }, [textModels, researchDocModel, projectModel, phishModel]);

  useEffect(() => {
    setApiKeyInput(geminiApiKey);
  }, [geminiApiKey]);

  const handleApiKeyChange = (val: string) => {
    setApiKeyInput(val);
    update('copilot/providers.gemini/apiKey', val);
  };

  const fetchFallbackInfo = async () => {
    try {
      const res = await fetch('/api/presentation/gemini/fallback-info');
      if (res.ok) {
        const data = await res.json();
        setFallbackInfo(data);
        if (Array.isArray(data.syncedModels) && data.syncedModels.length > 0) {
          setTextModels(data.syncedModels);
        }
      }
    } catch (e) {
      console.error('Failed to fetch fallback info:', e);
    }
  };

  // Live polling for fallback stats and circuit breaker cooldowns when modal is open
  useEffect(() => {
    if (!showPriorityInfo) return;
    fetchFallbackInfo();
    const interval = setInterval(() => {
      fetchFallbackInfo();
    }, 2000);
    return () => clearInterval(interval);
  }, [showPriorityInfo]);

  // Fetch available text-only models dynamically from Gemini API
  useEffect(() => {
    let active = true;
    const fetchTextModels = async () => {
      setLoadingModels(true);
      try {
        const key = apiKeyInput.trim();
        const res = await fetch(`/api/presentation/gemini/models?apiKey=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && active) {
            const excluded = ['image', 'vision', 'audio', 'video', 'embedding', 'imagen', 'veo', 'tts'];
            const filteredText = data.filter((m: any) => {
              const nameLower = (m.name || '').toLowerCase();
              return !excluded.some(kw => nameLower.includes(kw));
            });
            if (filteredText.length > 0) {
              setTextModels(filteredText);
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch text models:', e);
      } finally {
        if (active) setLoadingModels(false);
      }
    };

    const timer = setTimeout(() => {
      fetchTextModels();
      fetchFallbackInfo();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [apiKeyInput]);

  const handleSyncModels = async () => {
    setIsSyncingModels(true);
    try {
      const key = apiKeyInput.trim();
      const res = await fetch('/api/presentation/gemini/sync-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTextModels(data);
          notify.success({
            title: 'Models Synced',
            message: `Successfully synced ${data.length} text generation models from Gemini API.`,
          });
          await fetchFallbackInfo();
        }
      }
    } catch (e) {
      notify.error({
        title: 'Sync Failed',
        message: 'Failed to sync available models from Google Gemini API.',
      });
    } finally {
      setIsSyncingModels(false);
    }
  };

  return (
    <div className="h-screen flex-1 flex-col flex bg-background font-sans relative">
      <Header
        title="AI & Sandbox Settings"
        endFix={
          <Button
            type="button"
            size="icon"
            className="w-8 h-8"
            variant="ghost"
            onClick={handleSave}
            disabled={disableSave}
            title="Save changes"
          >
            <CheckIcon size={20} className={disableSave ? 'text-muted-foreground' : 'text-primary'} />
          </Button>
        }
      />
      <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden w-full flex-1')}>
        <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [&>div]:!block">
          <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">AI Configurations</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Centralized management for Google Gemini text models, fallback priorities, and global API credentials.
              </p>
            </div>

            {/* API Key Section */}
            <div className="border rounded-xl p-6 bg-card space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-base font-semibold">Google Gemini API Credentials</h2>
                  <p className="text-xs text-muted-foreground">Global API key used across project copilot, document canvas, phish generator, and presentation meetings.</p>
                </div>
              </div>
              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Gemini API Key
                </label>
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => handleApiKeyChange(e.target.value)}
                  placeholder="Paste your Gemini API Key..."
                  className="font-mono text-sm max-w-md"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* AI Text Models Selection */}
            <div className="border rounded-xl p-6 bg-card space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b pb-4">
                <Cpu className="w-5 h-5 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Global Text AI Model Selection</h2>
                    {loadingModels && (
                      <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full animate-pulse">
                        Syncing API models...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Select primary text generation Gemini models for each workspace feature.</p>
                </div>
              </div>

              {/* Intelligent Model Fallback Switch Bar */}
              <div className="bg-muted/40 rounded-lg p-4 border flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Intelligent model fallback</span>
                    <button
                      type="button"
                      onClick={() => {
                        fetchFallbackInfo();
                        setShowPriorityInfo(prev => !prev);
                      }}
                      className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                      title="Open Settings & Dynamic Model Priority Ranking"
                    >
                      Settings
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    When enabled, if the selected model fails, AI features automatically retry through the priority model chain built from working execution logs.
                    <span className="font-semibold text-foreground ml-1">If disabled, features ONLY use the selected model.</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium', intelligentFallbackEnabled ? 'text-emerald-600' : 'text-amber-600')}>
                    {intelligentFallbackEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <Switch
                    checked={intelligentFallbackEnabled}
                    onCheckedChange={checked => update('copilot/intelligentFallbackEnabled', checked)}
                  />
                </div>
              </div>

              {/* Settings: Dynamic Model Priority Ranking & Worked Logs Popover/Modal */}
              {showPriorityInfo && (
                <div className="border rounded-xl p-5 bg-card space-y-4 shadow-lg border-primary/20 relative animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    type="button"
                    onClick={() => setShowPriorityInfo(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between gap-4 border-b pb-3 pr-8">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <Layers className="w-4 h-4" />
                      <span>Dynamic Model Priority Ranking & Worked Logs</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSyncModels}
                      disabled={isSyncingModels}
                      className="gap-2 text-xs font-medium border-primary/20 hover:bg-primary/5"
                    >
                      <RefreshCw className={cn('w-3.5 h-3.5 text-primary', isSyncingModels && 'animate-spin')} />
                      <span>{isSyncingModels ? 'Syncing...' : 'Sync Available Models'}</span>
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Models are prioritized automatically based on real-time execution success logs and Google Gemini text capabilities.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Priority List */}
                    <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Fallback Priority Chain</span>
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(fallbackInfo?.priorityModels || availableModels.map(m => m.name)).map((modName: string, idx: number) => {
                          const stats = fallbackInfo?.stats?.[modName];
                          const isCoolingDown = stats?.cooldownUntil && stats.cooldownUntil > Date.now();
                          const remainingCooldownSec = isCoolingDown
                            ? Math.max(1, Math.ceil((stats.cooldownUntil - Date.now()) / 1000))
                            : 0;
                          const score = typeof stats?.score === 'number'
                            ? stats.score
                            : stats?.successCount
                              ? Math.min(4, stats.successCount)
                              : 0;
                          const hasWorked = score > 0;

                          return (
                            <div key={modName} className="flex items-center justify-between text-xs p-1.5 rounded bg-card border font-mono">
                              <span className="flex items-center gap-2">
                                <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                                <span className="font-semibold text-foreground">{modName}</span>
                              </span>
                              {isCoolingDown ? (
                                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  Cooldown ({remainingCooldownSec}s)
                                </span>
                              ) : hasWorked ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Worked ({score}/4)
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Standby</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Worked Logs */}
                    <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Recent Worked Logs</span>
                        <span className="text-[10px] text-primary font-mono font-bold">Live</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {fallbackInfo?.workedLogs && fallbackInfo.workedLogs.length > 0 ? (
                          fallbackInfo.workedLogs.slice(0, 15).map((log: any) => (
                            <div key={log.id} className="text-[11px] p-2 rounded-md bg-card border space-y-1">
                              <div className="flex items-center justify-between font-mono">
                                <span className="font-bold capitalize text-primary text-[11px]">[{log.feature}]</span>
                                <span className={log.success ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                                  {log.success ? `${log.latencyMs}ms` : 'Failed'}
                                </span>
                              </div>
                              {log.success ? (
                                <div className="text-muted-foreground text-[11px] leading-tight">
                                  <span>Worked: </span>
                                  <span className="text-foreground font-semibold font-mono">{log.workingModel}</span>
                                  {log.fallbackOccurred && (
                                    <span className="text-amber-600 dark:text-amber-400 ml-1.5 font-medium">
                                      (Fallback from <span className="font-mono">{log.selectedModel}</span>)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="text-muted-foreground text-[11px] leading-tight">
                                    <span>Failed: </span>
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">{log.workingModel}</span>
                                  </div>
                                  {log.error && (
                                    <div className="text-[10px] text-rose-500/80 font-mono truncate" title={log.error}>
                                      {log.error}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground p-4 text-center">
                            No model executions logged yet. Execution logs will populate in real time.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Research & Document Canvas Copilot Model
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    Powers Document Canvas AI, Writing Assistant, Proposals & Doc Sidebar.
                  </p>
                  <Select
                    value={researchDocModel}
                    onValueChange={val => update('copilot/researchDocModel', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select document text model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Workspace & Project Management Copilot Model
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    Powers Workspace Copilot for project documents, planning & project management.
                  </p>
                  <Select
                    value={projectModel}
                    onValueChange={val => update('copilot/providers.gemini/model', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select project text model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Phishing Threat & Security AI Model
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    Powers Email Threat Analysis, Sender Risk Scoring & Incident Inspection.
                  </p>
                  <Select
                    value={phishModel}
                    onValueChange={val => update('phish/model', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select phish security model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.ScrollAreaScrollbar
          className={cn(
            'flex touch-none select-none transition-colors',
            'h-full w-2.5 border-l border-l-transparent p-[1px]'
          )}
        >
          <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </div>
  );
}

export { AiPage as Component };
