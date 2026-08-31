# ZChart Core / Pro — Arbeits-Workflow & Audit-Trail

**Version:** 2.0.0 | **Aktualisiert:** 2026-08-18 | Gehört zu: [roadmap.md](roadmap.md)

> **Modellwechsel 2026-08-18 (User-Entscheidung):** Kein Subtree, kein Export-Script, keine Änderungen am trading-dashboard. ZChart Core und Pro sind **eigenständige Projekte**, die mit dem Dashboard-Code als *Vorlage* neu aufgebaut werden (abschreiben + anpassen, nicht 1:1 spiegeln). v1.0.0 dieser Datei (Subtree-/Lockstep-Modell) ist obsolet.

---

## 1. Repos & Rollen

| Projekt | Lokal | GitHub | Rolle |
|---|---|---|---|
| **trading-dashboard** | `…\trading-dashboard` | privat | **Nur-Lese-Vorlage.** Wird für Core/Pro NICHT verändert — kein Code-Umzug, keine Ordner, keine gitignore-Einträge. Engine-Referenz: `react-app/src/zchart/`, UI-Referenz: `react-app/src/pages/charts/zchart/`. |
| **ZChart Core** | `J:\07 VPS Server\04 ZChart` | [kurtkrausee/ZChart](https://github.com/kurtkrausee/ZChart) (public, MIT) | Eigenständiges Projekt mit eigener Struktur. Code wird aus der Dashboard-Engine **übertragen und dabei angepasst** (Dashboard-Reste raus, API geglättet). |
| **ZChart Pro** | `J:\07 VPS Server\05 ZChart-Pro` | [kurtkrausee/zchart-pro](https://github.com/kurtkrausee/zchart-pro) (privat, kommerziell) | Eigenständiges Projekt, hängt an Core (Dependency). Pro-Inhalte ebenfalls aus dem Dashboard übertragen. |

**Grundregeln:**
1. **Dashboard bleibt unangetastet.** Alle Anpassungen, die der Transfer nötig macht (Broker-/Journal-Bezüge entfernen, `utils/timezone`-Funktionen, Typ-Definitionen), passieren auf Core-/Pro-Seite.
2. **Übertragen heißt portieren, nicht kopieren.** Struktur, Namen und API dürfen in Core besser sein als im Dashboard. Die Abgrenzung Core↔Pro folgt [roadmap.md §2/§3](roadmap.md).
3. **Kein Rückfluss-Automatismus.** Dashboard und Core entwickeln sich nach dem Transfer unabhängig. Verbesserungen aus dem Dashboard werden bei Bedarf **manuell nachportiert** (und umgekehrt gute Core-Ideen ins Dashboard). Jeder Port wird im SYNC_LOG festgehalten (§3).
4. **Pro nutzt Core nur als Dependency** (`file:`-Link lokal in der Aufbauphase, später npm `@kurtkrausee/zchart`). Kein Core-Code in Pro duplizieren (Lizenz-Sauberkeit MIT vs. kommerziell).

## 2. Arbeitsablauf je Baustein (Core-Aufbau, später Pro)

Pro Arbeitspaket (z.B. „Scales + Achsen", „Tool-Framework", „Basis-Indikatoren"):
1. Referenz-Dateien im Dashboard lesen (`react-app/src/zchart/…`).
2. In Core portieren: Dashboard-spezifisches entfernen, ggf. vereinfachen/umbenennen, Datei-Header mit Versionszeile.
3. Tests portieren/schreiben (Vitest), `npm run build` + Tests grün.
4. Demo-Seite aktualisiert (der sichtbare Beweis, dass das Paket ohne Dashboard läuft).
5. Commit im Core-Repo: `core: <was> (ZC-P<n>)` — Meldung nennt die Dashboard-Quelle (`portiert aus zchart/<pfad>, Dashboard-Stand <kurz-sha>`).
6. Audit-Zeile in [roadmap.md §6](roadmap.md) (liegt hier im Core-Repo) + Eintrag im SYNC_LOG des Ziel-Repos.
7. Push. GitHub-Releases: Arbeitsstand auf `dev`, Release per PR `dev → main` + Tag.

## 3. Audit-Trail

| Ebene | Wo | Inhalt |
|---|---|---|
| Gesamt-Überblick | Core-Repo: [roadmap.md §6](roadmap.md) (2026-08-18 aus dem Dashboard hierher umgezogen) | Datum · Phase · Repo · Kurz-SHA · Beschreibung + Verify (wie jede Feature-Roadmap) |
| **SYNC_LOG.md** | Core-Repo und Pro-Repo (Wurzel) | Herkunfts-Nachweis je Port: `Datum · Bereich · Dashboard-Commit <sha> · portierte Dateien/Umfang · Abweichungen von der Vorlage` |
| CHANGELOG.md | Core-Repo (public) / Pro-Repo | Nutzer-Sicht je Release (Added/Changed/Fixed/Breaking), keine internen SHAs |

Das SYNC_LOG beantwortet später die Frage „auf welchem Dashboard-Stand basiert diese Datei, und was wurde bewusst anders gemacht?" — wichtig, wenn im Dashboard ein Bug gefixt wird und wir wissen wollen, ob Core ihn auch hat.

## 4. Versionierung & Veröffentlichung

- Core: SemVer ab `v2.0.0` (Neuaufbau; alter Stand vorher als Tag `v1-legacy` gesichert). Major = Public-API-Bruch, Minor = neue Nodes/Tools/API, Patch = Bugfix.
- Pro: eigene SemVer, `peerDependency` nennt die minimal nötige Core-Version.
- Veröffentlichung Core: GitHub-Release + `npm publish` (public). Pro: privates Paket/Lizenzweg (Entscheidung in P5).

## 5. Sonderfälle

- **Bugfix im Dashboard, den Core auch braucht** (oder umgekehrt): manuell nachportieren, SYNC_LOG-Eintrag mit beiden Commits.
- **Externe PRs auf Core:** normal reviewen/mergen (Core ist eigenständig). Gute Fixes bei Gelegenheit ins Dashboard nachziehen (SYNC_LOG „reverse").
- **Parallel-Sessions:** Core-/Pro-Repos haben eigene Working Trees — die Git-Index-Falle des Dashboards gilt dort nicht; das Dashboard wird für dieses Vorhaben gar nicht mehr angefasst (Doku lebt seit 2026-08-18 hier).

## 6. Audit-Trail dieser Datei

| Datum | Commit | Änderung |
|---|---|---|
| 2026-08-18 | 7ceefb9e | v1.0.0: Subtree-/Lockstep-Modell (obsolet) |
| 2026-08-18 | – | v2.0.0: Modellwechsel auf eigenständige Projekte + manuelles Portieren (User-Klarstellung: Dashboard unangetastet, Code nur als Vorlage) |
