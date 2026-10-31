import { DocService, DocsService } from '@affine/core/modules/doc';
import { AppThemeService } from '@affine/core/modules/theme';
import type { Container } from '@blocksuite/affine/global/di';
import { ColorScheme } from '@blocksuite/affine/model';
import {
  type ThemeExtension,
  ThemeExtensionIdentifier,
} from '@blocksuite/affine/shared/services';
import {
  createSignalFromObservable,
  type Signal,
} from '@blocksuite/affine/shared/utils';
import { LifeCycleWatcher, StdIdentifier } from '@blocksuite/affine/std';
import { type FrameworkProvider } from '@toeverything/infra';
import { combineLatest, map, Observable } from 'rxjs';

export function getThemeExtension(
  framework: FrameworkProvider
): typeof LifeCycleWatcher {
  class AffineThemeExtension
    extends LifeCycleWatcher
    implements ThemeExtension
  {
    static override readonly key = 'affine-theme';

    private readonly themes: Map<string, Signal<ColorScheme>> = new Map();

    protected readonly disposables: (() => void)[] = [];

    static override setup(di: Container) {
      super.setup(di);
      di.override(ThemeExtensionIdentifier, AffineThemeExtension, [
        StdIdentifier,
      ]);
    }

    getAppTheme() {
      const keyName = 'app-theme';
      const cache = this.themes.get(keyName);
      if (cache) return cache;

      const theme$ = new Observable<ColorScheme>(subscriber => {
        const getCurrentTheme = (): ColorScheme => {
          const docTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'light';
          return docTheme === 'dark' ? ColorScheme.Dark : ColorScheme.Light;
        };

        subscriber.next(getCurrentTheme());

        if (typeof document === 'undefined') return;

        const observer = new MutationObserver(() => {
          subscriber.next(getCurrentTheme());
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });

        return () => observer.disconnect();
      });

      const { signal: themeSignal, cleanup } =
        createSignalFromObservable<ColorScheme>(theme$, ColorScheme.Light);
      this.disposables.push(cleanup);
      this.themes.set(keyName, themeSignal);
      return themeSignal;
    }

    getEdgelessTheme(docId?: string) {
      const doc =
        (docId && framework.get(DocsService).list.doc$(docId).getValue()) ||
        framework.get(DocService).doc;

      const cache = this.themes.get(doc.id);
      if (cache) return cache;

      const appTheme$ = new Observable<ColorScheme>(subscriber => {
        const getCurrentTheme = (): ColorScheme => {
          const docTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'light';
          return docTheme === 'dark' ? ColorScheme.Dark : ColorScheme.Light;
        };

        subscriber.next(getCurrentTheme());

        if (typeof document === 'undefined') return;

        const observer = new MutationObserver(() => {
          subscriber.next(getCurrentTheme());
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });

        return () => observer.disconnect();
      });

      const docTheme$ = doc.properties$.map(
        props => props.edgelessColorTheme || 'system'
      );
      const theme$: Observable<ColorScheme> = combineLatest([
        appTheme$,
        docTheme$,
      ]).pipe(
        map(([appTheme, docTheme]) => {
          const theme = docTheme === 'system' ? appTheme : docTheme;
          return theme === ColorScheme.Dark
            ? ColorScheme.Dark
            : ColorScheme.Light;
        })
      );
      const { signal: themeSignal, cleanup } =
        createSignalFromObservable<ColorScheme>(theme$, ColorScheme.Light);
      this.disposables.push(cleanup);
      this.themes.set(doc.id, themeSignal);
      return themeSignal;
    }

    override unmounted() {
      this.dispose();
    }

    dispose() {
      this.disposables.forEach(dispose => dispose());
    }
  }

  return AffineThemeExtension;
}
