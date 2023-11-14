import { Address, useBalance, useChainId, useNetwork } from 'wagmi';
import { SendDialog } from '~/components/send-dialog';
import { Skeleton } from '~/components/ui/skeleton';

export function TokenCard({
  address,
  tokenName,
  contractAddress,
}: {
  address?: Address;
  tokenName?: string;
  contractAddress?: Address;
}) {
  const { data } = useBalance({
    address: address!,
    token: contractAddress!,
    enabled: !!address,
    watch: true,
  });

  return (
    <div className="flex flex-row items-center space-x-3">
      <Skeleton className="h-12 w-12 rounded-full" />

      {data ? (
        <div className="flex flex-col">
          <span className="font-medium">{tokenName ?? data.symbol}</span>
          <span className="text-zinc-600 text-sm">
            {data.formatted} {data.symbol}
          </span>
        </div>
      ) : (
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      )}

      <div className="flex flex-1 flex-row justify-end">
        <SendDialog erc20Address={contractAddress} balanceData={data} />
      </div>
    </div>
  );
}
