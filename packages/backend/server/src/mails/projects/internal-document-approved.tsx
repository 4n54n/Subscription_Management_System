import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Bold,
  Content,
  formatWorkspaceDisplayName,
  P,
  Template,
  Title,
  type UserProps,
  type WorkspaceProps,
} from '../components';

export type InternalDocumentApprovedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  projectName: string;
  documentTitle: string;
  approvedBy: string;
  timestamp: string;
};

export default function InternalDocumentApproved(props: InternalDocumentApprovedProps) {
  const { workspace, projectName, documentTitle, approvedBy, timestamp } = props;

  return (
    <Template>
      <Title>Internal Document Approved: {documentTitle}</Title>
      <Content>
        <P>
          Internal approval verification has been successfully logged for <Bold>{documentTitle}</Bold> in project <Bold>{projectName}</Bold> ({formatWorkspaceDisplayName(workspace?.name)}).
        </P>
        <P>
          <Bold>Approved By:</Bold> {approvedBy}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

InternalDocumentApproved.PreviewProps = {
  user: { ...TEST_USER, name: 'Ansan Mathew' },
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Workspace Platform',
  documentTitle: 'Architecture Document _v1',
  approvedBy: 'Ansan Mathew | PM',
  timestamp: new Date().toLocaleString(),
};
