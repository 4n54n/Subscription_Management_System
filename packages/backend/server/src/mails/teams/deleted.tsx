import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export interface TeamWorkspaceDeletedProps {
  workspace: WorkspaceProps;
}

export default function TeamWorkspaceDeleted(props: TeamWorkspaceDeletedProps) {
  const { workspace } = props;

  return (
    <Template>
      <Title>Workspace data deleted</Title>
      <Content>
        <P>
          All data in <Workspace {...workspace} /> has been permanently deleted
          by an administrator. This action cannot be undone.
        </P>
        <P>
          Thank you for using One by IntoAI Technologies Pvt. Ltd.
        </P>
      </Content>
    </Template>
  );
}

TeamWorkspaceDeleted.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
