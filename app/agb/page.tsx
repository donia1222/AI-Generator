import Link from "next/link";

export const metadata = { title: "AGB | Lweb KI Creator Suite" };

export default function AGB() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16 max-md:py-10">
      <Link href="/" className="text-[13px] text-gunpowder-400 hover:text-gunpowder-700 transition-colors">&larr; Zurück</Link>
      <h1 className="text-[28px] font-extrabold text-gunpowder-900 mt-4 mb-8">Allgemeine Geschäftsbedingungen</h1>

      <div className="space-y-6 text-[15px] text-gunpowder-600 leading-relaxed">
        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">1. Geltungsbereich</h2>
          <p>Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Dienstleistungen und Produkte von Lweb, Roberto Salvador, 9475 Sevelen, Schweiz (nachfolgend &laquo;Anbieter&raquo;).</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">2. Leistungsbeschreibung</h2>
          <p>Die KI Creator Suite ist eine Web-Applikation zur KI-gestützten Generierung von Webseiten, Bildern, Musik und Videos. Der Erwerb umfasst den Source-Code sowie eine Nutzungslizenz. Der Käufer ist für die Bereitstellung eigener API-Keys verantwortlich.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">3. Preise &amp; Zahlung</h2>
          <p>Alle Preise verstehen sich in Schweizer Franken (CHF) als einmalige Zahlung. Die Zahlung ist vor Lieferung des Produkts fällig. Es gelten die zum Zeitpunkt der Bestellung angegebenen Preise.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">4. Lieferung</h2>
          <p>Nach Zahlungseingang wird der Source-Code digital bereitgestellt. Der Käufer erhält Zugang zur vollständigen Applikation inklusive Dokumentation für die Einrichtung.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">5. Nutzungsrechte</h2>
          <p>Der Käufer erhält eine nicht-exklusive, zeitlich unbegrenzte Lizenz zur Nutzung der Software für eigene Projekte oder Kundenprojekte. Eine Weiterveräusserung des Source-Codes an Dritte ist ohne schriftliche Genehmigung des Anbieters nicht gestattet.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">6. Gewährleistung</h2>
          <p>Das Produkt wird &laquo;wie besehen&raquo; (as-is) geliefert. Der Anbieter übernimmt keine Garantie für die Funktionsfähigkeit mit zukünftigen API-Versionen der Drittanbieter (OpenAI, Google, Suno). Die Software wird zum Zeitpunkt der Lieferung in funktionsfähigem Zustand bereitgestellt.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">7. Haftung</h2>
          <p>Die Haftung des Anbieters ist auf den Kaufpreis beschränkt. Für indirekte Schäden, entgangenen Gewinn oder Datenverlust wird keine Haftung übernommen. Der Käufer ist für die Einhaltung der Nutzungsbedingungen der jeweiligen API-Anbieter selbst verantwortlich.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">8. API-Kosten</h2>
          <p>Die Kosten für die Nutzung der APIs (OpenAI, Google Gemini, Suno) sind nicht im Kaufpreis enthalten und werden direkt vom jeweiligen Anbieter in Rechnung gestellt. API-Keys können über <a href="https://kie.ai" target="_blank" rel="noopener noreferrer" className="text-cerulean-500 hover:underline">kie.ai</a> oder direkt bei den Anbietern bezogen werden.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">9. Anwendbares Recht</h2>
          <p>Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist Sevelen, Kanton St. Gallen, Schweiz.</p>
        </div>

        <p className="text-[13px] text-gunpowder-400">Stand: Februar 2026</p>
      </div>
    </div>
  );
}
