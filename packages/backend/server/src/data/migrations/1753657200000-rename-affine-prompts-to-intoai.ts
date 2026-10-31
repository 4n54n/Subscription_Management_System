import { PrismaClient } from '@prisma/client';

/**
 * Migration: Rename AFFiNE prompt names to IntoAI branding.
 *
 * The frontend requests prompts by name (e.g. "Chat With IntoAI").
 * Previously the backend seeded them as "Chat With AFFiNE AI", causing
 * COPILOT_PROMPT_NOT_FOUND errors for all AI chat and sidebar interactions.
 *
 * Schema notes:
 * - AiPromptMessage joins via promptId (Int FK) → messages don't need updating.
 * - AiSession references promptName (VarChar(32) FK) → sessions must be updated.
 * - AiPrompt.name is @unique @db.VarChar(32) — all new names are ≤ 32 chars.
 */
export class RenameAffinePromptsToIntoAI1753657200000 {
  static always = false;

  static async up(db: PrismaClient) {
    const renames: Array<{ from: string; to: string }> = [
      { from: 'Chat With AFFiNE AI', to: 'Chat With IntoAI' },
      { from: 'Search With AFFiNE AI', to: 'Search With IntoAI' },
      { from: 'Chat With AFFiNE AI - Believer', to: 'Chat With IntoAI - Believer' },
    ];

    for (const { from, to } of renames) {
      // Check if the old name exists
      const existing = await db.aiPrompt.findUnique({ where: { name: from } });
      if (!existing) continue;

      // Check if target name already exists (idempotent)
      const target = await db.aiPrompt.findUnique({ where: { name: to } });
      if (target) {
        // Target already exists — update any sessions still pointing to old name
        await db.aiSession.updateMany({
          where: { promptName: from },
          data: { promptName: to },
        });
        // Delete old prompt (messages cascade via promptId FK)
        await db.aiPrompt.delete({ where: { name: from } });
        continue;
      }

      // Update sessions that reference the old prompt name first (FK constraint)
      await db.aiSession.updateMany({
        where: { promptName: from },
        data: { promptName: to },
      });

      // Now rename the prompt itself
      await db.aiPrompt.update({
        where: { name: from },
        data: { name: to },
      });
    }
  }

  static async down(db: PrismaClient) {
    const renames: Array<{ from: string; to: string }> = [
      { from: 'Chat With IntoAI', to: 'Chat With AFFiNE AI' },
      { from: 'Search With IntoAI', to: 'Search With AFFiNE AI' },
      { from: 'Chat With IntoAI - Believer', to: 'Chat With AFFiNE AI - Believer' },
    ];

    for (const { from, to } of renames) {
      const existing = await db.aiPrompt.findUnique({ where: { name: from } });
      if (!existing) continue;

      await db.aiSession.updateMany({
        where: { promptName: from },
        data: { promptName: to },
      });

      await db.aiPrompt.update({
        where: { name: from },
        data: { name: to },
      });
    }
  }
}
