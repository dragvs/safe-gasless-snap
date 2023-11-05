import { handleKeyringRequest } from '@metamask/keyring-api';
import {
  DialogType,
  type OnKeyringRequestHandler,
  type OnRpcRequestHandler,
} from '@metamask/snaps-types';
import { copyable, divider, heading, panel, text } from '@metamask/snaps-ui';
import {
  OperationType,
  type MetaTransactionData,
} from '@safe-global/safe-core-sdk-types';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import axios from 'axios';

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
            heading('Do you want to sign & send this transaction?'),
            text(`From: ${from}`),
            divider(),
            text(`To: ${to}`),
            divider(),
            text(`Value: ${value}`),
            divider(),
            text(`Data: ${data}`),
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

    case 'safe_deploy': {
      try {
        const keyring = await getKeyring();
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
