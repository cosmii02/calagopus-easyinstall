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
            java: 'Runs on Java {java}.',
          },
          summary: {
            title: 'Summary',
            empty: 'Make your selections to see what will be installed.',
            install: 'Install',
            reset: 'Start over',
            wipe: 'Wipe existing files',
            wipeDescription: 'Delete everything on the server before installing, including worlds.',
          },
          confirm: {
            title: 'Confirm install',
            body: 'This server will be reinstalled with {selection}.',
            details:
              'Its egg, startup command and Java image are switched to match, then the install runs. The server is stopped during the install.',
            wipeWarning: 'All existing files on this server will be permanently deleted, including worlds and configs.',
          },
          current: {
            title: 'Currently installed',
            build: 'build {build}',
            buildUnknown: 'unknown build',
            source: {
              detected: 'Identified from server.jar.',
              recorded: 'Last installed by EasyInstall.',
              variables: 'The exact build could not be identified.',
            },
            upToDate: 'Up to date',
            updateAvailable: 'Update available: {build}',
            update: 'Update to {build}',
            reinstallLatest: 'Install latest build ({build})',
            newerVersion:
              'Minecraft {version} is available. Pick it below to upgrade, and take a backup first: version upgrades can break worlds and plugins.',
            confirmTitle: 'Update server',
            confirmBody: '{name} {version} will be reinstalled with build {build}. Files, worlds and configs are kept.',
            toast: 'Updating, follow the progress in the console.',
          },
          notConfigured:
            'EasyInstall has not been set up yet. An administrator needs to pick the Minecraft egg in the extension settings.',
          toast: {
            installing: 'Installing, follow the progress in the console.',
          },
        },
      },
    },
    admin: {
      eggLabel: 'Minecraft egg',
      eggDescription:
        'Servers are switched to this egg when installing Minecraft. It needs SOFTWARE, VERSION and BUILD variables and "Java N" docker images, like the MCJars egg.',
      eggPlaceholder: 'Select an egg',
      save: 'Save',
      saved: 'EasyInstall settings saved.',
    },
    software: {
      VANILLA: 'Vanilla',
      PAPER: 'Paper',
      FORGE: 'Forge',
      NEOFORGE: 'NeoForge',
      FABRIC: 'Fabric',
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
