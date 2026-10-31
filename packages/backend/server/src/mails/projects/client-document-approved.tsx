import { TEST_WORKSPACE } from '../common';
import {
  Bold,
  Content,
  formatWorkspaceDisplayName,
  P,
  Template,
  Title,
  type WorkspaceProps,
} from '../components';

export type ClientDocumentApprovedProps = {
  workspace: WorkspaceProps;
  projectName: string;
  documentTitle: string;
  clientEmail: string;
  timestamp: string;
};

export default function ClientDocumentApproved(props: ClientDocumentApprovedProps) {
  const { workspace, projectName, documentTitle, clientEmail, timestamp } = props;

  return (
    <Template>
      <Title>Document Approved: {documentTitle}</Title>
      <Content>
        <P>
          The document <Bold>{documentTitle}</Bold> for project <Bold>{projectName}</Bold> in workspace <Bold>{formatWorkspaceDisplayName(workspace?.name)}</Bold> has been successfully approved by the client.
        </P>
        <P>
          <Bold>Signee Email:</Bold> {clientEmail}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

ClientDocumentApproved.PreviewProps = {
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Cloud Platform',
  documentTitle: 'Architecture Specification v1',
  clientEmail: 'client@example.com',
  timestamp: new Date().toLocaleString(),
};
