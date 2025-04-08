'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Plus, Minus, Loader } from 'lucide-react';
import { Cart, CartItem } from '@/types';
import { toast } from 'sonner';
import { addItemToCard, removeItemFromCart } from '@/lib/actions/cart.actions';

const AddToCart = ({ item, cart }: { item: CartItem; cart?: Cart }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = async () => {
    startTransition(async () => {
      const response = await addItemToCard(item);

      if (!response?.success) {
        toast.error(response?.message, {
          style: { backgroundColor: 'red', color: 'white' },
        });
        return;
      }

      toast.success(response.message, {
        action: { label: 'View Cart', onClick: () => router.push('/cart') },
        style: { backgroundColor: 'green', color: 'white' },
        actionButtonStyle: {
          backgroundColor: 'white',
          color: 'green',
        },
      });
    });
  };

  const handleRemoveFromCart = async () => {
    startTransition(async () => {
      const response = await removeItemFromCart(item.productId);

      if (!response?.success) {
        toast.error(response?.message, {
          style: { backgroundColor: 'red', color: 'white' },
        });
      }

      toast.success(response.message, {
        action: { label: 'View Cart', onClick: () => router.push('/cart') },
        style: { backgroundColor: 'green', color: 'white' },
        actionButtonStyle: {
          backgroundColor: 'white',
          color: 'green',
        },
      });

      return;
    });
  };

  // Check if item is already in cart
  const existingItem =
    cart &&
    cart.items.find((cartItem) => cartItem.productId === item.productId);

  return existingItem ? (
    <div className='flex gap-2 justify-evenly items-center'>
      <Button type='button' variant='outline' onClick={handleRemoveFromCart}>
        {isPending ? (
          <Loader className='h-4 w-4 animate-spin' />
        ) : (
          <Minus className='h-4 w-4' />
        )}
      </Button>
      <span className='px-2'>{existingItem.qty}</span>
      <Button type='button' variant='outline' onClick={handleAddToCart}>
        {isPending ? (
          <Loader className='h-4 w-4 animate-spin' />
        ) : (
          <Plus className='h-4 w-4' />
        )}
      </Button>
    </div>
  ) : (
    <Button className='w-full' type='button' onClick={handleAddToCart}>
      {isPending ? <Loader className='h-4 w-4 animate-spin' /> : <Plus />}
      Add to Cart
    </Button>
  );
};

export default AddToCart;
