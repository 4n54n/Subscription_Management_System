import { TEST_WORKSPACE } from '../common';
import {
  Bold,
  Button,
  Content,
  formatWorkspaceDisplayName,
  P,
  Template,
  Title,
  type WorkspaceProps,
} from '../components';

export type ClientKeyAccessGrantedProps = {
  workspace: WorkspaceProps;
  projectName: string;
  clientEmail: string;
  portalUrl: string;
  accessDays?: number;
};

export default function ClientKeyAccessGranted(props: ClientKeyAccessGrantedProps) {
  const { workspace, projectName, clientEmail, portalUrl, accessDays } = props;

  return (
    <Template>
      <Title>Client Portal Key Access Activated</Title>
      <Content>
        <P>
          Client key access has been activated for project <Bold>{projectName}</Bold> in workspace <Bold>{formatWorkspaceDisplayName(workspace?.name)}</Bold>.
        </P>
        <P>
          Authorized guest users can access and view project documentation for <Bold>{accessDays || 7} days</Bold> by verifying <Bold>{clientEmail}</Bold> with an OTP.
        </P>
        <Button href={portalUrl}>Access Guest Portal</Button>
      </Content>
    </Template>
  );
}

ClientKeyAccessGranted.PreviewProps = {
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Cloud Platform',
  clientEmail: 'client@example.com',
  portalUrl: 'https://one.intoai.ai',
  accessDays: 7,
};
