
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const CallToAction: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-afri-orange/90 to-afri-brown">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join the Movement to Preserve African Languages
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Every voice matters. Help us build technology that recognizes and 
            speaks the diverse languages of Africa.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/register">
              <Button size="lg" className="bg-white text-afri-orange hover:bg-white/90">
                Sign Up Now
              </Button>
            </Link>
            <Link to="/languages">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Explore Languages
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
