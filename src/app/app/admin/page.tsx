import { redirect } from "next/navigation";
import { createClient } from "~/lib/supabase/server";

type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  photoCount: number;
  albumCount: number;
};

function countByUserId(rows: { user_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/app");
  }

  const [{ data: profiles, error }, { data: photos }, { data: albums }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("photos").select("user_id"),
      supabase.from("albums").select("user_id"),
    ]);

  const photoCounts = countByUserId(photos ?? []);
  const albumCounts = countByUserId(albums ?? []);

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    createdAt: p.created_at,
    photoCount: photoCounts.get(p.id) ?? 0,
    albumCount: albumCounts.get(p.id) ?? 0,
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          {rows.length} user{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {error ? (
        <p className="text-destructive">Couldn't load users: {error.message}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">No users yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Photos</th>
                <th className="px-4 py-3 font-medium">Albums</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{row.photoCount}</td>
                  <td className="px-4 py-3">{row.albumCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
