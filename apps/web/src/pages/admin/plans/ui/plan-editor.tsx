import { isDefinedError } from "@orpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";
import { Label } from "@saasweave/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@saasweave/ui/components/sheet";

import { plansQueryKeys, type PlansQueryResult } from "@/shared/api/get-plans.query";
import { ConfirmActionDialog } from "@/shared/ui/confirm-action-dialog";
import { Switch } from "@/shared/ui/console-kit";

import { useCreatePlanMutation } from "@/pages/admin/plans/api/create-plan.mutation";
import { useArchivePlanMutation } from "@/pages/admin/plans/api/archive-plan.mutation";
import { useUpdatePlanMutation } from "@/pages/admin/plans/api/update-plan.mutation";

export type PlanRow = PlansQueryResult[number];

type PlanDraft = {
  cta: string;
  highlights: string;
  id: string;
  name: string;
  popular: boolean;
  priceMonthly: string;
  seatPrice: string;
  seatsIncluded: string;
  tagline: string;
};

function draftFromPlan(plan?: PlanRow): PlanDraft {
  return {
    cta: plan?.cta ?? m.plans__choose(),
    highlights: plan?.highlights.join("\n") ?? "",
    id: plan?.id ?? "",
    name: plan?.name ?? "",
    popular: plan?.popular ?? false,
    priceMonthly: plan?.priceMonthly === null ? "" : String(plan?.priceMonthly ?? ""),
    seatPrice:
      plan?.seatPrice === undefined || plan.seatPrice === null ? "" : String(plan.seatPrice),
    seatsIncluded: String(plan?.seatsIncluded ?? 1),
    tagline: plan?.tagline ?? ""
  };
}

function toPayload(draft: PlanDraft) {
  return {
    cta: draft.cta.trim() || m.plans__choose(),
    highlights: draft.highlights
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    id: draft.id.trim(),
    name: draft.name.trim(),
    popular: draft.popular,
    priceMonthly: draft.priceMonthly.trim() === "" ? null : Math.max(0, Number(draft.priceMonthly)),
    seatPrice: draft.seatPrice.trim() === "" ? null : Math.max(0, Number(draft.seatPrice)),
    seatsIncluded: Math.max(0, Number(draft.seatsIncluded) || 0),
    tagline: draft.tagline.trim()
  };
}

function PlanForm({
  draft,
  isCreate,
  onChange
}: {
  draft: PlanDraft;
  isCreate: boolean;
  onChange: (next: PlanDraft) => void;
}) {
  return (
    <div className="grid gap-4 overflow-y-auto px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="plan-id">{m.plans__plan_id()}</Label>
        <Input
          disabled={!isCreate}
          id="plan-id"
          onChange={(event) => onChange({ ...draft, id: event.target.value })}
          placeholder="growth"
          value={draft.id}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-name">{m.plans__name()}</Label>
        <Input
          id="plan-name"
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          value={draft.name}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-tagline">{m.plans__tagline()}</Label>
        <Input
          id="plan-tagline"
          onChange={(event) => onChange({ ...draft, tagline: event.target.value })}
          value={draft.tagline}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plan-price">{m.plans__price_month()}</Label>
          <Input
            id="plan-price"
            min={0}
            onChange={(event) => onChange({ ...draft, priceMonthly: event.target.value })}
            type="number"
            value={draft.priceMonthly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-seat-price">{m.plans__seat_price()}</Label>
          <Input
            id="plan-seat-price"
            min={0}
            onChange={(event) => onChange({ ...draft, seatPrice: event.target.value })}
            type="number"
            value={draft.seatPrice}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-seats">{m.plans__seats_included()}</Label>
        <Input
          id="plan-seats"
          min={0}
          onChange={(event) => onChange({ ...draft, seatsIncluded: event.target.value })}
          type="number"
          value={draft.seatsIncluded}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-cta">{m.plans__call_to_action()}</Label>
        <Input
          id="plan-cta"
          onChange={(event) => onChange({ ...draft, cta: event.target.value })}
          value={draft.cta}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-highlights">{m.plans__highlights()}</Label>
        <textarea
          className="min-h-28 w-full rounded-lg border border-input/70 bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-border dark:bg-input/32"
          id="plan-highlights"
          onChange={(event) => onChange({ ...draft, highlights: event.target.value })}
          value={draft.highlights}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <span className="text-sm text-foreground">{m.plans__popular_toggle()}</span>
        <Switch
          checked={draft.popular}
          label={m.plans__popular_toggle()}
          onChange={(next) => onChange({ ...draft, popular: next })}
        />
      </div>
    </div>
  );
}

export function CreatePlanSheet() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(() => draftFromPlan());
  const mutation = useCreatePlanMutation({
    onError: (error) => {
      if (isDefinedError(error) && error.code === "PLAN_EXISTS") {
        toast.error(m.plans__exists());
        return;
      }
      toast.error(error.message || m.plans__create_failed());
    },
    onSuccess: () => {
      toast.success(m.plans__created());
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.all() });
      setOpen(false);
      setDraft(draftFromPlan());
    }
  });

  return (
    <Sheet
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(draftFromPlan());
      }}
      open={open}
    >
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          {m.plans__new()}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{m.plans__new()}</SheetTitle>
          <SheetDescription>{m.plans__catalog_description()}</SheetDescription>
        </SheetHeader>
        <PlanForm draft={draft} isCreate onChange={setDraft} />
        <SheetFooter>
          <Button
            disabled={!draft.id.trim() || !draft.name.trim() || mutation.isPending}
            onClick={() => mutation.mutate(toPayload(draft))}
          >
            {mutation.isPending ? m.plans__creating() : m.plans__create()}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function EditPlanSheet({ plan }: { plan: PlanRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(() => draftFromPlan(plan));
  const update = useUpdatePlanMutation({
    onError: (error) => toast.error(error.message || m.plans__update_failed()),
    onSuccess: () => {
      toast.success(m.plans__updated());
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.all() });
      setOpen(false);
    }
  });
  const archive = useArchivePlanMutation({
    onError: (error) => toast.error(error.message || m.plans__update_failed()),
    onSuccess: () => {
      toast.success(m.plans__archived());
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.all() });
      setOpen(false);
    }
  });

  return (
    <Sheet
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(draftFromPlan(plan));
      }}
      open={open}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="mt-4 w-full">
          {m.plans__edit()}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{m.plans__edit()} {plan.name}</SheetTitle>
          <SheetDescription>{m.plans__edit_description()}</SheetDescription>
        </SheetHeader>
        <PlanForm draft={draft} isCreate={false} onChange={setDraft} />
        <SheetFooter className="flex-row items-center justify-between">
          <ConfirmActionDialog
            confirmLabel={m.plans__archive_plan()}
            description={m.plans__archive_description()}
            onConfirm={() => archive.mutate({ id: plan.id })}
            title={`${m.plans__archive_plan()} ${plan.name}?`}
          >
            <Button variant="outline" size="sm" disabled={archive.isPending}>
              <Archive className="size-4" aria-hidden="true" />
              {m.plans__archive()}
            </Button>
          </ConfirmActionDialog>
          <Button disabled={update.isPending} onClick={() => update.mutate(toPayload(draft))}>
            {update.isPending ? m.plans__saving() : m.plans__save()}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
