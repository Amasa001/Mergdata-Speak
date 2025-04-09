
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mic, Headphones, Globe, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Header: React.FC = () => {
  const isMobile = useIsMobile();

  const NavLinks = () => (
    <>
      <Link to="/about" className="text-foreground/80 hover:text-foreground transition-colors">
        About
      </Link>
      <Link to="/languages" className="text-foreground/80 hover:text-foreground transition-colors">
        Languages
      </Link>
      <Link to="/how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">
        How It Works
      </Link>
      <Link to="/faq" className="text-foreground/80 hover:text-foreground transition-colors">
        FAQ
      </Link>
    </>
  );

  return (
    <header className="border-b bg-white sticky top-0 z-30">
      <div className="container mx-auto py-4 px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Globe className="h-8 w-8 text-afri-orange" />
          <span className="font-bold text-xl bg-gradient-to-r from-afri-orange to-afri-brown bg-clip-text text-transparent">
            AfriSpeakNexus
          </span>
        </Link>

        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col space-y-6 mt-8 text-lg">
                <NavLinks />
                <div className="flex flex-col space-y-3 pt-4">
                  <Link to="/login">
                    <Button variant="outline" className="w-full">
                      Log In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <nav className="hidden md:flex space-x-8">
              <NavLinks />
            </nav>
            <div className="hidden md:flex space-x-3">
              <Link to="/login">
                <Button variant="outline">Log In</Button>
              </Link>
              <Link to="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
