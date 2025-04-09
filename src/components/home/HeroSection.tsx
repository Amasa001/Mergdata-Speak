
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Mic, Headphones, FileText, CheckCircle } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <div className="pattern-bg py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Empowering African Languages
              <span className="text-afri-orange block mt-2">Through Voice & Text</span>
            </motion.h1>
            <motion.p 
              className="text-lg text-gray-600 max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Join our community-driven platform to help build speech technologies 
              that preserve and promote the rich diversity of African languages.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link to="/register">
                <Button size="lg" className="bg-afri-orange hover:bg-afri-orange/90">
                  Get Started
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </motion.div>
            
            <motion.div 
              className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-afri-yellow/50 p-3 rounded-full">
                  <Mic className="h-6 w-6 text-afri-orange" />
                </div>
                <p className="mt-2 text-sm font-medium">Record Speech</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-afri-beige/50 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-afri-orange" />
                </div>
                <p className="mt-2 text-sm font-medium">Transcribe Audio</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-afri-yellow/50 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-afri-orange" />
                </div>
                <p className="mt-2 text-sm font-medium">Validate Data</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-afri-beige/50 p-3 rounded-full">
                  <Headphones className="h-6 w-6 text-afri-orange" />
                </div>
                <p className="mt-2 text-sm font-medium">Listen & Review</p>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-gradient-to-br from-afri-orange/10 to-afri-blue/10 rounded-2xl p-4 md:p-6">
              <img 
                src="/placeholder.svg" 
                alt="African language diversity illustration" 
                className="rounded-xl shadow-lg w-full"
              />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-4 md:p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-afri-green/20 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-afri-green" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Currently Supporting</p>
                    <p className="font-bold">25+ African Languages</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
