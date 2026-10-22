import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import {
  ZAcceptOrLeaveInputSchema,
  ZChangeMemberRoleInputSchema,
  ZCreateInputSchema,
  ZDeleteInputSchema,
  ZGetInputSchema,
  ZInviteMemberInputSchema,
  ZListMembersInputSchema,
  ZRemoveMemberInputSchema,
  ZResendInvitationInputSchema,
  ZUpdateInputSchema,
} from "./schema";

const teamHandlers = () => import("./team.handler");
const memberHandlers = () => import("./members.handler");

export const teamsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => (await teamHandlers()).listHandler({ ctx })),
  get: authedProcedure
    .input(ZGetInputSchema)
    .query(async ({ ctx, input }) => (await teamHandlers()).getHandler({ ctx, input })),
  create: authedProcedure
    .input(ZCreateInputSchema)
    .mutation(async ({ ctx, input }) => (await teamHandlers()).createHandler({ ctx, input })),
  update: authedProcedure
    .input(ZUpdateInputSchema)
    .mutation(async ({ ctx, input }) => (await teamHandlers()).updateHandler({ ctx, input })),
  delete: authedProcedure
    .input(ZDeleteInputSchema)
    .mutation(async ({ ctx, input }) => (await teamHandlers()).deleteHandler({ ctx, input })),
  listMembers: authedProcedure
    .input(ZListMembersInputSchema)
    .query(async ({ ctx, input }) => (await memberHandlers()).listMembersHandler({ ctx, input })),
  inviteMember: authedProcedure
    .input(ZInviteMemberInputSchema)
    .mutation(async ({ ctx, input }) => (await memberHandlers()).inviteMemberHandler({ ctx, input })),
  resendInvitation: authedProcedure
    .input(ZResendInvitationInputSchema)
    .mutation(async ({ ctx, input }) => (await memberHandlers()).resendInvitationHandler({ ctx, input })),
  acceptOrLeave: authedProcedure
    .input(ZAcceptOrLeaveInputSchema)
    .mutation(async ({ ctx, input }) => (await memberHandlers()).acceptOrLeaveHandler({ ctx, input })),
  changeMemberRole: authedProcedure
    .input(ZChangeMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => (await memberHandlers()).changeMemberRoleHandler({ ctx, input })),
  removeMember: authedProcedure
    .input(ZRemoveMemberInputSchema)
    .mutation(async ({ ctx, input }) => (await memberHandlers()).removeMemberHandler({ ctx, input })),
});
