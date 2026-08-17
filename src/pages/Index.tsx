import { MeshGradient } from "@/components/landing/MeshGradient";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { FeatureBlock } from "@/components/landing/FeatureBlock";
import { VisualATS, VisualOutreach, VisualVoiceCoach } from "@/components/landing/FeatureVisuals";

import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { ResumeCompare } from "@/components/landing/ResumeCompare";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { HiredWall } from "@/components/landing/HiredWall";
import { ProofQuote } from "@/components/landing/ProofQuote";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <MeshGradient />
      <Navbar />
      <Hero />
      <section className="px-4 -mt-8 md:-mt-16 pb-12 md:pb-16 relative z-10">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          <div className="lg:col-span-3">
            <Stats embedded />
          </div>
          <div className="lg:col-span-2">
            <ProofQuote embedded />
          </div>
        </div>
      </section>

      <section id="features" className="pt-12">
        <SectionHeader
          eyebrow="Core Capabilities"
          title="Three engines, engineered for offers."
          description="Each module is built to compress weeks of guesswork into minutes of decisive feedback."
        />

        <FeatureBlock
          index={1}
          eyebrow="ATS Simulator & Resume Architect"
          title="Bypass the filter. Earn the read."
          description="We simulate a real enterprise Applicant Tracking System and rewrite your resume with data-driven, action-oriented impact statements."
          bullets={[
            "Definitive 0–100 Market Readiness Score against your target role.",
            "Side-by-side Impact Rewrites that turn duties into achievements.",
            "Exact missing keywords required to clear automated HR filters.",
          ]}
          visual={<VisualATS />}
        />

        <FeatureBlock
          index={2}
          eyebrow="Contextual Pitch & Outreach Engine"
          title="Cover letters are table stakes."
          description="A complete suite for professional networking — every message tuned to the human on the other side."
          bullets={[
            "Hyper-personalized cover letters that reference the company's actual roadmap.",
            "Punchy 50-word LinkedIn cold DMs tailored to the hiring manager.",
            "Polite, persistent follow-up emails for every stage of the loop.",
          ]}
          visual={<VisualOutreach />}
          reverse
        />

        <FeatureBlock
          index={3}
          eyebrow="Immersive Behavioral Voice Coach"
          title="Practice under pressure. Walk in fluent."
          description="A high-stakes, voice-first simulation that listens to your delivery — not just your words."
          bullets={[
            "STAR Method analyzer flags missing Situation, Task, Action, or Result.",
            "Delivery metrics on pacing, filler words, and conversational confidence.",
            "Curveball generation injects high-stress questions to test adaptability.",
          ]}
          visual={<VisualVoiceCoach />}
        />
      </section>

      <ResumeCompare />
      <HowItWorks />
      <ProductShowcase />
      <Testimonials />
      <HiredWall />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
};

export default Index;
