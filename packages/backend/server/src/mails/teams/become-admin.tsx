import { TEST_WORKSPACE } from '../common';
import {
  Button,
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type TeamBecomeAdminProps = {
  workspace: WorkspaceProps;
  url: string;
};

export default function TeamBecomeAdmin(props: TeamBecomeAdminProps) {
  const { workspace, url } = props;
  return (
    <Template>
      <Title>Promoted to workspace admin</Title>
      <Content>
        <P>
          You have been promoted to administrator of <Workspace {...workspace} />. As an
          administrator, you can help manage members, security permissions, and workspace settings.
        </P>
        <Button href={url}>Go to Workspace</Button>
      </Content>
    </Template>
  );
}

TeamBecomeAdmin.PreviewProps = {
  workspace: TEST_WORKSPACE,
  role: 'admin',
  url: 'http://localhost:8080',
};
