// Základní testy pro gameLogic.js
// Spuštění: node --test tests/gameLogic.test.js

import { test } from 'node:test';
import assert from 'node:assert';
import { vypocitejTabulku } from '../src/utils/gameLogic.js';
import { zkraceneJmeno, normalize } from '../src/utils/constants.js';

// Test data
const HRACI = ['František Paľo', 'Libor Stanislav', 'Jan Matúš', 'Vladimír Vašut'];

function vytvorZapas(p1, p2, s1, s2) {
  return {
    player1_name: p1,
    player2_name: p2,
    status: 'finished',
    match_state: {
      sets_won: { player1: s1, player2: s2 },
      completed_sets: [
        { player1_games: s1 > 0 ? 6 : 0, player2_games: s2 > 0 ? 6 : 0 },
        { player1_games: s1 > 1 ? 6 : 0, player2_games: s2 > 1 ? 6 : 0 }
      ].filter((_, i) => (i === 0 && (s1 > 0 || s2 > 0)) || (i === 1 && (s1 > 1 || s2 > 1)))
    }
  };
}

test('vypocitejTabulku - prázdné pole vrací inicializované staty ale bez zápasů', () => {
  const { serazeni } = vypocitejTabulku([], HRACI);
  assert.strictEqual(serazeni.length, HRACI.length);
  serazeni.forEach(s => {
    assert.strictEqual(s.z, 0);
    assert.strictEqual(s.v, 0);
    assert.strictEqual(s.p, 0);
    assert.strictEqual(s.body, 0);
  });
});

test('vypocitejTabulku - bodování 2:0 = 4 body pro vítěze, 1 pro poraženého', () => {
  const zapasy = [vytvorZapas('František Paľo', 'Libor Stanislav', 2, 0)];
  const { staty } = vypocitejTabulku(zapasy, HRACI);
  
  assert.strictEqual(staty['František Paľo'].body, 4);
  assert.strictEqual(staty['Libor Stanislav'].body, 1);
  assert.strictEqual(staty['František Paľo'].v, 1);
  assert.strictEqual(staty['Libor Stanislav'].p, 1);
});

test('vypocitejTabulku - bodování 2:1 = 3 body pro vítěze, 2 pro poraženého', () => {
  const zapasy = [vytvorZapas('František Paľo', 'Libor Stanislav', 2, 1)];
  const { staty } = vypocitejTabulku(zapasy, HRACI);
  
  assert.strictEqual(staty['František Paľo'].body, 3);
  assert.strictEqual(staty['Libor Stanislav'].body, 2);
});

test('vypocitejTabulku - řazení podle bodů', () => {
  const zapasy = [
    vytvorZapas('František Paľo', 'Libor Stanislav', 2, 0), // Paľo: 4 body
    vytvorZapas('Jan Matúš', 'Vladimír Vašut', 2, 0),     // Matúš: 4 body
    vytvorZapas('František Paľo', 'Jan Matúš', 2, 0),      // Paľo: 8 bodů celkem
  ];
  const { serazeni } = vypocitejTabulku(zapasy, HRACI);
  
  assert.strictEqual(serazeni[0].jmeno, 'František Paľo');
  assert.ok(serazeni[0].body >= serazeni[1].body);
});

test('vypocitejTabulku - kontumace 0:0 s viníkem', () => {
  const zapasy = [{
    player1_name: 'František Paľo',
    player2_name: 'Libor Stanislav',
    status: 'finished',
    match_state: {
      sets_won: { player1: 0, player2: 0 },
      completed_sets: [{ player1_games: 0, player2_games: 0 }, { player1_games: 0, player2_games: 0 }],
      is_default: true,
      fault_player: 'Libor Stanislav'
    }
  }];
  const { serazeni } = vypocitejTabulku(zapasy, HRACI);
  
  // Viník (Stanislav) by měl být níže v tabulce
  const poradiPaľo = serazeni.find(s => s.jmeno === 'František Paľo').poradi;
  const poradiStanislav = serazeni.find(s => s.jmeno === 'Libor Stanislav').poradi;
  assert.ok(poradiPaľo < poradiStanislav, 'Paľo by měl být výše než viník Stanislav');
});

test('zkraceneJmeno - jednoslovné jméno zůstává stejné', () => {
  assert.strictEqual(zkraceneJmeno('Karel'), 'Karel');
});

test('zkraceneJmeno - víceslovné jméno se zkrátí na iniciály', () => {
  assert.strictEqual(zkraceneJmeno('František Paľo'), 'F. Paľo');
  assert.strictEqual(zkraceneJmeno('Jan Matúš'), 'J. Matúš');
});

test('zkraceneJmeno - prázdný vstup', () => {
  assert.strictEqual(zkraceneJmeno(''), '');
  assert.strictEqual(zkraceneJmeno(null), '');
  assert.strictEqual(zkraceneJmeno(undefined), '');
});

test('normalize - odstranění diakritiky', () => {
  assert.strictEqual(normalize('František'), 'frantisek');
  assert.strictEqual(normalize('Paľo'), 'palo');
  assert.strictEqual(normalize('Matúš'), 'matus');
});

test('normalize - velká písmena na malá', () => {
  assert.strictEqual(normalize('KAREL'), 'karel');
});

test('normalize - speciální znaky', () => {
  assert.strictEqual(normalize('O\'Brien'), 'obrien');
  assert.strictEqual(normalize('van der Berg'), 'van der berg');
});
