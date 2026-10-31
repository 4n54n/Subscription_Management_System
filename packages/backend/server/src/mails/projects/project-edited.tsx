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

export type ProjectEditedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  projectName: string;
  editedBy: string;
  timestamp: string;
  details?: string;
};

export default function ProjectEdited(props: ProjectEditedProps) {
  const { workspace, projectName, editedBy, timestamp, details } = props;

  return (
    <Template>
      <Title>Project Details Updated: {projectName}</Title>
      <Content>
        <P>
          Project details for <Bold>{projectName}</Bold> in workspace <Bold>{formatWorkspaceDisplayName(workspace?.name)}</Bold> were updated.
        </P>
        <P>
          <Bold>Updated By:</Bold> {editedBy}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
        {details && (
          <P>
            <Bold>Changes:</Bold> {details}
          </P>
        )}
      </Content>
    </Template>
  );
}

ProjectEdited.PreviewProps = {
  user: { ...TEST_USER, name: 'Ansan Mathew' },
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'IntoAI Workspace Platform',
  editedBy: 'Ansan Mathew',
  timestamp: new Date().toLocaleString(),
  details: 'Updated project status to Active and assigned Project Manager.',
};
