# Interaktive Modellierung (Edit-Modus)

> Diese Referenz beschreibt den interaktiven Edit-Modus im aia-Viewer.

## Zielbild

Der Edit-Modus ermöglicht die interaktive Bearbeitung von Verbindungsverläufen (Connection-Pathpoints), ohne das JSON manuell editieren zu müssen.

## Aktivierung

- Der Dev-/Edit-Modus ist standardmäßig nicht sichtbar.
- Sichtbar wird er nur, wenn er in der Modell-Datei unter settings explizit gesetzt ist:

```json
{
  "settings": {
    "developerMode": true
  }
}
```

## Bedienung (aktueller Stand)

Voraussetzung:
- Dev mode ist aktiviert.
- Eine Connection ist ausgewählt.

### 1. Connection auswählen

- Linksklick auf eine sichtbare Verbindung, um sie für die Bearbeitung zu selektieren.

### 2. Punkte einfügen

- Shift + Linksklick fügt einen neuen Punkt auf der selektierten Linie ein.
- Der Einfügepunkt wird als Hover-Vorschau angezeigt.

### 3. Punkte verschieben

- Vorhandenen Punkt anklicken und ziehen.
- Die Mausbewegung wird perspektivisch korrekt in 3D umgesetzt.
- Positionen werden auf ein 0.5er Raster gesnappt.

### 4. Punkte entfernen

- Aktiven Punkt selektieren.
- Delete oder Backspace drücken.

### 5. Selektion aufheben

- Escape drücken.

## Undo / Redo

- Ctrl+Z: Undo
- Ctrl+Y oder Ctrl+Shift+Z: Redo

Eigenschaften:
- Undo/Redo arbeitet über die laufende Edit-Session.
- Die Selektion (Connection + aktiver Punkt) wird mit der History wiederhergestellt.
- Die Selektion der ConnectionGroups bleibt bei Undo/Redo erhalten.
- Export löscht die Undo/Redo-History nicht.

Konfigurierbare Historientiefe:

```json
{
  "settings": {
    "undoRedoDepth": 50
  }
}
```

## Export

- Export JSON erzeugt eine Datei mit dem aktuellen In-Memory-Modellstand (inkl. geänderter points).
- Dateiname: bestehender Modellname mit Suffix -devmode.json.
- Der Export muss dann ggf. manuell in die Originaldatei übernommen werden.

## Verfügbare relevante Settings (Kurzübersicht)

```json
{
  "settings": {
    "developerMode": false,
    "undoRedoDepth": 50,
    "animateComponents": false,
    "showComponentPosition": false,
    "selectConnectionsAndComponents": false
  }
}
```

---

## Referenzen

- **Modellierungsanleitung für aia‑Modelle**  
  [Modellierungsanleitung](/doc/german/modelingInstructions.md)
