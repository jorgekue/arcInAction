# architecture in action (aia) – 4D‑Sichten auf Software‑Architekturen

> Dieses Dokument beschreibt das Demo‑Programm **architecture in action (aia)** und sein Modellierungsprinzip.  
> Details zum JSON‑Datenmodell finden sich in der **Modellierungsanleitung**, siehe Referenzen.

# Inhalt
- [Motivation](#motivation)
- [Interaktive Sicht auf das Modell](#interaktive-sicht-auf-das-modell)
- [Deklarativer Modell‑Ansatz](#deklarativer-modell‑ansatz)
- [Laden der Modelle](#laden-der-modelle)
- [Definition der Connections und der Datenfluss‑Animation](#definition-der-connections-und-der-datenfluss‑animation)
- [Reduktion der Modellierungskomplexität mit KI-Unterstützung](#reduktion-der-modellierungskomplexität-mit-ki-unterstützung)
- [Zusammenfassung und Fazit](#zusammenfassung-und-fazit)
- [Über den Autor](#über-den-Autor)
- [Referenzen](#referenzen)
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

Die folgende Animation zeigt einige Features:

![architecture in action](/doc/img/arcInAction.gif)

_Bild: architecture in action._

Skript der Animation:
- Konzentration zunächst auf die ConnectionGroup `user registration`
- Datenfluss der `user registration` per Play-Button ausgelöst.
- Nun Fokussierung auf die ConnectionGroup `creating orders` und `processing payments`
- Datenfluss per Play-Button ausgelöst.
- Per Klick auf DB-Komponente Anzeige der Metadaten oben rechts.
- Grid an- und ausgeschaltet.
- Modell wird geändert.
- Mausinteraktionen: Drehen, verschieben, zoomen
- Perspektiven ändern: Oben, Front, Iso

---

# Interaktive Sicht auf das Modell

Der **aia‑Viewer** bietet eine interaktiv steuerbare 3D‑Ansicht. Über die Maus lässt sich das Modell:

- **drehen** (Orbit‑Bewegung),
- **verschieben** (Pan),
- **zoomen** (Zoom in/out).

Eine kurze Übersicht zu den Maus‑Interaktionen wird in der linken oberen Ecke des Viewers angezeigt und erleichtert insbesondere neuen Nutzern den Einstieg.

![mouse interactions](/doc/img/mouseInteractions.gif)

_Bild: Interaktionen mit der Maus._

Zusätzlich stehen oben mittig Schaltflächen für vordefinierte Kameraperspektiven zur Verfügung:

- **Isometrisch**: „klassische“ Architekturansicht in 3D,
- **Oben**: Sicht von oben,
- **Front**: frontale Ansicht auf das Modell.

Damit lässt sich die Sicht auf die Architektur schnell an Zielgruppe und Gesprächssituation anpassen – etwa ein Überblick für Fachbereichs‑Stakeholder oder eine technische Detailansicht für Entwickler.

![Vordefinierte Perspektiven](/doc/img/perspectives.gif)

_Bild: Vordefinierte Perspektiven._

---

# Deklarativer Modell‑Ansatz

Der Viewer folgt einem **deklarativen Modell‑Ansatz**:

- Der **aia‑Viewer** liest ein **aia‑Modell** ein und stellt dieses im Browser interaktiv dar.
- Das **aia‑Modell** wird in **JSON‑Notation** definiert.

Anstatt die Architektur in einem Tool „zusammenzuklicken“, wird sie in einer strukturierten JSON‑Datei beschrieben. Diese dient als:

- **Single Source of Truth** für die Darstellung,
- potentieller **Export‑/Import‑Punkt** in andere Werkzeuge.

Dieses Konzept des deklarativen Ansatzes mag der eine oder andere vielleicht aus der Erstellung von Sequenzdiagrammen mit dem Tool plantuml kennen, Referenz dazu siehe unten.

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

![Grid für Modellierung](/doc/img/gridButton.gif)

_Bild: Grid für Modellierung._

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

![Vorauswahl Modelle](/doc/img/predefinedModels.gif)

_Bild: Vorauswahl Modelle._

Zusätzlich können Benutzer eigene Modelle dynamisch laden:

- Über den Button **„Laden Modell“** (rechts unten) kann ein loka­les JSON‑Modell ausgewählt werden.
- So lassen sich unterschiedliche Architekturvarianten oder Projektstände einfach im Browser betrachten – ohne Anpassung am Viewer selbst.

![Individuelle Modelle laden](/doc/img/loadModel.gif)

_Bild: Individuelle Modelle laden._

---

# Definition der Connections und der Datenfluss‑Animation

Ein Kernfeatures von **aia** ist die Darstellung von **Verbindungen** (*connections*), inklusive der Möglichkeit **animierter Datenflüsse** abspielen zu können.

## ConnectionGroups

Verbindungen werden in **ConnectionGroups** organisiert:

- Jede Gruppe bündelt thematisch zusammengehörige Verbindungen – etwa einen **Use Case** wie „User registrieren“, „Bestellung anlegen“ oder „Zahlung verarbeiten“.
- Die Gruppen lassen sich über ein Menü **rechts mittig** im Viewer einzeln zu‑ oder wegschalten und unterstützen so einen sukzessiven und strukturierten Walkthrough durch die Zielarchitektur.

Der Bereich ConnectionGroups ist dabei aufgeteilt in:

- einen **fixen Kopfbereich** mit dem Master‑Schalter `all groups`,
- zwei Radio‑Optionen für den Sichtbarkeitsmodus:
  - `only connections`
  - `connections & components`
- sowie eine **scrollbare Liste** der einzelnen Gruppen.

Mit `connections & components` blendet der Viewer zusätzlich Komponenten aus, die von den aktuell aktiven Gruppen nicht referenziert werden. Das erhöht die Übersichtlichkeit beim Fokus auf einzelne Abläufe deutlich.

Pro ConnectionGroup werden u.a. definiert:

- ein **Name** (z.B. „creating orders“),
- eine **Reihenfolge** (`order`) für die Reihenfolge einer gruppenübergreifenden Datenflussanimation,
- die Information, ob die Gruppe beim Laden des Modells initial **aktiv** sein soll (`active`),
- optional eine **Farbe**, die für alle Verbindungen dieser Gruppe verwendet wird.

Der initiale Sichtbarkeitsmodus kann optional im Modell unter `settings` über `selectConnectionsAndComponents` konfiguriert werden (Default: `false`).

![Connections Groups](/doc/img/connectionGroups.gif)

_Bild: Connections Groups._

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

![Animationssteuerung](/doc/img/animationControls.gif)

_Bild: Animations‑Steuerung._

---
# Reduktion der Modellierungskomplexität mit KI-Unterstützung

Mit wachsender Architektur steigt der Aufwand, konsistente aia‑Modelle manuell in JSON zu pflegen. KI‑Werkzeuge können hier helfen, die **Komplexität der Modellierung** deutlich zu reduzieren, ohne auf fachliche Qualität zu verzichten.

## GitHub‑Agenten als Modellierungsassistent

In VS Code können GitHub‑Agenten (z.B. im „Build with Agent Mode“) als spezialisierte **Modellierungsassistenten** eingerichtet werden. Die Idee:

- Im Repository werden **Kontextdateien** gepflegt, z.B.:
  - ein Style‑Guide für die JSON‑Struktur (`layers`, `components`, `connectionGroups`, `typeStyles`),
  - eine Mapping‑Beschreibung, wie PlantUML‑Elemente auf aia‑Komponenten abgebildet werden,
  - eine Modellierungsbeschreibung bzw. dieser Artikel.
- Ein Agent („aia‑Model‑Agent“) nutzt diese Dateien als **feste Regeln und Beispiele**, um:
  - aus textuellen Beschreibungen oder
  - aus PlantUML‑Sequenzdiagrammen  
  automatisch **aia‑konforme JSON‑Modelle** zu erzeugen.

Routineaufgaben wie das Anlegen von Layern, Standard‑Typen (`frontend`, `service`, `database`), ID‑Schemata (z.B. `UI1`, `S1`, `DB1`) und Metadaten (z.B. „Java/JEE“) übernimmt der Agent. Der Modellierer fokussiert sich stärker auf fachliche Struktur und Beziehungen.

## PlantUML als Ausgangs- und Zwischenformat

Viele Teams nutzen bereits **PlantUML‑Sequenzdiagramme**, um Abläufe zwischen Akteuren, UI, Services und Datenbanken zu beschreiben. Diese Diagramme eignen sich als **Ausgangspunkt und Zwischenstufe** für `aia`‑Modelle:

1. Fachliche Abläufe werden in PlantUML formuliert oder verfeinert.
2. Ein GitHub‑Agent transformiert das Sequenzdiagramm in ein aia‑JSON‑Modell, indem er:
   - Teilnehmer (actor, participant, database) passenden Layern und Typen zuordnet,
   - IDs und Labels gemäß der Modellierungskonventionen erzeugt,
   - die Nachrichten im Sequenzdiagramm in `connectionGroups` und `connections` überführt.
3. Das resultierende Modell wird im `aia`‑Viewer geladen und bei Bedarf manuell ergänzt (Layout, weitere Flows, Metadaten).

Damit dient PlantUML als **kompakte, textuelle Beschreibung**, während der Agent die Übersetzung in das detaillierte JSON übernimmt. Änderungen erfolgen primär im Sequenzdiagramm und werden bei Bedarf erneut in ein aktuelles `aia`‑Modell überführt.

---

# Availability on GitHub Pages

Für Interessenten ist die schnellste Möglichkeit, das Programm direkt zu nutzen, über GitHub Pages:

https://jorgekue.github.io/arcInAction/aiaViewer.html

---

# Zusammenfassung und Fazit

**architecture in action (aia)** zeigt einen alternativen Ansatz, um Software‑Architekturen zu erklären: Architektur wird als **4D‑Modell** (3D + Zeit) visualisiert, kombiniert Elemente aus **Komponenten‑ und Sequenzdiagrammen** in einem Bild und nutzt ein **deklaratives JSON‑Modell** als Grundlage. So lassen sich auch komplexe Zielarchitekturen anschaulich, strukturiert und zielgruppengerecht vermitteln – oft klarer als mit klassischen 2D‑Darstellungen.

Über verschiedene **Kameraperspektiven**, das gezielte Zu‑ und Abschalten von **ConnectionGroups** und **Datenfluss‑Animationen** kann die dargestellte Komplexität fein dosiert und an unterschiedliche Stakeholder angepasst werden – von der Entwicklung bis zum Management.

**KI‑gestützte Agenten** wirken dabei als **Modellierungsassistenz**: Sie automatisieren formale und syntaktische Schritte, sichern Konventionen und Konsistenz und senken die Einstiegshürde, `aia`‑Modelle zu erstellen oder zu pflegen. In Kombination mit **PlantUML** als textuellem Format, einem GitHub‑Agenten als Transformator und dem `aia`‑Viewer als Visualisierung entsteht ein durchgängiger Weg von der textuellen Interaktionsbeschreibung zum 4D‑Modell – bei deutlich reduziertem manuellen Aufwand und besser beherrschbarer Modellierungskomplexität.

---

# Über den Autor

Jürgen Kürpig ist Software Architect bei der adesso insurance solutions und unterstützt seit vielen Jahren java-basierte IT-Projekte in unterschiedlichen Rollen in den Themengebieten Architektur, Integration, Konzepterstellung und Projektmethodik.

Juergen.Kuerpig@adesso-insurance-solutions.de

---

# Referenzen

- **Live Viewer (GitHub Pages)**  
  https://jorgekue.github.io/arcInAction/aiaViewer.html

- **Modellierungsanleitung für aia‑Modelle**  
  [Modellierungsanleitung](/doc/german/modelingInstructions.md)

- **GitHub‑Repository des Programms**  
  [arcInAction](https://github.com/jorgekue/arcInAction)

- **THREE.js**  
  <https://threejs.org/>

- **PlantUML: Open-Source-Werkzeug zur textuellen Beschreibung von UML-Diagrammen (u.a. Sequenzdiagramme)**  
  <https://plantuml.com>


