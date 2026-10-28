import { useState, type FormEvent } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { LegalFooter } from "../components/legal/LegalFooter";
import { TopNav } from "../components/layout/TopNav";
import { useAppLanguage } from "../hooks/useAppLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { DATE_LOCALES } from "../lib/locale";

type Kind = "ordinary" | "extraordinary";

interface Receipt {
  reference: string;
  received_at: string;
  name: string;
  email: string;
  kind: Kind;
  reason: string | null;
  contract_reference: string | null;
}

const INPUT_CLASS =
  "w-full rounded-xl border px-4 py-3 text-base transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";
const INPUT_STYLE = {
  borderColor: "var(--color-border)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text-primary)",
};

/**
 * Kündigungsbutton nach § 312k BGB: ohne Login, alle nötigen Angaben auf
 * einer Seite, Bestätigung mit Datum und Uhrzeit zum Speichern/Drucken.
 * Die Antwort des Servers verrät nie, ob zur Adresse ein Abo existiert.
 */
export default function CancellationPage() {
  const { t } = useTranslation();
  const lang = useAppLanguage();
  usePageTitle(t("meta.cancel"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contractReference, setContractReference] = useState("");
  const [kind, setKind] = useState<Kind>("ordinary");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.includes("@")) {
      setError(t("cancel.missingIdentity"));
      return;
    }
    if (kind === "extraordinary" && !reason.trim()) {
      setError(t("cancel.missingReason"));
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/v1/contracts/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          kind,
          reason: kind === "extraordinary" ? reason.trim() : null,
          contract_reference: contractReference.trim() || null,
        }),
      });
      if (res.status === 429) {
        setError(t("cancel.tooMany"));
      } else if (res.status === 422) {
        setError(t("cancel.invalid"));
      } else if (!res.ok) {
        setError(t("cancel.failed"));
      } else {
        setReceipt((await res.json()) as Receipt);
      }
    } catch {
      setError(t("cancel.failed"));
    } finally {
      setSending(false);
    }
  };

  const receivedAt = receipt
    ? new Date(receipt.received_at).toLocaleString(DATE_LOCALES[lang], {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "";

  return (
    <IonPage>
      <IonContent>
        <TopNav />
        <div
          className="min-h-full flex flex-col"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          <main className="w-full max-w-xl mx-auto px-6 py-10 flex-1">
            {receipt ? (
              <section aria-labelledby="cancel-receipt-title">
                <div className="text-5xl mb-4 select-none" aria-hidden="true">
                  ✅
                </div>
                <h1
                  id="cancel-receipt-title"
                  className="text-2xl font-extrabold mb-3"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t("cancel.receiptTitle")}
                </h1>
                <p
                  className="mb-6"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("cancel.receiptIntro")}
                </p>
                <dl
                  className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border p-5 text-sm break-words"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <dt className="font-semibold">
                    {t("cancel.receiptReference")}
                  </dt>
                  <dd className="min-w-0 break-all" dir="ltr">
                    {receipt.reference}
                  </dd>
                  <dt className="font-semibold">
                    {t("cancel.receiptReceived")}
                  </dt>
                  <dd>{receivedAt}</dd>
                  <dt className="font-semibold">{t("cancel.name")}</dt>
                  <dd className="min-w-0">{receipt.name}</dd>
                  <dt className="font-semibold">{t("cancel.email")}</dt>
                  <dd className="min-w-0 break-all" dir="ltr">
                    {receipt.email}
                  </dd>
                  <dt className="font-semibold">{t("cancel.kindLabel")}</dt>
                  <dd>
                    {receipt.kind === "extraordinary"
                      ? t("cancel.extraordinary")
                      : t("cancel.ordinary")}
                  </dd>
                  {receipt.reason && (
                    <>
                      <dt className="font-semibold">{t("cancel.reason")}</dt>
                      <dd className="min-w-0">{receipt.reason}</dd>
                    </>
                  )}
                  {receipt.contract_reference && (
                    <>
                      <dt className="font-semibold">
                        {t("cancel.contractReference")}
                      </dt>
                      <dd className="min-w-0">{receipt.contract_reference}</dd>
                    </>
                  )}
                </dl>
                <p
                  className="mt-4 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {receipt.kind === "extraordinary"
                    ? t("cancel.receiptEndExtraordinary")
                    : t("cancel.receiptEndOrdinary")}
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="mt-6 px-5 py-3 rounded-xl font-bold border-2 transition-all duration-200 hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  style={{
                    borderColor: "var(--color-primary)",
                    color: "var(--color-primary-text)",
                  }}
                >
                  {t("cancel.print")}
                </button>
              </section>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h1
                  className="text-2xl font-extrabold mb-3"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t("cancel.title")}
                </h1>
                <p
                  className="mb-8"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("cancel.intro")}
                </p>

                <div className="flex flex-col gap-5">
                  <div>
                    <label
                      htmlFor="cancel-name"
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t("cancel.name")}
                    </label>
                    <input
                      id="cancel-name"
                      type="text"
                      autoComplete="name"
                      maxLength={200}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cancel-email"
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t("cancel.email")}
                    </label>
                    <input
                      id="cancel-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={255}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-describedby="cancel-email-hint"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                    <p
                      id="cancel-email-hint"
                      className="mt-1.5 text-xs"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t("cancel.emailHint")}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="cancel-contract"
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t("cancel.contractReference")}
                    </label>
                    <input
                      id="cancel-contract"
                      type="text"
                      maxLength={120}
                      value={contractReference}
                      onChange={(e) => setContractReference(e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>

                  <fieldset>
                    <legend
                      className="text-sm font-semibold mb-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t("cancel.kindLabel")}
                    </legend>
                    {(["ordinary", "extraordinary"] as const).map((value) => (
                      <label
                        key={value}
                        className="flex items-start gap-3 py-1.5 cursor-pointer text-sm"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        <input
                          type="radio"
                          name="cancel-kind"
                          value={value}
                          checked={kind === value}
                          onChange={() => setKind(value)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                        />
                        {t(`cancel.${value}`)}
                      </label>
                    ))}
                  </fieldset>

                  {kind === "extraordinary" && (
                    <div>
                      <label
                        htmlFor="cancel-reason"
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {t("cancel.reason")}
                      </label>
                      <textarea
                        id="cancel-reason"
                        rows={4}
                        maxLength={2000}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                      />
                    </div>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="text-sm font-medium"
                      style={{ color: "var(--color-error-text)" }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full px-6 py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)]"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {sending ? t("cancel.sending") : t("cancel.submit")}
                  </button>
                </div>
              </form>
            )}
          </main>
          <LegalFooter />
        </div>
      </IonContent>
    </IonPage>
  );
}
