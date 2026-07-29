import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

const categories = [
  {
    tag: "Duplicates",
    title: "Duplicates & near-duplicates",
    description:
      "Bursts and near-identical shots get grouped together, with the best one pre-selected — so you're reviewing one decision, not twelve photos.",
  },
  {
    tag: "Junk",
    title: "Screenshots & junk",
    description:
      "Screenshots, memes, and downloads are set apart from your real photos, so clearing clutter never risks a memory.",
  },
  {
    tag: "Quality",
    title: "Blurry & low-quality shots",
    description:
      "Out-of-focus and low-quality shots are flagged on their own, separate from anything that might still matter to you.",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Scan",
    description:
      "Your library is reviewed for duplicates, junk, and blurry shots.",
  },
  {
    number: "02",
    title: "Review",
    description:
      "Go through each suggestion with a clear reason attached — nothing removed silently.",
  },
  {
    number: "03",
    title: "Relief",
    description:
      "Leave with a library that feels trustworthy again, not just smaller.",
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          AI-first photo cleanup
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Acuity Photos
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          Helps people with overwhelming photo libraries use smart technology to
          effortlessly organize, clean, and rediscover their pictures.
        </p>
        <a
          href="#how-it-works"
          className="text-sm font-medium underline underline-offset-4 text-foreground hover:text-muted-foreground"
        >
          See how it works
        </a>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            What gets cleaned up first
          </h2>
          <p className="text-muted-foreground">
            Three focused categories, reviewed one at a time.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.tag}>
              <CardHeader>
                <span className="text-xs font-medium text-muted-foreground">
                  {category.tag}
                </span>
                <CardTitle className="text-base">{category.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{category.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-3xl px-4 py-20"
      >
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground">
            Every suggestion comes with a reason — nothing is a black box.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {step.number}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
