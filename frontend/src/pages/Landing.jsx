import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <img src="https://assets.nflxext.com/ffe/siteui/vlv3/dc1cf82d-97c9-409f-b7c8-6ac1718946d6/14a8fe85-b6f4-4c06-8eaf-eccf3276d557/IN-en-20230911-popsignuptwoweeks-perspective_alpha_website_medium.jpg" alt="bg" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
      </div>
      <header className="relative z-10 flex items-center justify-between px-6 md:px-16 py-6">
        <div className="brand-font text-4xl md:text-5xl netflix-red font-bold">NETFLIX</div>
        <Link to="/login" className="bg-netflix-red text-white px-4 py-1.5 rounded font-semibold">Sign In</Link>
      </header>
      <div className="relative z-10 max-w-3xl mx-auto text-center px-6 pt-16 md:pt-32">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Unlimited movies, TV shows and more</h1>
        <p className="text-xl md:text-2xl mb-4">Watch anywhere. Cancel anytime.</p>
        <p className="text-lg md:text-xl mb-6">Ready to watch? Enter your email to create or restart your membership.</p>
        <div className="flex flex-col md:flex-row gap-3 justify-center">
          <Link to="/signup" className="bg-netflix-red text-white px-6 md:px-8 py-3 md:py-4 rounded font-semibold text-lg flex items-center justify-center gap-2">Get Started <ChevronRight className="w-5 h-5" /></Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
