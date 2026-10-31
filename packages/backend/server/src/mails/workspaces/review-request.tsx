import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Button,
  Content,
  P,
  Template,
  Title,
  User,
  type UserProps,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type LinkInvitationReviewRequestProps = {
  workspace: WorkspaceProps;
  user: UserProps;
  url: string;
};

export default function LinkInvitationReviewRequest(
  props: LinkInvitationReviewRequestProps
) {
  const { workspace, user, url } = props;
  return (
    <Template>
      <Title>
        Request to join workspace
      </Title>
      <Content>
        <P>
          <User {...user} /> has requested to join <Workspace {...workspace} />.
          <br />
          As a workspace administrator, your approval is required.
        </P>
        <Button href={url}>Review Access Request</Button>
      </Content>
    </Template>
  );
}

LinkInvitationReviewRequest.PreviewProps = {
  workspace: TEST_WORKSPACE,
  user: TEST_USER,
  url: 'http://localhost:8080',
};
