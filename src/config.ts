// =============================================================
//  config.ts — Constantes globais do jogo
// =============================================================

export interface EnemyTypeDef {
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
  color: number;
  r: number;   // raio do sprite em px
  w: number;   // peso de spawn (0 = spawn manual apenas)
}

export interface WaveDef {
  time: number;       // segundos de jogo para ativar
  interval: number;   // ms entre spawns
  pool: string[];     // tipos disponíveis nessa onda
  miniboss: boolean;
  boss: boolean;
}

export interface UpgradeDef {
  id: string;
  label: string;
  desc: string;
}

export const CFG = {
  // ── Tela ──────────────────────────────────────────────────
  WIDTH:  960,
  HEIGHT: 640,

  // ── Mundo ─────────────────────────────────────────────────
  WORLD: 5000,

  // ── Jogador (RF01, RF03.1) ────────────────────────────────
  PLAYER: {
    SPEED:          180,
    MAX_HP:         100,
    PICKUP_RADIUS:   90,   // raio magnético de coleta de XP (RF03)
    DAMAGE_MULT:      1.0,
    COOLDOWN_MULT:    1.0,
    INVULN_MS:        600, // janela de invulnerabilidade após levar dano
  },

  // ── XP necessário para avançar de nível (RF09) ────────────
  XP_TABLE: [20, 50, 95, 155, 230, 320, 425, 545, 680, 830],

  // ── Tipos de inimigos (RF07) ──────────────────────────────
  ENEMY_TYPES: {
    COMMON:   { hp:   30, speed:  75, dmg:  8, xp:   3, color: 0xe74c3c, r: 14, w: 10 },
    FAST:     { hp:   15, speed: 160, dmg:  5, xp:   2, color: 0xf39c12, r: 10, w:  6 },
    TANK:     { hp:  100, speed:  45, dmg: 20, xp:  10, color: 0x8e44ad, r: 22, w:  3 },
    MINIBOSS: { hp:  400, speed:  55, dmg: 30, xp:  60, color: 0x9b59b6, r: 34, w:  0 },
    BOSS:     { hp: 1500, speed:  40, dmg: 50, xp: 250, color: 0x6600cc, r: 60, w:  0 },
  } as Record<string, EnemyTypeDef>,

  // ── Ondas de dificuldade (RF08) ───────────────────────────
  WAVES: [
    { time:   0, interval: 1400, pool: ['COMMON'],                    miniboss: false, boss: false },
    { time:  30, interval: 1100, pool: ['COMMON', 'FAST'],            miniboss: false, boss: false },
    { time:  60, interval:  900, pool: ['COMMON', 'FAST', 'TANK'],    miniboss: false, boss: false },
    { time: 120, interval:  700, pool: ['COMMON', 'FAST', 'TANK'],    miniboss: true,  boss: false },
    { time: 180, interval:  600, pool: ['COMMON', 'FAST', 'TANK'],    miniboss: false, boss: false },
    { time: 300, interval:  500, pool: ['COMMON', 'FAST', 'TANK'],    miniboss: false, boss: true  },
  ] as WaveDef[],

  SPAWN_MARGIN: 160, // px além da viewport onde inimigos aparecem (RF05)

  // ── Melhorias disponíveis (RF11, RF12) ────────────────────
  UPGRADES: [
    { id: 'MAX_HP',        label: '❤️ Vida Máxima',    desc: '+25 de vida máxima (cura total)' },
    { id: 'SPEED',         label: '💨 Velocidade',      desc: '+15% velocidade de movimento'    },
    { id: 'DAMAGE',        label: '⚔️ Dano',            desc: '+20% de dano em todas as armas'  },
    { id: 'PICKUP_RADIUS', label: '🧲 Magnetismo',      desc: '+40px de raio de coleta de XP'   },
    { id: 'COOLDOWN',      label: '⚡ Cadência',        desc: '-15% de cooldown das armas'      },
    { id: 'WEAPON_AURA',   label: '🌀 Aura Mágica',    desc: 'Desbloqueia / aprimora Aura'     },
    { id: 'WEAPON_ORB',    label: '🔮 Orbe Mágico',    desc: 'Desbloqueia / aprimora Orbe'     },
    { id: 'WEAPON_ARROW',  label: '🏹 Flechas',         desc: 'Desbloqueia / aprimora Flechas'  },
  ] as UpgradeDef[],
};
