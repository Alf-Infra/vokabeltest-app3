# MEMORY

## Produktkontext
- App: `vokabeltest-app3`
- Ziel: Vokabeln aus Fotos von Buchseiten per KI extrahieren, persistent speichern und interaktiv abfragen.
- Nutzer liefert API-Keys zur Laufzeit ueber die Weboberflaeche; Keys bleiben nur in der Session.

## Technische Leitplanken
- Erwarteter Stack: Node.js, Express, React, Vite, SQLite.
- Geplanter Laufzeit-Port: `3120`.
- KI-Provider: Claude, OpenAI, Gemini.
- Bild-Upload mit serverseitiger Validierung und Timeout-Schutz.
- Iteration `v1.2` adressiert das Backend-Hardening: `4 MB` Upload-Limit und `30 s` Timeout fuer KI-Extraktion.

## Pipeline-Hinweise
- Startlauf `2026-05-02-vokabeltest-app3-v1-2-001` initialisiert.
- `spec` abgeschlossen; weitere Schritte muessen ueber Controller/Step-Requests laufen.
