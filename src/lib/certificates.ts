import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export type ServerCertificate = {
  id: string;
  course: string;
  provider: string;
  issuedOn: string;
  reference: string;
  status: "verified" | "pending";
  fileName: string | null;
  hasFile: boolean;
  createdAt: string;
};

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const UPLOAD_TYPES = ["application/pdf", "image/png", "image/jpeg"];

/** The logged-in user's certificates, from the server. */
export function useCertificates() {
  const [certificates, setCertificates] = useState<ServerCertificate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { certificates } = await api<{ certificates: ServerCertificate[] }>("/certificates");
      setCertificates(certificates);
    } catch {
      /* offline — keep what we have */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { certificates, loaded, reload };
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
