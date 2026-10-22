import { z } from "zod";

const teamId = z.number().int();
const role = z.enum(["MEMBER", "ADMIN", "OWNER"]);

export const ZGetInputSchema = z.object({ teamId });
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;

export const ZCreateInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;

export const ZUpdateInputSchema = z.object({
  id: teamId,
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  bio: z.string().nullable().optional(),
  /** base64 data URL, or null to clear */
  logo: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  brandColor: z.string().nullable().optional(),
  darkBrandColor: z.string().nullable().optional(),
  hideBranding: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  hideTeamProfileLink: z.boolean().optional(),
  rrResetInterval: z.enum(["DAY", "MONTH"]).nullable().optional(),
  rrTimestampBasis: z.enum(["CREATED_AT", "START_TIME"]).optional(),
});
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;

export const ZDeleteInputSchema = z.object({ teamId });
export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;

export const ZListMembersInputSchema = z.object({ teamId });
export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;

export const ZInviteMemberInputSchema = z.object({
  teamId,
  usernameOrEmail: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
  role,
  language: z.string(),
});
export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;

export const ZResendInvitationInputSchema = z.object({
  teamId,
  email: z.string().email(),
  language: z.string(),
});
export type TResendInvitationInputSchema = z.infer<typeof ZResendInvitationInputSchema>;

export const ZAcceptOrLeaveInputSchema = z.object({ teamId, accept: z.boolean() });
export type TAcceptOrLeaveInputSchema = z.infer<typeof ZAcceptOrLeaveInputSchema>;

export const ZChangeMemberRoleInputSchema = z.object({
  teamId,
  /** user id */
  memberId: z.number().int(),
  role,
});
export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;

export const ZRemoveMemberInputSchema = z.object({
  teamId,
  /** user ids */
  memberIds: z.array(z.number().int()).min(1),
});
export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
