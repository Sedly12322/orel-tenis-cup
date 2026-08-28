export const HRACI_SKUPINA_A = ["František Paľo", "Libor Stanislav", "Jan Matúš", "Vladimír Vašut", "Radek Petr", "Pavel Hazuka, ml.", "Dominik Sedlář", "Sidney Rek", "Vladislav Rek"];
export const HRACI_SKUPINA_B = ["Petr Osterezy", "Zdeněk Liška", "Jaromír Darivčák", "Přemysl Kahánek", "Tomáš Sedlář", "Jan Hrančík", "Lukáš Rafael Osterezy", "Jaroslav Jurek"];

// Čtyřhra - páry (fungují v tabulkách jako "hráči")
export const CTYRHRA_TYMY = [
  "Aleš Anderle / Petr Němec",
  "Sidney Rek / Kryštof Sedlář",
  "Jan Matúš / Tomáš Macháček",
  "Petr Osterezy / Zdeněk Liška",
  "Vladislav Rek / Tomáš Sedlář",
  "Dominik Sedlář / Libor Stanislav",
  "František Paľo / Lukáš Hubeňák",
  "Tomáš Kyselý / Martin Lacina"
];

// Seznam archivních ročníků
export const RODNICI = [
  { rok: 2025, popis: '17. ročník - 2025' },
  { rok: 2024, popis: '16. ročník - 2024' },
  { rok: 2023, popis: '15. ročník - 2023' },
  { rok: 2022, popis: '14. ročník - 2022' },
  { rok: 2021, popis: '13. ročník - 2021' },
  { rok: 2020, popis: '12. ročník - 2020' },
  { rok: 2019, popis: '11. ročník - 2019' },
  { rok: 2018, popis: '10. ročník - 2018' },
  { rok: 2017, popis: '9. ročník - 2017' },
  { rok: 2016, popis: '8. ročník - 2016' },
  { rok: 2015, popis: '7. ročník - 2015' },
  { rok: 2014, popis: '6. ročník - 2014' },
  { rok: 2013, popis: '5. ročník - 2013' },
  { rok: 2012, popis: '4. ročník - 2012' },
  { rok: 2011, popis: '3. ročník - 2011' },
  { rok: 2010, popis: '2. ročník - 2010' },
  { rok: 2009, popis: '1. ročník - 2009' },
];

/**
 * Univerzální normalizační funkce pro porovnávání jmen.
 * Odstraní diakritiku a převede na malá písmena.
 */
export const normalize = (s) => s.toLowerCase()
  .replace(/[áàâäã]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
  .replace(/[óòôöõ]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[řŕ]/g, 'r')
  .replace(/[šś]/g, 's').replace(/[čć]/g, 'c').replace(/[žź]/g, 'z')
  .replace(/[ď]/g, 'd').replace(/[ť]/g, 't').replace(/[ň]/g, 'n')
  .replace(/[ľ]/g, 'l').replace(/[ą]/g, 'a').replace(/[ę]/g, 'e')
  .replace(/[ů]/g, 'u').replace(/[yý]/g, 'y').replace(/[ł]/g, 'l')
  .replace(/[^a-z0-9\s/]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Zjistí, jestli jméno odpovídá páru v CTYRHRA_TYMY.
 * Podporuje plné i zkrácené názvy (např. "A. Anderle / P. Němec" → "Aleš Anderle / Petr Němec").
 * Také podporuje jména bez "/" (např. "Tomáš Kyselý Martin Lacina").
 */
export function jeCtyrhraPar(jmeno) {
  if (!jmeno) return false;

  // Nejprve přesná shoda
  if (CTYRHRA_TYMY.includes(jmeno)) return true;

  const normJmeno = normalize(jmeno);

  for (const par of CTYRHRA_TYMY) {
    // Přesná shoda po normalizaci
    if (normalize(par) === normJmeno) return true;

    // Rozdělíme na části před a po "/"
    const castiPar = normalize(par).split('/').map(s => s.trim());

    // Zkusíme různé způsoby rozdělení jména
    const mozneRozdeleni = [
      normJmeno.split('/').map(s => s.trim()),  // S lomítkem
      normJmeno.split(/\s+(?=[A-ZÁ-Ž])/),  // Podle velkých písmen (iniciál)
      normJmeno.split(/\s+/).reduce((acc, slovo, idx, arr) => {
        // Rozdělíme na poloviny
        if (idx < arr.length / 2) acc[0] = (acc[0] + ' ' + slovo).trim();
        else acc[1] = (acc[1] + ' ' + slovo).trim();
        return acc;
      }, ['', '']),
    ];

    for (const castiJmeno of mozneRozdeleni) {
      if (castiJmeno.length !== 2 || !castiJmeno[0] || !castiJmeno[1]) continue;

      // Pro každou stranu páru ověříme shodu
      let obeStranyShodne = true;

      for (let i = 0; i < 2; i++) {
        const slovaJmeno = castiJmeno[i].split(' ').filter(Boolean);
        const slovaPar = castiPar[i].split(' ').filter(Boolean);

        if (slovaJmeno.length === 0 || slovaPar.length === 0) {
          obeStranyShodne = false;
          break;
        }

        // Získáme příjmení (poslední slovo)
        const prijmeniJmeno = slovaJmeno[slovaJmeno.length - 1];
        const prijmeniPar = slovaPar[slovaPar.length - 1];

        // Získáme iniciálu (první slovo, první písmeno)
        const inicialaJmeno = slovaJmeno[0].charAt(0);
        const inicialaPar = slovaPar[0].charAt(0);

        // Shoda příjmení a iniciály
        if (prijmeniJmeno !== prijmeniPar || inicialaJmeno !== inicialaPar) {
          obeStranyShodne = false;
          break;
        }
      }

      if (obeStranyShodne) return true;
    }
  }

  return false;
}