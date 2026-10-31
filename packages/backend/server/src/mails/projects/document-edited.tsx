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

export type DocumentEditedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  projectName: string;
  documentTitle: string;
  editedByName?: string;
  createdByName?: string;
  timestamp: string;
};

export default function DocumentEdited(props: DocumentEditedProps) {
  const { workspace, projectName, documentTitle, editedByName, createdByName, timestamp } = props;
  const actor = editedByName || createdByName || 'User';

  return (
    <Template>
      <Title>Document Updated: {documentTitle}</Title>
      <Content>
        <P>
          The document <Bold>{documentTitle}</Bold> has been successfully updated in project <Bold>{projectName}</Bold> ({formatWorkspaceDisplayName(workspace?.name)}).
        </P>
        <P>
          <Bold>Updated By:</Bold> {actor}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

DocumentEdited.PreviewProps = {
  user: { ...TEST_USER, name: 'Ansan Mathew' },
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Workspace Platform',
  documentTitle: 'SRS _v2',
  editedByName: 'Ansan Mathew',
  timestamp: new Date().toLocaleString(),
};
