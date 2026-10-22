import { randomBytes } from "node:crypto";

import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TrpcSessionUser } from "../../../types";
import type {
  TAcceptOrLeaveInputSchema,
  TChangeMemberRoleInputSchema,
  TInviteMemberInputSchema,
  TListMembersInputSchema,
  TRemoveMemberInputSchema,
  TResendInvitationInputSchema,
} from "./schema";
import {
  assertManager,
  assertOwnerRemains,
  deleteInviteLeftovers,
  getMembership,
  removeFromTeam,
} from "./util";

type Ctx = { user: NonNullable<TrpcSessionUser> };

const INVITE_TTL_DAYS = 7;
const inviteExpiry = () => new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

const sendInvite = async ({
  ctx,
  team,
  to,
  language,
  joinLink,
  isCalcomMember,
}: {
  ctx: Ctx;
  team: { name: string };
  to: string;
  language: string;
  joinLink: string;
  isCalcomMember: boolean;
}) => {
  try {
    await sendTeamInviteEmail({
      language: await getTranslation(language, "common"),
      from: ctx.user.name || ctx.user.username || `${team.name}'s admin`,
      to,
      teamName: team.name,
      joinLink,
      isCalcomMember,
      isAutoJoin: false,
      isOrg: false,
      parentTeamName: undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });
  } catch (e) {
    // The invite itself is stored; admin can use resendInvitation.
    logger.error("Failed sending team invite email", { to, team: team.name, error: e });
  }
};

export const listMembersHandler = async ({ ctx, input }: { ctx: Ctx; input: TListMembersInputSchema }) => {
  const me = await getMembership(ctx.user.id, input.teamId);
  if (!me?.accepted) throw new TRPCError({ code: "FORBIDDEN" });
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: input.teamId },
    select: { isPrivate: true },
  });
  const ownRowOnly = team.isPrivate && me.role === MembershipRole.MEMBER;
  const memberships = await prisma.membership.findMany({
    where: { teamId: input.teamId, ...(ownRowOnly ? { userId: ctx.user.id } : {}) },
    select: {
      role: true,
      accepted: true,
      user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } },
    },
    orderBy: { id: "asc" },
  });
  return memberships.map(({ user, role, accepted }) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role,
    accepted,
  }));
};

export const inviteMemberHandler = async ({ ctx, input }: { ctx: Ctx; input: TInviteMemberInputSchema }) => {
  const { teamId, role, language } = input;
  const caller = await assertManager(ctx.user.id, teamId);
  if (role === MembershipRole.OWNER && caller.role !== MembershipRole.OWNER) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { name: true } });

  const entries = Array.from(
    new Set(
      (Array.isArray(input.usernameOrEmail) ? input.usernameOrEmail : [input.usernameOrEmail]).map((s) =>
        s.trim().toLowerCase()
      )
    )
  ).filter(Boolean);

  // Resolve everything first so a bad entry fails the whole request before any write.
  const resolved = await Promise.all(
    entries.map(async (entry) => {
      const isEmail = z.string().email().safeParse(entry).success;
      const user = await prisma.user.findFirst({
        where: isEmail ? { email: { equals: entry, mode: "insensitive" } } : { username: entry },
        select: { id: true, email: true, teams: { where: { teamId }, select: { id: true } } },
      });
      if (user?.teams.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "user_already_invited_or_member" });
      }
      if (!user && !isEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "user_not_found" });
      return { entry, user };
    })
  );

  for (const { entry, user } of resolved) {
    if (user) {
      await prisma.membership.create({ data: { teamId, userId: user.id, role, accepted: false } });
      await sendInvite({
        ctx,
        team,
        to: user.email,
        language,
        joinLink: `${WEBAPP_URL}/teams`,
        isCalcomMember: true,
      });
      continue;
    }
    const token = randomBytes(32).toString("hex");
    await prisma.$transaction(async (tx) => {
      // Stub user: completed by the signup handler (matched through invitedTo + the token's teamId).
      const stub = await tx.user.create({ data: { email: entry, invitedTo: teamId }, select: { id: true } });
      await tx.membership.create({ data: { teamId, userId: stub.id, role, accepted: false } });
      await tx.verificationToken.create({
        data: { identifier: entry, token, expires: inviteExpiry(), expiresInDays: INVITE_TTL_DAYS, teamId },
      });
    });
    await sendInvite({
      ctx,
      team,
      to: entry,
      language,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/teams`,
      isCalcomMember: false,
    });
  }
  return { invited: resolved.length };
};

export const resendInvitationHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TResendInvitationInputSchema;
}) => {
  await assertManager(ctx.user.id, input.teamId);
  const team = await prisma.team.findUniqueOrThrow({ where: { id: input.teamId }, select: { name: true } });
  const pending = await prisma.membership.findFirst({
    where: {
      teamId: input.teamId,
      accepted: false,
      user: { email: { equals: input.email, mode: "insensitive" } },
    },
    select: { user: { select: { email: true } } },
  });
  if (!pending) throw new TRPCError({ code: "NOT_FOUND", message: "invitation_not_found" });
  const email = pending.user.email;

  // Invitees without an account have a token; refresh it and link to signup.
  const token = await prisma.verificationToken.findFirst({
    where: { identifier: email, teamId: input.teamId },
    select: { id: true, token: true },
  });
  if (token) {
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { expires: inviteExpiry(), expiresInDays: INVITE_TTL_DAYS },
    });
  }
  await sendInvite({
    ctx,
    team,
    to: email,
    language: input.language,
    joinLink: token ? `${WEBAPP_URL}/signup?token=${token.token}&callbackUrl=/teams` : `${WEBAPP_URL}/teams`,
    isCalcomMember: !token,
  });
  return { teamId: input.teamId, email };
};

export const acceptOrLeaveHandler = async ({ ctx, input }: { ctx: Ctx; input: TAcceptOrLeaveInputSchema }) => {
  const me = await getMembership(ctx.user.id, input.teamId);
  if (!me) throw new TRPCError({ code: "NOT_FOUND", message: "team_not_found" });
  if (input.accept) {
    await prisma.membership.update({
      where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
      data: { accepted: true },
    });
    return { teamId: input.teamId };
  }
  if (me.accepted) await assertOwnerRemains(input.teamId, [ctx.user.id]);
  await prisma.$transaction((tx) => removeFromTeam(tx, input.teamId, [ctx.user.id]));
  return { teamId: input.teamId };
};

export const changeMemberRoleHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TChangeMemberRoleInputSchema;
}) => {
  const { teamId, memberId, role } = input;
  const caller = await assertManager(ctx.user.id, teamId);
  const target = await getMembership(memberId, teamId);
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "member_not_found" });
  if (
    (role === MembershipRole.OWNER || target.role === MembershipRole.OWNER) &&
    caller.role !== MembershipRole.OWNER
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  if (target.role === MembershipRole.OWNER && role !== MembershipRole.OWNER && target.accepted) {
    await assertOwnerRemains(teamId, [memberId]);
  }
  await prisma.membership.update({ where: { userId_teamId: { userId: memberId, teamId } }, data: { role } });
  return { teamId, memberId, role };
};

export const removeMemberHandler = async ({ ctx, input }: { ctx: Ctx; input: TRemoveMemberInputSchema }) => {
  const { teamId, memberIds } = input;
  const caller = await assertManager(ctx.user.id, teamId);
  const targets = await prisma.membership.findMany({
    where: { teamId, userId: { in: memberIds } },
    select: { userId: true, role: true, accepted: true, user: { select: { email: true } } },
  });
  if (targets.some((t) => t.role === MembershipRole.OWNER) && caller.role !== MembershipRole.OWNER) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  await assertOwnerRemains(
    teamId,
    targets.filter((t) => t.accepted).map((t) => t.userId)
  );
  await prisma.$transaction(async (tx) => {
    await removeFromTeam(
      tx,
      teamId,
      targets.map((t) => t.userId)
    );
    const pendingEmails = targets.filter((t) => !t.accepted).map((t) => t.user.email);
    if (pendingEmails.length) await deleteInviteLeftovers(tx, teamId, pendingEmails);
  });
  return { teamId, removed: targets.length };
};
