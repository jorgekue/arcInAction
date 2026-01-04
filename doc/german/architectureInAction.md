# architecture in action (aia) – 4D‑Sichten auf Software‑Architekturen

> Dieses Dokument beschreibt das Demo‑Programm **architecture in action (aia)** und sein Modellierungsprinzip.  
> Details zum JSON‑Datenmodell finden sich in der **Modellierungsanleitung**, siehe Referenzen.

---

# Motivation

In typischen IT‑Projekten sollen nicht nur Techniker, sondern auch ein **breiteres Publikum** bei der Definition und Kommunikation einer Zielarchitektur informiert und mitgenommen werden. Klassische 2D‑Diagramme (z.B. UML‑Komponenten‑ und Sequenzdiagramme) sind hier oft entweder zu technisch oder visuell wenig ansprechend.

Aus der Projektarbeit heraus ist deshalb die Idee für das Demo‑Programm **architecture in action (aia)** mit dem Motto entstanden, Zielarchitektur einfacher erklären können.

Die Kernelemente von **architecture in action (aia)** sind:

- Kombination aus **Komponenten‑Diagramm** und **Sequenz‑Diagramm**
- **3D‑Komponentenmodell** mit Verbindungen (*connections*)
- **animierte Datenflüsse** entlang dieser Verbindungen

Gegenüber den üblichen 2D‑UML‑Diagrammen sollen hier **4D‑Darstellungen** (3D plus Zeit, also die Koordinaten `x, y, z, t`) mehr Interesse wecken und zusätzliche „Spannungsmomente“ bieten.

## Technologiegrundlage: THREE.js

Das Programm ist in **JavaScript** realisiert und basiert auf der 3D‑Library **[THREE.js](https://threejs.org/)**:

- **THREE.js** ist eine etablierte, Open‑Source‑JavaScript‑Bibliothek zur 3D‑Darstellung im Browser.
- Sie kapselt die Komplexität von **WebGL** und bietet u.a.:
  - Szenen‑ und Kameraverwaltung,
  - Geometrien, Materialien und Lichtquellen,
  - Animationen und Interaktionen.
- Durch die Verwendung von THREE.js lässt sich **aia** leicht als **Web‑Applikation** auf einem geeigneten Server bereitstellen.

> Lizenzhinweis: Das Programm **aia** steht (geplant) unter der **Apache‑Lizenz** (z.B. Apache License, Version 2.0). Die konkrete Lizenzdatei sollte im jeweiligen GitHub‑Repository hinterlegt sein.

**Beispielbild (Platzhalter):**

> _Image_

---

# Interaktive Sicht auf das Modell

Der **aia‑Viewer** bietet eine interaktiv steuerbare 3D‑Ansicht. Über die Maus lässt sich das Modell:

- **drehen** (Orbit‑Bewegung),
- **verschieben** (Pan),
- **zoomen** (Zoom in/out).

Eine kurze Übersicht zu den Maus‑Interaktionen wird in der linken oberen Ecke des Viewers angezeigt und erleichtert insbesondere neuen Nutzern den Einstieg.

**Beispielausschnitt Interaktionen (Platzhalter):**

> _Image_

Zusätzlich stehen oben mittig Schaltflächen für vordefinierte Kameraperspektiven zur Verfügung:

- **Isometrisch**: „klassische“ Architekturansicht in 3D,
- **Oben**: Sicht von oben,
- **Front**: frontale Ansicht auf das Modell.

Damit lässt sich die Sicht auf die Architektur schnell an Zielgruppe und Gesprächssituation anpassen – etwa ein Überblick für Fachbereichs‑Stakeholder oder eine technische Detailansicht für Entwickler.

**Beispielausschnitt Perspektiven (Platzhalter):**

> _Image_

---

# Deklarativer Modell‑Ansatz

Der Viewer folgt einem **deklarativen Modell‑Ansatz**:

- Der **aia‑Viewer** liest ein **aia‑Modell** ein und stellt dieses im Browser interaktiv dar.
- Das **aia‑Modell** wird in **JSON‑Notation** definiert.

Anstatt die Architektur in einem Tool „zusammenzuklicken“, wird sie in einer strukturierten JSON‑Datei beschrieben. Diese dient als:

- **Single Source of Truth** für die Darstellung,
- potentieller **Export‑/Import‑Punkt** in andere Werkzeuge.

## Layer und Komponenten (Überblick)

Die wichtigsten Konzepte sind:

- **Layers**:  
  Architektur‑Ebenen entlang der **z‑Achse** (z.B. „Actors“, „Presentation“, „Business“, „Infrastructure“, „Data“).
- **Components**:  
  Bausteine innerhalb eines Layers (z.B. Services, Datenbanken, Queues, Scheduler, UIs, Akteure).

Jede Komponente besitzt u.a.:

- Position und Größe (`x`, `y`, `width`, `height`, `depth`)
- ein **Label** für die Darstellung (Zeilenumbrüche über `\n`, z.B. `"User\nService"`)
- einen **Type**, der die Form der Visualisierung bestimmt (z.B. `service`, `database`, `queue`, `actor`, `scheduler`)
- **Metadata** mit zusätzlichen Informationen (z.B. `owner`, `version`, `tech`, `criticality`)

Die Metadaten werden beim Klick auf eine Komponente **oben rechts** im Viewer angezeigt und erlauben so den Zugriff auf weitere Informationen ohne das Bild zu überfrachten.

> **Details zum JSON‑Aufbau (Attribute, Typen, Beispiele)**  
> siehe **Modellierungsanleitung für aia‑Modelle** in den Referenzen.

## Typen (Kurzüberblick)

Aktuell werden folgende Typen unterstützt:

- `service` → als Box
- `database` → als stehender Zylinder
- `queue` → als liegender Zylinder
- `actor` → als Spielfigur
- `scheduler` → als Uhr

Ein optionales Farbschema pro Typ wird über `typeStyles` definiert (z.B. Services in Grün, Datenbanken in Rot, Frontend in Blau).

## Unterstützung durch das Grid

Zur Hilfestellung bei der Modellierung kann ein **Grid** eingeblendet werden (Checkbox oben mittig):

- Das Grid erleichtert das **Ausrichten** und **Abmessen** von Komponenten.
- Für Modellierungs‑Workshops oder Live‑Refactorings lässt sich das Grid schnell ein‑ oder ausblenden.

**Beispielbild zur Modellansicht (Platzhalter):**

> _Image_

## Perspektive: Interaktiver Modellierungsmodus

Derzeit werden aia‑Modelle rein **deklarativ** in JSON gepflegt. In einer möglichen Ausbaustufe ist ein **interaktiver Modellierungsmodus** denkbar:

- Komponenten und Verbindungen werden direkt im Viewer platziert.
- Änderungen werden automatisch zurück in das JSON‑Modell geschrieben.

Dies würde insbesondere für nicht‑technische Anwender und Moderatoren in Workshops einen deutlich niedrigeren Einstieg ermöglichen.

---

# Laden der Modelle

Für den Einsatz im Projektkontext kann der aia‑Viewer mit einer **Vorauswahl von Modellen** bereitgestellt werden:

- Diese Modelle werden gemeinsam mit dem Viewer bereitgestellt.
- Sie sind dann **links unten** im Viewer über eine Auswahl (z.B. Dropdown, Liste) wählbar.

**Beispielausschnitt Modell‑Auswahl(Platzhalter):**

> _Image_

Zusätzlich können Benutzer eigene Modelle dynamisch laden:

- Über den Button **„Laden Modell“** (rechts unten) kann ein loka­les JSON‑Modell ausgewählt werden.
- So lassen sich unterschiedliche Architekturvarianten oder Projektstände einfach im Browser betrachten – ohne Anpassung am Viewer selbst.

**Beispielausschnitt Laden Modell (Platzhalter):**

> _Image_

---

# Definition der Connections und der Datenfluss‑Animation

Ein Kernfeatures von **aia** ist die Darstellung von **Verbindungen** (*connections*), inklusive der Möglichkeit **animierter Datenflüsse** abspielen zu können.

## ConnectionGroups

Verbindungen werden in **ConnectionGroups** organisiert:

- Jede Gruppe bündelt thematisch zusammengehörige Verbindungen – etwa einen **Use Case** wie „User registrieren“, „Bestellung anlegen“ oder „Zahlung verarbeiten“.
- Die Gruppen lassen sich über ein Menü **rechts mittig** im Viewer einzeln zu‑ oder wegschalten und unterstützen so einen sukzessiven und strukturierten Walkthrough durch die Zielarchitektur.

Pro ConnectionGroup werden u.a. definiert:

- ein **Name** (z.B. „creating orders“),
- eine **Reihenfolge** (`order`) für die Reihenfolge einer gruppenübergreifenden Datenflussanimation,
- die Information, ob die Gruppe beim Laden des Modells initial **aktiv** sein soll (`active`),
- optional eine **Farbe**, die für alle Verbindungen dieser Gruppe verwendet wird.

**Beispielausschnitt ConnectionGroups‑Menü (Platzhalter):**

> _Image_

## Connections: Richtung und Verlauf

Jede Connection beschreibt eine Verbindung zwischen zwei Komponenten. Wichtige Aspekte:

- **Kommunikationsrichtung**:
  - Felder `from` und `to` definieren **Sender** und **Empfänger** – und damit auch die Pfeilrichtung im Diagramm.
- **Datenflussrichtung für die Animation**:
  - Über das Feld `direction` wird gesteuert, in welche Richtung die **Datenfluss‑Animation** entlang des Pfades läuft:
    - `outbound` (Standard): animierte Daten fließen von `from` nach `to`.
    - `inbound`: animierte Daten fließen visuell in umgekehrter Richtung (von `to` nach `from`).
- **Pfadgeometrie**:
  - Optional kann eine direkte Verbindung zusätzlich über eine Liste von 3D‑Punkten (*Pathpoints*) geführt werden, um z.B. einen Bogen um andere Komponenten herum zu machen oder bestimmte Ebenen in der Architektur zu betonen.
- **Technische Details und Lastinformationen**:
  - `type` und `protocol` beschreiben die Art und Technologie der Verbindung (z.B. **REST/HTTPS**, **amqp**, **JDBC**).
  - `throughput` kann verwendet werden, um Lastgrößen (z.B. „800 req/min“) anzugeben.
  - Ein optionales `label` dient zur Beschriftung bei der Datenflußanimation.

> Eine detaillierte Beschreibung aller Connection‑Attribute (inkl. `begin`, `end`, `points`) findet sich in der **Modellierungsanleitung für aia‑Modelle**, siehe Referenzen unten.

## Datenfluss‑Animation als lebendiges Sequenzdiagramm

Die definierten Connections dienen gleichzeitig als Basis für **Datenfluss‑Animationen** – im Sinne eines lebendigen Sequenzdiagramms:

- Es werden die **aktiven ConnectionGroups** berücksichtigt.
- Innerhalb jeder ConnectionGroup wird die Reihenfolge der einzelnen Connections über deren `order`-Attribut bestimmt.
- Die Animation kann so Schritt für Schritt zeigen:
  - welcher Actor welches Frontend anspricht,
  - welche Services beteiligt sind,
  - welche Datenbanken, Queues oder Scheduler ins Spiel kommen.

Damit kann man:

- die prozessuale Aspekte einer Zielarchitektur sukzessive betrachten oder erläutern,
- die Sicht bei Bedarf auf einzelne Use Cases oder Teilprozesse fokussieren,
- und die Darstellung jederzeit wieder auf die Gesamtarchitektur erweitern.

## Steuerung der Datenfluss‑Animation

Die Animation wird über das Schalterfeld **unten mittig** gesteuert:

- **Play**  
  Startet die automatische Abfolge der definierten Datenflüsse entsprechend der Connection‑Reihenfolge in den aktiven ConnectionGroups.
- **Stop**  
  Beendet die automatische Animation.
- **Next**  
  Schaltet zum nächsten Schritt / zur nächsten Connection.
- **Prev.**  
  Schaltet zurück zur vorherigen Connection.

**Beispielausschnitt Animations‑Steuerung (Platzhalter):**

> _Image_

---

# Zusammenfassung

**architecture in action (aia)** zeigt hier prototypisch einen alternative Ansatz, um Software‑Architektur zu erklären:

- Darstellung von Architektur als **4D‑Modell** (3D + Zeit),
- Kombination von **Komponenten‑ und Sequenzdiagramm** in einem,
- Nutzung eines **deklarativen JSON‑Modells** als Basis.

Trotz des prototypischen Charakters kann dieser Ansatz helfen, auch komplexere Zielarchitekturen:

- **anschaulich**,
- **strukturiert** und
- **zielgruppengerecht**

zu präsentieren – oft verständlicher und einprägsamer als das klassische 2D‑Standarddarstellungen vermögen.

Über:

- die **Kameraperspektive** (Isometrisch, Oben, Front),
- das gezielte Zu‑ und Abschalten von **ConnectionGroups**,
- und die **Datenfluss‑Animation**

lässt sich die Komplexität dynamisch fein dosieren und so an unterschiedliche Stakeholder anpassen – vom Entwickler bis zum Management.

---

# Referenzen

- **Modellierungsanleitung für aia‑Modelle**  
  (TODO: Link zum Dokument im GitHub‑Repository, z.B. `docs/aia-modelling-guide.md`)

- **GitHub‑Repository des Programms**  
  (TODO: Link zum aia‑Viewer auf dem GitHub‑Account, z.B. `https://github.com/<org>/aia-viewer`)

- **THREE.js**  
  <https://threejs.org/>
