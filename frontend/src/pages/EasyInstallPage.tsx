import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faCircleExclamation, faRotateLeft, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Grid, SimpleGrid } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import Badge from '@/elements/data-display/Badge.tsx';
import Card from '@/elements/data-display/Card.tsx';
import TitleCard from '@/elements/data-display/TitleCard.tsx';
import Alert from '@/elements/feedback/Alert.tsx';
import Spinner from '@/elements/feedback/Spinner.tsx';
import Select from '@/elements/input/Select.tsx';
import Switch from '@/elements/input/Switch.tsx';
import Group from '@/elements/layout/Group.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import ConfirmationModal from '@/elements/modals/ConfirmationModal.tsx';
import Text from '@/elements/typography/Text.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import getCurrent from '../api/getCurrent.ts';
import getStatus from '../api/getStatus.ts';
import getVersions from '../api/getVersions.ts';
import install from '../api/install.ts';
import { games } from '../catalog.ts';
import CurrentInstallCard from '../components/CurrentInstallCard.tsx';
import OptionIcon from '../components/OptionIcon.tsx';
import type { currentSchema, mcVersionSchema } from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';

const PREFIX = 'pages.server.easyInstall';

function OptionCard({
  icon,
  image,
  name,
  description,
  selected,
  onSelect,
}: {
  icon: IconDefinition;
  image?: string;
  name: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      hoverable
      onClick={onSelect}
      role='radio'
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      style={selected ? { borderColor: 'var(--mantine-primary-color-filled)' } : undefined}
    >
      <Group wrap='nowrap' align='flex-start'>
        <OptionIcon icon={icon} image={image} selected={selected} />
        <Stack gap={2} className='flex-1 min-w-0'>
          <Group justify='space-between' wrap='nowrap'>
            <Text fw={600}>{name}</Text>
            {selected && <FontAwesomeIcon icon={faCheck} className='text-(--mantine-primary-color-filled)' />}
          </Group>
          <Text size='sm' c='dimmed'>
            {description}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <TitleCard title={title} icon={<Text fw={700}>{index}</Text>}>
      {children}
    </TitleCard>
  );
}

export default function EasyInstallPage() {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const server = useServerStore((state) => state.server);
  const updateServer = useServerStore((state) => state.updateServer);
  const td = (key: string) => tExt(key as Parameters<typeof tExt>[0], {} as never);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [current, setCurrent] = useState<z.infer<typeof currentSchema> | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [loaderId, setLoaderId] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [versions, setVersions] = useState<z.infer<typeof mcVersionSchema>[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [truncateDirectory, setTruncateDirectory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const game = useMemo(() => games.find((g) => g.id === gameId) ?? null, [gameId]);
  const variant = useMemo(() => game?.variants.find((v) => v.id === variantId) ?? null, [game, variantId]);
  const needsLoader = !!variant?.loaders?.length;
  const loader = useMemo(() => variant?.loaders?.find((l) => l.id === loaderId) ?? null, [variant, loaderId]);
  const software = loader?.software ?? (needsLoader ? null : (variant?.software ?? null));
  const selectedVersion = versions.find((v) => v.version === version) ?? null;
  const complete = !!software && !!selectedVersion && configured === true;

  useEffect(() => {
    getStatus(server.uuid)
      .then((status) => setConfigured(status.configured))
      .catch((err) => addToast(httpErrorToHuman(err), 'error'));
    getCurrent(server.uuid)
      .then(setCurrent)
      .catch((err) => addToast(httpErrorToHuman(err), 'error'));
  }, [server.uuid]);

  useEffect(() => {
    setVersion(null);
    setVersions([]);
    setVersionsError(null);
    if (!software) return;

    let cancelled = false;
    setVersionsLoading(true);
    getVersions(server.uuid, software)
      .then((result) => !cancelled && setVersions(result))
      .catch((err) => !cancelled && setVersionsError(httpErrorToHuman(err)))
      .finally(() => !cancelled && setVersionsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [server.uuid, software]);

  const selectGame = (id: string | null) => {
    setGameId(id);
    setVariantId(null);
    setLoaderId(null);
  };
  const selectVariant = (id: string) => {
    setVariantId(id);
    setLoaderId(null);
  };
  const reset = () => {
    selectGame(null);
    setTruncateDirectory(false);
  };

  const doInstall = async () => {
    if (!software || !selectedVersion) return;

    await install(server.uuid, { software, version: selectedVersion.version, truncateDirectory });
    addToast(tExt(`${PREFIX}.toast.installing`, {}), 'success');
    updateServer({ status: 'installing' });
    navigate(`/server/${server.uuidShort}`);
  };

  const summaryName = [
    game && td(`games.${game.id}.name`),
    variant && td(`games.${game!.id}.variants.${variant.id}.name`),
    loader && td(`games.${game!.id}.loaders.${loader.id}.name`),
    selectedVersion?.version,
  ]
    .filter(Boolean)
    .join(' · ');

  let step = 1;

  return (
    <ServerContentContainer title={tExt(`${PREFIX}.title`, {})} subtitle={tExt(`${PREFIX}.subtitle`, {})}>
      <ConfirmationModal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={tExt(`${PREFIX}.confirm.title`, {})}
        confirm={tExt(`${PREFIX}.summary.install`, {})}
        onConfirmed={doInstall}
      >
        <Stack gap='xs'>
          <Text>{tExt(`${PREFIX}.confirm.body`, { selection: summaryName })}</Text>
          <Text size='sm' c='dimmed'>
            {tExt(`${PREFIX}.confirm.details`, {})}
          </Text>
          {truncateDirectory && (
            <Alert color='red' icon={<FontAwesomeIcon icon={faCircleExclamation} />}>
              {tExt(`${PREFIX}.confirm.wipeWarning`, {})}
            </Alert>
          )}
        </Stack>
      </ConfirmationModal>

      {configured === false && (
        <Alert color='yellow' icon={<FontAwesomeIcon icon={faCircleExclamation} />} mb='md'>
          {tExt(`${PREFIX}.notConfigured`, {})}
        </Alert>
      )}

      <Grid gap='md'>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap='md'>
            {current?.current && <CurrentInstallCard data={current} />}
            <Step index={step++} title={tExt(`${PREFIX}.steps.game`, {})}>
              <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} role='radiogroup'>
                {games.map((g) => (
                  <OptionCard
                    key={g.id}
                    icon={g.icon}
                    image={g.image}
                    name={td(`games.${g.id}.name`)}
                    description={td(`games.${g.id}.description`)}
                    selected={g.id === gameId}
                    onSelect={() => selectGame(g.id)}
                  />
                ))}
              </SimpleGrid>
            </Step>

            {game && (
              <Step index={step++} title={tExt(`${PREFIX}.steps.variant`, {})}>
                <SimpleGrid cols={{ base: 1, sm: 3 }} role='radiogroup'>
                  {game.variants.map((v) => (
                    <OptionCard
                      key={v.id}
                      icon={v.icon}
                      image={v.image}
                      name={td(`games.${game.id}.variants.${v.id}.name`)}
                      description={td(`games.${game.id}.variants.${v.id}.description`)}
                      selected={v.id === variantId}
                      onSelect={() => selectVariant(v.id)}
                    />
                  ))}
                </SimpleGrid>
              </Step>
            )}

            {game && needsLoader && (
              <Step index={step++} title={tExt(`${PREFIX}.steps.loader`, {})}>
                <SimpleGrid cols={{ base: 1, sm: 3 }} role='radiogroup'>
                  {variant!.loaders!.map((l) => (
                    <OptionCard
                      key={l.id}
                      icon={l.icon}
                      image={l.image}
                      name={td(`games.${game.id}.loaders.${l.id}.name`)}
                      description={td(`games.${game.id}.loaders.${l.id}.description`)}
                      selected={l.id === loaderId}
                      onSelect={() => setLoaderId(l.id)}
                    />
                  ))}
                </SimpleGrid>
              </Step>
            )}

            {game && software && (
              <Step index={step++} title={tExt(`${PREFIX}.steps.version`, {})}>
                <Select
                  label={tExt(`${PREFIX}.version.label`, {})}
                  placeholder={tExt(`${PREFIX}.version.placeholder`, {})}
                  data={versions.map((v, i) => ({
                    value: v.version,
                    label: `${v.version}${i === 0 ? ` (${tExt(`${PREFIX}.version.latest`, {})})` : ''}`,
                  }))}
                  value={version}
                  onChange={setVersion}
                  disabled={versionsLoading || !!versionsError}
                  rightSection={versionsLoading ? <Spinner size={16} /> : undefined}
                  error={versionsError}
                  searchable
                  maw={320}
                />
                {selectedVersion && (
                  <Text size='sm' c='dimmed' mt='xs'>
                    {tExt(`${PREFIX}.version.java`, { java: selectedVersion.java })}
                  </Text>
                )}
              </Step>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <div className='lg:sticky lg:top-4'>
            <TitleCard
              title={tExt(`${PREFIX}.summary.title`, {})}
              icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
            >
              <Stack gap='sm'>
                {game ? (
                  <Group gap='xs'>
                    <Badge>{td(`games.${game.id}.name`)}</Badge>
                    {variant && <Badge variant='light'>{td(`games.${game.id}.variants.${variant.id}.name`)}</Badge>}
                    {loader && <Badge variant='light'>{td(`games.${game.id}.loaders.${loader.id}.name`)}</Badge>}
                    {selectedVersion && <Badge variant='outline'>{selectedVersion.version}</Badge>}
                  </Group>
                ) : (
                  <Text size='sm' c='dimmed'>
                    {tExt(`${PREFIX}.summary.empty`, {})}
                  </Text>
                )}
                <Switch
                  label={tExt(`${PREFIX}.summary.wipe`, {})}
                  description={tExt(`${PREFIX}.summary.wipeDescription`, {})}
                  checked={truncateDirectory}
                  onChange={(e) => setTruncateDirectory(e.currentTarget.checked)}
                />
                <Group gap='xs'>
                  <Button
                    disabled={!complete}
                    leftSection={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {tExt(`${PREFIX}.summary.install`, {})}
                  </Button>
                  {game && (
                    <Button variant='default' leftSection={<FontAwesomeIcon icon={faRotateLeft} />} onClick={reset}>
                      {tExt(`${PREFIX}.summary.reset`, {})}
                    </Button>
                  )}
                </Group>
              </Stack>
            </TitleCard>
          </div>
        </Grid.Col>
      </Grid>
    </ServerContentContainer>
  );
}
