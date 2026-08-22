import { redirect } from "next/navigation";
import { ResetPasswordForm } from "~/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reaching this page requires a session established by the recovery
  // link's code exchange (see /auth/callback) — no session means the link
  // was invalid, expired, or this page was visited directly.
  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-24">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
