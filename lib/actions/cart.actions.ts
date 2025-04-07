'use server';
import { CartItem } from '@/types';

export async function addItemToCard(data: CartItem) {
  return {
    success: true,
    message: 'Item added to cart',
  };
}
