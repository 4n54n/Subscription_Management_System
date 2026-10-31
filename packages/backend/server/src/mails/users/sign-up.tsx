import {
  Content,
  OnelineCodeBlock,
  P,
  SecondaryText,
  Template,
  Title,
} from '../components';

export type SignUpProps = {
  url: string;
  otp: string;
};

export default function SignUp(props: SignUpProps) {
  const formattedOtp = props.otp ? props.otp.split('').join(' ') : '';
  return (
    <Template>
      <Title>IntoAI Workspace Guest Access</Title>
      <Content>
        <P>
          Please enter the following one-time verification code to access the shared project workspace:
        </P>
        <OnelineCodeBlock>{formattedOtp}</OnelineCodeBlock>
        <P>
          <SecondaryText>
            This code expires in 15 minutes.
          </SecondaryText>
        </P>
      </Content>
    </Template>
  );
}

SignUp.PreviewProps = {
  url: 'http://localhost:8080/magic-link?token=123456&email=test@test.com',
  otp: '151457',
};
