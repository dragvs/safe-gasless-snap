import type { MetaFunction } from '@remix-run/node';
import { Jazzicon } from '@ukstv/jazzicon-react';
import {
  AlertOctagon,
  Download,
  PowerCircle,
  SeparatorHorizontal,
  Terminal,
  UserCircle,
} from 'lucide-react';
import { P, match } from 'ts-pattern';
import { Address, Hex } from 'viem';
import { useBalance } from 'wagmi';
import { ConnectButton } from '~/components/buttons/connect';
import { CreateAccountButton } from '~/components/buttons/create-account';
import { InstallFlaskButton } from '~/components/buttons/install-flask';
import { TokenCard } from '~/components/token-card';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { useIsDeployed } from '~/hooks/use-is-deployed';
import { useMetamaskState } from '~/hooks/use-metamask-state';
import { useSnapAccounts } from '~/hooks/use-snap-accounts';
import { getSnapOrigin, isLocalSnap } from '~/lib/snap';
import { Snap } from '~/types/snap';

const dappName = 'Gasless Wallet App';

export const meta: MetaFunction = () => {
  return [
    { title: dappName },
    { name: 'description', content: `Welcome to ${dappName}!` },
  ];
};

const shouldDisplayReconnectButton = (installedSnap?: Snap) =>
  typeof installedSnap !== 'undefined' && isLocalSnap(installedSnap?.id);

export default function Index() {
  const { data: metamaskState } = useMetamaskState();

  const isMetamaskReady = typeof metamaskState !== 'undefined';

  const { data: snapAccounts } = useSnapAccounts(isMetamaskReady);
  const { data: isDeployed } = useIsDeployed(isMetamaskReady);

  const snapAccount = snapAccounts?.[0];

  return (
    <div className="container max-w-[960px] py-8 space-y-8">
      <h1 className="text-xl font-bold text-primary">
        Gasless Safe Wallet App
      </h1>

      <Card className="flex flex-row items-center justify-between p-4">
        {typeof snapAccount !== 'undefined' ? (
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full">
              <Jazzicon address={snapAccount.address} />
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 text-sm">Safe address:</span>
              <span className="text-base font-medium">
                {snapAccount.address}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-[250px]" />
          </div>
        )}

        {shouldDisplayReconnectButton(metamaskState?.installedSnap) && (
          <ConnectButton reconnect={true} />
        )}
      </Card>

      {match(metamaskState)
        .with(P.nullish, () => null)
        .with({ supportsSnaps: false, isFlask: false }, () => (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Install MetaMask Flask</AlertTitle>
            <AlertDescription>
              This dapp extensively uses features only available in MetaMask
              Flask, a canary distribution for developers with access to
              upcoming features.
            </AlertDescription>
          </Alert>
        ))
        .with({ supportsSnaps: true, installedSnap: P.nullish }, () => (
          <Alert variant="destructive">
            <PowerCircle className="h-4 w-4" />
            <AlertTitle>Connect with MetaMask</AlertTitle>
            <AlertDescription className="w-2/3">
              Connect this dapp to MetaMask to be able to create a Safe account,
              manage tokens, and see your balance within the MetaMask extension
              window.
              <div className="pt-2">
                <ConnectButton reconnect={false} />
              </div>
            </AlertDescription>
          </Alert>
        ))
        .when(
          () => snapAccounts && snapAccounts.length <= 0,
          () => (
            <Alert variant="destructive">
              <UserCircle className="h-4 w-4" />
              <AlertTitle>Create account</AlertTitle>
              <AlertDescription className="w-2/3">
                Create a new MetaMask Snap account to get access to your
                personal Safe account.
                <div className="pt-2">
                  <CreateAccountButton />
                </div>
              </AlertDescription>
            </Alert>
          ),
        )
        .when(
          () => snapAccount && typeof isDeployed !== 'undefined' && !isDeployed,
          () => (
            <Alert>
              <AlertOctagon className="h-4 w-4" />
              <AlertTitle>This Safe is not deployed yet!</AlertTitle>
              <AlertDescription className="w-2/3">
                First-ever outgoing transaction from Safe account will deploy
                the contract automagically. You can already top-up this address
                with Wrapped xDAI or USDT to cover the gas fees.
              </AlertDescription>
            </Alert>
          ),
        )
        .otherwise(() => null)}

      <Card className="p-4 space-y-3">
        <TokenCard address={snapAccount?.address as Address} />
        <Separator />
        <TokenCard
          address={snapAccount?.address as Address}
          contractAddress="0x18c8a7ec7897177E4529065a7E7B0878358B3BfF"
          tokenName="Wrapped xDAI"
        />
      </Card>
    </div>
  );
}
