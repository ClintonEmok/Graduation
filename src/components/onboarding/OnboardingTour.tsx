"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function OnboardingTour() {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    // Check if user has already seen the tour
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
      steps: [] // Steps will be defined in the next task
    });
    
    // We will call drive() once steps are added
  }, []);

  return null;
}
