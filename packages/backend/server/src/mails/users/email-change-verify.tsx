import { Button, Content, P, SecondaryText, Template, Title } from '../components';

export type VerifyChangeEmailProps = {
  url: string;
};

export default function VerifyChangeEmail(props: VerifyChangeEmailProps) {
  return (
    <Template>
      <Title>Verify Email Address</Title>
      <Content>
        <P>
          Please click the button below to verify your email address and activate your account.
        </P>
        <Button href={props.url}>Verify Email</Button>
        <P>
          <SecondaryText>
            If you did not sign up for an IntoAI account, please ignore this email.
          </SecondaryText>
        </P>
      </Content>
    </Template>
  );
}

VerifyChangeEmail.PreviewProps = {
  url: 'http://localhost:8080',
};
