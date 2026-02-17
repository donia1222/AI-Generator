import Link from "next/link";

export const metadata = { title: "Impressum | Lweb KI Creator Suite" };

export default function Impressum() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16 max-md:py-10">
      <Link href="/" className="text-[13px] text-gunpowder-400 hover:text-gunpowder-700 transition-colors">&larr; Zurück</Link>
      <h1 className="text-[28px] font-extrabold text-gunpowder-900 mt-4 mb-8">Impressum</h1>

      <div className="space-y-6 text-[15px] text-gunpowder-600 leading-relaxed">
        <p className="text-[13px] font-semibold text-gunpowder-400 uppercase tracking-wider">Angaben gemäss Schweizer Recht</p>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Betreiber</h2>
          <p>Lweb<br/>Roberto Salvador<br/>9475 Sevelen<br/>Schweiz</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Kontakt</h2>
          <p>Telefon: <a href="tel:+41765608645" className="text-cerulean-500 hover:underline">+41 76 560 86 45</a><br/>E-Mail: <a href="mailto:info@lweb.ch" className="text-cerulean-500 hover:underline">info@lweb.ch</a><br/>Website: <a href="https://www.lweb.ch" target="_blank" rel="noopener noreferrer" className="text-cerulean-500 hover:underline">lweb.ch</a></p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Unternehmensform</h2>
          <p>Einzelunternehmen</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Verantwortlich für den Inhalt</h2>
          <p>Roberto Salvador, 9475 Sevelen, Schweiz</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Haftungsausschluss</h2>
          <p>Der Autor übernimmt keine Gewähr für die Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen auf dieser Website.</p>
          <p className="mt-2">Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, die aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen entstanden sind, werden ausgeschlossen.</p>
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-gunpowder-900 mb-1">Urheberrecht</h2>
          <p>Die auf dieser Website enthaltenen Inhalte und Werke sind urheberrechtlich geschützt. Jede Verwertung ausserhalb der Grenzen des Urheberrechts bedarf der vorherigen schriftlichen Zustimmung des Autors.</p>
        </div>
      </div>
    </div>
  );
}
