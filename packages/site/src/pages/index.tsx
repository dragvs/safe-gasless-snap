import { useContext } from 'react';
import { useQuery } from 'react-query';
import styled from 'styled-components';

import {
  Card,
  ConnectButton,
  CreateAccountButton,
  InstallFlaskButton,
} from '../components';
import { SendForm } from '../components/SendForm';
import { defaultSnapOrigin } from '../config';
import { MetaMaskContext, MetamaskActions } from '../hooks';
import {
  connectSnap,
  createAccount,
  getIsDeployed,
  getSnap,
  isLocalSnap,
  listAccounts,
} from '../utils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

// const Subtitle = styled.p`
//   font-size: ${({ theme }) => theme.fontSizes.large};
//   font-weight: 500;
//   margin-top: 0;
//   margin-bottom: 0;
//   ${({ theme }) => theme.mediaQueries.small} {
//     font-size: ${({ theme }) => theme.fontSizes.text};
//   }
// `;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  const { data: snapAccounts } = useQuery({
    queryKey: ['snap-accounts'],
    queryFn: listAccounts,
    enabled: isMetaMaskReady,
  });

  const hasSnapAccount =
    typeof snapAccounts !== 'undefined' && snapAccounts.length > 0;

  const { data: isDeployed } = useQuery({
    queryKey: ['is-deployed'],
    queryFn: getIsDeployed,
    enabled: isMetaMaskReady,
  });

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleCreateAccountClick = async () => {
    try {
      await createAccount();
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  // const handleDeployAccountClick = async () => {
  //   try {
  //     await deploySafe();
  //     await refetchDeploy();
  //   } catch (error) {
  //     console.error(error);
  //     dispatch({ type: MetamaskActions.SetError, payload: error });
  //   }
  // };

  // const handleCreateAccountClick = async () => {
  //   try {
  //     await createAccount();
  //   } catch (error) {
  //     console.error(error);
  //     dispatch({ type: MetamaskActions.SetError, payload: error });
  //   }
  // };

  return (
    <Container>
      <Heading>
        Welcome to <Span>Gasless Wallet App</Span>
      </Heading>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}
        {hasSnapAccount ? (
          <Card
            content={{
              title: isDeployed
                ? 'Your Safe is deployed'
                : 'Your Safe is not deployed yet',
              description: (
                <span>
                  Address: <b>{snapAccounts[0]?.address}</b>
                </span>
              ),
            }}
            disabled={!state.installedSnap}
            fullWidth={isMetaMaskReady && Boolean(state.installedSnap)}
          />
        ) : (
          <Card
            content={{
              title: 'Create account',
              description: '',
              button: (
                <CreateAccountButton
                  onClick={handleCreateAccountClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
            fullWidth={isMetaMaskReady && Boolean(state.installedSnap)}
          />
        )}

        {hasSnapAccount && <SendForm />}
      </CardContainer>
    </Container>
  );
};

export default Index;
