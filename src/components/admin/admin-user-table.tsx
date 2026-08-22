"use client";

import { Loader2, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  adminDeleteUserAction,
  updateUserQuotaAction,
} from "~/app/actions/admin";
import type { AdminUserRow } from "~/app/app/admin/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatBytes, MAX_STORAGE_BYTES } from "~/lib/storage-quota";
import { cn } from "~/lib/utils";

function bytesToGb(bytes: number) {
  return bytes / 1024 / 1024 / 1024;
}

function QuotaEditor({ row }: { row: AdminUserRow }) {
  const [value, setValue] = useState(
    row.quotaBytes !== null ? String(bytesToGb(row.quotaBytes)) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = (quotaGb: number | null) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateUserQuotaAction({ userId: row.id, quotaGb });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  };

  const limitBytes = row.quotaBytes ?? MAX_STORAGE_BYTES;
  const usedPct = Math.min(100, (row.usedBytes / limitBytes) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={0.5}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`${Math.round(bytesToGb(MAX_STORAGE_BYTES))} (default)`}
          className="h-8 w-28"
          aria-label={`Storage quota in GB for ${row.email}`}
        />
        <span className="text-xs text-muted-foreground">GB</span>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            const parsed = Number.parseFloat(value);
            if (!value || Number.isNaN(parsed)) {
              setError("Enter a number.");
              return;
            }
            save(parsed);
          }}
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : "Save"}
        </Button>
        {row.quotaBytes !== null ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setValue("");
              save(null);
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary",
            usedPct >= 90 && "bg-destructive",
          )}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatBytes(row.usedBytes)} of {formatBytes(limitBytes)}
        {row.quotaBytes === null ? " (default)" : ""}
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function DeleteUserButton({ row }: { row: AdminUserRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await adminDeleteUserAction(row.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="xs" disabled={isPending}>
            {isPending ? <Loader2 className="size-3 animate-spin" /> : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {row.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their account, photos, and albums. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminUserTable({
  rows,
  currentUserId,
}: {
  rows: AdminUserRow[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.email.toLowerCase().includes(q));
  }, [rows, query]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-24 text-center">
        <p className="text-muted-foreground">No users yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No users match "{query}".</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Photos</th>
                <th className="px-4 py-3 font-medium">Albums</th>
                <th className="px-4 py-3 font-medium">Storage quota</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{row.photoCount}</td>
                  <td className="px-4 py-3">{row.albumCount}</td>
                  <td className="px-4 py-3">
                    <QuotaEditor row={row} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.id !== currentUserId ? (
                      <DeleteUserButton row={row} />
                    ) : (
                      <span className="text-xs text-muted-foreground">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
