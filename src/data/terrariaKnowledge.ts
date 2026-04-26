export type TerrariaKnowledgeEntry = {
  id: string;
  title: string;
  category: "boss" | "item" | "crafting" | "progression" | "npc" | "biome";
  keywords: string[];
  summary: string;
  sourceUrl: string;
};

export const terrariaKnowledge: TerrariaKnowledgeEntry[] = [
  {
    id: "eye-of-cthulhu-progression",
    title: "After defeating the Eye of Cthulhu",
    category: "progression",
    keywords: [
      "eye of cthulhu",
      "after eye of cthulhu",
      "progression",
      "next boss",
      "what next",
    ],
    summary:
      "After defeating the Eye of Cthulhu, players often continue improving gear, exploring deeper areas, and preparing for the next major evil biome boss such as the Eater of Worlds or Brain of Cthulhu depending on the world evil.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Eye_of_Cthulhu",
  },
  {
    id: "nights-edge-crafting",
    title: "Night's Edge crafting",
    category: "crafting",
    keywords: [
      "night's edge",
      "nights edge",
      "craft night edge",
      "crafting",
      "sword",
      "pre hardmode sword",
    ],
    summary:
      "Night's Edge is a powerful pre-Hardmode sword crafted from multiple swords. It is commonly treated as an important melee weapon before entering Hardmode.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Night%27s_Edge",
  },
  {
    id: "skeletron-preparation",
    title: "Preparing for Skeletron",
    category: "boss",
    keywords: [
      "skeletron",
      "prepare for skeletron",
      "dungeon",
      "old man",
      "pre skeletron",
    ],
    summary:
      "Before fighting Skeletron, players should prepare better armor, stronger weapons, mobility accessories, healing potions, and a useful arena near the Dungeon entrance.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Skeletron",
  },
  {
    id: "hardmode-preparation",
    title: "Preparing for Hardmode",
    category: "progression",
    keywords: [
      "hardmode",
      "prepare for hardmode",
      "wall of flesh",
      "pre hardmode",
      "what before hardmode",
    ],
    summary:
      "Before entering Hardmode, players often prepare by organizing storage, building NPC housing, gathering useful items, improving gear, exploring the world, and preparing for stronger enemies after the Wall of Flesh is defeated.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Hardmode",
  },
  {
    id: "guide-npc",
    title: "Guide NPC",
    category: "npc",
    keywords: [
      "guide",
      "guide npc",
      "crafting help",
      "npc",
      "recipes",
    ],
    summary:
      "The Guide is one of the first NPCs players encounter. He can provide crafting information when shown materials and gives general gameplay advice.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Guide",
  },
    {
    id: "wings-overview",
    title: "Wings",
    category: "item",
    keywords: [
      "wings",
      "get wings",
      "how to get wings",
      "flight",
      "fly",
      "hardmode wings",
      "mobility",
    ],
    summary:
      "Wings are mobility accessories that allow flight and slow falling. Most wings are obtained in Hardmode through crafting, enemy drops, treasure bags, or special sources. If a player is still in pre-Hardmode, they usually need to defeat the Wall of Flesh and enter Hardmode before most wing options become available.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Wings",
  },
  {
    id: "wall-of-flesh-preparation",
    title: "Preparing for the Wall of Flesh",
    category: "boss",
    keywords: [
      "wall of flesh",
      "prepare for wall of flesh",
      "hell boss",
      "underworld boss",
      "enter hardmode",
      "voodoo doll",
    ],
    summary:
      "The Wall of Flesh is the boss that triggers Hardmode when defeated. Before fighting it, players often build a long bridge in the Underworld, bring strong pre-Hardmode gear, use buff potions, and make sure they are ready for the world changes that happen after Hardmode begins.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Wall_of_Flesh",
  },
  {
    id: "goblin-tinkerer",
    title: "Goblin Tinkerer",
    category: "npc",
    keywords: [
      "goblin tinkerer",
      "tinkerer",
      "reforge",
      "workshop",
      "tinkerer's workshop",
      "goblin army",
      "combine accessories",
    ],
    summary:
      "The Goblin Tinkerer is an NPC who can reforge items and sells the Tinkerer's Workshop, which is used to combine many accessories. He becomes available after a Goblin Army has been defeated and can be found bound underground before moving into suitable housing.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Goblin_Tinkerer",
  },
  {
    id: "molten-armor",
    title: "Molten armor",
    category: "item",
    keywords: [
      "molten armor",
      "hellstone armor",
      "best pre hardmode armor",
      "melee armor",
      "hellstone",
      "obsidian",
      "underworld gear",
    ],
    summary:
      "Molten armor is a strong pre-Hardmode armor set made from Hellstone Bars. It is especially useful for melee-focused players and is commonly used when preparing for late pre-Hardmode challenges such as Skeletron, Queen Bee, or the Wall of Flesh.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Molten_armor",
  },
  {
    id: "queen-bee-preparation",
    title: "Preparing for Queen Bee",
    category: "boss",
    keywords: [
      "queen bee",
      "prepare for queen bee",
      "jungle boss",
      "bee boss",
      "hive",
      "abeemination",
    ],
    summary:
      "Queen Bee is a pre-Hardmode boss usually fought in the Underground Jungle. Players should prepare mobility, healing, a small arena inside or near the Hive, and weapons that can handle her movement and summoned bees.",
    sourceUrl: "https://terraria.wiki.gg/wiki/Queen_Bee",
  },
];