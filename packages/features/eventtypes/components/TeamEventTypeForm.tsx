import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { createEventTypeInput } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Form, TextField } from "@calcom/ui/components/form";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { Tooltip } from "@calcom/ui/components/tooltip";

type CreateEventTypeFormValues = z.infer<typeof createEventTypeInput>;

// Managed event types are not offered: cal.diy stubs out children event type syncing.
export const TeamEventTypeForm = ({
  teamSlug,
  teamId,
  form,
  urlPrefix,
  isPending,
  handleSubmit,
  SubmitButton,
}: {
  teamSlug?: string | null;
  teamId: number;
  isPending: boolean;
  urlPrefix?: string;
  form: UseFormReturn<CreateEventTypeFormValues>;
  handleSubmit: (values: CreateEventTypeFormValues) => void;
  SubmitButton: (isPending: boolean) => ReactNode;
}) => {
  const { t } = useLocale();
  const { register, setValue, formState } = form;
  const prefix = `${urlPrefix}/team/${teamSlug}/`;

  return (
    <Form form={form} handleSubmit={handleSubmit}>
      <div className="mb-6 mt-1 stack-y-6">
        <input type="hidden" {...register("teamId", { valueAsNumber: true })} value={teamId} />
        <TextField
          label={t("title")}
          placeholder={t("quick_chat")}
          data-testid="event-type-quick-chat"
          {...register("title")}
          onChange={(e) => {
            setValue("title", e?.target.value);
            if (formState.touchedFields["slug"] === undefined) {
              setValue("slug", slugify(e?.target.value));
            }
          }}
        />
        <TextField
          label={t("url")}
          required
          addOnLeading={
            <Tooltip content={prefix}>
              <span className="max-w-24 md:max-w-56 inline-block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {prefix}
              </span>
            </Tooltip>
          }
          containerClassName="[&>div]:gap-0"
          className="pl-0"
          {...register("slug")}
          onChange={(e) => setValue("slug", slugify(e?.target.value), { shouldTouch: true })}
        />
        <div className="mb-4">
          <label htmlFor="schedulingType" className="text-default block text-sm font-bold">
            {t("assignment")}
          </label>
          {formState.errors.schedulingType && (
            <Alert className="mt-1" severity="error" message={formState.errors.schedulingType.message} />
          )}
          <RadioArea.Group
            onValueChange={(val: SchedulingType) => setValue("schedulingType", val)}
            className="mt-1 flex gap-4">
            <RadioArea.Item
              {...register("schedulingType")}
              value={SchedulingType.COLLECTIVE}
              className="w-1/2 text-sm">
              <strong className="mb-1 block">{t("collective")}</strong>
              <p>{t("collective_description")}</p>
            </RadioArea.Item>
            <RadioArea.Item
              {...register("schedulingType")}
              value={SchedulingType.ROUND_ROBIN}
              className="w-1/2 text-sm">
              <strong className="mb-1 block">{t("round_robin")}</strong>
              <p>{t("round_robin_description")}</p>
            </RadioArea.Item>
          </RadioArea.Group>
        </div>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
};
