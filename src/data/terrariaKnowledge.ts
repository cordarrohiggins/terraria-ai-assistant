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
];