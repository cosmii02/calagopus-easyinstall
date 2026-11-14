import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCube,
  faFire,
  faFireFlameCurved,
  faHammer,
  faLeaf,
  faPuzzlePiece,
  faScroll,
} from '@fortawesome/free-solid-svg-icons';

const MCJARS_ICONS = 'https://s3.mcjars.app/icons';

export interface Option {
  id: string;
  icon: IconDefinition; // fallback when there is no image or it fails to load
  image?: string;
}

export interface Loader extends Option {
  software: string; // MCJars server type
}

export interface Variant extends Option {
  software?: string; // MCJars server type, unset when a loader has to be picked
  loaders?: Loader[];
}

export interface Game extends Option {
  variants: Variant[];
}

export const games: Game[] = [
  {
    id: 'minecraft',
    icon: faCube,
    image: `${MCJARS_ICONS}/vanilla.png`,
    variants: [
      { id: 'vanilla', icon: faLeaf, image: `${MCJARS_ICONS}/vanilla.png`, software: 'VANILLA' },
      { id: 'plugins', icon: faPuzzlePiece, image: `${MCJARS_ICONS}/paper.png`, software: 'PAPER' },
      {
        id: 'modded',
        icon: faHammer,
        loaders: [
          { id: 'forge', icon: faFire, image: `${MCJARS_ICONS}/forge.png`, software: 'FORGE' },
          { id: 'neoforge', icon: faFireFlameCurved, image: `${MCJARS_ICONS}/neoforge.png`, software: 'NEOFORGE' },
          { id: 'fabric', icon: faScroll, image: `${MCJARS_ICONS}/fabric.png`, software: 'FABRIC' },
        ],
      },
    ],
  },
];

/** The catalog option (variant or loader) that installs this MCJars server type. */
export function findBySoftware(software: string): Option | null {
  for (const game of games) {
    for (const variant of game.variants) {
      if (variant.software === software) return variant;
      const loader = variant.loaders?.find((l) => l.software === software);
      if (loader) return loader;
    }
  }
  return null;
}
