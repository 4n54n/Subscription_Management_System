import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Bold,
  Button,
  Content,
  P,
  Template,
  Title,
  type UserProps,
  type WorkspaceProps,
} from '../components';

export type InvitationProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  url: string;
};

export default function Invitation(props: InvitationProps) {
  const { user, workspace, url } = props;
  const inviterName = user.name || user.email || 'Someone';
  const workspaceName = workspace.name || 'Workspace';

  return (
    <Template>
      <Title>Workspace Team Invitation</Title>
      <Content>
        <P>
          <Bold>{inviterName}</Bold> has invited you to collaborate in Workspace <Bold>{workspaceName}</Bold>.
        </P>
        <P>
          You will gain access to shared documents, team whiteboards, and AI assistant capabilities.
        </P>
        <Button href={url}>Accept Workspace Invite</Button>
      </Content>
    </Template>
  );
}

Invitation.PreviewProps = {
  user: { ...TEST_USER, name: 'Sarah Jenkins' },
  workspace: { ...TEST_WORKSPACE, name: 'design-team' },
  url: 'http://localhost:8080',
};
