import { Bold, Button, Content, P, Template, Title } from '../components';

export type ChangeEmailProps = {
  url: string;
};

export default function ChangeEmail(props: ChangeEmailProps) {
  return (
    <Template>
      <Title>Confirm email change request for One</Title>
      <Content>
        <P>
          You recently requested to change the email address associated with
          your One account by IntoAI Technologies Pvt. Ltd.
          <br />
          To complete this process, please click on the verification link below.
        </P>
        <P>
          This link will expire in <Bold>30 minutes</Bold>.
        </P>
        <Button href={props.url}>Authorize Email Change</Button>
      </Content>
    </Template>
  );
}

ChangeEmail.PreviewProps = {
  url: 'http://localhost:8080',
};
