# Fix za "Invalid Date" problem u grafiku

## Problem

Na deploymentu se prikazuje "Invalid Date" na grafiku umesto pravilnih datuma.

## Uzrok

Excel serial brojevi se ne konvertuju pravilno u datume zbog:

1. Nedostajuće validacije ulaznih podataka
2. Nedostajućeg error handling-a za neispravne serial brojeve
3. Nedostajućeg fallback-a za neispravne datume

## Rešenje

### 1. Poboljšana validacija u `excelSerialToMonthYear` funkciji

- Dodana validacija za null/undefined/NaN vrednosti
- Dodana provera da li je rezultujući datum validan
- Dodana provera da li je datum u razumnom opsegu (1900 - trenutna godina + 10)

### 2. Poboljšano rukovanje u `formatDataForChart` funkciji

- Neispravni datumi se grupišu u "Invalid Date" kategoriju
- Dodano logovanje za debug svrhe
- Dodana analiza datuma za bolje razumevanje problema

### 3. Dodana utility funkcija `analyzeDateData`

- Analizira sve datume u grupi
- Prikazuje statistike o validnim/neispravnim datumima
- Pomaže u identifikaciji problema sa podacima

## Kako koristiti

1. Otvorite Developer Tools (F12) u browseru
2. Idite na Console tab
3. Pokrenite kalkulaciju koja generiše grafike
4. Pogledajte console logove za:
   - "Date Analysis for Group X" - detaljnu analizu datuma
   - "Raw date values" - originalne Excel serial vrednosti
   - "Converted labels" - konvertovane datume
   - Warning poruke za neispravne datume

## Debug informacije

Console će prikazati:

- Ukupan broj datuma u grupi
- Broj validnih datuma
- Broj neispravnih datuma
- Min/max serial vrednosti
- Broj jedinstvenih vrednosti
- Primer vrednosti

## Rezultat

- Neispravni datumi se sada prikazuju kao "Invalid Date" kategorija
- Validni datumi se prikazuju u formatu "Month YYYY"
- Console logovi pomažu u identifikaciji problema sa podacima
- Grafikon je stabilan i neće se rušiti zbog neispravnih datuma
