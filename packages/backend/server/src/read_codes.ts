import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log('Available models:', tables);
  
  // Try UserVerificationCode or verification codes tables
  try {
    const verificationCodes = await (prisma as any).verificationToken.findMany({
      orderBy: { expiresAt: 'desc' },
      take: 5
    });
    console.log('VerificationTokens:', verificationCodes);
  } catch (e: any) {
    console.log('Failed to query verificationToken table:', e.message);
  }

  try {
    const projectDocOtps = await (prisma as any).projectDocOtp.findMany({
      orderBy: { expiresAt: 'desc' },
      take: 5
    });
    console.log('ProjectDocOtps:', projectDocOtps);
  } catch (e: any) {
    console.log('Failed to query projectDocOtp table:', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
