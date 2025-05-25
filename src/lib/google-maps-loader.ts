
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-api-script-rumbos-global'; // Ensures a single ID for the global script
const GLOBAL_CALLBACK_NAME = 'initGoogleMapsApiGlobalRumbosCallback'; // Ensures a single global callback

// Define all libraries your application might need globally
const REQUIRED_LIBRARIES = ['marker', 'geometry', 'directions'].join(',');

let googleMapsPromise: Promise<void> | null = null;
let resolveGoogleMapsPromise: (() => void) | null = null;
let rejectGoogleMapsPromise: ((reason?: any) => void) | null = null;

// Function to check if all essential parts of the API are loaded
function isMapsApiFullyLoaded(win: Window & typeof globalThis): boolean {
  return !!(
    win.google &&
    win.google.maps &&
    win.google.maps.Map &&
    win.google.maps.Marker &&
    win.google.maps.LatLng &&
    win.google.maps.LatLngBounds &&
    win.google.maps.InfoWindow &&
    win.google.maps.DirectionsService && // Crucial check
    win.google.maps.DirectionsRenderer &&
    win.google.maps.Geocoder
  );
}

export function loadGoogleMapsApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error("Google Maps API cannot be loaded on the server."));
  }

  if (isMapsApiFullyLoaded(window)) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    resolveGoogleMapsPromise = resolve;
    rejectGoogleMapsPromise = reject;

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is missing. (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)");
      reject(new Error("Google Maps API key is missing."));
      googleMapsPromise = null; 
      return;
    }

    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      // Script tag already exists, but API might not be fully loaded or promise not resolved
      // This typically means something went wrong, or we are waiting for an existing load.
      // If it's a persistent issue, check for multiple loaders or manual script tags.
      console.warn("Google Maps script tag already exists. Waiting for it to complete or previous load to resolve.");
      // We don't create a new script, just wait for the existing promise to resolve or reject
      return;
    }
    
    (window as any)[GLOBAL_CALLBACK_NAME] = () => {
      if (isMapsApiFullyLoaded(window)) {
        if (resolveGoogleMapsPromise) resolveGoogleMapsPromise();
      } else {
        console.error("Google Maps API loaded but not all required services (like DirectionsService) are available.");
        if (rejectGoogleMapsPromise) rejectGoogleMapsPromise(new Error("Google Maps API loaded but not all required services are available."));
      }
      delete (window as any)[GLOBAL_CALLBACK_NAME];
      resolveGoogleMapsPromise = null;
      rejectGoogleMapsPromise = null;
    };

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=${GLOBAL_CALLBACK_NAME}&libraries=${REQUIRED_LIBRARIES}&loading=async`; // Explicitly include libraries
    script.async = true;
    script.defer = true;
    script.onerror = (event: Event | string) => {
      console.error("Failed to load Google Maps script:", event);
      const scriptTag = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
      if (scriptTag) {
        scriptTag.remove();
      }
      if (rejectGoogleMapsPromise) rejectGoogleMapsPromise(new Error("Failed to load Google Maps script."));
      googleMapsPromise = null; 
      delete (window as any)[GLOBAL_CALLBACK_NAME];
      resolveGoogleMapsPromise = null;
      rejectGoogleMapsPromise = null;
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
