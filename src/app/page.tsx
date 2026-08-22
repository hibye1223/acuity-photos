import { DeclutterMoment } from "~/components/declutter-moment";
import { ProductMoment } from "~/components/product-moment";
import { Reveal, RevealItem } from "~/components/reveal";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";

const steps = [
  {
    number: "01",
    title: "Tell it what you're after",
    description:
      'Say something like "build an album from the Tokyo trip." Acuity finds the right photos using time and location, no manual sorting through your camera roll.',
  },
  {
    number: "02",
    title: "Talk it through",
    description:
      "It asks when something's unclear. Cut the blurry one? Which shot's better? Who's this? You answer in a tap, and it keeps going.",
  },
  {
    number: "03",
    title: "Shape it together",
    description:
      "Swap a photo, rewrite a caption, or ask it to try again. It's a conversation, not a hand-off. The album isn't final until you're both happy with it.",
  },
] as const;

const personal = [
  {
    tag: "Collaboration",
    title: "It asks before it assumes",
    description:
      "When something's a toss-up, like two near-identical shots or an unclear face, Acuity lays out the options and waits on you. It's more coworker than tool.",
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
          Acuity isn't a report you approve. It's a back-and-forth. It asks
          about the tricky photos, you answer, and the album takes shape
          together, one exchange at a time.
        </p>

        <ProductMoment className="w-full max-w-lg" />

        <p className="max-w-md text-balance text-xs text-muted-foreground">
          Every exchange happens on your own photos. Nothing here is used to
          train a model, and nothing is shared.
        </p>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        <Reveal>
          <RevealItem className="mb-10 flex flex-col gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <p className="text-muted-foreground">
              You and Acuity, building the album together.
            </p>
          </RevealItem>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <RevealItem
                key={step.number}
                delay={120 + i * 90}
                className="flex flex-col gap-2"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {step.number}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </RevealItem>
            ))}
          </div>
        </Reveal>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        <Reveal>
          <RevealItem className="mb-10 flex flex-col gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Made with you, not for you
            </h2>
            <p className="text-muted-foreground">More coworker than tool.</p>
          </RevealItem>
          <div className="grid gap-10 sm:grid-cols-2">
            {personal.map((item, i) => (
              <RevealItem
                key={item.tag}
                delay={120 + i * 90}
                className="flex flex-col gap-2"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {item.tag}
                </span>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
                {item.tag === "Collaboration" && (
                  <Switch
                    className="mt-2 rounded-lg border border-border bg-card px-3 py-2.5"
                    label="Let it challenge your calls"
                    description="It'll speak up when it thinks there's a better option. Turn it off if you just want it to do what you say."
                    defaultChecked
                  />
                )}
              </RevealItem>
            ))}
          </div>
        </Reveal>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      <section className="mx-auto w-full max-w-3xl px-4 py-16">
        <Reveal>
          <RevealItem className="text-center">
            <h2 className="text-lg font-semibold tracking-tight">
              Need to declutter too? Acuity can help with that.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Duplicates, screenshots, and blurry shots get grouped and flagged
              with a clear reason, so clearing clutter never risks a memory.
            </p>
          </RevealItem>
          <RevealItem delay={150} className="mx-auto mt-8 w-full max-w-xs">
            <DeclutterMoment />
          </RevealItem>
          <RevealItem
            delay={250}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            {["Duplicates", "Screenshots & junk", "Blurry shots"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </RevealItem>
        </Reveal>
      </section>
    </main>
  );
}
