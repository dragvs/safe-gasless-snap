import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@remix-run/react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, SendIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Address, encodeFunctionData, isAddress, parseUnits } from 'viem';
import { erc20ABI, useBalance } from 'wagmi';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { ToastAction } from '~/components/ui/toast';
import { useToast } from '~/components/ui/use-toast';
import { invokeSnap } from '~/lib/snap';

export function SendDialog({
  erc20Address,
  balanceData,
}: {
  erc20Address?: Address;
  balanceData: ReturnType<typeof useBalance>['data'];
}) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        to: z.string().refine((value) => isAddress(value), {
          message: 'This is not an Ethereum address',
        }),
        value: z.coerce
          .number({ invalid_type_error: 'This is not a number' })
          .gt(0, 'Value should be more than zero')
          .lt(
            parseFloat(balanceData?.formatted ?? '0'),
            'Value should be less than the current balance',
          ),
      }),
    [balanceData?.formatted],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: '',
      value: 0,
    },
  });

  const { mutate, isPending, reset } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      let value

      try {
        console.log('Parsing value', values.value)
        value = parseUnits(
          values.value.toFixed(18),
          balanceData?.decimals ?? 0,
        );
      } catch (error) {
        console.error('Failed to parse value', error);
        throw error;
      }

      let transactionHash

      try {
        transactionHash = await invokeSnap('safe_sendTransaction', {
          to: erc20Address ?? values.to,
          value: erc20Address ? '0' : value.toString(),
          data: erc20Address
            ? encodeFunctionData({
              abi: erc20ABI,
              functionName: 'transfer',
              args: [values.to as Address, value],
            })
            : '0x',
        });
      } catch (error) {
        console.error('Failed to send transaction', error);
        throw error;
      }

      if (typeof transactionHash !== 'string') {
        throw new Error('Transaction failed.');
      }
      return transactionHash;
    },
    onSuccess: (data) => {
      toast({
        title: 'Transaction Confirmed',
        action: (
          <ToastAction asChild altText="View transaction on explorer">
            <Link to={`https://blockscout.chiadochain.net/tx/${data}`}>
              View TX on Explorer
            </Link>
          </ToastAction>
        ),
      });
    },
    onError: (error) => {
      toast({
        title: 'Transaction Reverted',
        description: error.message,
      });
    },
    onSettled: () => {
      setOpen(false);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  useEffect(() => {
    form.reset();
    reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          disabled={typeof balanceData === 'undefined'}
        >
          <SendIcon className="mr-2 h-4 w-4" /> Send
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send {balanceData?.symbol}</DialogTitle>
          <DialogDescription>
            Gas fees will be paid by this token.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient</FormLabel>
                  <FormControl>
                    <Input placeholder="0x000...00000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row justify-between">
                    <FormLabel>Value</FormLabel>
                    <FormLabel className="font-medium text-xs text-gray-600">
                      Max:{' '}
                      {parseFloat(balanceData?.formatted ?? '0').toFixed(4)}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.0}
                      step="any"
                      placeholder="0.0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
              Send
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
