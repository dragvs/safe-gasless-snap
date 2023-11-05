import { Common, Hardfork } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';
import type { TransactionStatusResponse } from '@gelatonetwork/relay-sdk';
import type {
  Keyring,
  KeyringAccount,
  KeyringRequest,
  SubmitRequestResponse,
} from '@metamask/keyring-api';
import {
  EthAccountType,
  EthMethod,
  KeyringEvent,
  emitSnapKeyringEvent,
} from '@metamask/keyring-api';
import type { Json, JsonRpcRequest } from '@metamask/snaps-types';
import Safe, {
  EthersAdapter,
  type SafeAccountConfig,
  predictSafeAddress,
} from '@safe-global/protocol-kit';
import { GelatoRelayPack } from '@safe-global/relay-kit';
import {
  type MetaTransactionData,
  OperationType,
} from '@safe-global/safe-core-sdk-types';
import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';

import { isUniqueAddress, throwError, serializeTransaction } from '../utils';
import { saveState } from './state';

export type Wallet = {
  account: KeyringAccount;
  privateKey: string;
};

export type KeyringState = {
  wallets: Record<string, Wallet>;
  pendingRequests: Record<string, KeyringRequest>;
  useSyncApprovals: boolean;
};

export class SafeKeyring implements Keyring {
  #state: KeyringState;

  #safeSdk?: Safe;

  #relayPack: GelatoRelayPack;

  constructor(state: KeyringState) {
    this.#state = state;
    this.#relayPack = new GelatoRelayPack();
  }

  async listAccounts(): Promise<KeyringAccount[]> {
    return Object.values(this.#state.wallets).map((wallet) => wallet.account);
  }

  async getAccount(id: string): Promise<KeyringAccount> {
    return (
      this.#state.wallets[id]?.account ??
      throwError(`Account '${id}' not found`)
    );
  }

  async createAccount(
    options: Record<string, Json> = {},
  ): Promise<KeyringAccount> {
    const privateKey = await this.#getPrivateKey();

    const safe = await this.getSafeSdk();
    const address = await safe.getAddress();

    if (!isUniqueAddress(address, Object.values(this.#state.wallets))) {
      throw new Error(`Account address already in use: ${address}`);
    }

    try {
      const account: KeyringAccount = {
        id: uuid(),
        options,
        address,
        methods: [
          EthMethod.Sign,
          EthMethod.SignTransaction,
          EthMethod.SignTypedDataV1,
          EthMethod.SignTypedDataV3,
          EthMethod.SignTypedDataV4,
        ],
        type: EthAccountType.Eip4337,
      };
      await this.#emitEvent(KeyringEvent.AccountCreated, { account });
      this.#state.wallets[account.id] = { account, privateKey };
      await this.#saveState();
      return account;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }

  async deploySafe(): Promise<string> {
    return await this.#executeTransactions([
      {
        operation: OperationType.Call,
        to: '0xBf99Be97a8905439DC051ceA15df33D48a3DCc8d',
        value: '10000000000000',
        data: '0x',
      },
    ]);
  }

  async updateAccount(account: KeyringAccount): Promise<void> {
    const wallet =
      this.#state.wallets[account.id] ??
      throwError(`Account '${account.id}' not found`);
    const newAccount: KeyringAccount = {
      ...wallet.account,
      ...account,
      // Restore read-only properties.
      address: wallet.account.address,
    };
    try {
      await this.#emitEvent(KeyringEvent.AccountUpdated, {
        account: newAccount,
      });
      wallet.account = newAccount;
      await this.#saveState();
    } catch (error) {
      throwError((error as Error).message);
    }
  }

  async deleteAccount(id: string): Promise<void> {
    try {
      await this.#emitEvent(KeyringEvent.AccountDeleted, { id });
      delete this.#state.wallets[id];
      await this.#saveState();
    } catch (error) {
      throwError((error as Error).message);
    }
  }

  async listRequests(): Promise<KeyringRequest[]> {
    return Object.values(this.#state.pendingRequests);
  }

  async getRequest(id: string): Promise<KeyringRequest> {
    return (
      this.#state.pendingRequests[id] ?? throwError(`Request '${id}' not found`)
    );
  }

  async submitRequest(request: KeyringRequest): Promise<SubmitRequestResponse> {
    return this.#state.useSyncApprovals
      ? this.#syncSubmitRequest(request)
      : this.#asyncSubmitRequest(request);
  }

  async approveRequest(id: string): Promise<void> {
    const { request } =
      this.#state.pendingRequests[id] ??
      throwError(`Request '${id}' not found`);
    const result = await this.#handleSigningRequest(
      request.method,
      request.params ?? [],
    );
    await this.#removePendingRequest(id);
    await this.#emitEvent(KeyringEvent.RequestApproved, { id, result });
  }

  async rejectRequest(id: string): Promise<void> {
    if (this.#state.pendingRequests[id] === undefined) {
      throw new Error(`Request '${id}' not found`);
    }

    await this.#removePendingRequest(id);
    await this.#emitEvent(KeyringEvent.RequestRejected, { id });
  }

  async #removePendingRequest(id: string): Promise<void> {
    delete this.#state.pendingRequests[id];
    await this.#saveState();
  }

  // #getCurrentUrl(): string {
  //   const dappUrlPrefix =
  //     // eslint-disable-next-line no-restricted-globals
  //     process.env.NODE_ENV === 'production'
  //       ? // eslint-disable-next-line no-restricted-globals
  //         process.env.DAPP_ORIGIN_PRODUCTION
  //       : // eslint-disable-next-line no-restricted-globals
  //         process.env.DAPP_ORIGIN_DEVELOPMENT;
  //   const dappVersion: string = packageInfo.version;

  //   // Ensuring that both dappUrlPrefix and dappVersion are truthy
  //   if (dappUrlPrefix && dappVersion && process.env.NODE_ENV === 'production') {
  //     return `${dappUrlPrefix}${dappVersion}/`;
  //   }
  //   // Default URL if dappUrlPrefix or dappVersion are falsy, or if URL construction fails
  //   return dappUrlPrefix as string;
  // }

  async #asyncSubmitRequest(
    request: KeyringRequest,
  ): Promise<SubmitRequestResponse> {
    this.#state.pendingRequests[request.id] = request;
    await this.#saveState();
    // const dappUrl = this.#getCurrentUrl();
    return {
      pending: true,
      redirect: {
        // url: dappUrl,
        message: 'Redirecting to Snap Simple Keyring to sign transaction',
      },
    };
  }

  async #syncSubmitRequest(
    request: KeyringRequest,
  ): Promise<SubmitRequestResponse> {
    const { method, params = [] } = request.request as JsonRpcRequest;
    const signature = await this.#handleSigningRequest(method, params);
    return {
      pending: false,
      result: signature,
    };
  }

  #getWalletByAddress(address: string): Wallet {
    const match = Object.values(this.#state.wallets).find(
      (wallet) =>
        wallet.account.address.toLowerCase() === address.toLowerCase(),
    );

    return match ?? throwError(`Account '${address}' not found`);
  }

  async #getPrivateKey(): Promise<`0x${string}`> {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const privateKey = await snap.request({
      method: 'snap_getEntropy',
      params: {
        version: 1,
        salt: 'safe',
      },
    });

    return privateKey ?? throwError('No private key returned');
  }

  async getSafeSdk(): Promise<Safe> {
    if (typeof this.#safeSdk === 'undefined') {
      const privateKey = await this.#getPrivateKey();

      const provider = new ethers.providers.Web3Provider(ethereum as any);
      const signer = new ethers.Wallet(privateKey, provider);

      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer,
      });

      console.log({
        privateKey,
        address: ethers.utils.computeAddress(privateKey),
      });

      const owners = [ethers.utils.computeAddress(privateKey)];
      const threshold = 1;

      const safeAccountConfig: SafeAccountConfig = {
        owners,
        threshold,
      };

      const safeAddress = await predictSafeAddress({
        ethAdapter,
        safeAccountConfig,
      });

      const isSafeDeployed = await ethAdapter.isContractDeployed(safeAddress);

      if (isSafeDeployed) {
        this.#safeSdk = await Safe.create({
          ethAdapter,
          safeAddress,
        });
      } else {
        this.#safeSdk = await Safe.create({
          ethAdapter,
          predictedSafe: { safeAccountConfig },
        });
      }
    }
    return this.#safeSdk;
  }

  async #handleSigningRequest(method: string, params: Json): Promise<Json> {
    switch (method) {
      case EthMethod.Sign: {
        const [from, data] = params as [string, string];
        return this.#signMessage(from, data);
      }

      case EthMethod.SignTransaction: {
        const [tx] = params as [any];
        return await this.#signTransaction(tx);
      }

      case 'eth_sendTransaction': {
        const [tx] = params as [any];
        console.log('eth_sendTransaction');
        console.log(tx);
        return null;
      }

      // case EthMethod.SignTypedDataV1: {
      //   const [from, data] = params as [string, Json];
      //   return this.#signTypedData(from, data, {
      //     version: SignTypedDataVersion.V1,
      //   });
      // }

      // case EthMethod.SignTypedDataV3: {
      //   const [from, data] = params as [string, Json];
      //   return this.#signTypedData(from, data, {
      //     version: SignTypedDataVersion.V3,
      //   });
      // }

      // case EthMethod.SignTypedDataV4: {
      //   const [from, data] = params as [string, Json];
      //   return this.#signTypedData(from, data, {
      //     version: SignTypedDataVersion.V4,
      //   });
      // }

      default: {
        throw new Error(`EVM method '${method}' not supported`);
      }
    }
  }

  async #signTransaction(tx: any): Promise<Json> {
    // Patch the transaction to make sure that the `chainId` is a hex string.
    if (!tx.chainId.startsWith('0x')) {
      tx.chainId = `0x${parseInt(tx.chainId, 10).toString(16)}`;
    }

    const common = Common.custom(
      { chainId: tx.chainId },
      {
        hardfork:
          tx.maxPriorityFeePerGas || tx.maxFeePerGas
            ? Hardfork.London
            : Hardfork.Istanbul,
      },
    );

    const priv = await this.#getPrivateKey();
    console.log(priv);

    // eslint-disable-next-line no-restricted-globals
    const privateKey = Buffer.from(priv.substring(2, 66), 'hex');

    const signedTx = TransactionFactory.fromTxData(tx, {
      common,
    }).sign(privateKey);

    return serializeTransaction(signedTx.toJSON(), signedTx.type);
  }

  // async #signTypedData(
  //   from: string,
  //   data: Json,
  //   opts: { version: SignTypedDataVersion } = {
  //     version: SignTypedDataVersion.V4,
  //   },
  // ): string {
  //   const { privateKey } = this.#getWalletByAddress(from);
  //   const safe = await this.#getSafeSdk(privateKey);

  //   // const signature = await safe.signTypedData();
  //   return signature.data;

  //   const privateKeyBuffer = Buffer.from(privateKey, 'hex');

  //   return signTypedData({
  //     privateKey: privateKeyBuffer,
  //     data: data as unknown as TypedDataV1 | TypedMessage<any>,
  //     version: opts.version,
  //   });
  // }

  // #signPersonalMessage(from: string, request: string): string {
  //   const { privateKey } = this.#getWalletByAddress(from);
  //   const privateKeyBuffer = Buffer.from(privateKey, 'hex');
  //   const messageBuffer = Buffer.from(request.slice(2), 'hex');

  //   const signature = personalSign({
  //     privateKey: privateKeyBuffer,
  //     data: messageBuffer,
  //   });

  //   const recoveredAddress = recoverPersonalSignature({
  //     data: messageBuffer,
  //     signature,
  //   });
  //   if (recoveredAddress !== from) {
  //     throw new Error(
  //       `Signature verification failed for account '${from}' (got '${recoveredAddress}')`,
  //     );
  //   }
  //   return signature;
  // }

  async #signMessage(from: string, data: string): Promise<string> {
    const { privateKey } = this.#getWalletByAddress(from);

    const provider = new ethers.providers.Web3Provider(ethereum as any);
    const signer = new ethers.Wallet(privateKey, provider);

    return await signer.signMessage(data);
  }

  async #executeTransactions(
    transactions: MetaTransactionData[],
  ): Promise<string> {
    const safe = await this.getSafeSdk();

    const chainId = await safe.getChainId();
    const balance = await safe.getBalance();

    const options = {
      gasLimit: '525000',
      gasToken: '0x18c8a7ec7897177E4529065a7E7B0878358B3BfF',
    };

    const relayFee = await this.#relayPack.getEstimateFee(
      chainId,
      options.gasLimit,
      options.gasToken,
    );

    if (balance.lt(relayFee)) {
      throw new Error(
        `Insufficient funds. Relay fee: ${relayFee}, current balance: ${balance.toString()}`,
      );
    }

    const relayedTransaction = await this.#relayPack.createRelayedTransaction({
      safe,
      transactions,
      options,
    });

    const { taskId } = await this.#relayPack.executeRelayTransaction(
      await safe.signTransaction(relayedTransaction),
      safe,
    );

    const transactionStatus = await this.#waitForGelatoTask(taskId);

    return (
      transactionStatus.transactionHash ??
      throwError(`Deployment failed: ${transactionStatus.taskState}`)
    );
  }

  async #waitForGelatoTask(taskId: string): Promise<TransactionStatusResponse> {
    const status = await this.#relayPack.getTaskStatus(taskId);

    if (
      typeof status !== 'undefined' &&
      !['CheckPending', 'ExecPending'].includes(status.taskState)
    ) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await this.#waitForGelatoTask(taskId);
  }

  async filterAccountChains(_id: string, chains: string[]): Promise<string[]> {
    // The `id` argument is not used because all accounts created by this snap
    // are expected to be compatible with any EVM chain.
    return chains.filter((chain) => {
      console.log(chain);
      return true;
    });
  }

  async #saveState(): Promise<void> {
    await saveState(this.#state);
  }

  async #emitEvent(
    event: KeyringEvent,
    data: Record<string, Json>,
  ): Promise<void> {
    await emitSnapKeyringEvent(snap, event, data);
  }

  async toggleSyncApprovals(): Promise<void> {
    this.#state.useSyncApprovals = !this.#state.useSyncApprovals;
    await this.#saveState();
  }

  isSynchronousMode(): boolean {
    return this.#state.useSyncApprovals;
  }
}
