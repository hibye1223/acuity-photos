import { ProductMoment } from "~/components/product-moment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

const steps = [
  {
    number: "01",
    title: "Tell it what you want",
    description:
      'Say something like "build an album from the Tokyo trip." Acuity finds the right photos using time and location, no manual sorting through your camera roll.',
  },
  {
    number: "02",
    title: "Review what it proposes",
    description:
      "It suggests an order and captions, and asks before it labels anyone it doesn't recognize. Nothing about your photos is decided without you.",
  },
  {
    number: "03",
    title: "Keep, edit, or redo",
    description:
      "Swap a photo, rewrite a caption, or ask it to try again. The album isn't final until you say it is.",
  },
] as const;

const personal = [
  {
    tag: "Collaboration",
    title: "The AI suggests. You decide.",
    description:
      "Every album, every caption, every face label is a suggestion until you approve it. Acuity never finishes something behind your back.",
  },
  {
    tag: "Personal",
    title: "Captions that sound like you",
    description:
      "Not generic AI phrasing. Acuity writes like someone who was actually there, and you can always rewrite anything yourself.",
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-16 text-center sm:py-24">
        <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Finally, an album you'd actually share.
        </h1>

        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          Acuity turns years of forgotten photos into a finished album. It
          suggests the order, the captions, and who's in each photo. You keep
          the final say on everything.
        </p>

        <ProductMoment className="w-full max-w-lg" />
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground">
            You and Acuity, building the album together.
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

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Made with you, not for you
          </h2>
          <p className="text-muted-foreground">Automatic, but never robotic.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {personal.map((item) => (
            <Card key={item.tag}>
              <CardHeader>
                <span className="text-xs font-medium text-muted-foreground">
                  {item.tag}
                </span>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-lg text-center text-sm text-muted-foreground">
          Your photos are only used to build your albums and catch duplicates,
          never for training and never shared.
        </p>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          Need to declutter too? Acuity can help with that.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Duplicates, screenshots, and blurry shots get grouped and flagged with
          a clear reason, so clearing clutter never risks a memory.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {["Duplicates", "Screenshots & junk", "Blurry shots"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
