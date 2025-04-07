'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { CartItem } from '@/types';
import { toast } from 'sonner';
import { addItemToCard } from '@/lib/actions/cart.actions';

const AddToCart = ({ item }: { item: CartItem }) => {
  const router = useRouter();

  const handleAddToCart = async () => {
    const response = await addItemToCard(item);

    if (!response.success) {
      toast.error(response.message, {
        style: { backgroundColor: 'red', color: 'white' },
      });
      return;
    }

    toast.success(`${item.name} added to cart`, {
      action: { label: 'View Cart', onClick: () => router.push('/cart') },
    });
  };

  return (
    <Button className='w-full' type='button' onClick={handleAddToCart}>
      <Plus />
      Add to Cart
    </Button>
  );
};

export default AddToCart;
