'use server';
import { prisma } from '@/db/prisma';
import { convertToPlainObject } from '../utils';
import { LATEST_PRODUCTS_LIMIT } from '../constants';

export async function getLatestProducts() {
  const data = await prisma.product.findMany({
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return convertToPlainObject(data);
}

export async function getProductBySlug(slug: string) {
  const data = await prisma.product.findUnique({
    where: {
      slug,
    },
  });

  return convertToPlainObject(data);
}

export async function getSingleProduct(id: string) {
  const data = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  return convertToPlainObject(data);
}
