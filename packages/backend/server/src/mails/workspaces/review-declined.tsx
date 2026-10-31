import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type LinkInvitationReviewDeclinedProps = {
  workspace: WorkspaceProps;
};

export default function LinkInvitationReviewDeclined(
  props: LinkInvitationReviewDeclinedProps
) {
  const { workspace } = props;
  return (
    <Template>
      <Title>Access request declined</Title>
      <Content>
        <P>
          Your request to join <Workspace {...workspace} /> was declined by
          a workspace administrator.
        </P>
      </Content>
    </Template>
  );
}

LinkInvitationReviewDeclined.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
