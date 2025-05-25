
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
      if (isLoading) {
        return;
      }

      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function' && typeof window.Tawk_API.showWidget === 'function') {
        if (user?.role === "admin") {
          window.Tawk_API.hideWidget();
        } else {
          window.Tawk_API.showWidget();
        }
      }
    };
    
    if (window.Tawk_API && window.Tawk_API.onLoad) {
      window.Tawk_API.onLoad = function() {
         configureTawkVisibility();
      };
    } else if (window.Tawk_API && typeof window.Tawk_API.getStatus === 'function') { 
      // If API is already loaded and onLoad might have fired before this component mounted
      configureTawkVisibility();
    } else {
      // Fallback if Tawk_API is not yet fully initialized - set interval to check
      const intervalId = setInterval(() => {
        if (window.Tawk_API && window.Tawk_API.onLoad) {
          window.Tawk_API.onLoad = function() {
            configureTawkVisibility();
          };
          // Once onLoad is set, try to configure immediately if API seems ready
          if (typeof window.Tawk_API.getStatus === 'function') {
             configureTawkVisibility();
          }
          clearInterval(intervalId);
        } else if (window.Tawk_API && typeof window.Tawk_API.getStatus === 'function') {
          // API is available, but onLoad might not have been set by us yet
          configureTawkVisibility();
          clearInterval(intervalId); // Stop checking if API methods are available
        }
      }, 100); // Check every 100ms

      return () => clearInterval(intervalId); // Cleanup interval on unmount
    }
    // Initial attempt to configure if Tawk_API is already present
    if (window.Tawk_API && typeof window.Tawk_API.getStatus === 'function') {
      configureTawkVisibility();
    }

  }, [user, isLoading]); 

  return null; 
}

