export type Config = {
  rpcUrl: string;
  deployerAddressPrivateKey: string;
  deploySafe: {
    owners: string[];
    threshold: number;
    saltNonce: string;
  };
};

export const config: Config = {
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  deployerAddressPrivateKey:
    '0x9e161de1982509ad961a20efa5ce2d35146abe070bd665868acfcc012e8b68f8',
  deploySafe: {
    owners: ['0x68F3E0946b7a0b0172DE9dAb28Ce5b6937CC30A7'],
    threshold: 1, // <SAFE_THRESHOLD>
    saltNonce: '1',
  },
};
