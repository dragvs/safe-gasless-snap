import { useQuery } from '@tanstack/react-query';
import { detectSnaps, isFlask } from '~/lib/metamask';
import { getSnap } from '~/lib/snap';

const queryKey = ['metamask-state'];

export const useMetamaskState = () =>
  useQuery({
    queryKey,
    queryFn: async () => ({
      isFlask: await isFlask(),
      supportsSnaps: await detectSnaps(),
      installedSnap: await getSnap(),
    }),
  });
