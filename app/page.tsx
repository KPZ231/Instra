import AboutProject from "@/components/ui/AboutProject";
import Hero from "@/components/ui/Hero";
import Marquee, { Testimonial } from "@/components/ui/Marquee";
import CTA from "@/components/ui/CTA";
import FAQ from "@/components/ui/FAQ";
import PricingPlans from "@/components/ui/PricingPlans";


const testimonials: Testimonial[] = [
  {
    company: "AdRoll",
    quoteKey: "marquee.adroll.quote",
    author: "Kevin Garcia",
    titleKey: "marquee.adroll.title",
    linkTextKey: "marquee.adroll.linkText",
    linkUrl: "#"
  },
  {
    company: "Fireclay Tile",
    quoteKey: "marquee.fireclay.quote",
    author: "Jamie Chappell",
    titleKey: "marquee.fireclay.title",
    linkTextKey: "marquee.fireclay.linkText",
    linkUrl: "#"
  },
  {
    company: "Lorem Corp",
    quoteKey: "marquee.lorem.quote",
    author: "John Doe",
    titleKey: "marquee.lorem.title",
    linkTextKey: "marquee.lorem.linkText",
    linkUrl: "#"
  }
];

export default function Home() {
  return (
    <>
      <Hero></Hero>
      <AboutProject></AboutProject>
      <Marquee items={testimonials} speed={50}></Marquee>
      <PricingPlans />
      <FAQ />
      <CTA />
    </>
  );
}
