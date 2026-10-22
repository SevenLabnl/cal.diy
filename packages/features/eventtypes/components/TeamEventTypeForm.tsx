import type { ReactNode } from "react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { createEventTypeInput } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";
import { Form, Label, TextField } from "@calcom/ui/components/form";
import { RadioAreaGroup } from "@calcom/ui/components/radio";

type FormValues = z.infer<typeof createEventTypeInput>;

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
  form: UseFormReturn<FormValues>;
  handleSubmit: (values: FormValues) => void;
  SubmitButton: (isPending: boolean) => ReactNode;
}) => {
  const { t } = useLocale();
  const { register, control, formState } = form;

  return (
    <Form form={form} handleSubmit={handleSubmit}>
      <div className="mt-3 stack-y-6 pb-11">
        <input type="hidden" {...register("teamId", { valueAsNumber: true })} value={teamId} />

        <TextField
          label={t("title")}
          placeholder={t("quick_chat")}
          data-testid="event-type-quick-chat"
          {...register("title")}
          onChange={(e) => {
            form.setValue("title", e.target.value);
            if (form.formState.touchedFields["slug"] === undefined) {
              form.setValue("slug", slugify(e.target.value));
            }
          }}
        />

        <TextField
          label={t("url")}
          required
          addOnLeading={
            <span className="inline-block min-w-0 max-w-24 overflow-hidden text-ellipsis whitespace-nowrap md:max-w-56">
              {`${urlPrefix}/team/${teamSlug}/`}
            </span>
          }
          containerClassName="[&>div]:gap-0"
          className="pl-0"
          {...register("slug")}
          onChange={(e) => {
            form.setValue("slug", slugify(e.target.value), { shouldTouch: true });
          }}
        />

        <div>
          <Label>{t("assignment")}</Label>
          <Controller
            name="schedulingType"
            control={control}
            rules={{ required: t("required") }}
            render={({ field: { value, onChange } }) => (
              <RadioAreaGroup.Group
                value={value ?? undefined}
                onValueChange={(v) => onChange(v as SchedulingType)}
                className="flex flex-col gap-2">
                <RadioAreaGroup.Item value={SchedulingType.COLLECTIVE}>
                  <strong className="mb-1 block">{t("collective")}</strong>
                  <p>{t("collective_description")}</p>
                </RadioAreaGroup.Item>
                <RadioAreaGroup.Item value={SchedulingType.ROUND_ROBIN}>
                  <strong className="mb-1 block">{t("round_robin")}</strong>
                  <p>{t("round_robin_description")}</p>
                </RadioAreaGroup.Item>
              </RadioAreaGroup.Group>
            )}
          />
          {formState.errors.schedulingType && (
            <p className="mt-2 text-sm text-red-700">{formState.errors.schedulingType.message}</p>
          )}
        </div>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
};
