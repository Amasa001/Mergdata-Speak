import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Mic, FileText, CheckCircle, BarChart, User } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: <User className="h-10 w-10 text-white" />,
      title: "Sign Up",
      description: "Create an account and select your preferred role based on how you'd like to contribute.",
      color: "bg-afri-orange"
    },
    {
      icon: <Mic className="h-10 w-10 text-white" />,
      title: "Contribute Data",
      description: "Record audio descriptions, read texts aloud, or describe images based on your selected role.",
      color: "bg-afri-blue"
    },
    {
      icon: <FileText className="h-10 w-10 text-white" />,
      title: "Process & Validate",
      description: "Help transcribe audio or validate the quality and accuracy of submitted data.",
      color: "bg-afri-green"
    },
    {
      icon: <BarChart className="h-10 w-10 text-white" />,
      title: "Track Progress",
      description: "Watch as your contributions help build speech technologies for African languages.",
      color: "bg-afri-brown"
    }
  ];

  const contributionTypes = [
    {
      title: "ASR Contributor",
      description: "Describe images verbally to help train speech recognition models that can understand spoken African languages.",
      tasks: [
        "Look at images and describe them in your language",
        "Record short 10-15 second audio clips",
        "Complete sets of image descriptions on various topics"
      ]
    },
    {
      title: "TTS Contributor",
      description: "Read text passages aloud to help build natural-sounding text-to-speech systems in African languages.",
      tasks: [
        "Read provided text passages clearly in your language",
        "Record sentences covering different phonetics",
        "Contribute voice samples with varying tones and emotions"
      ]
    },
    {
      title: "Transcriber",
      description: "Listen to audio recordings and transcribe them accurately to create paired speech-text data.",
      tasks: [
        "Listen to short audio clips in languages you know",
        "Type what you hear with accurate spelling and punctuation",
        "Review and correct machine-generated transcriptions"
      ]
    },
    {
      title: "Validator",
      description: "Review recordings and transcriptions to ensure high quality data that meets our standards.",
      tasks: [
        "Check audio recordings for clarity and accuracy",
        "Verify transcriptions match audio content",
        "Flag issues and suggest improvements"
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-3 text-center">How AfriSpeakNexus Works</h1>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Our platform makes it easy to contribute to African language technology. 
          Here's a simple guide to how you can help build better speech technologies.
        </p>

        {/* Process Steps */}
        <div className="relative mb-24">
          <div className="hidden md:block absolute left-1/2 top-16 h-[calc(100%-8rem)] w-1 bg-gray-200 -translate-x-1/2" />
          
          <div className="space-y-20">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="md:absolute left-1/2 -translate-x-1/2 z-10 mb-4 md:mb-0">
                  <div className={`${step.color} w-20 h-20 rounded-full flex items-center justify-center mx-auto`}>
                    {step.icon}
                  </div>
                </div>
                
                <div className={`md:grid md:grid-cols-2 md:gap-16 ${index % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
                  <div className={`${index % 2 === 0 ? 'md:text-right md:pr-24' : 'md:pl-24'} md:flex md:flex-col md:justify-center`}>
                    <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                  
                  <div className={`${index % 2 === 0 ? 'md:order-first' : ''} hidden md:block`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contribution Types */}
        <h2 className="text-3xl font-bold mb-8 text-center">Contribution Roles</h2>
        <div className="grid gap-8 mb-16">
          {contributionTypes.map((type, index) => (
            <Card key={index} className="shadow-sm">
              <CardHeader>
                <CardTitle>{type.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{type.description}</p>
                <h4 className="font-semibold mb-2">What you'll do:</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  {type.tasks.map((task, taskIndex) => (
                    <li key={taskIndex}>{task}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Getting Started CTA */}
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Join thousands of contributors helping to preserve and promote African languages through technology.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register">
              <Button size="lg">Create Account</Button>
            </Link>
            <Link to="/languages">
              <Button variant="outline" size="lg">Explore Languages</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
