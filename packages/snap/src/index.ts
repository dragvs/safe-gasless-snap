import { handleKeyringRequest } from '@metamask/keyring-api';
import {
  DialogType,
  type OnKeyringRequestHandler,
  type OnRpcRequestHandler,
} from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';
import {
  OperationType,
  type MetaTransactionData,
} from '@safe-global/safe-core-sdk-types';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import axios from 'axios';
import { ethers } from 'ethers';

import { SafeKeyring, getState } from './keyring';

axios.defaults.adapter = fetchAdapter;

let _keyring: SafeKeyring;

// eslint-disable-next-line jsdoc/require-jsdoc
async function getKeyring(): Promise<SafeKeyring> {
  if (!_keyring) {
    const state = await getState();
    if (!_keyring) {
      _keyring = new SafeKeyring(state);
    }
  }
  return _keyring;
}

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ request }) => {
  switch (request.method) {
    case 'safe_isDeployed': {
      const keyring = await getKeyring();
      if (!keyring) {
        return false;
      }
      const listedAccounts = await keyring.listAccounts();
      if (!listedAccounts || listedAccounts.length <= 0) {
        return false;
      }
      const safe = await keyring.getSafeSdk();
      return safe ? await safe.isSafeDeployed() : false;
    }

    case 'safe_sendTransaction': {
      const keyring = await getKeyring();
      if (!keyring) {
        return null;
      }

      const { to, value, data } =
        request.params as unknown as MetaTransactionData;

      const safe = await keyring.getSafeSdk();
      const from = await safe.getAddress();

      // eslint-disable-next-line @typescript-eslint/await-thenable
      const response = await snap.request({
        method: 'snap_dialog',
        params: {
          type: DialogType.Confirmation,
          content: panel([
            heading('Do you want to sign & send this transaction?\n'),
            divider(),
            text(`**From:** ${from}`),
            text(`**To:** ${to}`),
            text(`**Value:** ${ethers.utils.formatEther(value)}`),
            text(`**Data:** ${data}`),
          ]),
        },
      });

      if (!response) {
        return null;
      }

      return await keyring.executeTransaction({
        operation: OperationType.Call,
        to,
        value,
        data,
      });
    }

    default:
      throw new Error('Method not found.');
  }
};

export const onKeyringRequest: OnKeyringRequestHandler = async ({ request }) =>
  handleKeyringRequest(await getKeyring(), request);
