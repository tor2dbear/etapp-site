---
title: Repot har ingen testsvit, och vakten hålls i takt för hand
status: done
tags: [ci, tooling]
updated: 2026-08-31
---

## Goal
Ge det här repot ett eget nät, så att det som skyddar den publicerade bundlen inte
bara skyddar systerrepot.

## Research

`scripts/check-bundle.mjs` finns i två kopior — här och i `tor2dbear/roadmap` — och
hålls i takt **för hand**. Filens egen kommentar säger det rakt ut. `tor2dbear/roadmap`
har 387 kontroller varav några ligger direkt på vakten; här finns noll.

### Varför det inte är teoretiskt

Kopian här hade en bugg som kopian där aldrig kunde visa (2026-08-29):

> Mönstret matchades segment för segment, så `demo/data/build.mjs` jämfördes mot
> `demo`, `data` och `build.mjs` var för sig och matchade inget.

Inget mönster i roadmap-repots `.assetsignore` har ett snedstreck, så dess kontroller
kunde aldrig se felet. Det hittades bara för att någon råkade köra vakten här. Samma
runda hittade ytterligare två former som inte matchade (inledande snedstreck, och en
förankrad katalog som inte svarade för filerna under sig).

Vakten är dessutom det enda som står mellan repot och en upprepning av det som redan
hänt en gång: **113 spårade filer ur `node_modules/` låg publikt på
`etapp.tor2dbear.com`**, verifierade med HTTP 200. `.assetsignore` var inte tom — den
var oläst, för kommandot som skulle assertera den kördes aldrig.

### Vad ett nät här skulle täcka

- **Vakten själv** — mönstermatcharens former, och att `SERVED` matchar det som
  faktiskt ligger i repot.
- **Att kopiorna inte glider isär.** En kontroll som jämför den här filen mot
  systerrepots, eller ett steg som hämtar den i stället för att duplicera den.
- **Demot** — att `/demo` bootar, att demoläget inte skickar något till GitHub, att
  landningssidan inte spiller sidled. Allt det mäts i dag i roadmap-repots svit, mot
  en syntetisk fixtur, aldrig mot den här sidan.

### Vad som inte finns här

Repot har `playwright-core` som devDependency men ingen testkatalog, ingen runner och
ingen CI-workflow alls. Cloudflares Git-build är den enda automatiken, och den
bygger — den granskar inte.

## Delivered

Levererat mot **målet ovan** — repot har ett eget nät — men inte mot allt som står
under *"Vad ett nät här skulle täcka"*. Två av de tre punkterna är kvar: **en har en
egen puck, den andra har medvetet ingen.** Skälet till skillnaden står under **Vad som
inte gjordes** sist, och är värt att läsa innan man antar att allt kvarvarande är
spårat någonstans.

**15 kontroller på `node:test` och en `Check`-workflow** som kör dem plus vakten vid
varje PR och push till `main` ([#5](https://github.com/tor2dbear/etapp-site/pull/5)).
Inga beroenden — vakten är Node-builtins med flit, och sviten följer efter. Jobbet har
ingen `npm ci` och går på **9 sekunder**. Det körde på sin egen PR, alltså granskade
den koden som införde den.

Det stänger det pucken egentligen handlade om: vakten var påslagen genom **två
textfält i Cloudflares dashboard**. De var rätt ifyllda — verifierat 2026-08-31 med en
avsiktlig läcka som bygget vägrade — men ingen pull request kan se ett dashboard-fält.
Nu ligger kontrollen i repot, där den bara går att ta bort i en diff någon godkänner.

Testerna ligger där buggarna satt: mönstermatcharens fyra former, plus att slash-fria
mönster matchar på alla djup — inte en bugg, men något annat vilar på det numera.
Demodatan får konsistenskontroller (`counts` mot `items`, `sources.count` mot items per
repo, relationer som id:n som finns, `roadmap.js` mot `roadmap.json`) men **ingen
fältlista**: den datan genereras av harvestern sedan
`demofixturen-driver-isar-fran-produkten`, så en handhållen lista över vad den
producerar vore samma misstag på en ny plats.

### Sviten hittade en bugg i vakten, vilket var hela poängen

`auditBundle()` bygger varje sökväg med strängkonkatenering — `walk()` också — så roten
**måste** sluta med snedstreck. Enda anroparen skickar
`fileURLToPath(new URL("..", import.meta.url))`, som alltid gör det. Anropad med en
vanlig katalogsökväg svarade den:

> no .assetsignore — every file in the repo would be published

Vaktens allra högsta larm, om ett repo vars `.assetsignore` låg där hela tiden. En vakt
som skriker varg om fel sak är sämre än en tyst: nästa gång den larmar tror man den
mindre. Fixad i båda kopiorna
([roadmap#34](https://github.com/tor2dbear/roadmap/pull/34)).

**Och varför roadmaps 387 kontroller aldrig kunde se den:** `ROOT` i
`tests/shipping.test.mjs` byggs med *samma uttryck som CLI:t*. Testet ärvde exakt det
antagande det skulle pröva, så hur många kontroller som än lades till gick var och en
genom samma dörr som koden. Samma lärdom som räknarsvepet och teckensvepet gav — fråga
källan, inte en kopia av den — men den här gången satt felet i **testet**.

Buggen hittades följaktligen inte där. Den hittades här, av det första testet någonsin
skrivet mot funktionen, av någon som skickade sökvägen på det uppenbara sättet.

### Vad som inte gjordes

Två av de tre punkterna under *"Vad ett nät här skulle täcka"*:

- **Att kopiorna inte glider isär.** Egen puck i verktygsrepot —
  `vakten-underhalls-i-tva-kopior` (`tor2dbear/roadmap`), eftersom fixen är speglingen
  och speglingen bor där.
- **Webbläsartester av demot.** Demots kod speglas från `tor2dbear/roadmap` och testas
  i dess svit; det unika här är fixturen och landningssidan. Ingen puck ännu — skriv en
  när något faktiskt går sönder, hellre än att gissa vad som skulle kunna.

## Answered

- **Duplicera eller hämta vakten?** *Ingetdera.* Frågan var fel ställd: en diff visade
  att filerna är 159 rader vardera och skiljer sig på ~20 — och **varenda** skiljande
  rad är en kommentar eller `SERVED`-kartan. Regelverket är identiskt tecken för tecken.
  Filen är alltså redan två saker, och bara den ena ska delas. Att *hämta* hela filen
  vid bygget vore dessutom fel form för en vakt: ett nätverksberoende som kan fallera
  öppet. Flyttat till `vakten-underhalls-i-tva-kopior` i `tor2dbear/roadmap`.
- **Egen svit här, eller roadmaps mot den här sidan?** Egen — men mindre än frågan
  antog. Det unika här visade sig vara `.assetsignore` och den committade demodatan,
  båda snabba och webbläsarlösa. Efter delningen ovan äger repot bara tio rader
  konfiguration, och roadmaps svit är rätt plats för regelverket den delar.
- **Räcker en workflow, eller vill vi ha webbläsartester?** Workflowen räckte för det
  pucken var till för. Den stoppar den kända återfallsrisken, kör på nio sekunder, och
  fann en riktig bugg första gången den kördes. Webbläsartester är inte avfärdade, bara
  inte betalda för av något som gått sönder — se *Vad som inte gjordes*.
