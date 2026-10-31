import agoraTokenPkg from 'agora-token';

const { RtcRole, RtcTokenBuilder } = agoraTokenPkg;

export { RtcRole };

/**
 * Generates an Agora RTC AccessToken for joining an Agora RTC channel.
 * Uses official Agora RtcTokenBuilder with numeric UID.
 */
export function generateAgoraRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: number = RtcRole.PUBLISHER,
  expireSeconds: number = 86400
): string | null {
  const cleanAppId = appId?.trim();
  const cleanCertificate = appCertificate?.trim();

  // If no certificate is configured, return null (Agora test mode without token security)
  if (!cleanAppId || !cleanCertificate) {
    return null;
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireSeconds;

  try {
    return RtcTokenBuilder.buildTokenWithUid(
      cleanAppId,
      cleanCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    );
  } catch (err) {
    console.error('[Agora] Token generation error:', err);
    return null;
  }
}
