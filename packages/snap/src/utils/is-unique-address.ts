import type { Wallet } from 'src/keyring/keyring';

/**
 * Validates whether there are no duplicate addresses in the provided array of wallets.
 *
 * @param address - The address to validate for duplication.
 * @param wallets - The array of wallets to search for duplicate addresses.
 * @returns Returns true if no duplicate addresses are found, otherwise false.
 */
export function isUniqueAddress(address: string, wallets: Wallet[]): boolean {
  return !wallets.find((wallet) => wallet.account.address === address);
}
