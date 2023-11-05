import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { connectSnap } from '~/lib/snap';

export function ConnectButton({ reconnect }: { reconnect?: boolean }) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => await connectSnap(),
    onSettled: () => queryClient.invalidateQueries(),
  });

  return (
    <Button onClick={() => mutate()} disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {reconnect ? 'Reconnect' : 'Connect'}
    </Button>
  );
}
