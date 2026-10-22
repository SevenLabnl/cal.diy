import { _generateMetadata } from "app/_utils";

import TeamAppearanceView from "~/settings/teams/team-appearance-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/appearance`
  );

const Page = () => <TeamAppearanceView />;

export default Page;
