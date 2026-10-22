import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

/** Membership of `userId` in a (non-organization) team, pending or accepted. */
export const getMembership = (userId: number, teamId: number) =>
  prisma.membership.findFirst({
    where: { userId, teamId, team: { isOrganization: false } },
    select: { role: true, accepted: true },
  });

/** Caller must be an accepted ADMIN or OWNER. */
export async function assertManager(userId: number, teamId: number) {
  const m = await getMembership(userId, teamId);
  if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "team_not_found" });
  if (!m.accepted || m.role === MembershipRole.MEMBER) throw new TRPCError({ code: "FORBIDDEN" });
  return m;
}

/** Caller must be an accepted OWNER. */
export async function assertOwner(userId: number, teamId: number) {
  const m = await assertManager(userId, teamId);
  if (m.role !== MembershipRole.OWNER) throw new TRPCError({ code: "FORBIDDEN" });
}

/** Throws if removing/demoting `userIds` would leave the team without an accepted OWNER. */
export async function assertOwnerRemains(teamId: number, userIds: number[]) {
  const owners = await prisma.membership.findMany({
    where: { teamId, role: MembershipRole.OWNER, accepted: true },
    select: { userId: true },
  });
  if (owners.some((o) => userIds.includes(o.userId)) && owners.every((o) => userIds.includes(o.userId))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "cannot_remove_last_owner" });
  }
}

/**
 * Drops invite tokens and never-signed-up invitee stubs (no password, unverified) of a team.
 * Pass `emails` (exact, as stored on the user) to limit to specific invitees.
 */
export async function deleteInviteLeftovers(tx: Prisma.TransactionClient, teamId: number, emails?: string[]) {
  // Prisma here rejects explicit `undefined`, so only add the filter when emails are given.
  const byEmail = emails ? { in: emails } : null;
  await tx.verificationToken.deleteMany({ where: { teamId, ...(byEmail && { identifier: byEmail }) } });
  await tx.user.deleteMany({
    where: {
      invitedTo: teamId,
      username: null,
      emailVerified: null,
      password: { is: null },
      accounts: { none: {} },
      teams: { every: { teamId } },
      ...(byEmail && { email: byEmail }),
    },
  });
}

/** Removes the users' hosts on the team's event types and their memberships. */
export async function removeFromTeam(tx: Prisma.TransactionClient, teamId: number, userIds: number[]) {
  await tx.host.deleteMany({ where: { userId: { in: userIds }, eventType: { teamId } } });
  await tx.membership.deleteMany({ where: { teamId, userId: { in: userIds } } });
}
