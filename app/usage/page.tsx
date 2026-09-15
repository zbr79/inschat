import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UsagePanel from "@/components/UsagePanel";
import { getUserFromRequest } from "@/lib/auth";

export const metadata: Metadata = {
  title: "API Usage — InsChat",
};

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const cookieHeader = (await cookies()).toString();
  const user = await getUserFromRequest(
    new Request("http://inschat.local/usage", {
      headers: { cookie: cookieHeader },
    })
  );
  if (!user) redirect("/");

  return <UsagePanel />;
}
