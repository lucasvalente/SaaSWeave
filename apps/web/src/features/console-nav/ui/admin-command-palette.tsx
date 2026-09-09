import { useEffect, useState } from "react";

import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@saasweave/ui/components/sheet";

import { useAdminSearch } from "@/features/console-nav/api/admin-search.query";
import { type ConsoleNavGroup } from "@/features/console-nav/config/console-nav.config";
export function AdminCommandPalette({ groups }: { groups: ConsoleNavGroup[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = useAdminSearch(search, open);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const close = () => setOpen(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {m.global__search_shortcut()}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{m.global__admin_search()}</SheetTitle>
            <SheetDescription>{m.global__admin_search_description()}</SheetDescription>
          </SheetHeader>
          <Input
            aria-label="Global admin search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
          <nav aria-label="Admin commands" className="grid max-h-96 gap-2 overflow-auto">
            {groups
              .flatMap((group) => group.items)
              .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
              .map((item) => (
                <Link key={item.to} to={item.to} onClick={close}>
                  {item.label}
                </Link>
              ))}
            {query.isFetching && <p role="status">{m.global__searching()}</p>}
            {query.isError && <p role="alert">{m.global__search_failed()}</p>}
            {query.data?.users.map((entry) => (
              <Link key={entry.id} to="/admin/users/$id" params={{ id: entry.id }} onClick={close}>
                {entry.name} · {entry.email}
              </Link>
            ))}
            {query.data?.workspaces.map((entry) => (
              <Link
                key={entry.id}
                to="/admin/workspaces/$id"
                params={{ id: entry.id }}
                onClick={close}
              >
                {entry.name}
              </Link>
            ))}
            {query.isSuccess &&
              query.data.users.length === 0 &&
              query.data.workspaces.length === 0 && <p>{m.global__no_matches()}</p>}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
