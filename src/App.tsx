/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sanctum } from './components/Sanctum';

// --- Components ---

/**
 * A typewriter component that renders text letter by letter.
 */
const Typewriter = ({ 
  text, 
  delay = 50, 
  onComplete,
  className = "" 
}: { 
  text: string; 
  delay?: number; 
  onComplete?: () => void;
  className?: string;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, delay, onComplete]);

  return <span className={className}>{displayedText}</span>;
};

// --- Constants ---

const BACKGROUND_URL = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2000&auto=format&fit=crop"; // E.g., 'image_11.png'
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLeftText, setShowLeftText] = useState(false);
  const [showRightText, setShowRightText] = useState(false);

  // Trigger typewriter sequence on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowLeftText(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleWindowClick = useCallback(() => {
    if (isOpen) return;
    
    setIsOpen(true);
    
    // Play soothing audio cue
    const audio = new Audio(CHIME_URL);
    audio.volume = 0.3;
    audio.play().catch(e => console.log("Audio play blocked", e));
  }, [isOpen]);

  return (
    <div id="sanctuary-root" className="relative w-full h-screen overflow-hidden bg-[#050505] select-none">
      {/* Background Layer: The Forest View */}
      <motion.div 
        id="outside-view"
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1.1 : 1.05, // Subtle breathing scale
          filter: isOpen ? 'blur(0px)' : 'blur(5px)' // Slight blur when "inside"
        }}
        transition={{ 
          opacity: { duration: 2 },
          scale: { duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" },
          filter: { duration: 3 }
        }}
      />

      {/* Foreground Layer: The Dark Blurry Interior */}
      <motion.div 
        id="interior-overlay"
        className="absolute inset-0 z-10 pointer-events-none"
        initial={false}
        animate={{ 
          opacity: isOpen ? 0 : 1,
          scale: isOpen ? 1.1 : 1
        }}
        transition={{ duration: 2.5, ease: [0.7, 0, 0.3, 1] }}
        style={{
          background: 'linear-gradient(to bottom, #141414, #050505)',
        }}
      >
        {/* Deep physical texture - brushed metal / stone */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
        
        {/* Soft, focused light source from above-left */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_30%_0%,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />

        {/* Delicate effect of sparse raindrops on a frosted windowpane (Glassmorphism) */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </motion.div>

      {/* The Interactive Window Button / Frame */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            id="window-frame-container"
            className="absolute z-20 flex items-center justify-center p-2"
            style={{
              top: '50%',
              left: '50%',
              marginTop: '-190px',
              marginLeft: '-190px',
              width: '380px',
              height: '380px',
              perspective: '1200px',
            }}
            exit={{ 
              scale: 3, 
              opacity: 0,
              z: 200,
              transition: { duration: 2, ease: [0.7, 0, 0.3, 1] } 
            }}
          >
            {/* The Polaroid Photo Paper Frame within Antique Bronze Square Frame */}
            <motion.div
              id="window-portal"
              onClick={handleWindowClick}
              className="relative w-full h-full cursor-pointer flex flex-col justify-center items-center group overflow-hidden"
              style={{
                transformStyle: 'preserve-3d',
                boxShadow: '0 50px 100px -20px rgba(0,0,0,1), 0 0 60px rgba(0,0,0,0.8)',
                background: 'linear-gradient(135deg, #4a453e 0%, #292622 50%, #151311 100%)', // Antique Bronze
                border: '1px solid #5a544a',
                padding: '16px', // Thickness of the outer metallic frame
              }}
              whileHover={{ 
                scale: 1.02,
                translateZ: 30,
              }}
              whileTap={{ 
                scale: 0.98,
                translateZ: 0,
                transition: { duration: 0.1 }
              }}
            >
              {/* Inner metallic bevel structure */}
              <div className="absolute inset-0 border-[6px] border-[#36322d]/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.8)] pointer-events-none" />

              {/* The Inner Photo Paper */}
              <div className="relative w-full h-full bg-[#fcfcfc] flex flex-col p-4 md:p-6 justify-center items-center shadow-inner overflow-hidden">
                {/* Minimal paper texture */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
                
                {/* The Scenery inside the photo area */}
                <div className="relative w-full h-full bg-black shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)] ring-1 ring-black/5 overflow-hidden flex items-center justify-center">
                  <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
                  />
                  {/* Glass Reflection */}
                  <div 
                    className="absolute inset-0 opacity-10 bg-gradient-to-tr from-transparent via-white/50 to-transparent pointer-events-none group-hover:translate-x-1/2 transition-transform duration-1000" 
                    style={{ transform: 'rotate(25deg) translateY(-30%)' }}
                  />

                  {/* Perfectly Centered Circular Glowing Glassmorphism Button */}
                  <div className="absolute z-10 w-28 h-28 md:w-32 md:h-32 rounded-full animate-breathing border border-white/30 bg-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.3),inset_0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center transition-all duration-500 group-hover:bg-white/20 group-hover:shadow-[0_0_35px_rgba(255,255,255,0.5),inset_0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-105">
                    <span className="text-white font-typewriter tracking-[0.1em] text-[10px] md:text-xs uppercase pointer-events-none font-bold text-center leading-tight px-2" style={{ textShadow: '0 0 8px rgba(255,255,255,1), 0 2px 4px rgba(0,0,0,0.5)' }}>
                      open the<br/>picture
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UI Elements: Narrative Text */}
      <div className="absolute inset-0 z-30 flex items-center justify-between px-12 md:px-24 pointer-events-none">
        
        {/* Left Side: "Hi, How are you? This is [Reflecta]." */}
        <div id="narrative-left" className="w-1/3 flex flex-col items-start text-white/90">
          <AnimatePresence>
            {showLeftText && !isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-4"
                style={{ textShadow: '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3)' }}
              >
                <div className="text-lg md:text-xl lg:text-2xl tracking-wide leading-relaxed font-bold">
                  <Typewriter 
                    text="Hi," 
                    delay={120} 
                  />
                  <br />
                  <Typewriter 
                    text="How are you?" 
                    delay={100} 
                  />
                  <br />
                  <Typewriter 
                    text="This is [Reflecta]." 
                    delay={90} 
                    onComplete={() => setShowRightText(true)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: "Lay down your burdens; I am here to listen." */}
        <div id="narrative-right" className="w-1/3 flex flex-col items-end text-white/90 text-right">
          <AnimatePresence>
            {showRightText && !isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 50 }}
                className="animate-breathing space-y-4"
                style={{ textShadow: '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3)' }}
              >
                <div className="text-lg md:text-xl lg:text-2xl tracking-wide leading-relaxed font-bold">
                  <Typewriter 
                    text="Lay down your burdens;" 
                    delay={100} 
                  />
                  <br />
                  <Typewriter 
                    text="I am here to listen." 
                    delay={100} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Final State UI: The Inner Sanctum */}
      <AnimatePresence>
        {isOpen && (
          <Sanctum backgroundImageUrl={BACKGROUND_URL} />
        )}
      </AnimatePresence>
    </div>
  );
}

