'use client';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/lib/actions/order.actions';
import { Button } from '@/components/ui/button';
import { Check, Loader } from 'lucide-react';
import React from 'react';

const PlaceOrderForm = () => {
  const router = useRouter();

  const PlaceOrderButton = () => {
    const { pending } = useFormStatus();

    return (
      <Button
        type='submit'
        className='w-full'
        disabled={pending}
        variant='default'
      >
        {pending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Check className='w-4 h-4' />
        )}
        Place Order
      </Button>
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await createOrder();

    if (response.redirectTo) {
      router.push(response.redirectTo);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='w-full'>
      <PlaceOrderButton />
    </form>
  );
};

export default PlaceOrderForm;
