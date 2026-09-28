# DataLake UI

Frontend React + TypeScript + Vite

## Requisiti

Sono richiesti **Node.js 20.19 o successivo (20.x), oppure Node.js 22.12 o superiore**, e **npm**.

## Setup

```bash
npm install
npm run dev
```

L'app viene eseguita su `http://localhost:5173`.

L'app inoltra le richieste verso il backend all'indirizzo `http://localhost:5000`




## Struttura

```text
src/
  api/                 chiamate HTTP e normalizzazione risposte backend
  components/
    layout/            shell, sidebar e protezione rotte
    ui/                componenti riusabili
  features/
    describe/          normalizzazione e risultati describe
    estimate/          normalizzazione e risultati estimate
    profile/           normalizzazione, risultati e grafici profile
  hooks/               auth store e caricamento utenti admin
  pages/
    admin/             pagine riservate agli amministratori
    user/              pagine per utenti autenticati
  router.tsx           rotte applicative e guard
```
