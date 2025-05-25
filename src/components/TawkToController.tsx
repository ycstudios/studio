
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Enhance the Window interface to include Tawk_API
declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      onLoad?: () => void;
      getStatus?: () => string | undefined; 
      maximize?: () => void; 
      [key: string]: any; 
    };
  }
}

export function TawkToController() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const configureTawkVisibility = () => {
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function' && typeof window.Tawk_API.showWidget === 'function') {
        if (user?.role === "admin") {
          window.Tawk_API.hideWidget();
        } else {
          window.Tawk_API.showWidget();
        }
      }
    };
    
    // If Tawk_API is already loaded and has an onLoad property, set our handler.
    if (window.Tawk_API && window.Tawk_API.onLoad) {
      window.Tawk_API.onLoad = function() {
         // This will run after Tawk.to has fully initialized itself.
         configureTawkVisibility();
      };
      // It's possible Tawk.to loaded *before* this component mounted and onLoad already fired.
      // So, try to configure visibility immediately if Tawk_API seems ready.
      if (typeof window.Tawk_API.getStatus === 'function') {
         configureTawkVisibility();
      }
    } else if (window.Tawk_API && typeof window.Tawk_API.getStatus === 'function') {
      // Tawk_API exists but onLoad might not have been set by this component yet,
      // or Tawk.to is already loaded.
      configureTawkVisibility();
    } else {
      // Tawk_API is not yet available. Set an interval to check for it.
      // This is a fallback for scenarios where the Tawk.to script loads very slowly
      // or after this component's initial render.
      const intervalId = setInterval(() => {
        if (window.Tawk_API && window.Tawk_API.onLoad) {
          window.Tawk_API.onLoad = function() {
            configureTawkVisibility();
          };
          // Try to configure immediately if API seems ready after setting onLoad
          if (typeof window.Tawk_API.getStatus === 'function') {
             configureTawkVisibility();
          }
          clearInterval(intervalId);
        } else if (window.Tawk_API && typeof window.Tawk_API.getStatus === 'function') {
          // API became available, but onLoad was not set by this component's interval path
          configureTawkVisibility();
          clearInterval(intervalId);
        }
      }, 200); // Check every 200ms

      return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }

  }, [user, isLoading]); // Re-run effect if user or isLoading state changes

  return null; // This component does not render anything itself
}
