import { z } from "zod";

/** Campos permitidos em PATCH /api/webinars/[id] (exclui id, userId, code, slug). */
export const webinarPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    videoUrl: z.string().optional(),
    useNativeStreaming: z.boolean().optional(),
    startDate: z.union([z.string(), z.null()]).optional(),
    startTime: z.union([z.string(), z.null()]).optional(),
    redirectEnabled: z.boolean().optional(),
    redirectUrl: z.union([z.string(), z.null()]).optional(),
    passwordEnabled: z.boolean().optional(),
    password: z.union([z.string(), z.null()]).optional(),
    replayEnabled: z.boolean().optional(),
    lgpdEnabled: z.boolean().optional(),
    lgpdText: z.union([z.string(), z.null()]).optional(),
    customScripts: z.unknown().optional(),
    regBgImage: z.union([z.string(), z.null()]).optional(),
    regLogoUrl: z.union([z.string(), z.null()]).optional(),
    regDescription: z.union([z.string(), z.null()]).optional(),
    regTitle: z.union([z.string(), z.null()]).optional(),
    regCtaText: z.union([z.string(), z.null()]).optional(),
    regSponsors: z.unknown().optional(),
    config: z.unknown().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "REPLAY", "FINISHED"]).optional(),
  })
  .strict();

export type WebinarPatchInput = z.infer<typeof webinarPatchSchema>;
