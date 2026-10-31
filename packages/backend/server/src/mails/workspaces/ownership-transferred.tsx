import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type OwnershipTransferredProps = {
  workspace: WorkspaceProps;
};

export default function OwnershipTransferred(props: OwnershipTransferredProps) {
  const { workspace } = props;
  return (
    <Template>
      <Title>Ownership transferred</Title>
      <Content>
        <P>
          You have transferred ownership of <Workspace {...workspace} />. Your role is now set to administrator/collaborator.
        </P>
      </Content>
    </Template>
  );
}

OwnershipTransferred.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
