"use client";

import { useRouter } from "next/navigation";
import AuthForm from "./AuthForm";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const switchHref = mode === "login" ? "/signup" : "/login";

  const handleSuccess = () => {
    window.dispatchEvent(new CustomEvent("inschat-auth"));
    router.replace("/");
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <AuthForm
          mode={mode}
          switchHref={switchHref}
          onSuccess={handleSuccess}
        />
      </section>
    </main>
  );
}
