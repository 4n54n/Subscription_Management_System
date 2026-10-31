import { Button, Content, P, SecondaryText, Template, Title } from '../components';

export type SetPasswordProps = {
  url: string;
};

export default function SetPassword(props: SetPasswordProps) {
  return (
    <Template>
      <Title>Password Security Notice</Title>
      <Content>
        <P>
          Your IntoAI account password setup was requested. Please click the button below to set your account password and get started.
        </P>
        <P>
          <SecondaryText>
            If you did not request to set your password, please ignore this email or contact support.
          </SecondaryText>
        </P>
        <Button href={props.url}>Set Password</Button>
      </Content>
    </Template>
  );
}

SetPassword.PreviewProps = {
  url: 'http://localhost:8080',
};
