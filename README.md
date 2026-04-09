# Sezioni

Applicazione web per comporre sezioni stradali parametriche e scaricare un file SVG vettoriale in scala.

## Cosa fa

- compone sezioni urbane con carreggiate, ciclabili, marciapiedi, alberature, aiuole, prato, rain garden, sosta, spartitraffico e arredo urbano
- permette di modificare ogni fascia con slider o input numerico
- aggiorna in tempo reale l'anteprima quotata
- esporta il disegno in SVG scalato in millimetri alla scala scelta

## Stack

- Vite
- React 19
- TypeScript
- CSS custom

## Avvio locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run lint
```

## Note progettuali

- il file SVG viene generato con larghezze reali convertite in millimetri secondo la scala selezionata
- la simbologia interna resta leggera per mantenere il disegno pulito in tavola
- il layout e pensato per un uso rapido da desktop ma resta leggibile anche su mobile
