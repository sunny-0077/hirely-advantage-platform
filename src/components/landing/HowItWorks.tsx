const steps=[
 {n:"01",title:"Start with your experience",desc:"Create your account and build your Master Resume. Import and review a file, or enter your career information yourself."},
 {n:"02",title:"Choose an opportunity",desc:"Find a role in the city-routed feed, or paste a job description into your Custom Job Studio."},
 {n:"03",title:"Prepare. Apply. Keep track.",desc:"Tailor your resume, draft a cover letter and prepare for interviews. Apply on the employer’s website and update your tracker."},
];
export const HowItWorks=()=> <section id="how-it-works" className="py-16 md:py-24"><div className="landing-container"><p className="text-xs font-semibold text-primary mb-4">How it works</p><h2 className="text-3xl md:text-[40px] font-semibold mb-12">Less scattered. More prepared.</h2><div className="grid md:grid-cols-3 gap-8 md:gap-12">{steps.map(s=><div key={s.n} className="border-t border-border pt-5"><span className="text-sm font-semibold text-primary">{s.n}</span><h3 className="text-lg font-semibold mt-5 mb-3">{s.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p></div>)}</div></div></section>;
