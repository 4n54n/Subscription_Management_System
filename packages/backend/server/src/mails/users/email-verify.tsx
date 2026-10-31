import { Button, Content, P, SecondaryText, Template, Title } from '../components';

export type VerifyEmailProps = {
  url: string;
};

export default function VerifyEmail(props: VerifyEmailProps) {
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

VerifyEmail.PreviewProps = {
  url: 'http://localhost:8080',
};
