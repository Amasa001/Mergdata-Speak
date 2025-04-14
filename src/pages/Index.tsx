import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { ContributionTypes } from '@/components/home/ContributionTypes';
import { FeaturedLanguages } from '@/components/home/FeaturedLanguages';
import { HowItWorks } from '@/components/home/HowItWorks';
import { StatsSection } from '@/components/home/StatsSection';
import { CallToAction } from '@/components/home/CallToAction';

const Index: React.FC = () => {
  return (
    <>
      <HeroSection />
      <ContributionTypes />
      <FeaturedLanguages />
      <HowItWorks />
      <StatsSection />
      <CallToAction />
    </>
  );
};

export default Index;
