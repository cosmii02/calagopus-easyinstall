import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ThemeIcon } from '@mantine/core';
import { useEffect, useState } from 'react';

export default function OptionIcon({
  icon,
  image,
  selected,
}: {
  icon: IconDefinition;
  image?: string;
  selected: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);

  if (image && !failed) {
    return (
      <div className='flex size-10 shrink-0 items-center justify-center rounded-md bg-(--mantine-color-default-hover) p-1'>
        <img src={image} alt='' className='size-full object-contain' onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <ThemeIcon size={40} radius='md' variant={selected ? 'filled' : 'light'}>
      <FontAwesomeIcon icon={icon} size='lg' />
    </ThemeIcon>
  );
}
