import LandingPage from "@/components/LandingPage";
import { getLandingStats } from "@/lib/landing";

export const revalidate = 60;

export default async function Page() {
  const stats = await getLandingStats();
  return <LandingPage stats={stats} />;
}
