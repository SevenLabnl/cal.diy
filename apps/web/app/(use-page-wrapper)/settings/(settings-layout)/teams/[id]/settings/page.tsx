import { _generateMetadata } from "app/_utils";

import TeamSettingsView from "~/settings/teams/team-settings-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/settings`
  );

const Page = () => <TeamSettingsView />;

export default Page;
