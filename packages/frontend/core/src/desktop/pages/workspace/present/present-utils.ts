const AVATAR_PALETTE = [
  '#e53935',
  '#d81b60',
  '#8e24aa',
  '#5e35b1',
  '#1e88e5',
  '#00897b',
  '#43a047',
  '#fb8c00',
  '#6d4c41',
  '#546e7a',
  '#f06292',
  '#26c6da',
];

export function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export const applyVirtualBackground = async (
  videoTrack: any,
  effectType: string,
  customImgUrl?: string
) => {
  if (!videoTrack) return;
  const VirtualBackgroundExtension = (window as any).VirtualBackgroundExtension;
  const AgoraRTC = (window as any).AgoraRTC;
  if (!VirtualBackgroundExtension || !AgoraRTC) {
    console.warn('[Virtual Background] SDK or Extension not loaded');
    return;
  }

  try {
    let processor = videoTrack._vbProcessor;
    if (!processor) {
      if (effectType === 'none') {
        return;
      }
      if (videoTrack._vbInitializing) {
        await videoTrack._vbInitPromise;
      } else {
        let resolveInit: any;
        videoTrack._vbInitPromise = new Promise(resolve => {
          resolveInit = resolve;
        });
        videoTrack._vbInitializing = true;

        const extension = new VirtualBackgroundExtension();
        try {
          AgoraRTC.registerExtensions([extension]);
        } catch (e) {
          console.warn(
            '[Virtual Background] Extension registration warning:',
            e
          );
        }
        processor = extension.createProcessor();
        await processor.init(
          'https://cdn.jsdelivr.net/npm/agora-extension-virtual-background@2.1.0/wasms'
        );

        try {
          videoTrack.pipe(processor).pipe(videoTrack.processorDestination);
          videoTrack._vbProcessor = processor;
        } catch (pipeErr) {
          console.warn('[Virtual Background] Failed to pipe track to processor:', pipeErr);
        }

        videoTrack._vbInitializing = false;
        if (resolveInit) resolveInit();
      }
    }

    processor = videoTrack._vbProcessor;
    if (!processor) return;

    if (effectType === 'none') {
      try {
        await processor.disable();
      } catch (_) {}
    } else if (effectType === 'blur') {
      await processor.setOptions({ type: 'blur', blurDegree: 'high' });
      await processor.enable();
    } else if (effectType === 'office') {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src =
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        await processor.setOptions({ type: 'img', source: img });
        await processor.enable();
      } catch (imgErr) {
        console.warn('[Virtual Background] Office image failed, falling back to blur:', imgErr);
        await processor.setOptions({ type: 'blur', blurDegree: 'high' });
        await processor.enable();
      }
    } else if (effectType === 'beach') {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src =
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        await processor.setOptions({ type: 'img', source: img });
        await processor.enable();
      } catch (imgErr) {
        console.warn('[Virtual Background] Beach image failed, falling back to blur:', imgErr);
        await processor.setOptions({ type: 'blur', blurDegree: 'high' });
        await processor.enable();
      }
    } else if (effectType === 'custom' && customImgUrl) {
      try {
        const img = new Image();
        if (!customImgUrl.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
        img.src = customImgUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        await processor.setOptions({ type: 'img', source: img });
        await processor.enable();
      } catch (imgErr) {
        console.warn('[Virtual Background] Custom image failed, falling back to blur:', imgErr);
        await processor.setOptions({ type: 'blur', blurDegree: 'high' });
        await processor.enable();
      }
    }
  } catch (err) {
    console.error(
      '[Virtual Background] Failed to apply background effect:',
      err
    );
    videoTrack._vbInitializing = false;
  }
};

export const applyAiDenoiser = async (
  audioTrack: any,
  enabled: boolean
) => {
  if (!audioTrack) return;
  const AgoraExtensionAiDenoiser = (window as any).AIDenoiser || (window as any).AgoraExtensionAiDenoiser;
  const AgoraRTC = (window as any).AgoraRTC;
  if (!AgoraExtensionAiDenoiser || !AgoraRTC) {
    console.warn('[AI Denoiser] Agora RTC SDK or Extension not loaded yet');
    return;
  }

  try {
    let processor = audioTrack._aiDenoiserProcessor;
    if (!processor) {
      if (!enabled) {
        return;
      }
      if (audioTrack._aiDenoiserInitializing) {
        await audioTrack._aiDenoiserInitPromise;
        return;
      }

      let resolveInit: any;
      audioTrack._aiDenoiserInitPromise = new Promise(resolve => {
        resolveInit = resolve;
      });
      audioTrack._aiDenoiserInitializing = true;

      const { AIDenoiserExtension } = AgoraExtensionAiDenoiser;
      const extension = new AIDenoiserExtension({
        assetsPath: 'https://cdn.jsdelivr.net/npm/agora-extension-ai-denoiser@2.0.2/external'
      });

      try {
        AgoraRTC.registerExtensions([extension]);
      } catch (e) {
        console.warn(
          '[AI Denoiser] Extension already registered or registration failed:',
          e
        );
      }

      processor = extension.createProcessor();
      
      try {
        audioTrack.pipe(processor).pipe(audioTrack.processorDestination);
        audioTrack._aiDenoiserProcessor = processor;
      } catch (pipeErr) {
        console.warn('[AI Denoiser] Failed to pipe audio track to processor:', pipeErr);
      }

      audioTrack._aiDenoiserInitializing = false;
      resolveInit();
    }

    processor = audioTrack._aiDenoiserProcessor;
    if (!processor) return;

    if (enabled) {
      await processor.enable();
    } else {
      await processor.disable();
    }
  } catch (err) {
    console.error(
      '[AI Denoiser] Failed to configure AI Noise Suppression:',
      err
    );
    audioTrack._aiDenoiserInitializing = false;
  }
};
