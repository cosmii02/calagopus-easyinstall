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
            bedrock: "Clients on an older version can't join, so stay on the latest unless you have a reason not to.",
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
              detected: "Identified from the server's files.",
              recorded: 'Last installed by EasyInstall.',
              pinned: "Version set in the server's startup variables.",
              variables: 'The exact build could not be identified.',
            },
            notDownloaded: 'downloads on first start',
            autoUpdates: 'Updates are downloaded automatically every time the server starts.',
            upToDate: 'Up to date',
            updateAvailable: 'Update available: {build}',
            update: 'Update to {build}',
            reinstallLatest: 'Install latest build ({build})',
            newerVersion:
              'Minecraft {version} is available. Pick it below to upgrade, and take a backup first: version upgrades can break worlds and plugins.',
            confirmTitle: 'Update server',
            confirmBody: '{name} {version} will be reinstalled with build {build}. Files, worlds and configs are kept.',
            confirmBodyVersion: '{name} will be updated to {version}. Worlds and configs are kept.',
            toast: 'Updating, follow the progress in the console.',
          },
          notConfigured:
            'EasyInstall has not been set up yet. An administrator needs to pick the eggs in the extension settings.',
          toast: {
            installing: 'Installing, follow the progress in the console.',
          },
        },
      },
    },
    admin: {
      eggPlaceholder: 'Select an egg',
      minecraftEgg: {
        label: 'Minecraft: Java Edition egg',
        description:
          'Servers are switched to this egg when installing Java Edition. It needs SOFTWARE, VERSION and BUILD variables and "Java N" docker images, like the MCJars egg.',
      },
      hytaleEgg: {
        label: 'Hytale egg',
        description:
          'Servers are switched to this egg when installing Hytale. It needs a HYTALE_PATCHLINE variable and an image that downloads the server, like the Hytale egg from pterodactyl/game-eggs. Leave empty to hide Hytale.',
      },
      bedrockEgg: {
        label: 'Minecraft: Bedrock Edition egg',
        description:
          'Servers are switched to this egg when installing Bedrock Edition. It needs a BEDROCK_VERSION variable, like the Vanilla Bedrock egg. Leave empty to hide Bedrock.',
      },
      save: 'Save',
      saved: 'EasyInstall settings saved.',
    },
    software: {
      VANILLA: 'Vanilla',
      PAPER: 'Paper',
      FORGE: 'Forge',
      NEOFORGE: 'NeoForge',
      FABRIC: 'Fabric',
      BEDROCK: 'Bedrock',
      HYTALE: 'Hytale',
    },
    games: {
      minecraft: {
        name: 'Minecraft: Java',
        description: 'Java Edition server, for players on PC.',
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
      bedrock: {
        name: 'Minecraft: Bedrock',
        description: 'Bedrock Edition server, for players on consoles, phones and Windows.',
        variants: {
          vanilla: { name: 'Vanilla', description: 'The official Bedrock Dedicated Server.' },
        },
      },
      hytale: {
        name: 'Hytale',
        description: 'The official Hytale dedicated server.',
        variantStep: 'Branch',
        note: 'On first start the console shows a link to sign in with a Hytale account, which downloads the server. Once it has booted, run /auth login device in the console so players can join.',
        variants: {
          release: { name: 'Release', description: 'The current stable build.' },
          prerelease: { name: 'Pre-release', description: 'Upcoming changes before they reach Release. Expect bugs.' },
        },
      },
    },
  },
});

export const useExtTranslations = translations.useTranslations.bind(translations);
export const getExtTranslations = translations.getTranslations.bind(translations);

export default translations;
