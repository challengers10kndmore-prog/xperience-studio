import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Mail, MessageCircle, Plus } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import { gsap, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { Magnetic } from "@/motion/Magnetic";
import { SectionMedia } from "@/components/media/SectionMedia";
import { sendContact } from "@/lib/contact";
import { SectionHeader } from "./SectionHeader";

export function Faq() {
  const data = useSiteData();
  return (
    <section id="faq" aria-labelledby="faq-title" className="section py-32 md:py-40">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeader eyebrow="FAQ" title={data.settings.copy.faq.headline} />
        <ul className="content divide-y divide-line border-y border-line">
          {data.faqs.map((f) => <FaqItem key={f.id} q={f.question} a={f.answer} />)}
        </ul>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const icon = useRef<SVGSVGElement>(null);
  useGSAP(() => {
    const d = reducedMotion() ? 0 : 0.6;
    gsap.to(body.current, { height: open ? "auto" : 0, opacity: open ? 1 : 0, duration: d, ease: "expo" });
    gsap.to(icon.current, { rotate: open ? 45 : 0, duration: d, ease: "expo" });
  }, { dependencies: [open] });
  const id = `faq-${q.replace(/\W+/g, "-").toLowerCase().slice(0, 40)}`;
  const todo = /\bTODO\b/.test(a);
  return (
    <li>
      <h3 className="font-body text-base tracking-normal">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg md:text-xl">
          {q}<Plus ref={icon} className="size-5 shrink-0 text-magenta" aria-hidden />
        </button>
      </h3>
      <div id={id} ref={body} className="h-0 overflow-hidden opacity-0" role="region">
        <p className="max-w-2xl pb-6 text-chrome/75">
          {todo ? a.split(/\bTODO\b/).map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 && <mark className="rounded bg-amber-400/15 px-1 text-amber-200" title="To be confirmed">TBC</mark>}</span>) : a}
        </p>
      </div>
    </li>
  );
}

export function FinaleCta() {
  const { settings } = useSiteData();
  const root = useRef<HTMLElement>(null);
  const [showForm, setShowForm] = useState(false);
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.from("[data-cta-line]", { yPercent: 100, opacity: 0, stagger: 0.1, duration: 1.4, ease: "expo", scrollTrigger: { trigger: root.current, start: "top 70%" } });
  }, { scope: root });
  const wa = settings.whatsapp?.replace(/\D/g, "");
  const email = settings.contact_email;
  return (
    <section ref={root} id="contact" aria-labelledby="contact-title" className="section relative flex min-h-dvh flex-col justify-center py-32">
      <SectionMedia sectionKey="finale" align="center" />
      <div className="content mx-auto w-full max-w-6xl text-center">
        <h2 id="contact-title" className="font-display text-[clamp(2.8rem,8vw,8rem)] font-semibold leading-[0.92]">
          {settings.copy.finale.headline.split(/(?<=[?.!])\s+/).map((l, i) => <span key={i} className="block overflow-hidden"><span data-cta-line className="block">{l}</span></span>)}
        </h2>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <button type="button" onClick={() => setShowForm(true)} className="btn btn-primary !px-10 !py-6 !text-[0.8rem]" aria-expanded={showForm} aria-controls="contact-form" data-cursor="open">
              {settings.copy.finale.cta} <ArrowUpRight className="size-5" />
            </button>
          </Magnetic>
          {wa && <a className="btn btn-ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a>}
          {email && <a className="btn btn-ghost" href={`mailto:${email}`}><Mail className="size-4" /> Email</a>}
        </div>
        {showForm && <ContactForm />}
      </div>
    </section>
  );
}

function ContactForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  useGSAP(() => { gsap.from(ref.current, { opacity: 0, y: 30, duration: 0.9, ease: "expo" }); ref.current?.querySelector("input")?.focus(); });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("company")) return; // honeypot
    setState("sending");
    try {
      await sendContact({ name: String(fd.get("name")), email: String(fd.get("email")), message: String(fd.get("message")), budget: String(fd.get("budget") || "") || null });
      setState("sent");
    } catch (x) { setErr(x instanceof Error ? x.message : "Couldn't send"); setState("error"); }
  }
  if (state === "sent") return <p role="status" className="mx-auto mt-12 max-w-xl rounded-2xl border border-violet/50 bg-violet/10 p-8 text-lg">Got it. I'll reply within a day with questions and a plan.</p>;
  const field = "w-full rounded-xl border border-line bg-carbon/80 px-4 py-3.5 text-chrome placeholder:text-ash/70 backdrop-blur focus:border-violet focus:outline-none";
  return (
    <form id="contact-form" ref={ref} onSubmit={submit} className="mx-auto mt-12 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
      <label className="sr-only" htmlFor="c-name">Name</label>
      <input id="c-name" name="name" required maxLength={120} placeholder="Your name" autoComplete="name" className={field} />
      <label className="sr-only" htmlFor="c-email">Email</label>
      <input id="c-email" name="email" type="email" required maxLength={200} placeholder="Email" autoComplete="email" className={field} />
      <label className="sr-only" htmlFor="c-budget">Budget (optional)</label>
      <input id="c-budget" name="budget" maxLength={120} placeholder="Budget (optional)" className={`${field} sm:col-span-2`} />
      <label className="sr-only" htmlFor="c-msg">Your idea, deadline and any links</label>
      <textarea id="c-msg" name="message" required maxLength={5000} rows={5} placeholder="Your idea, deadline and any links" className={`${field} sm:col-span-2`} />
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p role="alert" className="text-sm text-rose-300 sm:col-span-2">{err}</p>}
      <button type="submit" disabled={state === "sending"} className="btn btn-primary justify-center sm:col-span-2">{state === "sending" ? "Sending…" : "Send"}</button>
    </form>
  );
}
