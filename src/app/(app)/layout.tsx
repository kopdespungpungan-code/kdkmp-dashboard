import { createClient } from "@/lib/supabase/server";
import AppLayoutClient from "./layout-client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppLayoutClient user={user}>{children}</AppLayoutClient>;
}
