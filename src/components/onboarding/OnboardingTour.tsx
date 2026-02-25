"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function OnboardingTour() {
  const pathname = usePathname();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const isDashboard = pathname.startsWith('/dashboard');

  useEffect(() => {
    // Only show on dashboard pages
    if (!isDashboard) return;
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (hasSeenTour) return;

    // Initialize driver
    driverRef.current = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: 'Done',
      nextBtnText: 'Next',
      prevBtnText: 'Previous',
      onDestroyed: () => {
        // Mark as seen when tour is finished or skipped
        localStorage.setItem("hasSeenTour", "true");
      },
      steps: [
        {
          popover: {
            title: 'Welcome to Adaptive Space-Time Cube',
            description: 'Explore spatiotemporal patterns in Chicago crime data using synchronized 2D, 3D, and timeline views.'
          }
        },
        {
          element: '#tour-toolbar',
          popover: {
            title: 'Floating Toolbar',
            description: 'Use these tools to reset view, toggle context, manage layers, open settings, and filter data.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '#tour-map-panel',
          popover: {
            title: '2D Map View',
            description: 'View spatial distribution of events. Compare spatial patterns with the 3D structure.',
            side: "right",
            align: 'center'
          }
        },
        {
          element: '#tour-cube-panel',
          popover: {
            title: '3D Space-Time Cube',
            description: 'Visualize events in 3D (X/Y=Space, Z=Time). Enable Adaptive Time to see density-based scaling.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '#tour-timeline-panel',
          popover: {
            title: 'Interactive Timeline',
            description: 'Analyze temporal distribution. Select time ranges to filter the Map and Cube views.',
            side: "top",
            align: 'center'
          }
        }
      ]
    });
    
    driverRef.current.drive();
  }, [isDashboard]);

  return null;
}
