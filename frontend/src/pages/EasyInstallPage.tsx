import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faRotateLeft, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Grid, SimpleGrid, ThemeIcon } from '@mantine/core';
import { useMemo, useState } from 'react';
import Button from '@/elements/buttons/Button.tsx';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import Badge from '@/elements/data-display/Badge.tsx';
import Card from '@/elements/data-display/Card.tsx';
import TitleCard from '@/elements/data-display/TitleCard.tsx';
import Select from '@/elements/input/Select.tsx';
import Group from '@/elements/layout/Group.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import Text from '@/elements/typography/Text.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { games } from '../catalog.ts';
import { useExtTranslations } from '../translations.ts';

const PREFIX = 'pages.server.easyInstall';

function OptionCard({
  icon,
  name,
  description,
  selected,
  onSelect,
}: {
  icon: IconDefinition;
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
        <ThemeIcon size='lg' radius='md' variant={selected ? 'filled' : 'light'}>
          <FontAwesomeIcon icon={icon} />
        </ThemeIcon>
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
  const td = (key: string) => tExt(key as Parameters<typeof tExt>[0], {});

  const [gameId, setGameId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [loaderId, setLoaderId] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const game = useMemo(() => games.find((g) => g.id === gameId) ?? null, [gameId]);
  const variant = useMemo(() => game?.variants.find((v) => v.id === variantId) ?? null, [game, variantId]);
  const needsLoader = !!variant?.loaders?.length;
  const loader = useMemo(() => variant?.loaders?.find((l) => l.id === loaderId) ?? null, [variant, loaderId]);
  const showVersion = !!variant && (!needsLoader || !!loader);
  const complete = showVersion && !!version;

  const selectGame = (id: string | null) => {
    setGameId(id);
    setVariantId(null);
    setLoaderId(null);
    setVersion(null);
  };
  const selectVariant = (id: string) => {
    setVariantId(id);
    setLoaderId(null);
  };
  const reset = () => selectGame(null);

  let step = 1;

  return (
    <ServerContentContainer title={tExt(`${PREFIX}.title`, {})} subtitle={tExt(`${PREFIX}.subtitle`, {})}>
      <Grid gap='md'>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap='md'>
            <Step index={step++} title={tExt(`${PREFIX}.steps.game`, {})}>
              <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} role='radiogroup'>
                {games.map((g) => (
                  <OptionCard
                    key={g.id}
                    icon={g.icon}
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
                      name={td(`games.${game.id}.loaders.${l.id}.name`)}
                      description={td(`games.${game.id}.loaders.${l.id}.description`)}
                      selected={l.id === loaderId}
                      onSelect={() => setLoaderId(l.id)}
                    />
                  ))}
                </SimpleGrid>
              </Step>
            )}

            {game && showVersion && (
              <Step index={step++} title={tExt(`${PREFIX}.steps.version`, {})}>
                <Select
                  label={tExt(`${PREFIX}.version.label`, {})}
                  placeholder={tExt(`${PREFIX}.version.placeholder`, {})}
                  data={game.versions.map((v, i) => ({
                    value: v,
                    label: i === 0 ? `${v} (${tExt(`${PREFIX}.version.latest`, {})})` : v,
                  }))}
                  value={version}
                  onChange={setVersion}
                  searchable
                  maw={320}
                />
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
                    {version && <Badge variant='outline'>{version}</Badge>}
                  </Group>
                ) : (
                  <Text size='sm' c='dimmed'>
                    {tExt(`${PREFIX}.summary.empty`, {})}
                  </Text>
                )}
                <Group gap='xs'>
                  <Button
                    disabled={!complete}
                    leftSection={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                    onClick={() => {
                      addToast(tExt(`${PREFIX}.summary.notWired`, {}), 'info');
                    }}
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
