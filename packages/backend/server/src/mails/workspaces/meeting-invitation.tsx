import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Bold,
  Button,
  Content,
  P,
  SecondaryText,
  Template,
  Title,
  type UserProps,
  type WorkspaceProps,
} from '../components';

export type MeetingInvitationProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  docTitle?: string;
  url: string;
  note?: string;
};

export function MeetingInvitation(props: MeetingInvitationProps) {
  const { user, docTitle, url, note } = props;
  const inviterName = user.name || user.email || 'Someone';
  const presentationTopic = docTitle || 'Live Presentation';

  return (
    <Template>
      <Title>Live Presentation Invitation</Title>
      <Content>
        <P>
          <Bold>{inviterName}</Bold> has invited you to join a live presentation session on <Bold>{presentationTopic}</Bold>.
        </P>
        {note ? (
          <P>
            <SecondaryText style={{ fontStyle: 'italic' }}>"{note}"</SecondaryText>
          </P>
        ) : null}
        <P>
          Click the button below to open the presentation room. Please note that room entry permissions apply.
        </P>
        <Button href={url}>Join Meeting</Button>
      </Content>
    </Template>
  );
}

MeetingInvitation.PreviewProps = {
  user: TEST_USER,
  workspace: TEST_WORKSPACE,
  docTitle: 'How to use folder and Tags',
  url: 'http://localhost:8080/join/sample-token',
  note: 'Looking forward to reviewing the new laboratory canvas features with everyone.',
};

export default MeetingInvitation;
