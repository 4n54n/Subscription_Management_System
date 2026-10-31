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

export type DocumentsSentForApprovalProps = {
  workspace: WorkspaceProps;
  projectName: string;
  clientEmail: string;
  portalUrl: string;
  accessDays?: number;
};

export default function DocumentsSentForApproval(props: DocumentsSentForApprovalProps) {
  const { workspace, projectName, clientEmail, portalUrl, accessDays } = props;

  return (
    <Template>
      <Title>Documents Ready for Approval: {projectName}</Title>
      <Content>
        <P>
          You have been granted access to review and approve project documents for <Bold>{projectName}</Bold> in workspace <Bold>{formatWorkspaceDisplayName(workspace?.name)}</Bold>.
        </P>
        <P>
          This guest access key is active for <Bold>{accessDays || 7} days</Bold>. Please click the link below to verify your email (<Bold>{clientEmail}</Bold>) via OTP and complete your review.
        </P>
        <Button href={portalUrl}>Open Guest Document Portal</Button>
      </Content>
    </Template>
  );
}

DocumentsSentForApproval.PreviewProps = {
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Mobile App',
  clientEmail: 'client@example.com',
  portalUrl: 'https://one.intoai.ai',
  accessDays: 7,
};
