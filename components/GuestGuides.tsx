"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  setReviewCoachDone,
  useReviewCoachDone,
  useVisitorIntent,
} from "@/lib/visitorIntent";
import ReviewCoach from "./ReviewCoach";

function isCoachRoute(pathname: string): boolean {
  return pathname === "/records" || pathname === "/records/full";
}

export default function GuestGuides() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authChecked } = useAuth();
  const { ready, intent } = useVisitorIntent();
  const coachDone = useReviewCoachDone();

  const showCoach =
    ready &&
    authChecked &&
    !user &&
    intent === "review" &&
    !coachDone &&
    isCoachRoute(pathname);

  if (!showCoach) return null;

  return (
    <ReviewCoach
      onDismiss={() => setReviewCoachDone(true)}
      onTryHealthChat={() => {
        setReviewCoachDone(true);
        router.push("/?newMode=health");
      }}
    />
  );
}
