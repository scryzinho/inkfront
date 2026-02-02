import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ParallaxHero } from "@/components/landing/ParallaxHero";
import { BrandMarquee } from "@/components/landing/BrandMarquee";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { ImmersiveFeatures } from "@/components/landing/ImmersiveFeatures";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { ScrollingStats } from "@/components/landing/ScrollingStats";
import { PaymentMethods } from "@/components/landing/PaymentMethods";
import { CompactPricing } from "@/components/landing/CompactPricing";
import { TestimonialsGrid } from "@/components/landing/TestimonialsGrid";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main>
        <ParallaxHero />
        <BrandMarquee />
        <DashboardPreview />
        <ImmersiveFeatures />
        <FeatureShowcase />
        <ScrollingStats />
        <PaymentMethods />
        <CompactPricing />
        <TestimonialsGrid />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
