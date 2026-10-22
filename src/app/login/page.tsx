import LoginClient from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; e?: string }>;
}) {
  const { error, e } = await searchParams;
  // `error=1` dipakai versi lama; anggap saja kredensial salah.
  const kode = e ?? (error ? "salah" : undefined);
  return <LoginClient error={kode} />;
}
