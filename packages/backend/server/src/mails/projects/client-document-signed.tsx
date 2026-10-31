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

export type ClientDocumentSignedProps = {
  workspace: WorkspaceProps;
  projectName: string;
  documentTitle: string;
  clientEmail: string;
  timestamp: string;
};

export default function ClientDocumentSigned(props: ClientDocumentSignedProps) {
  const { workspace, projectName, documentTitle, clientEmail, timestamp } = props;

  return (
    <Template>
      <Title>Document Digitally Signed: {documentTitle}</Title>
      <Content>
        <P>
          The document <Bold>{documentTitle}</Bold> for project <Bold>{projectName}</Bold> in workspace <Bold>{formatWorkspaceDisplayName(workspace?.name)}</Bold> has been verified and digitally signed by the client.
        </P>
        <P>
          <Bold>Signee Email:</Bold> {clientEmail}
          <br />
          <Bold>Signed On:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

ClientDocumentSigned.PreviewProps = {
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Cloud Platform',
  documentTitle: 'System Scope & Security Agreement',
  clientEmail: 'client@example.com',
  timestamp: new Date().toLocaleString(),
};
