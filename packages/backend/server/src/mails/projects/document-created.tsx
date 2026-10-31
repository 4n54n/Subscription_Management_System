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

export type DocumentCreatedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  projectName: string;
  documentTitle: string;
  createdByName: string;
  timestamp: string;
};

export default function DocumentCreated(props: DocumentCreatedProps) {
  const { workspace, projectName, documentTitle, createdByName, timestamp } = props;

  return (
    <Template>
      <Title>New Document Created: {documentTitle}</Title>
      <Content>
        <P>
          A new document <Bold>{documentTitle}</Bold> has been successfully created in project <Bold>{projectName}</Bold> ({formatWorkspaceDisplayName(workspace?.name)}).
        </P>
        <P>
          <Bold>Created By:</Bold> {createdByName}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

DocumentCreated.PreviewProps = {
  user: { ...TEST_USER, name: 'Ansan Mathew' },
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Workspace Platform',
  documentTitle: 'Architecture Document _v1',
  createdByName: 'Ansan Mathew',
  timestamp: new Date().toLocaleString(),
};
