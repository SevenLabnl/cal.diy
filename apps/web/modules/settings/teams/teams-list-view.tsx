"use client";

import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

export const TeamsCTA = () => {
  const { t } = useLocale();
  return (
    <Button href="/settings/teams/new" StartIcon="plus" data-testid="new-team-btn">
      {t("new")}
    </Button>
  );
};

export const TeamsList = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data: teams, isPending } = trpc.viewer.teams.list.useQuery();

  const respond = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => utils.viewer.teams.list.invalidate(),
    onError: (e) => showToast(t(e.message), "error"),
  });

  if (isPending) {
    return (
      <SkeletonContainer>
        <SkeletonText className="h-16 w-full" />
      </SkeletonContainer>
    );
  }

  if (!teams?.length) {
    return (
      <EmptyScreen
        Icon="users"
        headline={t("no_teams")}
        description={t("create_manage_teams_collaborative")}
        buttonRaw={<TeamsCTA />}
      />
    );
  }

  const pending = teams.filter((team) => !team.accepted);
  const accepted = teams.filter((team) => team.accepted);

  return (
    <div className="flex flex-col gap-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-emphasis text-sm">{t("pending_invites")}</h2>
          <ul className="divide-subtle border-subtle divide-y rounded-md border" data-testid="pending-invites">
            {pending.map((team) => (
              <li key={team.id} className="flex items-center gap-3 p-4">
                <Avatar alt={team.name} imageSrc={team.logoUrl} size="md" />
                <span className="flex-1 truncate font-medium text-emphasis text-sm">{team.name}</span>
                <Button
                  color="secondary"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ teamId: team.id, accept: false })}>
                  {t("reject")}
                </Button>
                <Button
                  color="primary"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ teamId: team.id, accept: true })}>
                  {t("accept")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {accepted.length > 0 && (
        <ul className="divide-subtle border-subtle divide-y rounded-md border" data-testid="team-list">
          {accepted.map((team) => (
            <li key={team.id}>
              <Link
                href={`/settings/teams/${team.id}/profile`}
                className="flex items-center gap-3 p-4 hover:bg-subtle">
                <Avatar alt={team.name} imageSrc={team.logoUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-emphasis text-sm">{team.name}</p>
                  {team.slug && <p className="truncate text-subtle text-sm">/team/{team.slug}</p>}
                </div>
                <Badge variant="gray">{t(team.role.toLowerCase())}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
