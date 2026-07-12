"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if we've shown the splash screen in this session to avoid annoyance
    // For this demonstration, we'll show it every time as requested.
    // If you want it only once per session, use sessionStorage.

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setShow(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isMounted || !show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div 
        className="flex flex-col items-center transition-all duration-700 ease-out translate-y-0 opacity-100"
        style={{ animation: 'slideUpFadeIn 0.8s ease-out forwards' }}
      >
        <div 
          className="relative w-40 h-40 md:w-56 md:h-56 mb-8"
          style={{ animation: 'floating 3s ease-in-out infinite' }}
        >
          <img 
            src="/logo_sawadik.jpeg" 
            alt="SawadikApp Logo" 
            className="w-full h-full object-cover rounded-[2rem] shadow-2xl border-4 border-slate-100/50"
          />
        </div>
        
        <h1 
          className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 tracking-tight mb-2"
          style={{ animation: 'fadeInUp 1s ease-out 0.3s forwards', opacity: 0 }}
        >
          SAWADIK-APP
        </h1>
        <p 
          className="text-slate-500 font-medium tracking-widest text-sm md:text-base uppercase"
          style={{ animation: 'fadeInUp 1s ease-out 0.5s forwards', opacity: 0 }}
        >
          Store Manager
        </p>
        
        <div 
          className="h-1.5 w-48 bg-slate-100 rounded-full mt-8 overflow-hidden"
          style={{ animation: 'fadeIn 1s ease-out 0.8s forwards', opacity: 0 }}
        >
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ animation: 'loadingBar 1.5s ease-in-out infinite' }}></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUpFadeIn {
          from { transform: translateY(40px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes floating {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        @keyframes loadingBar {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(20%); }
          100% { width: 100%; transform: translateX(200%); }
        }
      `}} />
    </div>
  );
}
