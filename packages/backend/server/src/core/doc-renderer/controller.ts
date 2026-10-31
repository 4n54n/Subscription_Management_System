import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import isMobile from 'is-mobile';

import { Config, metrics } from '../../base';
import { Models } from '../../models';
import { htmlSanitize } from '../../native';
import { Public } from '../auth';
import { ServerService } from '../config';
import { DocReader } from '../doc';

interface RenderOptions {
  title: string;
  summary: string;
  avatar?: string;
}

interface HtmlAssets {
  css: string[];
  js: string[];
  publicPath: string;
  gitHash: string;
  description: string;
}

const defaultAssets: HtmlAssets = {
  css: [],
  js: [],
  publicPath: '/',
  gitHash: '',
  description: '',
};

// TODO(@forehalo): reuse routes with frontend
const staticPaths = new Set([
  'all',
  'home',
  'search',
  'collection',
  'tag',
  'trash',
]);

@Controller('/workspace')
export class DocRendererController {
  private readonly logger = new Logger(DocRendererController.name);
  private cachedWebAssets: HtmlAssets = defaultAssets;
  private cachedMobileAssets: HtmlAssets = defaultAssets;
  private lastWebMtime = 0;
  private lastMobileMtime = 0;

  private getWebStaticPath(): string {
    const webDist = join(env.projectRoot, '../../packages/frontend/apps/web/dist');
    if (existsSync(join(webDist, 'index.html'))) {
      return webDist;
    }
    const legacyWebDist = join(env.projectRoot, '../../frontend/apps/web/dist');
    if (existsSync(join(legacyWebDist, 'index.html'))) {
      return legacyWebDist;
    }
    return join(env.projectRoot, 'static');
  }

  constructor(
    private readonly doc: DocReader,
    private readonly models: Models,
    private readonly config: Config,
    private readonly serverService: ServerService
  ) {
    this.readHtmlAssets(this.getWebStaticPath(), false);
    this.readHtmlAssets(join(env.projectRoot, 'static/mobile'), true);
  }

  @Public()
  @Get('/*path')
  async render(@Req() req: Request, @Res() res: Response) {
    try {
      const isMobileReq =
        Boolean(env.namespaces.canary) &&
        isMobile({
          ua: req.headers['user-agent'] ?? undefined,
        });

      const assets: HtmlAssets = isMobileReq
        ? this.readHtmlAssets(join(env.projectRoot, 'static/mobile'), true)
        : this.readHtmlAssets(this.getWebStaticPath(), false);

      let opts: RenderOptions | null = null;
      // /workspace/:workspaceId/{:docId | staticPaths}
      const [, , workspaceId, subPath, ...restPaths] = req.path.split('/');

      // /:workspaceId/:docId
      if (workspaceId && !staticPaths.has(subPath) && restPaths.length === 0) {
        try {
          opts =
            workspaceId === subPath
              ? await this.getWorkspaceContent(workspaceId)
              : await this.getPageContent(workspaceId, subPath);
          metrics.doc.counter('render').add(1);
        } catch (e) {
          this.logger.error('failed to render page content', e);
        }
      }

      res.setHeader('Content-Type', 'text/html');
      if (!opts) {
        res.setHeader('X-Robots-Tag', 'noindex');
      }

      const serverCfg = this.serverService.getConfig().server;
      const customOgImage = (serverCfg as any)?.linkPreviewImageUrl || (serverCfg as any)?.linkPreviewImageData;
      res.send(this._render(opts, assets, customOgImage));
    } catch (err) {
      this.logger.error('Error rendering HTML page', err);
      res.status(500).send('Internal Server Error');
    }
  }

  private async getPageContent(
    workspaceId: string,
    docId: string
  ): Promise<RenderOptions | null> {
    let allowUrlPreview = await this.models.doc.isPublic(workspaceId, docId);

    if (!allowUrlPreview) {
      // if page is private, but workspace url preview is on
      allowUrlPreview =
        await this.models.workspace.allowUrlPreview(workspaceId);
    }

    if (allowUrlPreview) {
      return this.doc.getDocContent(workspaceId, docId);
    }

    return null;
  }

  private async getWorkspaceContent(
    workspaceId: string
  ): Promise<RenderOptions | null> {
    const allowUrlPreview =
      await this.models.workspace.allowUrlPreview(workspaceId);

    if (allowUrlPreview) {
      const workspaceContent = await this.doc.getWorkspaceContent(workspaceId);

      if (workspaceContent) {
        return {
          title: workspaceContent.name,
          summary: '',
          avatar: workspaceContent.avatarUrl,
        };
      }
    }

    return null;
  }

  // @TODO(@forehalo): pre-compile html template to accelerate serializing
  _render(opts: RenderOptions | null, assets: HtmlAssets, customOgImage?: string | null): string {
    // TODO(@forehalo): how can we enable the type reference to @affine/env
    const envMeta: Record<string, any> = {
      publicPath: assets.publicPath,
      subPath: this.config.server.path,
      renderer: 'ssr',
    };

    if (env.selfhosted) {
      envMeta.isSelfHosted = true;
    }

    const title = opts?.title
      ? htmlSanitize(`${opts.title} · Brightloop Software`)
      : 'Brightloop Software';
    const summary = opts ? htmlSanitize(opts.summary) : assets.description;
    const image = opts?.avatar || customOgImage || 'https://brightloop.local/og.png';

    // TODO(@forehalo): parse assets/index.html
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    />
    <meta name="description" content="${summary}" />
    <meta name="theme-color" content="#fafafa" />
    ${assets.publicPath.startsWith('/') ? '' : `<link rel="preconnect" href="${assets.publicPath}" />`}
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="icon" sizes="192x192" href="/favicon-192.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta name="emotion-insertion-point" content="" />
    ${!opts ? '<meta name="robots" content="noindex, nofollow" />' : ''}
    <meta
      name="twitter:title"
      content="${title}"
    />
    <meta name="twitter:description" content="${summary}" />
    <meta name="twitter:site" content="@Brightloop" />
    <meta name="twitter:image" content="${image}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${summary}" />
    <meta property="og:image" content="${image}" />
    ${Object.entries(envMeta)
      .map(([key, val]) => `<meta name="env:${key}" content="${val}" />`)
      .join('\n')}
    ${assets.css.map(url => `<link rel="stylesheet" href="${url}" />`).join('\n')}
  </head>
  <body>
    <div id="app" data-version="${assets.gitHash}"></div>
    ${assets.js.map(url => `<script src="${url}"></script>`).join('\n')}
  </body>
</html>
    `;
  }

  /**
   * Fast timestamp-cached asset reader (0ms in-memory latency)
   */
  private readHtmlAssets(path: string, isMobileKey = false): HtmlAssets {
    const manifestPath = join(path, 'assets-manifest.json');

    try {
      if (existsSync(manifestPath)) {
        const stat = statSync(manifestPath);
        const mtime = stat.mtimeMs;
        const cache = isMobileKey ? this.cachedMobileAssets : this.cachedWebAssets;
        const lastMtime = isMobileKey ? this.lastMobileMtime : this.lastWebMtime;

        if (cache !== defaultAssets && mtime === lastMtime) {
          return cache;
        }

        const assets: HtmlAssets = JSON.parse(
          readFileSync(manifestPath, 'utf-8')
        );

        const publicPath = '/';

        assets.publicPath = publicPath;
        assets.js = assets.js.map(p => publicPath + p);
        assets.css = assets.css.map(p => publicPath + p);

        if (isMobileKey) {
          this.cachedMobileAssets = assets;
          this.lastMobileMtime = mtime;
        } else {
          this.cachedWebAssets = assets;
          this.lastWebMtime = mtime;
        }

        return assets;
      }
    } catch (e) {
      this.logger.warn(`Could not load assets manifest from ${manifestPath}: ${(e as Error).message}`);
    }

    return defaultAssets;
  }
}
