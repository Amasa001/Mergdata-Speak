import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const FAQ: React.FC = () => {
  const generalFaqs = [
    {
      question: "What is AfriSpeakNexus?",
      answer: "AfriSpeakNexus is a platform dedicated to building speech technology datasets for African languages. We collaborate with native speakers to collect, transcribe, and validate speech data that can be used to develop speech recognition and text-to-speech systems."
    },
    {
      question: "Why focus on African languages?",
      answer: "African languages are vastly underrepresented in speech technology. With over 2,000 languages spoken across the continent, most lack the datasets needed for developing effective speech recognition or synthesis systems. Our goal is to bridge this gap and ensure African languages are part of the AI revolution."
    },
    {
      question: "How is the data used?",
      answer: "The collected data is used to train machine learning models for speech recognition and text-to-speech systems. This enables the development of applications like voice assistants, dictation software, and accessibility tools that work in African languages."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we take data security very seriously. All contributor information is encrypted and stored securely. You retain ownership of your voice recordings, and we only use them for the purposes you consent to when signing up."
    }
  ];

  const contributionFaqs = [
    {
      question: "How do I start contributing?",
      answer: "Sign up for an account, select your preferred contribution role (ASR Contributor, TTS Contributor, Transcriber, or Validator), and choose the languages you speak. Once registered, you can immediately start contributing through your personalized dashboard."
    },
    {
      question: "Do I need special equipment to record?",
      answer: "No special equipment is required! A smartphone or computer with a built-in microphone is sufficient. However, we recommend recording in a quiet environment with minimal background noise for the best quality."
    },
    {
      question: "How much time do I need to contribute?",
      answer: "You can contribute as much or as little time as you want. Even 15 minutes of recording or transcription helps. Our platform saves your progress, so you can pick up where you left off at any time."
    },
    {
      question: "Can I contribute in multiple roles?",
      answer: "Yes! While you select a primary role during registration, you can request additional roles through your profile settings. Many contributors both record audio and help with transcription or validation."
    }
  ];

  const technicalFaqs = [
    {
      question: "What languages are currently supported?",
      answer: "We currently support over 25 African languages including Swahili, Yoruba, Zulu, Amharic, Hausa, Igbo, and many more. We're constantly adding new languages based on contributor availability and project needs."
    },
    {
      question: "How do you ensure data quality?",
      answer: "All contributions go through our validation system. Audio recordings are checked for clarity and background noise, and transcriptions are verified by multiple validators. This multi-step quality control ensures our datasets meet high standards."
    },
    {
      question: "Can I contribute to languages not listed?",
      answer: "Yes! If your language isn't listed, please contact us. We're always looking to expand our language coverage, especially for languages with limited digital resources."
    },
    {
      question: "How large are the datasets you're building?",
      answer: "Our target is to collect at least 5,000 validated utterances per language, though many popular languages have much larger datasets. Each utterance typically ranges from 5-15 seconds of audio with corresponding text."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-3 text-center">Frequently Asked Questions</h1>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Find answers to common questions about AfriSpeakNexus and how to contribute.
        </p>

        <div className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold mb-4">General Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {generalFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`general-item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-700">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Contributing</h2>
            <Accordion type="single" collapsible className="w-full">
              {contributionFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`contribution-item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-700">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Technical Details</h2>
            <Accordion type="single" collapsible className="w-full">
              {technicalFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`technical-item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-700">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-4">Didn't find the answer you're looking for?</h3>
          <p className="text-gray-600 mb-6">
            Contact us directly and we'll get back to you as soon as possible.
          </p>
          <Link to="/contact">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
