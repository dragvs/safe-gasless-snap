import { useQuery } from '@tanstack/react-query';
import { getKeyringClient } from '~/lib/snap';

const queryKey = ['snap-accounts'];

export const useSnapAccounts = (enabled: boolean = true) => {
  return useQuery({
    queryKey,
    queryFn: async () => await getKeyringClient().listAccounts(),
    enabled,
  });
};
