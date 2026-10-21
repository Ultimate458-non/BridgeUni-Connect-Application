import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Clock, FileText, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { FormError, TextField } from "../../components/AuthForm";
import { api, ApiError } from "../../lib/api";
import { fileToBase64, MAX_UPLOAD_BYTES, UPLOAD_TYPES, useCertificates } from "../../lib/certificates";
import { formatDay } from "../../lib/progress-store";

const TITLE = "Add a certificate · BridgeUni";
const DESCRIPTION = "Add a certificate from a free course. Verified certificates appear on your CV automatically.";

export const Route = createFileRoute("/_app/certify")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertifyPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function CertifyPage() {
  const { certificates, loaded, reload } = useCertificates();
  const [course, setCourse] = useState("");
  const [provider, setProvider] = useState("");
  const [issuedOn, setIssuedOn] = useState(today());
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | undefined) => {
    setErrors((e) => ({ ...e, file: null }));
    if (!f) return setFile(null);
    if (!UPLOAD_TYPES.includes(f.type)) {
      setFile(null);
      return setErrors((e) => ({ ...e, file: "Only PDF, PNG or JPG files are allowed." }));
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      return setErrors((e) => ({ ...e, file: "That file is bigger than 2 MB." }));
    }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string | null> = {};
    if (!course.trim()) errs.course = "Enter the course name.";
    if (!provider.trim()) errs.provider = "Enter who gave the certificate.";
    if (errs.course || errs.provider) return setErrors(errs);
    setBusy(true);
    setErrors({});
    setSaved(null);
    try {
      const body: Record<string, unknown> = { course, provider, issuedOn, reference };
      if (file) body.file = { name: file.name, type: file.type, data: await fileToBase64(file) };
      const { certificate } = await api<{ certificate: { status: string; course: string } }>("/certificates", { method: "POST", body });
      setSaved(
        certificate.status === "verified"
          ? `“${certificate.course}” is verified and now on your CV.`
          : `“${certificate.course}” was saved as pending. Add the certificate ID or link to verify it.`,
      );
      setCourse("");
      setProvider("");
      setReference("");
      setIssuedOn(today());
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : "Couldn't save it." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api(`/certificates/${id}`, { method: "DELETE" }).catch(() => {});
    await reload();
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section className="min-w-0">
        <span className="tag">Step 2 · Certify</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Add a certificate</h1>
        <p className="mt-2 text-muted-foreground">
          Add the certificate ID or link from the course provider to mark it <strong className="text-foreground">Verified</strong> — verified
          certificates go onto your CV automatically.
        </p>

        <form onSubmit={submit} noValidate className="panel mt-6 space-y-4 p-5 sm:p-6">
          {errors.form && <FormError>{errors.form}</FormError>}
          <TextField label="Course name" placeholder="e.g. Business Communication" value={course}
            onChange={(e) => setCourse(e.target.value)} error={errors.course} required />
          <TextField label="Provider" placeholder="e.g. HP LIFE" value={provider}
            onChange={(e) => setProvider(e.target.value)} error={errors.provider} required />
          <TextField label="Date completed" type="date" value={issuedOn} max={today()}
            onChange={(e) => setIssuedOn(e.target.value)} error={errors.issuedOn} />
          <TextField label="Certificate ID or link" placeholder="e.g. HPL-2026-48213 or https://…" value={reference}
            hint="Given with your certificate. Adding it marks the certificate Verified."
            onChange={(e) => setReference(e.target.value)} error={errors.reference} />

          <div>
            <p className="label">Certificate file <span className="font-normal text-muted-foreground">(optional)</span></p>
            <input id={fileId} ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="peer sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            <label htmlFor={fileId}
              className="btn-ghost w-full cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              <Upload className="size-4" aria-hidden /> {file ? "Change file" : "Upload PDF or photo"}
            </label>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {file ? <>Selected: <strong className="text-foreground">{file.name}</strong> ({Math.ceil(file.size / 1024)} KB)</> : "PDF, PNG or JPG · max 2 MB"}
            </p>
            {errors.file && <p className="mt-1.5 text-sm font-semibold text-danger">{errors.file}</p>}
          </div>

          <button type="submit" className="btn-solid w-full" disabled={busy}>{busy ? "Saving…" : "Add certificate"}</button>
          <p aria-live="polite" className="text-sm font-semibold text-success">{saved}</p>
        </form>
      </section>

      <section className="min-w-0 lg:pt-24" aria-labelledby="my-certs">
        <h2 id="my-certs" className="text-2xl font-extrabold">My certificates</h2>
        {!loaded ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : certificates.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None yet. Add your first one on the left.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {certificates.map((c) => (
              <li key={c.id} className="panel flex items-start gap-3 p-4">
                {c.status === "verified" ? (
                  <BadgeCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
                ) : (
                  <Clock className="mt-0.5 size-6 shrink-0 text-accent-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.course}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.provider}{c.issuedOn && ` · ${formatDay(c.issuedOn)}`}
                  </p>
                  <span className={`tag mt-2 ${c.status === "verified" ? "bg-success-soft text-success" : "bg-accent-soft text-accent-foreground"}`}>
                    {c.status === "verified" ? "Verified" : "Pending"}
                  </span>
                  {c.hasFile && (
                    <a href={`/api/certificates/${c.id}/file`} target="_blank" rel="noopener noreferrer" className="link ml-3 inline-flex min-h-10 items-center gap-1 text-sm">
                      <FileText className="size-4" aria-hidden /> View file
                    </a>
                  )}
                </div>
                <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.course}`}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/cv" className="btn-ghost mt-6">See them on my CV <ArrowRight className="size-4" aria-hidden /></Link>
      </section>
    </div>
  );
}
