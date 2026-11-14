import { faArrowsRotate, faCircleCheck, faCircleUp, faCube } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import Button from '@/elements/buttons/Button.tsx';
import Badge from '@/elements/data-display/Badge.tsx';
import TitleCard from '@/elements/data-display/TitleCard.tsx';
import Group from '@/elements/layout/Group.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import ConfirmationModal from '@/elements/modals/ConfirmationModal.tsx';
import Text from '@/elements/typography/Text.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import update from '../api/update.ts';
import { findBySoftware } from '../catalog.ts';
import type { currentSchema } from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';
import OptionIcon from './OptionIcon.tsx';

const PREFIX = 'pages.server.easyInstall.current';

export default function CurrentInstallCard({ data }: { data: z.infer<typeof currentSchema> }) {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const server = useServerStore((state) => state.server);
  const updateServer = useServerStore((state) => state.updateServer);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { current, latest, updateAvailable, canUpdate, newerVersion, autoUpdates } = data;
  if (!current) return null;

  const td = (key: string) => tExt(key as Parameters<typeof tExt>[0], {} as never);
  const match = findBySoftware(current.software, current.version);
  const name = td(`software.${current.software}`);
  const version = match?.versionKey ? td(match.versionKey) : current.version;
  // A pinned version (Bedrock) already names the exact release, there is no separate build.
  const buildLabel = current.build
    ? tExt(`${PREFIX}.build`, { build: current.build.name })
    : current.installedVersion
      ? current.installedVersion
      : current.source === 'pinned'
        ? null
        : autoUpdates
          ? tExt(`${PREFIX}.notDownloaded`, {})
          : tExt(`${PREFIX}.buildUnknown`, {});

  const doUpdate = async () => {
    await update(server.uuid);
    addToast(tExt(`${PREFIX}.toast`, {}), 'success');
    updateServer({ status: 'installing' });
    navigate(`/server/${server.uuidShort}`);
  };

  return (
    <TitleCard title={tExt(`${PREFIX}.title`, {})} icon={<FontAwesomeIcon icon={faCube} />}>
      {latest && (
        <ConfirmationModal
          opened={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={tExt(`${PREFIX}.confirmTitle`, {})}
          confirm={tExt(`${PREFIX}.update`, { build: latest.name })}
          confirmColor='blue'
          onConfirmed={doUpdate}
        >
          <Text>
            {latest.build
              ? tExt(`${PREFIX}.confirmBody`, { name, version: current.version ?? '', build: latest.name })
              : tExt(`${PREFIX}.confirmBodyVersion`, { name, version: latest.name })}
          </Text>
        </ConfirmationModal>
      )}

      <Stack gap='sm'>
        <Group justify='space-between' wrap='nowrap' align='center'>
          <Group wrap='nowrap' gap='sm'>
            {/* Variants without artwork of their own (Hytale's branches) show the game's. */}
            <OptionIcon icon={match?.option.icon ?? faCube} image={match?.option.image ?? match?.game.image} selected />
            <Stack gap={0}>
              <Text fw={600}>
                {name} {version}{' '}
                {buildLabel && (
                  <Text span c='dimmed'>
                    · {buildLabel}
                  </Text>
                )}
              </Text>
              <Text size='sm' c='dimmed'>
                {autoUpdates ? tExt(`${PREFIX}.autoUpdates`, {}) : tExt(`${PREFIX}.source.${current.source}`, {})}
              </Text>
            </Stack>
          </Group>

          <Group gap='xs' wrap='nowrap'>
            {updateAvailable && latest ? (
              <Badge color='yellow' variant='light' leftSection={<FontAwesomeIcon icon={faCircleUp} />}>
                {tExt(`${PREFIX}.updateAvailable`, { build: latest.name })}
              </Badge>
            ) : (
              (current.build || current.source === 'pinned') &&
              !canUpdate && (
                <Badge color='green' variant='light' leftSection={<FontAwesomeIcon icon={faCircleCheck} />}>
                  {tExt(`${PREFIX}.upToDate`, {})}
                </Badge>
              )
            )}
            {canUpdate && latest && (
              <Button leftSection={<FontAwesomeIcon icon={faArrowsRotate} />} onClick={() => setConfirmOpen(true)}>
                {updateAvailable
                  ? tExt(`${PREFIX}.update`, { build: latest.name })
                  : tExt(`${PREFIX}.reinstallLatest`, { build: latest.name })}
              </Button>
            )}
          </Group>
        </Group>

        {newerVersion && (
          <Text size='sm' c='dimmed'>
            {tExt(`${PREFIX}.newerVersion`, { version: newerVersion })}
          </Text>
        )}
      </Stack>
    </TitleCard>
  );
}
