# architecture in action (aia) – Architektur verständlicher machen

Wie lassen sich komplexe Software-Architekturen verständlich kommunizieren? Dieser Beitrag zeigt, wie architecture in action (aia) mit interaktiver 3D-Visualisierung, Datenflussdarstellung und KI-gestützter Modellierungsunterstützung Architekturarbeit im Projekteinsatz nachvollziehbarer und wirksamer macht.

## Motivation

In typischen IT-Projekten sollen nicht nur Techniker, sondern auch ein breiteres Publikum bei der Definition und Kommunikation einer Zielarchitektur informiert und mitgenommen werden. Klassische 2D-Diagramme (z.B. UML-Komponenten- und Sequenzdiagramme) sind hier oft entweder zu technisch oder visuell wenig ansprechend.

Aus der Projektarbeit heraus ist deshalb die Idee für eine altenative Darstellung von Architektur entstanden, das mit dem Demo-Programm architecture in action (aia) verprobt wurde: Zielarchitekturen nicht nur zu dokumentieren, sondern besser erlebbar und diskutierbar zu machen.

Der Ansatz dahinter ist bewusst praxisnah: Architektur wird nicht nur als statisches Bild betrachtet, sondern als Zusammenspiel von Struktur und Ablauf. Dadurch entsteht eine nachvollziehbare Architektur-Erzählung, die zentrale Fragen im Projektkontext unterstützt: Was gehört zusammen, wie greifen Teile ineinander und wie entwickelt sich ein Prozess über die Zeit?

Gerade in der Zusammenarbeit zwischen Fachlichkeit, IT und Entscheidungsebene hilft diese Sichtweise, Diskussionen zu versachlichen. Annahmen werden früher sichtbar, Unterschiede zwischen Zielbild und aktueller Situation lassen sich klarer benennen, und Architekturgespräche bleiben konstruktiv, ohne in unnötige Mikrodetails abzudriften.

Die Kernelemente sind die Verbindung aus Struktur- und Ablaufperspektive, dargestellt als 3D-Modell mit zeitlicher Dynamik. Diese 4D-Sicht (3D plus Zeit) schafft zusätzliche Orientierung und hilft, Zusammenhänge im Gesamtbild schneller zu verstehen.

Technologisch basiert aia auf JavaScript und THREE.js als etablierter Grundlage für interaktive 3D-Darstellungen im Browser.

![architecture in action](/doc/img/arcInAction.gif)

_Bild: architecture in action._

Skript der Animation:
- Konzentration zunächst auf die ConnectionGroup `user registration`
- Datenfluss der `user registration` per Play-Button ausgelöst.
- Nun Fokussierung auf die ConnectionGroup `creating orders` und `processing payments`
- Datenfluss per Play-Button ausgelöst.
- Im rechten oberen Panel werden pro aktuellem Verbindungsschritt Details angezeigt (id, protocol, from, to, label).
- Grid an- und ausgeschaltet.
- Modell wird geändert.
- Mausinteraktionen: Drehen, verschieben, zoomen
- Perspektiven ändern: Oben, Front, Iso

## Interaktive Sicht auf das Modell

Der aia-Viewer bietet eine interaktiv steuerbare 3D-Ansicht. Über die Maus lässt sich das Modell drehen, verschieben und zoomen. Damit können Architekturdiskussionen schrittweise geführt werden, ohne den Blick auf das Gesamtbild zu verlieren.

Zusätzlich stehen vordefinierte Kameraperspektiven zur Verfügung (z.B. Isometrisch, Oben, Front). So lässt sich die Darstellung schnell an unterschiedliche Kommunikationssituationen anpassen, vom Gesamtüberblick bis zur fokussierten Betrachtung.

## Deklarativer Modell-Ansatz

Der Viewer folgt einem deklarativen Modell-Ansatz: Das Architekturwissen wird in einem JSON-Modell beschrieben und daraus visualisiert. Die Struktur des Modells besteht grundsätzlich aus Komponenten, die in Layern organisiert sind, sowie Connections für die Datenverbindungen zwischen diesen Komponenten.

Neben der deklarativen Beschreibung gibt es einen interaktiven Edit-Modus für Connections. Damit kann die Linienführung direkt im Viewer nachgeschärft werden; ein einblendbares Grid unterstützt die präzise Modellierung.

## Connections und Datenfluss-Animation

Connections bilden Kommunikationsbeziehungen zwischen Komponenten ab und dienen gleichzeitig als Grundlage für die Datenfluss-Animation. Dabei werden Richtung, Verlauf und Metainformationen einer Verbindung sichtbar gemacht, sodass sowohl technische als auch fachliche Gespräche auf ein gemeinsames Bild referenzieren können.

Für größere Modelle werden Verbindungen in Gruppen organisiert. Das erlaubt es, gezielt auf einzelne Gruppen zu fokussieren und komplexe Diagramme schrittweise zu erklären, statt alles gleichzeitig zu zeigen.

## Reduktion der Modellierungskomplexität mit KI-Unterstützung

Mit wachsender Architektur steigt der Aufwand, konsistente aia-Modelle manuell in JSON zu pflegen. KI-Werkzeuge können hier helfen, die Komplexität der Modellierung deutlich zu reduzieren, ohne auf fachliche Qualität zu verzichten.

So können zum Beispiel Copilot-Agenten als spezialisierte Modellierungsassistenten eingerichtet werden. Kontextdateien im Repository - etwa für Strukturkonventionen, Mapping-Regeln und Modellierungsleitlinien - bilden dabei den stabilen Rahmen, in dem ein Agent aia-konforme Modelle erzeugt.

Routineaufgaben wie das Anlegen von Layern, Komponentenmustern und konsistenten IDs lassen sich dadurch weitgehend automatisieren. Der Modellierer kann sich stärker auf fachliche Struktur, Beziehungen und inhaltliche Schärfung konzentrieren.

Nutzt man schon eine textuelle Beschreibung seiner Architektur wie beispielsweise PlantUML-Diagramme, können diese dabei als textuelles Ausgangs- und Zwischenformat dienen, das durch den Agenten in ein aia-JSON-Modell überführt und anschließend im Viewer weiter verfeinert wird.

## Verfügbarkeit auf GitHub Pages

Für Interessenten ist die schnellste Möglichkeit, das Programm direkt zu nutzen, über GitHub Pages:

https://jorgekue.github.io/arcInAction/aiaViewer.html

## Zusammenfassung und Fazit

architecture in action (aia) zeigt einen alternativen Ansatz, um Software-Architekturen zu erklären: Architektur wird als 4D-Modell (3D + Zeit) visualisiert und verbindet Struktur- und Ablaufsicht in einem gemeinsamen Bild. So lassen sich auch komplexe Zielarchitekturen anschaulich, strukturiert und zielgruppengerecht vermitteln.

Für die Architekturarbeit ist das besonders relevant, weil es die gemeinsame Orientierung in komplexen Vorhaben stärkt, das Erklären von Zusammenhängen über Teamgrenzen hinweg erleichtert und ein Architekturverständnis fördert, das sowohl Struktur als auch Veränderung berücksichtigt.

Diese andere, deutlich haptischere Sichtweise führt eher zu konstruktivem Feedback, auch bei der eigenen Modellierung. Fehler, Unschärfen oder notwendige Ergänzungen fallen früher auf. Davon profitieren auch UML-Standardergebnistypen, weil die Beschreibung der Zielarchitektur zusätzlich qualitätsgesichert wird.

Im konkreten Projekteinsatz wurde dieser Ansatz durchweg positiv bewertet, insbesondere wegen der besseren Verständlichkeit in Abstimmungen zwischen Fachlichkeit und IT.

In Kombination mit KI-gestützter Modellierungsassistenz entsteht damit ein pragmatischer Weg, Architekturarbeit nachvollziehbarer, konsistenter und anschlussfähiger für unterschiedliche Stakeholder zu machen.

## Über den Autor

Jürgen Kürpig ist Software Architect bei der adesso insurance solutions und unterstützt seit vielen Jahren java-basierte IT-Projekte in unterschiedlichen Rollen in den Themengebieten Architektur, Integration, Konzepterstellung und Projektmethodik.

Juergen.Kuerpig@adesso-insurance-solutions.de

## Referenzen

- **Live Viewer (GitHub Pages)**
	https://jorgekue.github.io/arcInAction/aiaViewer.html

- **Modellierungsanleitung für aia-Modelle**
	[Modellierungsanleitung](/doc/german/modelingInstructions.md)

- **Interaktive Modellierung (Edit-Modus)**
	[Interaktive Modellierung](/doc/german/interactiveModelling.md)

- **GitHub-Repository des Programms**
	[arcInAction](https://github.com/jorgekue/arcInAction)

- **THREE.js**
	<https://threejs.org/>

- **PlantUML: Open-Source-Werkzeug zur textuellen Beschreibung von UML-Diagrammen (u.a. Sequenzdiagramme)**
	<https://plantuml.com>
