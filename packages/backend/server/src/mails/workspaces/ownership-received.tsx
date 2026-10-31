import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type OwnershipReceivedProps = {
  workspace: WorkspaceProps;
};

export default function OwnershipReceived(props: OwnershipReceivedProps) {
  const { workspace } = props;

  return (
    <Template>
      <Title>Designated workspace owner</Title>
      <Content>
        <P>
          You have been assigned as the owner of{' '}
          <Workspace {...workspace} />. As workspace owner, you have full
          control over workspace settings and member access.
        </P>
      </Content>
    </Template>
  );
}

OwnershipReceived.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
