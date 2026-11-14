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

  const { current, latestBuild, updateAvailable, canUpdate, newerVersion } = data;
  if (!current) return null;

  const option = findBySoftware(current.software);
  const name = tExt(`software.${current.software}` as Parameters<typeof tExt>[0], {} as never);
  const buildLabel = current.build
    ? tExt(`${PREFIX}.build`, { build: current.build.name })
    : tExt(`${PREFIX}.buildUnknown`, {});

  const doUpdate = async () => {
    await update(server.uuid);
    addToast(tExt(`${PREFIX}.toast`, {}), 'success');
    updateServer({ status: 'installing' });
    navigate(`/server/${server.uuidShort}`);
  };

  return (
    <TitleCard title={tExt(`${PREFIX}.title`, {})} icon={<FontAwesomeIcon icon={faCube} />}>
      {latestBuild && (
        <ConfirmationModal
          opened={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={tExt(`${PREFIX}.confirmTitle`, {})}
          confirm={tExt(`${PREFIX}.update`, { build: latestBuild.name })}
          confirmColor='blue'
          onConfirmed={doUpdate}
        >
          <Text>
            {tExt(`${PREFIX}.confirmBody`, { name, version: current.version ?? '', build: latestBuild.name })}
          </Text>
        </ConfirmationModal>
      )}

      <Stack gap='sm'>
        <Group justify='space-between' wrap='nowrap' align='center'>
          <Group wrap='nowrap' gap='sm'>
            <OptionIcon icon={option?.icon ?? faCube} image={option?.image} selected />
            <Stack gap={0}>
              <Text fw={600}>
                {name} {current.version}{' '}
                <Text span c='dimmed'>
                  · {buildLabel}
                </Text>
              </Text>
              <Text size='sm' c='dimmed'>
                {tExt(`${PREFIX}.source.${current.source}`, {})}
              </Text>
            </Stack>
          </Group>

          <Group gap='xs' wrap='nowrap'>
            {updateAvailable && latestBuild ? (
              <Badge color='yellow' variant='light' leftSection={<FontAwesomeIcon icon={faCircleUp} />}>
                {tExt(`${PREFIX}.updateAvailable`, { build: latestBuild.name })}
              </Badge>
            ) : (
              current.build &&
              !canUpdate && (
                <Badge color='green' variant='light' leftSection={<FontAwesomeIcon icon={faCircleCheck} />}>
                  {tExt(`${PREFIX}.upToDate`, {})}
                </Badge>
              )
            )}
            {canUpdate && latestBuild && (
              <Button leftSection={<FontAwesomeIcon icon={faArrowsRotate} />} onClick={() => setConfirmOpen(true)}>
                {updateAvailable
                  ? tExt(`${PREFIX}.update`, { build: latestBuild.name })
                  : tExt(`${PREFIX}.reinstallLatest`, { build: latestBuild.name })}
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
