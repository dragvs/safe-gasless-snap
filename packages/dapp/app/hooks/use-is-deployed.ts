import { useQuery } from '@tanstack/react-query';
import { getIsDeployed } from '~/lib/snap';

const queryKey = ['is-deployed'];

export const useIsDeployed = (enabled = true) => {
  return useQuery({
    queryKey,
    queryFn: getIsDeployed,
    enabled,
    refetchInterval: ({ state }) =>
      typeof state.data !== 'boolean' || !state.data ? 5000 : false,
  });
};
