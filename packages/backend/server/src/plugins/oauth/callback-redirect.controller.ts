import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { URLHelper, UseNamedGuard } from '../../base';
import { Public } from '../../core/auth';

/**
 * Handles GET /oauth/callback — the URL that Microsoft redirects to
 * after the user approves the sign-in.
 *
 * In development the backend runs on :3010 while the frontend (webpack-dev-server)
 * runs on :8080. This controller redirects the browser from the
 * backend's /oauth/callback to the frontend's /oauth/callback on :8080.
 *
 * In production/same-origin deployments, redirecting back to /oauth/callback
 * on the exact same host causes a 302 redirect loop (ERR_TOO_MANY_REDIRECTS).
 * Therefore, in production we serve the SPA html file directly so React router
 * handles /oauth/callback and finishes the authentication flow.
 */
@Controller('/oauth')
export class OAuthCallbackRedirectController {
  constructor(private readonly url: URLHelper) {}

  @Public()
  @UseNamedGuard('version')
  @Get('/callback')
  redirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response
  ) {
    const backendOrigin = this.url.origin; // e.g. 'http://localhost:3010'

    if (backendOrigin.includes(':3010')) {
      const frontendOrigin = backendOrigin.replace(':3010', ':8080');
      const params = new URLSearchParams();
      if (code) params.set('code', code);
      if (state) params.set('state', state);
      if (error) params.set('error', error);

      const target = `${frontendOrigin}/oauth/callback?${params.toString()}`;
      return res.redirect(302, target);
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const staticPath = join(env.projectRoot, 'static');
    const selfhostFile = join(staticPath, 'selfhost.html');
    if (existsSync(selfhostFile)) {
      return res.sendFile(selfhostFile);
    }

    const indexFile = join(staticPath, 'index.html');
    if (existsSync(indexFile)) {
      return res.sendFile(indexFile);
    }

    const fallbackPath = join(
      env.projectRoot,
      '../../frontend/core/dist/index.html'
    );
    if (existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath);
    }

    return res
      .status(404)
      .send('Static SPA shell file not found for OAuth callback');
  }
}
