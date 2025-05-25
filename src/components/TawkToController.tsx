
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
      getStatus?: () => string | undefined; // Example method to check if API is ready
      maximize?: () => void; // Keep for other components using it
      [key: string]: any; // Allow other properties
    };
  }
}

export function TawkToController() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const configureTawkVisibility = () => {
      if (isLoading) {
        // Wait for authentication status to be resolved
        return;
      }

      // Ensure Tawk_API and its methods exist before calling them
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function' && typeof window.Tawk_API.showWidget === 'function') {
        if (user?.role === "admin") {
          // console.log("[TawkToController] User is admin. Attempting to hide Tawk.to widget.");
          window.Tawk_API.hideWidget();
        } else {
          // console.log("[TawkToController] User is client/developer or guest. Attempting to show Tawk.to widget.");
          window.Tawk_API.showWidget();
        }
      } else {
        // console.warn("[TawkToController] Tawk_API or its methods not yet available.");
      }
    };

    // Case 1: Tawk_API is already loaded and seems ready (e.g., by checking if a known method like getStatus exists)
    if (window.Tawk_API && typeof window.Tawk_API.getStatus === 'function') {
      // console.log("[TawkToController] Tawk_API seems ready, configuring visibility.");
      configureTawkVisibility();
    } else {
      // Case 2: Tawk_API might not be fully loaded yet or getStatus isn't the right check.
      // Set (or override) the onLoad handler.
      // Tawk_API is guaranteed to be at least an empty object by their script snippet.
      
      // Ensure Tawk_API object exists before setting onLoad
      if (typeof window.Tawk_API === 'undefined') {
        window.Tawk_API = {}; // Create it if it doesn't exist, as per Tawk.to's own script logic
      }
      
      const existingOnLoad = window.Tawk_API?.onLoad;
      window.Tawk_API.onLoad = function () {
        // console.log("[TawkToController] Tawk_API.onLoad event triggered.");
        if (typeof existingOnLoad === 'function') {
          existingOnLoad(); // Call any previously set onLoad to avoid breaking other Tawk.to functionalities
        }
        configureTawkVisibility(); // Now configure visibility as Tawk.to is loaded
      };

      // If Tawk.to was already loaded but its API methods weren't ready for the first check,
      // and onLoad has already fired, try configuring visibility again.
      // This can happen if our component renders slightly after Tawk_API is fully initialized but before getStatus was true.
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function' && !isLoading) {
          // console.log("[TawkToController] Tawk_API methods became available after initial check, re-configuring visibility.");
          configureTawkVisibility();
      }
    }
  }, [user, isLoading]); // Re-run when user or isLoading state changes

  return null; // This component does not render anything to the DOM
}
