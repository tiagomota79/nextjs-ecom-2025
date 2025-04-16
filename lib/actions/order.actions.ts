'use server';

import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { formatZodError } from '../utils';
import { auth } from '@/auth';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';
import { insertOrderSchema } from '../validators';
import { prisma } from '@/db/prisma';
import { CartItem } from '@/types';

// Create order and create order items
export async function createOrder() {
  try {
    const session = await auth();

    if (!session) throw new Error('User not authenticated');

    const cart = await getMyCart();

    const userId = session?.user?.id;

    if (!userId) throw new Error('User not found');

    const user = await getUserById(userId);

    if (!cart || cart.items.length === 0) {
      return { success: false, message: 'Cart is empty', redirectTo: '/cart' };
    }
    if (!user.address) {
      return {
        success: false,
        message: 'No shipping address',
        redirectTo: '/shipping-address',
      };
    }
    if (!user.paymentMethod) {
      return {
        success: false,
        message: 'No payment method',
        redirectTo: '/payment-method',
      };
    }

    // Create order object
    const order = insertOrderSchema.parse({
      userId: userId,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    // Create a transaction to create order and order items in db
    const intertedOrderId = await prisma.$transaction(async (tx) => {
      // Create order
      const insertedOrder = await tx.order.create({
        data: order,
      });

      // Create order items from cart items
      for (const item of cart.items as CartItem[]) {
        await tx.orderItem.create({
          data: {
            ...item,
            price: item.price,
            orderId: insertedOrder.id,
          },
        });
      }

      // Clear cart
      await tx.cart.update({
        where: {
          id: cart.id,
        },
        data: {
          items: [],
          itemsPrice: 0,
          shippingPrice: 0,
          taxPrice: 0,
          totalPrice: 0,
        },
      });

      return insertedOrder.id;
    });

    if (!intertedOrderId) throw new Error('Order not created');

    return {
      success: true,
      message: 'Order created successfully',
      redirectTo: `/order/${intertedOrderId}`,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: formatZodError(error),
    };
  }
}
