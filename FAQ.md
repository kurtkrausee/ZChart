ZChart - Kurzübersicht für die Migration
1. Was ist der Hauptunterschied zu KLineChart?
ZChart ist ein reiner "Dumb View". Er berechnet keine API-Requests und baut keine HTML-Overlays. Er zeichnet nur das, was man ihm über die ZChartAPI sagt.

2. Wie werden Koordinaten gespeichert?
Wir nutzen kein Pixel-System, sondern ein Logical Coordinate System:

X: Index der Kerze (0, 1, 2...).

Y: Der reale Preis (z.B. 1.0850).
Dadurch bleiben Zeichnungen beim Zoomen und Verschieben immer an der richtigen Kerze "kleben".

3. Wie funktioniert der Daten-Import?
Der Server liefert Timestamps. Die API nutzt die timeToIndex Methode der TimeScale, um diese Timestamps in die internen Indizes umzurechnen.

4. Wie füge ich neue Indikatoren hinzu?
Einfach eine neue Klasse im Ordner nodes/indicators/ erstellen, die eine draw() Methode besitzt. Diese wird dann der entsprechenden Pane hinzugefügt.