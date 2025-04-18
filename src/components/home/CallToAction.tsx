import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const CallToAction: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-afri-orange/90 to-afri-brown">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Join Mergdata Speak today
            <br />
            Start contributing to African language technology
          </h2>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg" className="bg-afri-orange hover:bg-afri-orange/90">
              <Link to="/register">Register Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
