import { SupportContact } from "~/components/support-contact";

const TIPS = [
  'Describe a subject, place, or time period in the Album Assistant — "our dog photos" or "last weekend" both work without extra detail.',
  'Turn on "Challenge me" in Settings to get a mix of less-obvious picks instead of the safest matches every time.',
  'Don\'t want AI involved? Click "Build one yourself instead" on the Create page to pick photos manually.',
  "Turning on sharing for an album gives out a public link — turn it back off any time to revoke access immediately.",
  "Set a default caption style and turn on Challenge me once in Settings, and every new album starts with your preferences already applied.",
] as const;

const FAQS = [
  {
    question: "How do I sign in?",
    answer:
      "Enter your email on the sign-in page and we'll send you a magic link, no password needed. You can also sign in with a password or continue with Google.",
  },
  {
    question: "Is my magic link taking a while to arrive?",
    answer:
      "Check your spam folder first. Links expire after a while, so if it's been a bit, just request a new one from the sign-in page.",
  },
  {
    question: "What happens to my photos?",
    answer:
      "Your photos are only used to build your albums and catch duplicates. They're never used for training and never shared unless you turn on sharing for a specific album.",
  },
  {
    question: "How does the Album Assistant pick photos?",
    answer:
      "It searches your library by content tags, date, location, and named people based on what you type, then proposes a draft. Nothing is saved until you review it and hit Save album — you can reorder, swap, remove, or add photos first.",
  },
  {
    question: "Can I make an album without the AI?",
    answer:
      'Yes — on the Create page, click "Build one yourself instead" to pick photos from your library and order them manually.',
  },
  {
    question: "How do I share an album?",
    answer:
      "Open the album and click Share, then turn on the public link. Anyone with the link can view it without an account — turning sharing back off revokes access immediately.",
  },
  {
    question: "Is there a storage limit?",
    answer:
      "Yes, each account gets 1 GB of storage. You can see how much you've used on the Create and Gallery pages.",
  },
  {
    question: "How do I delete photos or my account?",
    answer:
      "Delete individual photos from the Gallery page. To delete your entire account, photos, and albums permanently, go to Settings and use Delete account — this can't be undone.",
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

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <h2 className="text-sm font-medium">Quick tips</h2>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
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
