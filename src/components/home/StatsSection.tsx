
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const StatsSection: React.FC = () => {
  const stats = [
    { value: "25+", label: "Languages" },
    { value: "1,000+", label: "Contributors" },
    { value: "10,000+", label: "Audio Hours" },
    { value: "500,000+", label: "Transcriptions" }
  ];
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Impact</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Together we're building the world's largest collection of African language speech data.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="border-none shadow-sm text-center">
              <CardContent className="pt-6">
                <p className="text-4xl font-bold text-afri-orange mb-1">{stat.value}</p>
                <p className="text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
