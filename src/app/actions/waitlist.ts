"use server";

import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  feedback: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => (value ? value : undefined)),
});

export type WaitlistState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse({
    email: formData.get("email"),
    feedback: formData.get("feedback"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_signups").insert({
    email: parsed.data.email,
    feedback: parsed.data.feedback,
  });

  if (error && error.code !== "23505") {
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }

  return { status: "success", message: "You're on the list." };
}
