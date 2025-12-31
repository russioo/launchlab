"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Declare Vanta type
declare global {
  interface Window {
    VANTA: {
      FOG: (options: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

export function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<{ destroy: () => void } | null>(null);

  useEffect(() => {
    // Load Vanta script dynamically
    const loadVanta = async () => {
      if (!vantaRef.current) return;

      // Make THREE available globally for Vanta
      (window as unknown as { THREE: typeof THREE }).THREE = THREE;

      // Load Vanta fog script
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js";
      script.async = true;
      
      script.onload = () => {
        if (window.VANTA && vantaRef.current) {
          const effect = window.VANTA.FOG({
            el: vantaRef.current,
            THREE: THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            highlightColor: 0xfff5f0,    // Soft cream white
            midtoneColor: 0xf5d5c8,      // Soft peach
            lowlightColor: 0xe8a890,     // Muted coral
            baseColor: 0xfff8f5,         // Light warm cream
            blurFactor: 0.8,
            zoom: 0.8,
            speed: 0.8,
          });
          setVantaEffect(effect);
        }
      };

      document.body.appendChild(script);
    };

    loadVanta();

    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={vantaRef}
        className="fixed inset-0 -z-10"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Light overlay for softer look */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ 
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
        }}
      />
    </>
  );
}
