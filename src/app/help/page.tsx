import { SupportContact } from "~/components/support-contact";

const FAQS = [
  {
    question: "How do I sign in?",
    answer:
      "Enter your email on the sign-in page and we'll send you a magic link, no password needed. You can also continue with Google.",
  },
  {
    question: "Is my magic link taking a while to arrive?",
    answer:
      "Check your spam folder first. Links expire after a while, so if it's been a bit, just request a new one from the sign-in page.",
  },
  {
    question: "What happens to my photos?",
    answer:
      "Your photos are only used to build your albums and catch duplicates. They're never used for training and never shared.",
  },
] as const;

export default function HelpPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Help & FAQ</h1>
        <p className="text-muted-foreground">
          Can't find what you're looking for? Email us at{" "}
          <SupportContact label="acuityphotoshelp@gmail.com" /> and we'll get
          back to you.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {FAQS.map((faq) => (
          <div key={faq.question} className="flex flex-col gap-1">
            <h2 className="font-medium">{faq.question}</h2>
            <p className="text-sm text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
