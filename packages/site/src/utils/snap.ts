import { KeyringSnapRpcClient } from '@metamask/keyring-api';
import type { MetaMaskInpageProvider } from '@metamask/providers';

import { defaultSnapOrigin } from '../config';
import type { GetSnapsResponse, Snap } from '../types';

const getKeyringClient = () => {
  return new KeyringSnapRpcClient(defaultSnapOrigin, window.ethereum);
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
  snapId: string = defaultSnapOrigin,
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
        snap.id === defaultSnapOrigin && (!version || snap.version === version),
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
      snapId: defaultSnapOrigin,
      request: { method, params: params ?? [] },
    },
  });
};

export const listAccounts = async () => {
  return await getKeyringClient().listAccounts();
};

export const getIsDeployed = async () => {
  return await invokeSnap('safe_isDeployed');
};

export const createAccount = async () => {
  const existingAccounts = await listAccounts();
  if (existingAccounts.length > 0) {
    throw new Error('Safe Snap account already exists');
  }
  const response = await getKeyringClient().createAccount();
  return response.address;
};

export const deploySafe = async () => {
  await invokeSnap('safe_deploy');
};

export const sendSafeTransaction = async (
  to: string,
  value: string,
  data: string,
) => {
  await invokeSnap('safe_sendTransaction', { to, value, data });
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');
