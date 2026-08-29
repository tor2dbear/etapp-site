---
title: Demofixturen driver isär från produkten
status: later
tags: [demo, ci]
updated: 2026-08-29
---

## Goal
Demot på `/demo` ska visa produkten som den är i dag, utan att någon behöver komma
ihåg att uppdatera fixturen.

## Research

Speglingen i `tor2dbear/roadmap` (`.github/workflows/sync-product.yml`) kopierar
`app.js`, `styles.css`, `index.html` och `fonts/` till `demo/` vid varje push till
`main`. Den kopierar **inte** `demo/data/`, som byggs av `demo/data/build.mjs` och
underhålls för hand här.

Motorn hålls alltså i takt automatiskt medan datan den kör på inte gör det. Det är
inte en glömska — **det är formen**: koden har en spegel, fixturen har ingen.

Vad det kostade senast (2026-08-29, mätt innan den lagades):

| | |
|---|---|
| fixturens ålder | 13 dagar |
| etapper (`parent`/rollup) | 0 av 14 puckar |
| `target` · `priority` · `agent` | 0 · 0 · 0 |
| sparade vyer | saknades |

Följden var att **Etapps-vyn var tom, Standalone identisk med All pucks, och
Agents-sektionen tom** — i en produkt som heter Etapp. Landningssidan sålde
dessutom §04 *"Route to a specialist — set `agent: backend`"*, som demot inte kunde
visa. Fixturen är omskriven nu, men ingenting hindrar att samma sak händer igen om
tre veckor.

### Riktningar

- **Generera fixturen ur produktens egen form.** Ett schema eller en generator som
  läser vilka fält harvestern producerar, så en ny fält-typ dyker upp i demot utan
  handpåläggning. Dyrast, men den enda som faktiskt stänger glappet.
- **Låt speglingen röra fixturen.** Kör `npm run build:demo` i mirror-jobbet och
  committa resultatet. Billigt, men bygger bara om samma påhittade puckar — det
  fångar inte att ett *nytt* fält saknas i dem.
- **En kontroll som failar när fixturen saknar ett fält produkten renderar.** Ingen
  automatik, men den gör åldrandet synligt i stället för tyst. Kräver att repot får
  en testsvit alls — se `repot-har-ingen-testsvit`.

## Open questions
- Går det att härleda "vilka fält har produkten" ur `roadmap.json`s form utan att
  duplicera harvestern här?
- Ska demot ha *stabil* data (bra för skärmdumpar och för att kunna länka ett kort)
  eller *färsk* data (bra för sanning)? Dagens fixtur är stabil; en generator kan
  vara det också om fröet är fast.
- Hör det här hemma här eller i `tor2dbear/roadmap`? Fixturen bor här, men det är
  speglingen där som avgör vad som hålls i takt.
