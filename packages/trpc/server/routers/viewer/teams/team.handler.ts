import { uploadLogo } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type {
  TCreateInputSchema,
  TDeleteInputSchema,
  TGetInputSchema,
  TUpdateInputSchema,
} from "./schema";
import { assertManager, assertOwner, deleteInviteLeftovers, getMembership } from "./util";

type Ctx = { user: NonNullable<TrpcSessionUser> };

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  bio: true,
  logoUrl: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  hideBranding: true,
  isPrivate: true,
  hideBookATeamMember: true,
  hideTeamProfileLink: true,
  rrResetInterval: true,
  rrTimestampBasis: true,
} as const;

const assertSlugFree = async (slug: string, exceptId?: number) => {
  const taken = await prisma.team.findFirst({
    where: { slug, parentId: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (taken) throw new TRPCError({ code: "CONFLICT", message: "team_url_taken" });
};

export const listHandler = async ({ ctx }: { ctx: Ctx }) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: ctx.user.id, team: { isOrganization: false } },
    select: { role: true, accepted: true, team: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    orderBy: { team: { name: "asc" } },
  });
  return memberships.map(({ team, role, accepted }) => ({ ...team, role, accepted }));
};

export const getHandler = async ({ ctx, input }: { ctx: Ctx; input: TGetInputSchema }) => {
  const membership = await getMembership(ctx.user.id, input.teamId);
  if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "team_not_found" });
  const team = await prisma.team.findUniqueOrThrow({ where: { id: input.teamId }, select: teamSelect });
  return { ...team, membership };
};

export const createHandler = async ({ ctx, input }: { ctx: Ctx; input: TCreateInputSchema }) => {
  const slug = slugify(input.slug);
  if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_slug" });
  await assertSlugFree(slug);
  const team = await prisma.team.create({
    data: {
      name: input.name,
      slug,
      members: { create: { userId: ctx.user.id, role: MembershipRole.OWNER, accepted: true } },
    },
    select: { id: true, slug: true },
  });
  return { team };
};

export const updateHandler = async ({ ctx, input }: { ctx: Ctx; input: TUpdateInputSchema }) => {
  const { id, logo, slug: rawSlug, ...fields } = input;
  await assertManager(ctx.user.id, id);

  let slug: string | undefined;
  if (rawSlug !== undefined) {
    slug = slugify(rawSlug);
    if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_slug" });
    await assertSlugFree(slug, id);
  }

  let logoUrl: string | null | undefined;
  if (typeof logo === "string") {
    logoUrl = await uploadLogo({ teamId: id, logo: await resizeBase64Image(logo) });
  } else if (logo === null) {
    await prisma.avatar.deleteMany({ where: { teamId: id, userId: 0, isBanner: false } });
    logoUrl = null;
  }

  return prisma.team.update({ where: { id }, data: { ...fields, slug, logoUrl }, select: teamSelect });
};

export const deleteHandler = async ({ ctx, input }: { ctx: Ctx; input: TDeleteInputSchema }) => {
  await assertOwner(ctx.user.id, input.teamId);
  await prisma.$transaction(async (tx) => {
    await deleteInviteLeftovers(tx, input.teamId);
    await tx.avatar.deleteMany({ where: { teamId: input.teamId } });
    // Memberships, team event types (and their hosts) cascade.
    await tx.team.delete({ where: { id: input.teamId } });
  });
  return { id: input.teamId };
};
