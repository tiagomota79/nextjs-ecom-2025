'use server';
import {
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
} from '../validators';
import { auth, signIn, signOut } from '@/auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { hashSync } from 'bcrypt-ts-edge';
import { prisma } from '@/db/prisma';
import { formatZodError } from '../utils';
import { ShippingAddress } from '@/types';
import { z } from 'zod';

export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', user);

    return { success: true, message: 'Signed in successfully' };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return { success: false, message: 'Invalid email or password' };
  }
}

export async function signOutUser() {
  await signOut();
}

// Sign up user
export async function signUpUser(prev: unknown, formData: FormData) {
  try {
    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const plainPassword = user.password;

    user.password = hashSync(user.password, 10);

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
      },
    });

    await signIn('credentials', {
      email: user.email,
      password: plainPassword,
    });

    return { success: true, message: 'User created successfully' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (isRedirectError(error)) {
      throw error;
    }

    return { success: false, message: formatZodError(error) };
  }
}

// Get user by ID
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) throw new Error('User not found');

  return user;
}

// Update user address on db
export async function updateUserAddress(data: ShippingAddress) {
  try {
    const session = await auth();

    const currentUser = await getUserById(session?.user?.id as string);

    if (!currentUser) throw new Error('User not found');

    const address = {
      fullName: data.fullName,
      streetAddress: data.streetAddress,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
    };

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        address,
      },
    });
    return { success: true, message: 'Address updated successfully' };
  } catch (error) {
    return { success: false, message: formatZodError(error) };
  }
}

// Update user payment method on db
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>
) {
  try {
    const session = await auth();

    const currentUser = await getUserById(session?.user?.id as string);

    if (!currentUser) throw new Error('User not found');

    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        paymentMethod: paymentMethod.type,
      },
    });

    return { success: true, message: 'Payment method updated successfully' };
  } catch (error) {
    return { success: false, message: formatZodError(error) };
  }
}
