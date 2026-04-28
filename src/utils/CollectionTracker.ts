// =============================================================
//  CollectionTracker — regista o que o jogador já encontrou
//  Persiste durante a sessão (não zera entre partidas)
// =============================================================
export const CollectionTracker = {
  monsters:  new Set<string>(),
  weapons:   new Set<string>(),
  upgrades:  new Set<string>(),

  addMonster(type: string)  { this.monsters.add(type);  },
  addWeapon(type: string)   { this.weapons.add(type);   },
  addUpgrade(id: string)    { this.upgrades.add(id);    },

  hasMonster(type: string)  { return this.monsters.has(type);  },
  hasWeapon(type: string)   { return this.weapons.has(type);   },
  hasUpgrade(id: string)    { return this.upgrades.has(id);    },
};
