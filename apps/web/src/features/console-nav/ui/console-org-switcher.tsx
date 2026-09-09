import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@saasweave/auth/react/auth-client";
import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@saasweave/ui/components/dropdown-menu";
import { Input } from "@saasweave/ui/components/input";
import { Label } from "@saasweave/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@saasweave/ui/components/sheet";
import { cn } from "@saasweave/ui/lib/utils";

function orgInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function CreateWorkspaceSheet({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${base || "workspace"}-${Math.random().toString(36).slice(2, 10)}`;
    const created = await authClient.organization.create({ name, slug });
    if (created.error) {
      toast.error(created.error.message ?? m.console_settings__workspace_update_failed());
      setPending(false);
      return;
    }
    await authClient.organization.setActive({ organizationId: created.data.id });
    toast.success(m.console_nav__workspace_created({ name }));
    setName("");
    setPending(false);
    setOpen(false);
    await onCreated();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <Plus className="size-4 opacity-60" aria-hidden="true" />
          {m.console_nav__new_workspace()}
        </DropdownMenuItem>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>{m.console_nav__create_workspace()}</SheetTitle>
        </SheetHeader>
        <form className="flex flex-col gap-5 p-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">{m.console_settings__workspace_name_label()}</Label>
            <Input
              id="workspace-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={m.console_settings__workspace_name_placeholder()}
            />
          </div>
          <Button type="submit" disabled={pending || !name.trim()} className="w-full">
            {pending ? m.console_nav__creating_workspace() : m.console_nav__create_workspace()}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ConsoleOrgSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const refresh = async () => {
    await queryClient.invalidateQueries();
    await router.invalidate();
  };

  const switchTo = async (organizationId: string) => {
    if (organizationId === activeOrganization?.id) return;
    const result = await authClient.organization.setActive({ organizationId });
    if (result.error) {
      toast.error(result.error.message ?? m.console_settings__workspace_update_failed());
      return;
    }
    await refresh();
  };

  const activeName = activeOrganization?.name ?? m.console_settings__workspace_name_label();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-between px-2.5 py-2"
          aria-label={m.console_nav__switch_workspace()}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground">
              {orgInitial(activeName)}
            </span>
            <span className="truncate text-sm font-medium">{activeName}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[13.5rem]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {m.admin_nav__workspaces()}
        </DropdownMenuLabel>
        {(organizations ?? []).map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="cursor-pointer"
            onClick={() => switchTo(org.id)}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-semibold">
              {orgInitial(org.name)}
            </span>
            <span className="truncate">{org.name}</span>
            <Check
              className={cn(
                "ml-auto size-4",
                org.id === activeOrganization?.id ? "opacity-100" : "opacity-0"
              )}
              aria-hidden="true"
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <CreateWorkspaceSheet onCreated={refresh} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
