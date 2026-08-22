# DataLake UI

Frontend React + TypeScript + Vite

## Setup

```bash
npm install
npm run dev
```

L'app viene eseguita su `http://localhost:5173`.

L'app inoltra le richieste verso il backend all'indirizzo `http://localhost:5000`

```


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
    admin/             schermate riservate agli amministratori
    user/              schermate per utenti autenticati
  router.tsx           rotte applicative e guard
```

