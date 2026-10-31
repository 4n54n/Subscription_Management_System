import { AvatarWithName } from './template';

export interface WorkspaceProps {
  name: string;
  avatar?: string;
  size?: number;
}

export const formatWorkspaceDisplayName = (name?: string | null, fallback = 'Workspace'): string => {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  // Never expose raw UUIDs in email templates
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
};

export const Workspace = (props: WorkspaceProps) => {
  const safeName = formatWorkspaceDisplayName(props.name);
  return (
    <AvatarWithName
      name={safeName}
      img={props.avatar}
      width={`${props.size ?? 20}px`}
      height={`${props.size ?? 20}px`}
    />
  );
};
