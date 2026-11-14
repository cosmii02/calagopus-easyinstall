import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import getAllEggs from '@/api/admin/nests/getAllEggs.ts';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import Select from '@/elements/input/Select.tsx';
import Group from '@/elements/layout/Group.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import getSettings from '../api/getSettings.ts';
import updateSettings from '../api/updateSettings.ts';
import { useExtTranslations } from '../translations.ts';

type EggGroup = { group: string; items: { value: string; label: string }[] };

export default function AdminSettingsPage() {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();

  const [eggGroups, setEggGroups] = useState<EggGroup[]>([]);
  const [eggUuid, setEggUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAllEggs(), getSettings()])
      .then(([nests, settings]) => {
        setEggGroups(
          nests
            .filter(({ eggs }) => eggs.length > 0)
            .map(({ nest, eggs }) => ({
              group: nest.name,
              items: eggs.map((egg) => ({ value: egg.uuid, label: egg.name })),
            })),
        );
        setEggUuid(settings.minecraftEggUuid);
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const save = () => {
    setSaving(true);
    updateSettings({ minecraftEggUuid: eggUuid })
      .then(() => addToast(tExt('admin.saved', {}), 'success'))
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setSaving(false));
  };

  return (
    <Stack>
      <Select
        label={tExt('admin.eggLabel', {})}
        description={tExt('admin.eggDescription', {})}
        placeholder={tExt('admin.eggPlaceholder', {})}
        data={eggGroups}
        value={eggUuid}
        onChange={setEggUuid}
        disabled={loading}
        searchable
        allowDeselect
        maw={480}
      />
      <Group>
        <Button
          leftSection={<FontAwesomeIcon icon={faFloppyDisk} />}
          onClick={save}
          loading={saving}
          disabled={loading}
        >
          {tExt('admin.save', {})}
        </Button>
      </Group>
    </Stack>
  );
}
