import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Github, Twitter } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Globe className="h-6 w-6 text-afri-orange" />
              <span className="font-bold text-lg">AfriSpeakNexus</span>
            </Link>
            <p className="text-gray-600 text-sm">
              Building speech technology for African languages through collaborative data collection.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-500 hover:text-afri-orange transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-gray-500 hover:text-afri-orange transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div className="w-full md:w-1/4 mb-8 md:mb-0">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/faq" className="text-gray-600 hover:text-afri-orange">FAQ</Link></li>
              <li><Link to="/terms" className="text-gray-600 hover:text-afri-orange">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-gray-600 hover:text-afri-orange">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Contribute</h3>
            <ul className="space-y-2">
              <li><Link to="/asr" className="text-gray-600 hover:text-afri-orange">ASR Data</Link></li>
              <li><Link to="/tts" className="text-gray-600 hover:text-afri-orange">TTS Data</Link></li>
              <li><Link to="/transcribe" className="text-gray-600 hover:text-afri-orange">Transcription</Link></li>
              <li><Link to="/validate" className="text-gray-600 hover:text-afri-orange">Validation</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-gray-600 hover:text-afri-orange">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-gray-600 hover:text-afri-orange">Privacy Policy</Link></li>
              <li><Link to="/data-policy" className="text-gray-600 hover:text-afri-orange">Data Usage Policy</Link></li>
              <li><Link to="/licenses" className="text-gray-600 hover:text-afri-orange">Licenses</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-12 pt-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} AfriSpeakNexus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
