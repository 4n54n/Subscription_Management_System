import { Input } from '@affine/admin/components/ui/input';
import { get } from 'lodash-es';
import { Server } from 'lucide-react';
import type { AppConfig } from '../config';

export function TestServerSsh({
  appConfig,
  onUpdate,
}: {
  appConfig: AppConfig;
  onUpdate?: (path: string, value: any) => void;
}) {
  const sshHost = String(get(appConfig, 'copilot.sshHost', '') || '');
  const sshUser = String(get(appConfig, 'copilot.sshUser', '') || '');
  const sshPass = String(get(appConfig, 'copilot.sshPass', '') || '');

  return (
    <div className="border rounded-xl p-6 bg-card space-y-6 shadow-sm mt-4">
      <div className="flex items-center gap-3">
        <Server className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Default Workspace Test Server (Sandbox SSH)</h2>
          <p className="text-xs text-muted-foreground">
            Default SSH credentials used for live terminal auto-login during meetings. Custom entries in presentation dialog will override these values.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Default Host (IP/Domain)
          </label>
          <Input
            type="text"
            value={sshHost}
            onChange={e => onUpdate?.('copilot/sshHost', e.target.value)}
            placeholder="e.g. 192.168.1.100"
            className="text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Default Username
          </label>
          <Input
            type="text"
            value={sshUser}
            onChange={e => onUpdate?.('copilot/sshUser', e.target.value)}
            placeholder="root"
            className="text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Default Password
          </label>
          <Input
            type="password"
            value={sshPass}
            onChange={e => onUpdate?.('copilot/sshPass', e.target.value)}
            placeholder="••••••••"
            className="text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
