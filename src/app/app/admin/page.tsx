import { redirect } from "next/navigation";
import { AdminUserTable } from "~/components/admin/admin-user-table";
import { ADMIN_EMAIL } from "~/lib/admin";
import { MAX_STORAGE_BYTES } from "~/lib/storage-quota";
import { createClient } from "~/lib/supabase/server";

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  photoCount: number;
  albumCount: number;
  usedBytes: number;
  quotaBytes: number | null;
};

function countByUserId(rows: { user_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

function sumSizeByUserId(rows: { user_id: string; size_bytes: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.size_bytes);
  }
  return totals;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/admin");
  }

  if (user.email !== ADMIN_EMAIL) {
    redirect("/app/create");
  }

  const [{ data: profiles, error }, { data: photos }, { data: albums }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, created_at, storage_quota_bytes")
        .order("created_at", { ascending: false }),
      supabase.from("photos").select("user_id, size_bytes"),
      supabase.from("albums").select("user_id"),
    ]);

  const photoCounts = countByUserId(photos ?? []);
  const usedBytesByUser = sumSizeByUserId(photos ?? []);
  const albumCounts = countByUserId(albums ?? []);

  const rows: AdminUserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    createdAt: p.created_at,
    photoCount: photoCounts.get(p.id) ?? 0,
    albumCount: albumCounts.get(p.id) ?? 0,
    usedBytes: usedBytesByUser.get(p.id) ?? 0,
    quotaBytes: p.storage_quota_bytes,
  }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          {rows.length} user{rows.length === 1 ? "" : "s"} · default quota{" "}
          {Math.round(MAX_STORAGE_BYTES / 1024 / 1024 / 1024)} GB
        </p>
      </div>

      {error ? (
        <p className="text-destructive">Couldn't load users: {error.message}</p>
      ) : (
        <AdminUserTable rows={rows} currentUserId={user.id} />
      )}
    </main>
  );
}
