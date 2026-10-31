import { Button, Content, P, SecondaryText, Template, Title } from '../components';

export type ChangePasswordProps = {
  url: string;
};

export default function ChangePassword(props: ChangePasswordProps) {
  return (
    <Template>
      <Title>Password Security Notice</Title>
      <Content>
        <P>
          Your IntoAI account password was recently changed. If you performed this action, no further steps are required.
        </P>
        <P>
          <SecondaryText>
            If you did not authorize this change, please click below to secure your account immediately:
          </SecondaryText>
        </P>
        <Button href={props.url}>Secure Account</Button>
      </Content>
    </Template>
  );
}

ChangePassword.PreviewProps = {
  url: 'http://localhost:8080',
};
