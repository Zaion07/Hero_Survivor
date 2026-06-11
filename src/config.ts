// =============================================================
//  config.ts — Constantes globais do jogo
// =============================================================

export interface EnemyTypeDef {
  name: string;
  kind: 'normal' | 'subboss' | 'boss';
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
  minibosses?: string[];
  bosses?: string[];
}

export interface HordeDef {
  start: number;      // segundo de início da horda
  duration: number;   // duração da horda em segundos
  interval: number;   // ms entre rajadas da horda
  count: number;      // quantidade por rajada
  pool: string[];     // tipos possíveis na horda
  label: string;      // texto exibido no HUD
}

export interface UpgradeDef {
  id: string;
  label: string;
  desc: string;
}

export interface AbilityDef {
  name: string;
  icon: string;
  desc: string;
  cooldownMs: number;
  upgradeDesc: string; // o que melhora a cada nível
}

export interface UltimateDef {
  name: string;
  icon: string;
  desc: string;
  cooldownMs: number;
}

export interface WeaponInfo {
  id: string;
  label: string;        // com emoji
  desc: string;
  evolvedName: string;  // nome após evoluir no nível 5
  evolvedDesc: string;
}

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  texture: string;
  desc: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  icon: string;
  desc: string;
  texture: string;
  maxHp: number;
  speed: number;
  damageMult: number;
  cooldownMult: number;
  pickupRadius: number;
  startWeapon: string;
  weapons: string[];     // arsenal exclusivo da classe
  ability: AbilityDef;
  ultimate: UltimateDef;
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

  // ── Personagens jogáveis (seleção antes da partida) ───────
  CHARACTERS: {
    KNIGHT: {
      id: 'KNIGHT',
      name: 'Cavaleiro',
      title: 'Baluarte de Ferro',
      icon: '🛡️',
      desc: 'Resistente e implacável. Aguenta o impacto das hordas na linha de frente.',
      texture: 'player_KNIGHT',
      maxHp: 150,
      speed: 160,
      damageMult: 1.0,
      cooldownMult: 1.0,
      pickupRadius: 90,
      startWeapon: 'WEAPON_SWORD',
      weapons: ['WEAPON_SWORD', 'WEAPON_SPIN', 'WEAPON_AXE'],
      ability: {
        name: 'Escudo Divino',
        icon: '🛡️',
        desc: 'Fica invulnerável por 3 segundos.',
        cooldownMs: 18000,
        upgradeDesc: '+0.6s de duração e recarga menor',
      },
      ultimate: {
        name: 'Julgamento Celestial',
        icon: '🌟',
        desc: 'Espadas sagradas gigantes caem do céu devastando o campo.',
        cooldownMs: 180000,
      },
    },
    RANGER: {
      id: 'RANGER',
      name: 'Caçadora',
      title: 'Sombra da Floresta',
      icon: '🏹',
      desc: 'Ágil e letal à distância. Dispara mais rápido que qualquer mortal.',
      texture: 'player_RANGER',
      maxHp: 80,
      speed: 220,
      damageMult: 1.0,
      cooldownMult: 0.85,
      pickupRadius: 110,
      startWeapon: 'WEAPON_ARROW',
      weapons: ['WEAPON_ARROW', 'WEAPON_KNIFE', 'WEAPON_BOOMERANG'],
      ability: {
        name: 'Dash Sombrio',
        icon: '💨',
        desc: 'Avança rapidamente, ficando intangível durante o avanço.',
        cooldownMs: 5000,
        upgradeDesc: 'Recarga menor; a partir do nv.2 dana inimigos no caminho',
      },
      ultimate: {
        name: 'Tempestade de Flechas',
        icon: '🌧️',
        desc: 'Uma chuva de flechas varre toda a tela por alguns segundos.',
        cooldownMs: 180000,
      },
    },
    MAGE: {
      id: 'MAGE',
      name: 'Arcanista',
      title: 'Senhor das Runas',
      icon: '🔮',
      desc: 'Frágil, porém devastador. Canaliza o poder bruto do vazio.',
      texture: 'player_MAGE',
      maxHp: 100,
      speed: 180,
      damageMult: 1.3,
      cooldownMult: 1.0,
      pickupRadius: 90,
      startWeapon: 'WEAPON_ORB',
      weapons: ['WEAPON_ORB', 'WEAPON_LIGHTNING', 'WEAPON_AURA'],
      ability: {
        name: 'Nova Arcana',
        icon: '☄️',
        desc: 'Explosão mágica que devasta inimigos próximos.',
        cooldownMs: 12000,
        upgradeDesc: '+25% de dano, +25px de raio e recarga menor',
      },
      ultimate: {
        name: 'Buraco Negro',
        icon: '🕳️',
        desc: 'Abre um vórtice que suga e tritura os inimigos próximos.',
        cooldownMs: 180000,
      },
    },
  } as Record<string, CharacterDef>,

  // ── Tipos de inimigos (RF07) ──────────────────────────────
  ENEMY_TYPES: {
    COMMON: {
      name: 'Morcego',
      kind: 'normal',
      hp: 30, speed: 75, dmg: 8, xp: 3, color: 0xe74c3c, r: 14, w: 10,
    },
    FAST: {
      name: 'Espírito',
      kind: 'normal',
      hp: 15, speed: 160, dmg: 5, xp: 2, color: 0xf39c12, r: 10, w: 6,
    },
    TANK: {
      name: 'Golem',
      kind: 'normal',
      hp: 100, speed: 45, dmg: 20, xp: 10, color: 0x8e44ad, r: 22, w: 3,
    },
    BRUTE: {
      name: 'Carrasco',
      kind: 'normal',
      hp: 180, speed: 62, dmg: 26, xp: 18, color: 0x6d2f2f, r: 26, w: 2,
    },
    SHOOTER: {
      name: 'Olho Maldito',
      kind: 'normal',
      hp: 26, speed: 58, dmg: 10, xp: 6, color: 0x22aacc, r: 12, w: 4,
    },
    FLANKER: {
      name: 'Sombra Caçadora',
      kind: 'normal',
      hp: 45, speed: 125, dmg: 13, xp: 8, color: 0x44446a, r: 13, w: 3,
    },
    GUARDIAN: {
      name: 'Guardião Ancestral',
      kind: 'subboss',
      hp: 320, speed: 55, dmg: 24, xp: 60, color: 0x2e8b57, r: 30, w: 0,
    },
    MINIBOSS: {
      name: 'Necromante',
      kind: 'subboss',
      hp: 500, speed: 55, dmg: 30, xp: 70, color: 0x9b59b6, r: 34, w: 0,
    },
    MINIBOSS_WARLORD: {
      name: 'Lorde da Guerra',
      kind: 'subboss',
      hp: 740, speed: 50, dmg: 38, xp: 105, color: 0xb03a2e, r: 38, w: 0,
    },
    BOSS: {
      name: 'Sr. do Vazio',
      kind: 'boss',
      hp: 1800, speed: 40, dmg: 52, xp: 280, color: 0x6600cc, r: 60, w: 0,
    },
    BOSS_ABYSS: {
      name: 'Titã Abissal',
      kind: 'boss',
      hp: 2500, speed: 36, dmg: 64, xp: 420, color: 0x2f0f57, r: 68, w: 0,
    },
  } as Record<string, EnemyTypeDef>,

  // ── Ondas de dificuldade (RF08) ───────────────────────────
  WAVES: [
    { time: 0, interval: 1350, pool: ['COMMON', 'FAST'] },
    { time: 60, interval: 980, pool: ['COMMON', 'FAST', 'TANK', 'SHOOTER'] },
    { time: 120, interval: 820, pool: ['COMMON', 'FAST', 'TANK', 'BRUTE', 'SHOOTER', 'FLANKER'] },
    { time: 180, interval: 720, pool: ['COMMON', 'FAST', 'TANK', 'BRUTE', 'SHOOTER', 'FLANKER'] },
    { time: 240, interval: 640, pool: ['COMMON', 'FAST', 'TANK', 'BRUTE', 'SHOOTER', 'FLANKER'] },
    { time: 300, interval: 560, pool: ['COMMON', 'FAST', 'TANK', 'BRUTE', 'SHOOTER', 'FLANKER'] },
    { time: 420, interval: 500, pool: ['COMMON', 'FAST', 'TANK', 'BRUTE', 'SHOOTER', 'FLANKER'] },
  ] as WaveDef[],

  // ── Elites: variantes douradas mais fortes que dropam itens
  ELITE: {
    CHANCE:    0.07, // chance de um inimigo normal nascer elite
    HP_MULT:   2.5,
    DMG_MULT:  1.5,
    XP_MULT:   3,
    SCALE:     1.3,
    TINT:      0xffd24a,
  },

  // ── Hordas temporizadas (picos de pressão) ──────────────────
  HORDES: [
    { start: 45,  duration: 10, interval: 500, count: 2, pool: ['FAST'], label: 'Enxame Fantasma' },
    { start: 105, duration: 12, interval: 430, count: 3, pool: ['COMMON', 'FAST'], label: 'Maré Sangrenta' },
    { start: 165, duration: 10, interval: 520, count: 2, pool: ['TANK'], label: 'Marcha dos Golems' },
    { start: 225, duration: 14, interval: 420, count: 3, pool: ['FAST', 'TANK', 'BRUTE'], label: 'Ruptura Abissal' },
    { start: 285, duration: 16, interval: 360, count: 4, pool: ['COMMON', 'FAST', 'BRUTE'], label: 'Tormenta Infernal' },
    { start: 360, duration: 18, interval: 320, count: 4, pool: ['FAST', 'TANK', 'BRUTE'], label: 'Noite Sem Fim' },
  ] as HordeDef[],

  SPAWN_MARGIN: 160, // px além da viewport onde inimigos aparecem (RF05)

  // ── Itens dropados por inimigos fortes ────────────────────
  ITEMS: {
    POTION: {
      id: 'POTION',
      name: 'Poção Vital',
      icon: '❤️',
      texture: 'item_POTION',
      desc: 'Recupera 30 de vida',
    },
    MAGNET: {
      id: 'MAGNET',
      name: 'Ímã Arcano',
      icon: '🧲',
      texture: 'item_MAGNET',
      desc: 'Atrai todas as gemas de XP do mapa',
    },
    BOMB: {
      id: 'BOMB',
      name: 'Bomba Sombria',
      icon: '💣',
      texture: 'item_BOMB',
      desc: 'Explode causando dano em todos os inimigos próximos',
    },
    FURY: {
      id: 'FURY',
      name: 'Fúria Demoníaca',
      icon: '⚔️',
      texture: 'item_FURY',
      desc: '+50% de dano por 10 segundos',
    },
    HASTE: {
      id: 'HASTE',
      name: 'Botas da Pressa',
      icon: '🥾',
      texture: 'item_HASTE',
      desc: '+40% de velocidade por 10 segundos',
    },
  } as Record<string, ItemDef>,

  // ── Melhorias passivas compartilhadas (RF11, RF12) ────────
  UPGRADES: [
    { id: 'MAX_HP',        label: '❤️ Vida Máxima',    desc: '+25 de vida máxima (cura total)' },
    { id: 'SPEED',         label: '💨 Velocidade',      desc: '+15% velocidade de movimento'    },
    { id: 'DAMAGE',        label: '⚔️ Dano',            desc: '+20% de dano em todas as armas'  },
    { id: 'PICKUP_RADIUS', label: '🧲 Magnetismo',      desc: '+40px de raio de coleta de XP'   },
    { id: 'COOLDOWN',      label: '⚡ Cadência',        desc: '-15% de cooldown das armas'      },
    { id: 'REGEN',         label: '✨ Regeneração',     desc: '+0.8 de vida por segundo'        },
  ] as UpgradeDef[],

  // ── Nível em que as armas evoluem (estilo Vampire Survivors)
  WEAPON_EVOLVE_LEVEL: 5,

  // ── Armas por classe ──────────────────────────────────────
  WEAPON_INFO: {
    // Cavaleiro
    WEAPON_SWORD: {
      id: 'WEAPON_SWORD',
      label: '🗡️ Espada',
      desc: 'Golpe em arco na direção do olhar',
      evolvedName: '⚜️ Excalibur',
      evolvedDesc: 'Golpeia dos dois lados com lâminas sagradas',
    },
    WEAPON_SPIN: {
      id: 'WEAPON_SPIN',
      label: '🌀 Lâminas Giratórias',
      desc: 'Espadas orbitam ao seu redor',
      evolvedName: '🌪️ Tempestade de Lâminas',
      evolvedDesc: 'Mais lâminas, girando em fúria',
    },
    WEAPON_AXE: {
      id: 'WEAPON_AXE',
      label: '🪓 Machado',
      desc: 'Machados giram em arco por cima',
      evolvedName: '⚔️ Machado do Carrasco',
      evolvedDesc: 'Machados enormes que atravessam tudo',
    },
    // Caçadora
    WEAPON_ARROW: {
      id: 'WEAPON_ARROW',
      label: '🏹 Flecha',
      desc: 'Atira no inimigo mais próximo; ganha perfuração e alcance',
      evolvedName: '👻 Flecha Fantasma',
      evolvedDesc: 'Flechas espectrais que atravessam tudo',
    },
    WEAPON_KNIFE: {
      id: 'WEAPON_KNIFE',
      label: '🔪 Adagas',
      desc: 'Rajada de adagas na direção do movimento',
      evolvedName: '✨ Mil Facas',
      evolvedDesc: 'Uma torrente interminável de lâminas',
    },
    WEAPON_BOOMERANG: {
      id: 'WEAPON_BOOMERANG',
      label: '🪃 Bumerangue',
      desc: 'Lâmina de vento que vai e volta perfurando',
      evolvedName: '🌬️ Ciclone',
      evolvedDesc: 'Lâminas duplas que rasgam o vento',
    },
    // Arcanista
    WEAPON_ORB: {
      id: 'WEAPON_ORB',
      label: '🔮 Orbe Mágico',
      desc: 'Orbes disparados em leque ao redor',
      evolvedName: '🌌 Esfera do Caos',
      evolvedDesc: 'Orbes maiores, mais rápidos e em maior número',
    },
    WEAPON_LIGHTNING: {
      id: 'WEAPON_LIGHTNING',
      label: '⚡ Relâmpago Arcano',
      desc: 'Raios caem sobre inimigos aleatórios',
      evolvedName: '🌩️ Ira da Tempestade',
      evolvedDesc: 'Uma tempestade implacável de raios',
    },
    WEAPON_AURA: {
      id: 'WEAPON_AURA',
      label: '🌀 Aura Mágica',
      desc: 'Dano contínuo em área ao redor',
      evolvedName: '🔥 Inferno Arcano',
      evolvedDesc: 'Um círculo de devastação arcana',
    },
  } as Record<string, WeaponInfo>,
};
