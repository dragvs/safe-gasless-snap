import { useContext, useState } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import { parseEther } from 'viem';

import { MetaMaskContext, MetamaskActions } from '../hooks';
import { sendSafeTransaction } from '../utils';
import { SendButton } from './Buttons';

const Container = styled.div`
  background-color: ${({ theme }) => theme.colors.background?.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  color: ${({ theme }) => theme.colors.text?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

// eslint-disable-next-line jsdoc/require-jsdoc, @typescript-eslint/naming-convention
export function SendForm() {
  const [, dispatch] = useContext(MetaMaskContext);
  const queryClient = useQueryClient();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSendClick = async () => {
    try {
      await sendSafeTransaction(recipient, String(parseEther(amount)), '0x');
      await queryClient.refetchQueries(['is-deployed']);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  return (
    <Container>
      <div>
        <input
          style={{ width: '100%' }}
          placeholder="Recipient"
          value={recipient}
          onChange={(evt) => setRecipient(evt.target.value)}
        />
        <input
          style={{ width: '100%' }}
          placeholder="Amount"
          value={amount}
          onChange={(evt) => setAmount(evt.target.value)}
        />
      </div>
      <br />
      <SendButton onClick={handleSendClick} />
    </Container>
  );
}
