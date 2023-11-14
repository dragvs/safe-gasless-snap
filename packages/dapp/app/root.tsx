import styles from './tailwind.css';

import { cssBundleHref } from '@remix-run/css-bundle';
import { json, type LinksFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { gnosisChiado } from 'wagmi/chains';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { publicProvider } from 'wagmi/providers/public';
import { Toaster } from '~/components/ui/toaster';

const queryClient = new QueryClient();

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [gnosisChiado],
  [publicProvider()],
);

const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
  connectors: [new InjectedConnector({ chains })],
});

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
];

export async function loader() {
  return json({
    env: {
      SNAP_ORIGIN: process.env.SNAP_ORIGIN ?? 'npm:rocketlaunchsnap',
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background">
        <WagmiConfig config={config}>
          <QueryClientProvider client={queryClient}>
            <Outlet />
          </QueryClientProvider>
        </WagmiConfig>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.env = ${JSON.stringify(data.env)}`,
          }}
        />
      </body>
    </html>
  );
}
