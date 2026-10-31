import { Content, Name, P, Template, Title } from '../components';

export type ChangeEmailNotificationProps = {
  to: string;
};

export default function ChangeEmailNotification(
  props: ChangeEmailNotificationProps
) {
  return (
    <Template>
      <Title>Primary account email updated</Title>
      <Content>
        <P>
          As per your request, we have changed your primary account email on One. Please make sure
          you use <Name>{props.to}</Name> to log in the next time.
        </P>
      </Content>
    </Template>
  );
}

ChangeEmailNotification.PreviewProps = {
  to: 'user@intoai.tech',
};
