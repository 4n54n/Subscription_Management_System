import {
  Bold,
  Content,
  OnelineCodeBlock,
  P,
  SecondaryText,
  Template,
  Title,
} from '../components';

export type DocumentActionOtpProps = {
  title: string;
  actionDescription: string;
  otp: string;
  expiresInMinutes?: number;
  userName?: string;
};

export default function DocumentActionOtp(props: DocumentActionOtpProps) {
  const {
    title = 'Security Authorization Code',
    actionDescription = 'Please enter the following one-time verification code to authorize your action:',
    otp,
    expiresInMinutes = 5,
    userName,
  } = props;

  const formattedOtp = otp ? otp.split('').join(' ') : '0 0 0 0 0 0';

  return (
    <Template>
      <Title>{title}</Title>
      <Content>
        {userName && (
          <P>
            Hello <Bold>{userName}</Bold>,
          </P>
        )}
        <P>
          {actionDescription}
        </P>
        <OnelineCodeBlock>{formattedOtp}</OnelineCodeBlock>
        <P>
          <SecondaryText>
            This verification code is valid for {expiresInMinutes} minutes. If you did not initiate this request, please disregard this email.
          </SecondaryText>
        </P>
      </Content>
    </Template>
  );
}

DocumentActionOtp.PreviewProps = {
  title: 'Invoice Payment Status Authorization',
  actionDescription: 'Please enter the following one-time verification code to authorize updating the payment status for your commercial invoice:',
  otp: '784912',
  expiresInMinutes: 5,
  userName: 'Ansan Mathew',
};
