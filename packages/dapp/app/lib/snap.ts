import { KeyringSnapRpcClient } from '@metamask/keyring-api';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { GetSnapsResponse, Snap } from '~/types/snap';

export const getSnapOrigin = () =>
  window.env.SNAP_ORIGIN ?? `local:http://localhost:8080`;

export const getKeyringClient = () => {
  return new KeyringSnapRpcClient(getSnapOrigin(), window.ethereum);
};

/**
 * Get the installed snaps in MetaMask.
 *
 * @param provider - The MetaMask inpage provider.
 * @returns The snaps installed in MetaMask.
 */
export const getSnaps = async (
  provider?: MetaMaskInpageProvider,
): Promise<GetSnapsResponse> =>
  (await (provider ?? window.ethereum).request({
    method: 'wallet_getSnaps',
  })) as unknown as GetSnapsResponse;

/**
 * Connect a snap to MetaMask.
 *
 * @param snapId - The ID of the snap.
 * @param params - The params to pass with the snap to connect.
 */
export const connectSnap = async (
  snapId: string = getSnapOrigin(),
  params: Record<'version' | string, unknown> = {},
) => {
  await window.ethereum.request({
    method: 'wallet_requestSnaps',
    params: {
      [snapId]: params,
    },
  });
};

/**
 * Get the snap from MetaMask.
 *
 * @param version - The version of the snap to install (optional).
 * @returns The snap object returned by the extension.
 */
export const getSnap = async (version?: string): Promise<Snap | undefined> => {
  try {
    const snaps = await getSnaps();

    return Object.values(snaps).find(
      (snap) =>
        snap.id === getSnapOrigin() && (!version || snap.version === version),
    );
  } catch (error) {
    console.log('Failed to obtain installed snap', error);
    return undefined;
  }
};

export const invokeSnap = async (method: string, params?: any) => {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: getSnapOrigin(),
      request: { method, params: params ?? [] },
    },
  });
};

export const getIsDeployed = async () => {
  return (await invokeSnap('safe_isDeployed')) as boolean;
};

export const createAccount = async () => {
  const response = await getKeyringClient().createAccount();
  return response.address;
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');
