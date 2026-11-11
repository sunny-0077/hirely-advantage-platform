const steps = [
  { n: "01", title: "Start with your story", desc: "Create your profile and build your Master Resume. Import a PDF or Word resume, or enter your career facts." },
  { n: "02", title: "Choose an opportunity", desc: "Explore jobs by city, or bring a job description to Custom Job Studio." },
  { n: "03", title: "Prepare, then take the next step", desc: "Generate and review your application documents. Apply on the employer’s site and track your progress in Hirely." },
];
export const HowItWorks = () => <section id="how-it-works" className="border-y border-border bg-card py-16 md:py-24"><div className="landing-container"><div className="grid gap-10 lg:grid-cols-[1fr_2fr]"><div><p className="section-kicker">HOW IT WORKS</p><h2 className="mt-4 text-3xl font-semibold leading-tight">A considered process.<br />A confident next step.</h2></div><div className="grid gap-8 sm:grid-cols-3">{steps.map(s => <div key={s.n}><span className="text-xs font-semibold text-primary">{s.n} /</span><h3 className="mt-5 text-base font-semibold leading-6">{s.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{s.desc}</p></div>)}</div></div></div></section>;
