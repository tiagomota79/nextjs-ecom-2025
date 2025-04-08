'use server';
import { CartItem } from '@/types';
import { cookies } from 'next/headers';
import {
  convertToPlainObject,
  formatZodError,
  roundToTwoDecimalPlaces,
} from '../utils';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { cartItemSchema, insertCartSchema } from '../validators';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

// Calculate cart prices
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = roundToTwoDecimalPlaces(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = roundToTwoDecimalPlaces(itemsPrice > 100 ? 0 : 10),
    taxPrice = roundToTwoDecimalPlaces(0.15 * itemsPrice),
    totalPrice = roundToTwoDecimalPlaces(itemsPrice + shippingPrice + taxPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export async function addItemToCard(data: CartItem) {
  try {
    // Check for cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;

    if (!sessionCartId) throw new Error('Cart session not found');

    // Get session and user ID
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Get Cart
    const cart = await getMyCart();

    // Parse and validate item
    const item = cartItemSchema.parse(data);

    // Find product in database
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
      },
    });

    if (!product) throw new Error('Product not found');

    if (!cart) {
      // Create new cart if it doesn't exist
      const newCart = insertCartSchema.parse({
        userId,
        items: [item],
        sessionCartId,
        ...calcPrice([item]),
      });

      // Add the new cart to the database
      await prisma.cart.create({
        data: newCart,
      });

      // Revalidate product page
      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} added to cart`,
      };
    } else {
      // Check if item already exists in cart
      const itemAlreadyInCart = (cart.items as CartItem[]).find(
        (cartItem) => cartItem.productId === item.productId
      );

      if (itemAlreadyInCart) {
        // Check stock
        if (product.stock < itemAlreadyInCart.qty + 1) {
          throw new Error('Not enough stock');
        }

        // Increase quantity of existing item
        (cart.items as CartItem[]).find(
          (cartItem) => cartItem.productId === item.productId
        )!.qty = itemAlreadyInCart.qty + 1;
      } else {
        // Check stock
        if (product.stock < 1) {
          throw new Error('Not enough stock');
        }

        // Add new item to cart
        (cart.items as CartItem[]).push(item);
      }

      // Save to database
      await prisma.cart.update({
        where: {
          id: cart.id,
        },
        data: {
          items: cart.items as Prisma.CartUpdateitemsInput[],
          ...calcPrice(cart.items as CartItem[]),
        },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${
          itemAlreadyInCart ? 'updated in' : 'added to'
        } cart`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: formatZodError(error),
    };
  }
}

export async function getMyCart() {
  // Check for cart cookie
  const sessionCartId = (await cookies()).get('sessionCartId')?.value;

  if (!sessionCartId) throw new Error('Cart session not found');

  // Get session and user ID
  const session = await auth();
  const userId = session?.user?.id ? (session.user.id as string) : undefined;

  // Get user cart from database
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionCartId },
  });

  if (!cart) return undefined;

  // Convert decimals and return
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}

export async function removeItemFromCart(productId: string) {
  try {
    // Check for cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;

    if (!sessionCartId) throw new Error('Cart session not found');

    // Get product
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
      },
    });

    if (!product) throw new Error('Product not found');

    // Get cart
    const cart = await getMyCart();
    if (!cart) throw new Error('Cart not found');

    // Check for item
    const existingItem = (cart.items as CartItem[]).find(
      (item) => item.productId === productId
    );

    if (!existingItem) throw new Error('Item not found in cart');

    // Check if only one item is in cart
    if (existingItem.qty === 1) {
      // Remove item from cart
      cart.items = (cart.items as CartItem[]).filter(
        (item) => item.productId !== existingItem.productId
      );
    } else {
      // Decrease quantity of item
      (cart.items as CartItem[]).find(
        (item) => item.productId === productId
      )!.qty = existingItem.qty - 1;
    }

    // Update database
    await prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[]),
      },
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name} removed from cart`,
    };
  } catch (error) {
    return {
      success: false,
      message: formatZodError(error),
    };
  }
}
