"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@calcom/ui/components/dialog";
import { Label, Select, TextArea } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import type { Team } from "./team-page";
import { TeamPage } from "./team-page";

type Role = "MEMBER" | "ADMIN" | "OWNER";

const useRoleOptions = (isOwner: boolean) => {
  const { t } = useLocale();
  // only owners may grant or revoke OWNER
  return [
    { value: "MEMBER" as Role, label: t("member") },
    { value: "ADMIN" as Role, label: t("admin") },
    ...(isOwner ? [{ value: "OWNER" as Role, label: t("owner") }] : []),
  ];
};

const InviteDialog = ({
  teamId,
  isOwner,
  open,
  onOpenChange,
}: {
  teamId: number;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const roleOptions = useRoleOptions(isOwner);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");

  const invite = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: async ({ invited }) => {
      await utils.viewer.teams.listMembers.invalidate({ teamId });
      showToast(t("team_invites_sent", { count: invited }), "success");
      setEmails("");
      onOpenChange(false);
    },
    onError: (e) => showToast(t(e.message), "error"),
  });

  const recipients = emails.split(/[\s,;]+/).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        type="creation"
        title={t("invite_team_member")}
        description={t("add_team_members_description")}>
        <div className="stack-y-4">
          <div>
            <Label>{t("email_or_username")}</Label>
            <TextArea
              rows={3}
              value={emails}
              data-testid="invite-team-member-input"
              onChange={(e) => setEmails(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("role")}</Label>
            <Select
              options={roleOptions}
              value={roleOptions.find((o) => o.value === role)}
              onChange={(o) => o && setRole(o.value)}
            />
          </div>
        </div>
        <DialogFooter showDivider>
          <DialogClose />
          <Button
            color="primary"
            loading={invite.isPending}
            disabled={recipients.length === 0}
            data-testid="invite-new-member-button"
            onClick={() =>
              invite.mutate({ teamId, usernameOrEmail: recipients, role, language: i18n.language })
            }>
            {t("invite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MemberRow = ({
  teamId,
  member,
  isSelf,
  canManage,
  isOwner,
}: {
  teamId: number;
  member: RouterOutputs["viewer"]["teams"]["listMembers"][number];
  isSelf: boolean;
  canManage: boolean;
  isOwner: boolean;
}) => {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const roleOptions = useRoleOptions(isOwner);
  const [removeOpen, setRemoveOpen] = useState(false);
  const onError = (e: { message: string }) => showToast(t(e.message), "error");
  const refresh = () => utils.viewer.teams.listMembers.invalidate({ teamId });

  const changeRole = trpc.viewer.teams.changeMemberRole.useMutation({
    onSuccess: refresh,
    onError: (e) => {
      onError(e);
      refresh();
    },
  });
  const remove = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: async () => {
      await refresh();
      setRemoveOpen(false);
      showToast(t("member_removed"), "success");
    },
    onError,
  });
  const resend = trpc.viewer.teams.resendInvitation.useMutation({
    onSuccess: () => showToast(t("invitation_resent"), "success"),
    onError,
  });

  // admins can't touch owners; nobody edits their own row (leave lives on the profile page)
  const canEdit = canManage && !isSelf && (isOwner || member.role !== "OWNER");

  return (
    <li className="flex flex-wrap items-center gap-3 p-4" data-testid="team-member-item">
      <Avatar alt={member.name ?? member.email} imageSrc={member.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-emphasis text-sm">{member.name || member.username || member.email}</p>
        <p className="truncate text-subtle text-sm">{member.email}</p>
      </div>
      {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
      {canEdit ? (
        <div className="w-32">
          <Select
            options={roleOptions}
            value={roleOptions.find((o) => o.value === member.role)}
            onChange={(o) => o && changeRole.mutate({ teamId, memberId: member.id, role: o.value })}
            isDisabled={changeRole.isPending}
          />
        </div>
      ) : (
        <Badge variant="gray">{t(member.role.toLowerCase())}</Badge>
      )}
      {canEdit && !member.accepted && (
        <Button
          color="secondary"
          loading={resend.isPending}
          onClick={() => resend.mutate({ teamId, email: member.email, language: i18n.language })}>
          {t("resend_invitation")}
        </Button>
      )}
      {canEdit && (
        <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <Button
            color="destructive"
            variant="icon"
            StartIcon="trash"
            tooltip={t("remove_member")}
            data-testid="remove-member-button"
            onClick={() => setRemoveOpen(true)}
          />
          <ConfirmationDialogContent
            variety="danger"
            title={t("remove_member")}
            confirmBtnText={t("confirm_remove_member")}
            isPending={remove.isPending}
            onConfirm={(e) => {
              e.preventDefault();
              remove.mutate({ teamId, memberIds: [member.id] });
            }}>
            {member.name || member.email}
          </ConfirmationDialogContent>
        </Dialog>
      )}
    </li>
  );
};

const MembersList = ({
  team,
  canManage,
  isOwner,
}: {
  team: Team;
  canManage: boolean;
  isOwner: boolean;
}) => {
  const { t } = useLocale();
  const session = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: members, isPending } = trpc.viewer.teams.listMembers.useQuery({ teamId: team.id });

  return (
    <div className="border-subtle stack-y-4 rounded-b-lg border border-t-0 p-4 sm:p-6">
      {canManage && (
        <div className="flex justify-end">
          <Button StartIcon="plus" data-testid="new-member-button" onClick={() => setInviteOpen(true)}>
            {t("invite_team_member")}
          </Button>
          <InviteDialog teamId={team.id} isOwner={isOwner} open={inviteOpen} onOpenChange={setInviteOpen} />
        </div>
      )}
      {isPending ? (
        <SkeletonContainer>
          <SkeletonText className="h-12 w-full" />
        </SkeletonContainer>
      ) : (
        <ul className="divide-subtle border-subtle divide-y rounded-md border" data-testid="team-members">
          {members?.map((member) => (
            <MemberRow
              key={member.id}
              teamId={team.id}
              member={member}
              isSelf={member.id === Number(session.data?.user.id)}
              canManage={canManage}
              isOwner={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

const TeamMembersView = () => {
  const { t } = useLocale();
  return (
    <TeamPage title={t("members")} description={t("members_team_description")}>
      {(team, { canManage, isOwner }) => (
        <MembersList key={team.id} team={team} canManage={canManage} isOwner={isOwner} />
      )}
    </TeamPage>
  );
};

export default TeamMembersView;
