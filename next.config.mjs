import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ada package-lock.json lain di folder home pengguna, sehingga Next.js salah
  // menebak root workspace (C:\Users\dewan). Kunci root ke folder proyek ini
  // supaya tracing & cache build selalu konsisten.
  outputFileTracingRoot: __dirname,
};
export default nextConfig;
