"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { removeDemoGlucoseRecords } from "@/lib/guestStore";
import {
  initializeGuestDemoData,
  rearmGuestExampleFlow,
  setHealthIntroSeen,
  useHealthIntroSeen,
} from "@/lib/visitorIntent";
import HealthIntroModal, { type HealthIntroChoice } from "./HealthIntroModal";

export default function GuestGuides() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authChecked } = useAuth();
  const healthIntroSeen = useHealthIntroSeen();
  const [healthIntroRequested, setHealthIntroRequested] = useState(false);

  useEffect(() => {
    if (!authChecked || user) return;
    initializeGuestDemoData();
  }, [authChecked, user]);

  useEffect(() => {
    const onRequest = () => setHealthIntroRequested(true);
    window.addEventListener("inschat-health-intro-request", onRequest);
    return () => window.removeEventListener("inschat-health-intro-request", onRequest);
  }, []);

  const showHealthIntro =
    authChecked &&
    !user &&
    pathname === "/" &&
    healthIntroRequested &&
    !healthIntroSeen;

  useEffect(() => {
    const shell = document.querySelector(".shell");
    if (!showHealthIntro) {
      document.body.classList.remove("health-intro-open");
      shell?.removeAttribute("inert");
      return;
    }
    document.body.classList.add("health-intro-open");
    shell?.setAttribute("inert", "");
    return () => {
      document.body.classList.remove("health-intro-open");
      shell?.removeAttribute("inert");
    };
  }, [showHealthIntro]);

  const handleHealthIntroChoice = (choice: HealthIntroChoice) => {
    setHealthIntroRequested(false);
    setHealthIntroSeen(true);
    if (choice === "view") {
      router.push("/records");
      return;
    }
    if (choice === "clear") {
      removeDemoGlucoseRecords();
      rearmGuestExampleFlow();
      window.dispatchEvent(new CustomEvent("inschat-records-changed"));
    }
  };

  if (!showHealthIntro) return null;

  return <HealthIntroModal onChoice={handleHealthIntroChoice} />;
}
