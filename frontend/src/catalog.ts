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

// Static concept data. Versions will come from MCJars once the backend is wired in.

export interface Loader {
  id: string;
  icon: IconDefinition;
}

export interface Variant {
  id: string;
  icon: IconDefinition;
  loaders?: Loader[];
}

export interface Game {
  id: string;
  icon: IconDefinition;
  variants: Variant[];
  versions: string[];
}

export const games: Game[] = [
  {
    id: 'minecraft',
    icon: faCube,
    variants: [
      { id: 'vanilla', icon: faLeaf },
      { id: 'plugins', icon: faPuzzlePiece },
      {
        id: 'modded',
        icon: faHammer,
        loaders: [
          { id: 'forge', icon: faFire },
          { id: 'neoforge', icon: faFireFlameCurved },
          { id: 'fabric', icon: faScroll },
        ],
      },
    ],
    versions: ['26.3', '26.2', '26.1.2', '26.1.1', '26.1', '1.21.11', '1.21.10', '1.21.9'],
  },
];
