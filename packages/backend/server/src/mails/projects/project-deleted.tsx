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

export type ProjectDeletedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  projectName: string;
  deletedBy: string;
  timestamp: string;
};

export default function ProjectDeleted(props: ProjectDeletedProps) {
  const { workspace, projectName, deletedBy, timestamp } = props;

  return (
    <Template>
      <Title>Project Deleted: {projectName}</Title>
      <Content>
        <P>
          The project <Bold>{projectName}</Bold> in workspace <Bold>{formatWorkspaceDisplayName(workspace?.name)}</Bold> has been permanently deleted.
        </P>
        <P>
          <Bold>Deleted By:</Bold> {deletedBy}
          <br />
          <Bold>Timestamp:</Bold> {timestamp || new Date().toLocaleString()}
        </P>
      </Content>
    </Template>
  );
}

ProjectDeleted.PreviewProps = {
  user: { ...TEST_USER, name: 'Ansan Mathew' },
  workspace: { ...TEST_WORKSPACE, name: 'Reliability Engineering' },
  projectName: 'Legacy Tracking Project',
  deletedBy: 'Ansan Mathew',
  timestamp: new Date().toLocaleString(),
};
