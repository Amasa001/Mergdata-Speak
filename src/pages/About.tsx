
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

const About: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">About AfriSpeakNexus</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed">
                AfriSpeakNexus is dedicated to preserving and promoting African languages through technology. Our platform brings together diverse contributors to build comprehensive voice datasets for African languages, enabling the creation of AI speech technology that works for all Africans.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Why African Languages?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Africa is home to over 2,000 languages, representing incredible linguistic diversity. Yet many of these languages remain underrepresented in speech technology, creating barriers to digital access for millions of people.
              </p>
              <p className="text-gray-700 leading-relaxed">
                By building robust datasets for speech recognition and text-to-speech systems in African languages, we're helping to bridge this digital divide and ensure that technological advancements benefit all language communities.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Approach</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Community-Driven</h3>
                  <p className="text-gray-700">
                    We believe that the best speech data comes from native speakers. Our platform enables speakers of African languages to contribute their voices and expertise.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Quality-Focused</h3>
                  <p className="text-gray-700">
                    Our validation system ensures that all contributed data meets high standards of clarity, accuracy, and naturalness.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Open and Ethical</h3>
                  <p className="text-gray-700">
                    We're committed to transparency in how data is collected and used, with contributors always maintaining control over their voice data.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Research-Backed</h3>
                  <p className="text-gray-700">
                    Our methodologies are informed by leading research in linguistics and machine learning to optimize data collection.
                  </p>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Team</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                AfriSpeakNexus brings together a multidisciplinary team of linguists, software engineers, AI researchers, and community advocates from across Africa and beyond.
              </p>
              <div className="text-center">
                <p className="text-gray-700 italic">
                  "Our vision is a world where technology speaks every language, preserving linguistic heritage while creating digital inclusion for all."
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default About;
