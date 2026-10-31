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

export type DocumentDeletedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  projectName: string;
  documentTitle: string;
  deletedByName: string;
  timestamp: string;
};

export default function DocumentDeleted(props: DocumentDeletedProps) {
  const { workspace, projectName, documentTitle, deletedByName, timestamp } = props;

  return (
    <Template>
      <Title>Document Deleted: {documentTitle}</Title>
      <Content>
        <P>
          The document <Bold>{documentTitle}</Bold> in project <Bold>{projectName}</Bold> ({formatWorkspaceDisplayName(workspace?.name)}) has been deleted.
        </P>
        <P>
          <Bold>Deleted By:</Bold> {deletedByName}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

DocumentDeleted.PreviewProps = {
  user: { ...TEST_USER, name: 'Ansan Mathew' },
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Workspace Platform',
  documentTitle: 'Architecture Document _v1',
  deletedByName: 'Ansan Mathew',
  timestamp: new Date().toLocaleString(),
};
