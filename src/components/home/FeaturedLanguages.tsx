
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Globe } from 'lucide-react';

export const FeaturedLanguages: React.FC = () => {
  const regions = [
    {
      name: "West Africa",
      languages: ["Yoruba", "Igbo", "Hausa", "Twi", "Wolof", "Fulani"],
      color: "bg-afri-yellow/20",
      badge: "bg-afri-orange/20 text-afri-orange"
    },
    {
      name: "East Africa",
      languages: ["Swahili", "Amharic", "Somali", "Oromo", "Luganda", "Kinyarwanda"],
      color: "bg-afri-beige/20",
      badge: "bg-afri-blue/20 text-afri-blue"
    },
    {
      name: "Southern Africa",
      languages: ["Zulu", "Xhosa", "Shona", "Ndebele", "Sesotho", "Setswana"],
      color: "bg-afri-green/10",
      badge: "bg-afri-green/20 text-afri-green"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Languages</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're focused on collecting data for these African languages, with more being added regularly.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {regions.map((region, index) => (
            <Card key={index} className={`${region.color} border-none shadow-sm`}>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <Globe className="mr-2 h-5 w-5 text-gray-700" />
                  <h3 className="text-lg font-semibold">{region.name}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {region.languages.map((language, idx) => (
                    <Badge key={idx} className={`${region.badge} hover:${region.badge}`}>
                      {language}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Don't see your language? <a href="#" className="text-afri-orange hover:underline">Request to add a language</a>
          </p>
        </div>
      </div>
    </section>
  );
};
