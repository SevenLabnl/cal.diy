"use client";

import { Controller, useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, Select, SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { Team } from "./team-page";
import { TeamPage } from "./team-page";

type FormValues = {
  isPrivate: boolean;
  hideBookATeamMember: boolean;
  hideTeamProfileLink: boolean;
  rrResetInterval: Team["rrResetInterval"];
  rrTimestampBasis: Team["rrTimestampBasis"];
};

const SettingsForm = ({ team, canManage }: { team: Team; canManage: boolean }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({
    defaultValues: {
      isPrivate: team.isPrivate ?? false,
      hideBookATeamMember: team.hideBookATeamMember ?? false,
      hideTeamProfileLink: team.hideTeamProfileLink ?? false,
      rrResetInterval: team.rrResetInterval,
      rrTimestampBasis: team.rrTimestampBasis,
    },
  });

  const mutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate({ teamId: team.id });
      form.reset(form.getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (e) => showToast(t(e.message), "error"),
  });

  const intervalOptions = [
    { value: "DAY" as const, label: t("daily") },
    { value: "MONTH" as const, label: t("monthly") },
  ];
  const basisOptions = [
    { value: "CREATED_AT" as const, label: t("created_at_option") },
    { value: "START_TIME" as const, label: t("start_time") },
  ];

  const toggle = (name: "isPrivate" | "hideBookATeamMember" | "hideTeamProfileLink", title: string, description: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={title}
          description={description}
          checked={value}
          disabled={!canManage}
          onCheckedChange={(checked) => onChange(checked)}
          data-testid={`team-setting-${name}`}
        />
      )}
    />
  );

  return (
    <Form form={form} handleSubmit={(values) => mutation.mutate({ id: team.id, ...values })}>
      <div className="border-subtle stack-y-6 border-x px-4 py-8 sm:px-6">
        {toggle("isPrivate", t("make_team_private"), t("make_team_private_description"))}
        {toggle("hideBookATeamMember", t("hide_book_a_team_member"), t("hide_book_a_team_member_description"))}
        {toggle("hideTeamProfileLink", t("hide_team_profile_link"), t("hide_team_profile_link_description"))}

        <div>
          <Label>{t("reset_interval_weighted_rr")}</Label>
          <Controller
            control={form.control}
            name="rrResetInterval"
            render={({ field: { value, onChange } }) => (
              <Select
                isDisabled={!canManage}
                options={intervalOptions}
                value={intervalOptions.find((o) => o.value === value)}
                onChange={(o) => o && onChange(o.value)}
              />
            )}
          />
          <p className="mt-2 text-subtle text-sm">{t("rr_reset_interval_description")}</p>
        </div>

        <div>
          <Label>{t("distribution_basis_weighted_rr")}</Label>
          <Controller
            control={form.control}
            name="rrTimestampBasis"
            render={({ field: { value, onChange } }) => (
              <Select
                isDisabled={!canManage}
                options={basisOptions}
                value={basisOptions.find((o) => o.value === value)}
                onChange={(o) => o && onChange(o.value)}
              />
            )}
          />
          <p className="mt-2 text-subtle text-sm">{t("timestamp_basis_description")}</p>
        </div>
      </div>
      <SectionBottomActions align="end">
        {canManage && (
          <Button loading={mutation.isPending} disabled={!form.formState.isDirty} color="primary" type="submit">
            {t("update")}
          </Button>
        )}
      </SectionBottomActions>
    </Form>
  );
};

const TeamSettingsView = () => {
  const { t } = useLocale();
  return (
    <TeamPage title={t("settings")} description={t("team_settings_description")}>
      {(team, { canManage }) => <SettingsForm key={team.id} team={team} canManage={canManage} />}
    </TeamPage>
  );
};

export default TeamSettingsView;
