import Link from "next/link";

export const metadata = { title: "Datenschutz | Lweb KI Creator Suite" };

export default function Datenschutz() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16 max-md:py-10">
      <Link href="/" className="text-[13px] text-gunpowder-400 hover:text-gunpowder-700 transition-colors">&larr; Zurück</Link>
      <h1 className="text-[28px] font-extrabold text-gunpowder-900 mt-4 mb-8">Datenschutzerklärung</h1>

      <div className="space-y-6 text-[15px] text-gunpowder-600 leading-relaxed">
        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Verantwortliche Stelle</h2>
          <p>Lweb — Roberto Salvador<br/>9475 Sevelen, Schweiz<br/>E-Mail: <a href="mailto:info@lweb.ch" className="text-cerulean-500 hover:underline">info@lweb.ch</a></p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Allgemeines</h2>
          <p>Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Wir verarbeiten Ihre Daten gemäss dem Schweizer Datenschutzgesetz (DSG) und, soweit anwendbar, der EU-Datenschutz-Grundverordnung (DSGVO).</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Erhobene Daten</h2>
          <p>Beim Besuch unserer Website werden automatisch folgende Daten erfasst:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>IP-Adresse (anonymisiert)</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Aufgerufene Seiten</li>
            <li>Verwendeter Browser und Betriebssystem</li>
          </ul>
          <p className="mt-2">Diese Daten werden ausschliesslich zur Sicherstellung des Betriebs und zur Verbesserung unserer Website verwendet.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">KI-Generierung &amp; API-Keys</h2>
          <p>Inhalte, die Sie über unsere KI-Tools generieren (Webseiten, Bilder, Musik, Videos), werden direkt über die APIs der jeweiligen Anbieter (OpenAI, Google Gemini, Suno) verarbeitet. Wir speichern keine generierten Inhalte auf unseren Servern. Die von Ihnen eingesetzten API-Keys werden ausschliesslich lokal in Ihrem Browser gespeichert.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Cookies</h2>
          <p>Unsere Website verwendet nur technisch notwendige Cookies, die für den Betrieb der Website erforderlich sind. Es werden keine Tracking-Cookies oder Werbe-Cookies eingesetzt.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Analyse-Dienste</h2>
          <p>Wir nutzen Vercel Analytics für anonymisierte Nutzungsstatistiken. Es werden keine personenbezogenen Daten an Dritte weitergegeben.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Ihre Rechte</h2>
          <p>Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten. Kontaktieren Sie uns unter <a href="mailto:info@lweb.ch" className="text-cerulean-500 hover:underline">info@lweb.ch</a>.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Änderungen</h2>
          <p>Wir behalten uns vor, diese Datenschutzerklärung jederzeit anzupassen. Die aktuelle Version gilt ab dem Zeitpunkt der Veröffentlichung auf dieser Website.</p>
        </div>

        <p className="text-[13px] text-gunpowder-400">Stand: Februar 2026</p>
      </div>
    </div>
  );
}
