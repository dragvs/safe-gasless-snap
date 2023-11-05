import { handleKeyringRequest } from '@metamask/keyring-api';
import type {
  OnKeyringRequestHandler,
  OnRpcRequestHandler,
} from '@metamask/snaps-types';
import { copyable, divider, heading, panel, text } from '@metamask/snaps-ui';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import axios from 'axios';

import { SafeKeyring, getState } from './keyring';

let keyring: SafeKeyring;

axios.defaults.adapter = fetchAdapter;

// eslint-disable-next-line jsdoc/require-jsdoc
async function getKeyring(): Promise<SafeKeyring> {
  if (!keyring) {
    const state = await getState();
    if (!keyring) {
      keyring = new SafeKeyring(state);
    }
  }
  return keyring;
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

    case 'safe_deploy': {
      try {
        const transactionHash = await keyring.deploySafe();
        return snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              heading(`Your Safe account has been successfully deployed!`),
              divider(),
              text('Deployment transaction hash:'),
              copyable(transactionHash),
            ]),
          },
        });
      } catch (error) {
        return snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              text('An error occurred while deploying Safe account:'),
              text(String(error)),
            ]),
          },
        });
      }

      // const safe = await getSafeSdk();
      // try {
      //   const destination = '0x68F3E0946b7a0b0172DE9dAb28Ce5b6937CC30A7';
      //   const amount = ethers.utils.parseUnits('0.005', 'ether').toString();
      //   const safeTransactionData: SafeTransactionDataPartial = {
      //     to: destination,
      //     data: '0x',
      //     value: amount,
      //   };
      //   // Create a Safe transaction with the provided parameters
      //   const safeTransaction = await safe.signTransaction(
      //     await safe.createTransaction({
      //       safeTransactionData,
      //     }),
      //   );
      //   const receipt = await safe.executeTransaction(safeTransaction);
      //   return snap.request({
      //     method: 'snap_dialog',
      //     params: {
      //       type: 'confirmation',
      //       content: panel([
      //         text(`Hello, **${origin}**!`),
      //         text(`Transaction hash: ${receipt.hash}`),
      //       ]),
      //     },
      //   });
      // } catch (error) {
      //   return snap.request({
      //     method: 'snap_dialog',
      //     params: {
      //       type: 'confirmation',
      //       content: panel([text(`${error as any}`)]),
      //     },
      //   });
      // }
    }

    default:
      throw new Error('Method not found.');
  }
};

export const onKeyringRequest: OnKeyringRequestHandler = async ({ request }) =>
  handleKeyringRequest(await getKeyring(), request);
