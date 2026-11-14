import { defineTranslations } from 'shared';

const translations = defineTranslations({
  items: {},
  translations: {
    pages: {
      server: {
        easyInstall: {
          title: 'EasyInstall',
          subtitle: 'Pick a game and setup, we handle the rest.',
          steps: {
            game: 'Game',
            variant: 'Server type',
            loader: 'Mod loader',
            version: 'Version',
          },
          version: {
            label: 'Game version',
            placeholder: 'Select a version',
            latest: 'latest',
          },
          summary: {
            title: 'Summary',
            empty: 'Make your selections to see what will be installed.',
            install: 'Install',
            notWired: 'Installing is not wired up yet, this is a UI preview.',
            reset: 'Start over',
          },
        },
      },
    },
    games: {
      minecraft: {
        name: 'Minecraft',
        description: 'Java Edition server.',
        variants: {
          vanilla: { name: 'Vanilla', description: 'The official server, no modifications.' },
          plugins: { name: 'Plugins', description: 'Paper-based server with Bukkit/Spigot plugin support.' },
          modded: { name: 'Modded', description: 'Run mods and modpacks with a mod loader.' },
        },
        loaders: {
          forge: { name: 'Forge', description: 'The classic loader with the largest mod library.' },
          neoforge: { name: 'NeoForge', description: 'Community fork of Forge for modern versions.' },
          fabric: { name: 'Fabric', description: 'Lightweight loader, fast to update.' },
        },
      },
    },
  },
});

export const useExtTranslations = translations.useTranslations.bind(translations);
export const getExtTranslations = translations.getTranslations.bind(translations);

export default translations;
