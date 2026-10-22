import { _generateMetadata } from "app/_utils";

import { CreateNewTeamView } from "~/settings/teams/new/create-new-team-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description"),
    undefined,
    undefined,
    "/settings/teams/new"
  );

const Page = () => <CreateNewTeamView />;

export default Page;
