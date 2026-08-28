# Orel Tenis Cup

Webová aplikace pro řízení tenisového turnaje Orel Tenis Cup Lichnov — tabulky, rozehrávky, archiv výsledků.

## Vývoj

```bash
npm run dev      # vývojový server (Vite)
npm run build    # produkční build
npm run lint     # oxlint
```

Archiv běží na Vercelu z `main` větve.

## Skripty pro import archivu

Ve složce [`scripts/`](scripts) jsou nástroje pro stahování archivních výsledků z `orellichnov.cz`:

| Příkaz | Popis |
|---|---|
| `npm run scrape:archiv` | Stáhne archivní HTML a parsuje do `archiv-data.json` |
| `node scripts/archiv-import.cjs [rok]` | Stáhne archiv pro daný rok a importuje přímo do Supabase |
| `node scripts/import-archive.cjs [rok]` | Importuje hotová archivní data do Supabase (pomocí lokálního Supabase klíče) |
| `node scripts/test_ctyrhra.mjs` | Testovací parsování čtyřhry |
| `node scripts/test_ctyrhra_axios.mjs` | Alternativní test s Axios |

## Deploy

Aplikace se nasazuje automaticky na [https://orel-tenis-cup.vercel.app/](https://orel-tenis-cup.vercel.app/) při pushi do `main`.
