"use client";

import { Controller, useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import { APP_NAME, DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ColorPicker, Form, SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { Team } from "./team-page";
import { TeamPage } from "./team-page";

type FormValues = {
  theme: "system" | "light" | "dark";
  brandColor: string;
  darkBrandColor: string;
  hideBranding: boolean;
};

const AppearanceForm = ({ team, canManage }: { team: Team; canManage: boolean }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const defaultValues: FormValues = {
    theme: team.theme === "light" || team.theme === "dark" ? team.theme : "system",
    brandColor: team.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    darkBrandColor: team.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    hideBranding: team.hideBranding ?? false,
  };
  const form = useForm<FormValues>({ defaultValues });

  const mutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate({ teamId: team.id });
      form.reset(form.getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (e) => showToast(t(e.message), "error"),
  });

  return (
    <Form
      form={form}
      handleSubmit={({ theme, ...rest }) =>
        mutation.mutate({ id: team.id, theme: theme === "system" ? null : theme, ...rest })
      }>
      <fieldset disabled={!canManage} className="border-subtle stack-y-8 border-x px-4 py-8 sm:px-6">
        <div>
          <p className="mb-1 font-semibold text-base text-default">{t("theme")}</p>
          <p className="mb-4 text-default text-sm">{t("theme_applies_note")}</p>
          <div className="flex flex-col justify-between sm:flex-row">
            <ThemeLabel
              variant="system"
              value="system"
              label={t("theme_system")}
              defaultChecked={defaultValues.theme === "system"}
              register={form.register}
            />
            <ThemeLabel
              variant="light"
              value="light"
              label={t("light")}
              defaultChecked={defaultValues.theme === "light"}
              register={form.register}
            />
            <ThemeLabel
              variant="dark"
              value="dark"
              label={t("dark")}
              defaultChecked={defaultValues.theme === "dark"}
              register={form.register}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 block font-medium text-default text-sm">{t("light_brand_color")}</p>
            <ColorPicker
              defaultValue={defaultValues.brandColor}
              resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
              onChange={(value) => form.setValue("brandColor", value, { shouldDirty: true })}
            />
          </div>
          <div>
            <p className="mb-2 block font-medium text-default text-sm">{t("dark_brand_color")}</p>
            <ColorPicker
              defaultValue={defaultValues.darkBrandColor}
              resetDefaultValue={DEFAULT_DARK_BRAND_COLOR}
              onChange={(value) => form.setValue("darkBrandColor", value, { shouldDirty: true })}
            />
          </div>
        </div>
        <Controller
          control={form.control}
          name="hideBranding"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              title={t("disable_cal_branding", { appName: APP_NAME })}
              description={t("removes_cal_branding", { appName: APP_NAME })}
              checked={value}
              onCheckedChange={onChange}
              disabled={!canManage}
            />
          )}
        />
      </fieldset>
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

const TeamAppearanceView = () => {
  const { t } = useLocale();
  return (
    <TeamPage title={t("appearance")} description={t("appearance_team_description")}>
      {(team, { canManage }) => <AppearanceForm key={team.id} team={team} canManage={canManage} />}
    </TeamPage>
  );
};

export default TeamAppearanceView;
