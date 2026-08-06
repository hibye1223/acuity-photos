import { redirect } from "next/navigation";
import { LoginForm } from "~/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? "/app");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-24">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to Acuity</CardTitle>
          <CardDescription>
            Sign in with your email and password, or use a magic link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
