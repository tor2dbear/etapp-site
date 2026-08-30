---
title: Repot har ingen testsvit, och vakten hålls i takt för hand
status: later
tags: [ci, tooling]
updated: 2026-08-29
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

## Open questions
- Duplicera vakten (som i dag, med en kontroll som fångar drift) eller **hämta** den
  ur `tor2dbear/roadmap` vid bygget? Det senare tar bort kopian men lägger ett
  beroende mellan repon som inte finns i dag.
- Egen svit här, eller låta roadmap-repots svit köra mot den här sidan? Sajten är
  mestadels speglad kod — det unika är fixturen, landningssidan och `.assetsignore`.
- Räcker en GitHub Actions-workflow som kör vakten på varje PR, eller vill vi ha
  webbläsartester också? Den första är en timmes arbete och stoppar den kända
  återfallsrisken.
