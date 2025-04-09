
import React from 'react';
import { 
  UserPlus, 
  Mic, 
  FileText, 
  CheckCircle, 
  BarChart
} from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      title: "Create an Account",
      description: "Sign up and choose your preferred role based on how you'd like to contribute.",
      icon: <UserPlus className="h-8 w-8 text-white" />,
      color: "bg-afri-orange"
    },
    {
      title: "Contribute Data",
      description: "Record speech, read texts, or describe images based on your selected role.",
      icon: <Mic className="h-8 w-8 text-white" />,
      color: "bg-afri-blue"
    },
    {
      title: "Transcribe & Validate",
      description: "Help transcribe audio or validate the quality of submitted data.",
      icon: <FileText className="h-8 w-8 text-white" />,
      color: "bg-afri-green"
    },
    {
      title: "Build & Improve",
      description: "Your contributions help build better speech technologies for African languages.",
      icon: <BarChart className="h-8 w-8 text-white" />,
      color: "bg-afri-brown"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform makes it easy to contribute to African language technology. Here's the simple process:
          </p>
        </div>
        
        <div className="relative">
          {/* Progress Line */}
          <div className="hidden md:block absolute left-1/2 top-12 h-[calc(100%-6rem)] w-1 bg-gray-200 -translate-x-1/2" />
          
          <div className="space-y-24">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className={`md:absolute left-1/2 -translate-x-1/2 z-10 ${index % 2 === 0 ? 'md:translate-y-1/2' : 'md:-translate-y-1/2'}`}>
                  <div className={`${step.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto`}>
                    {step.icon}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className={`${index % 2 === 0 ? 'md:text-right md:pr-16' : 'md:order-2 md:pl-16'}`}>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                  
                  <div className={`hidden md:block ${index % 2 === 0 ? 'md:order-2' : ''}`}>
                    {/* Placeholder for potential illustrations */}
                    <div className="h-32 bg-gray-100 rounded-lg animate-pulse-slow"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
