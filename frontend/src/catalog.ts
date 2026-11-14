import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCube,
  faFire,
  faFireFlameCurved,
  faFlag,
  faFlask,
  faGamepad,
  faHammer,
  faLeaf,
  faPuzzlePiece,
  faScroll,
} from '@fortawesome/free-solid-svg-icons';
import hytaleIcon from './assets/hytale.png';

const MCJARS_ICONS = 'https://s3.mcjars.app/icons';

export interface Option {
  id: string;
  icon: IconDefinition; // fallback when there is no image or it fails to load
  image?: string;
}

export interface Loader extends Option {
  software: string; // server type: an MCJars type, BEDROCK or HYTALE
}

export interface Variant extends Option {
  software?: string; // server type, unset when a loader has to be picked
  version?: string; // fixed version, skips the version step
  loaders?: Loader[];
}

export interface Game extends Option {
  variants: Variant[];
  note?: boolean; // has a games.<id>.note translation to show before installing
  variantStep?: boolean; // has a games.<id>.variantStep translation replacing the "Server type" title
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
  {
    id: 'bedrock',
    icon: faGamepad,
    variants: [{ id: 'vanilla', icon: faLeaf, image: `${MCJARS_ICONS}/vanilla.png`, software: 'BEDROCK' }],
  },
  {
    id: 'hytale',
    icon: faGamepad,
    image: hytaleIcon,
    note: true,
    variantStep: true,
    // The Hytale downloader only installs the newest build of a patchline.
    variants: [
      { id: 'release', icon: faFlag, software: 'HYTALE', version: 'release' },
      { id: 'prerelease', icon: faFlask, software: 'HYTALE', version: 'pre-release' },
    ],
  },
];

export interface SoftwareMatch {
  game: Game;
  option: Option;
  /** Translation key naming the version, for variants with a fixed one (Hytale's patchlines). */
  versionKey?: string;
}

/** The catalog option (variant or loader) that installs this server type and version. */
export function findBySoftware(software: string, version?: string | null): SoftwareMatch | null {
  for (const game of games) {
    for (const variant of game.variants) {
      if (variant.software === software && (!variant.version || variant.version === version)) {
        return {
          game,
          option: variant,
          versionKey: variant.version ? `games.${game.id}.variants.${variant.id}.name` : undefined,
        };
      }
      const loader = variant.loaders?.find((l) => l.software === software);
      if (loader) return { game, option: loader };
    }
  }
  return null;
}
