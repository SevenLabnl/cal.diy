"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

export const CreateNewTeamView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const create = trpc.viewer.teams.create.useMutation({
    onSuccess: async ({ team }) => {
      await utils.viewer.teams.list.invalidate();
      router.push(`/settings/teams/${team.id}/members`);
    },
    onError: (e) => showToast(e.data?.code === "CONFLICT" ? t("url_taken") : t(e.message), "error"),
  });

  return (
    <SettingsHeader
      title={t("create_new_team")}
      description={t("create_new_team_description")}
      borderInShellHeader={true}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name, slug });
        }}>
        <div className="border-subtle stack-y-6 border-x px-4 py-8 sm:px-6">
          <TextField
            label={t("team_name")}
            name="name"
            data-testid="team-name-input"
            value={name}
            placeholder="Acme Inc."
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value, true));
            }}
          />
          <TextField
            label={t("team_url")}
            name="slug"
            data-testid="team-slug-input"
            addOnLeading={`${WEBAPP_URL}/team/`}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value, true));
            }}
          />
        </div>
        <SectionBottomActions align="end">
          <div className="flex gap-2">
            <Button type="button" color="minimal" onClick={() => router.push("/teams")}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              color="primary"
              loading={create.isPending}
              disabled={!name.trim() || !slug.trim()}
              data-testid="continue-button">
              {t("continue")}
            </Button>
          </div>
        </SectionBottomActions>
      </form>
    </SettingsHeader>
  );
};

export default CreateNewTeamView;
