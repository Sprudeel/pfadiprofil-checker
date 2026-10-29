<div align="center" style="margin-top: 24px;">
  <img src="public/logo.svg" width="144" alt="Logo">
  <h1>Pfadiprofil-Checker</h1>
</div>

Web-App für Pfadileitende: Grobprogramm hochladen oder Samstage von Hand erfassen, jedem Block die
geförderten **Beziehungen** und eingesetzten **Methoden** aus dem Pfadiprofil zuordnen und eine
druckbare Übersicht erstellen. Alles läuft im Browser, ohne backend. LocalStorage speichert den Stand automatisch, JSON-Export/Import erlaubt Backup und Teilen im Leitungsteam.

## Starten

```bash
npm install
npm run dev
```

## Funktionen

- **Demo**: «Demo ansehen» auf der Startseite lädt ein erfundenes, vollständig ausgefülltes Herbstlager. Daran sieht man, wie Kalender, Übersicht und PDF aussehen, wenn alles zugeordnet ist.
- **PDF-Import**: Export «Grobprogramm» aus eCamp v3, sowohl im alten Druck als auch im neuen (Chrome-)Druck. Erkannt werden Tage, Uhrzeiten, Blocknummer, Kategorie, Titel, Verantwortliche, Legende und Lagerangaben. In der Vorschau lässt sich alles korrigieren. Ein späterer Import ins gleiche Programm behält die Zuordnungen von Blöcken mit gleicher Nummer.
- **Kalender** (Tag / Woche / alle Tage) im eCamp-Layout: Blöcke verschieben, Länge ändern, in leerer Fläche ziehen für einen neuen Block.
- **Zuordnen**: Block anklicken und Kacheln wählen. Tastatur: `1`–`5` für Beziehungen, `Q`–`I` für Methoden, `←`/`→` zum nächsten Block. Optional Unterthemen bzw. Teilaspekte (Pfeil unten rechts an einer Kachel). Mit dem **Pinsel** wählt man ein Element und klickt dann mehrere Blöcke an.
- **Übersicht**: Häufigkeit und Stunden pro Beziehung und Methode, Hinweise auf fehlende oder wenig genutzte Elemente, Matrix Beziehung × Methode, Verlauf über die Tage und für jedes Element die Liste der Blöcke. Kategorien (z.B. Essen) lassen sich ausblenden.
- **Als PDF speichern**: eigene Druckansicht (A4) über den Druckdialog des Browsers.
- **Daten**: Der Stand wird automatisch im Browser gespeichert. Über «Daten» lässt sich alles als JSON-Datei exportieren und wieder importieren (zum Teilen im Leitungsteam oder als Backup).


## Libraries
- [Vue 3](https://vuejs.org/) (Composition API, Vue Router)
- [TailwindCSS](https://tailwindcss.com/) (inkl. Forms, Typography)
- [Pinia](https://pinia.vuejs.org/) (State Management)
- [pdfjs](https://mozilla.github.io/pdf.js/) (PDF Viewer)