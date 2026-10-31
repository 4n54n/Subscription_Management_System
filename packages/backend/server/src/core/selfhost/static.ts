import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Application } from 'express';
import { static as serveStatic } from 'express';
import isMobile from 'is-mobile';

import { Config } from '../../base';
import { SetupMiddleware } from './setup';

@Injectable()
export class StaticFilesResolver implements OnModuleInit {
  constructor(
    private readonly config: Config,
    private readonly adapterHost: HttpAdapterHost,
    private readonly check: SetupMiddleware
  ) {}

  onModuleInit() {
    // in command line mode
    if (!this.adapterHost.httpAdapter) {
      return;
    }

    const app = this.adapterHost.httpAdapter.getInstance<Application>();
    // for example, '/affine' in host [//host.com/affine]
    const basePath = this.config.server.path;
    const staticPath = join(env.projectRoot, 'static');
    const adminStaticPath = existsSync(
      join(env.projectRoot, '../../packages/frontend/admin/dist/index.html')
    )
      ? join(env.projectRoot, '../../packages/frontend/admin/dist')
      : existsSync(
          join(env.projectRoot, '../../frontend/admin/dist/index.html')
        )
      ? join(env.projectRoot, '../../frontend/admin/dist')
      : join(staticPath, 'admin');

    const webStaticPath = existsSync(
      join(env.projectRoot, '../../packages/frontend/apps/web/dist/index.html')
    )
      ? join(env.projectRoot, '../../packages/frontend/apps/web/dist')
      : existsSync(
          join(env.projectRoot, '../../frontend/apps/web/dist/index.html')
        )
      ? join(env.projectRoot, '../../frontend/apps/web/dist')
      : staticPath;

    // web => {
    //   affine: 'static/index.html',
    //   selfhost: 'static/selfhost.html'
    // }
    // admin => {
    //   affine: 'static/admin/index.html',
    //   selfhost: 'static/admin/selfhost.html'
    // }
    // mobile => {
    //   affine: 'static/mobile/index.html',
    //   selfhost: 'static/mobile/selfhost.html'
    // }
    // NOTE(@forehalo):
    //   the order following routes should be respected,
    //   otherwise the app won't work properly.

    // START REGION: /admin
    // do not allow '/index.html' url, redirect to '/'
    app.get(basePath + '/admin/index.html', (_req, res) => {
      return res.redirect(basePath + '/admin');
    });

    // serve all static files
    app.use(
      basePath,
      serveStatic(adminStaticPath, {
        redirect: false,
        index: false,
        fallthrough: true,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        },
      })
    );

    // fallback all unknown routes
    app.get(
      [basePath + '/admin', basePath + '/admin/*path'],
      this.check.use,
      (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const selfhostFile = join(adminStaticPath, 'selfhost.html');
        if (existsSync(selfhostFile)) {
          res.sendFile(selfhostFile);
        } else {
          res.sendFile(join(adminStaticPath, 'index.html'));
        }
      }
    );
    // END REGION

    // START REGION: /mobile
    // serve all static files
    app.use(
      basePath,
      serveStatic(join(staticPath, 'mobile'), {
        redirect: false,
        index: false,
        fallthrough: true,
      })
    );
    // END REGION

    // START REGION: /
    // do not allow '/index.html' url, redirect to '/'
    app.get(basePath + '/index.html', (_req, res) => {
      return res.redirect(basePath);
    });

    // serve all static files
    app.use(
      basePath,
      serveStatic(webStaticPath, {
        redirect: false,
        index: false,
        fallthrough: true,
        dotfiles: 'ignore',
      })
    );

    if (webStaticPath !== staticPath && existsSync(staticPath)) {
      app.use(
        basePath,
        serveStatic(staticPath, {
          redirect: false,
          index: false,
          fallthrough: true,
          dotfiles: 'ignore',
        })
      );
    }

    // fallback all unknown routes
    app.get([basePath, basePath + '/*path'], this.check.use, (req, res) => {
      const path = req.path;
      const apiPrefix = basePath ? basePath + '/api/' : '/api/';
      if (path.startsWith(apiPrefix) || path.startsWith('/api/')) {
        return res.status(404).send({
          statusCode: 404,
          message: `Cannot GET ${path}`,
          error: 'Not Found',
        });
      }

      const mobile =
        env.namespaces.canary &&
        isMobile({
          ua: req.headers['user-agent'] ?? undefined,
        });

      const indexFile = join(
        webStaticPath,
        mobile ? 'mobile' : '',
        env.selfhosted ? 'selfhost.html' : 'index.html'
      );

      const finalIndexFile = existsSync(indexFile)
        ? indexFile
        : join(webStaticPath, 'index.html');

      return res.sendFile(finalIndexFile);
    });
    // END REGION
  }
}
