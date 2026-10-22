"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

export type Team = RouterOutputs["viewer"]["teams"]["get"];

/** Loads the team from the `[id]` route param and renders `children` inside the settings header. */
export const TeamPage = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (team: Team, perms: { canManage: boolean; isOwner: boolean }) => ReactNode;
}) => {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const teamId = Number(params?.id);
  const { data: team, error, isPending } = trpc.viewer.teams.get.useQuery({ teamId });

  const { role, accepted } = team?.membership ?? {};
  const isOwner = !!accepted && role === "OWNER";
  const canManage = isOwner || (!!accepted && role === "ADMIN");

  return (
    <SettingsHeader title={title} description={description} borderInShellHeader={true}>
      {isPending ? (
        <SkeletonContainer>
          <div className="border-subtle stack-y-6 rounded-b-lg border border-t-0 px-4 py-8 sm:px-6">
            <SkeletonText className="h-8 w-full" />
            <SkeletonText className="h-8 w-full" />
            <SkeletonText className="h-8 w-1/2" />
          </div>
        </SkeletonContainer>
      ) : team ? (
        children(team, { canManage, isOwner })
      ) : (
        <Alert severity="error" message={error ? t(error.message) : t("something_went_wrong")} />
      )}
    </SettingsHeader>
  );
};
