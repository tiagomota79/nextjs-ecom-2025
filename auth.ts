import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/db/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const config = {
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (credentials == null) return null;

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
          },
        });

        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );
          if (isMatch) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, user, trigger, token }: any) {
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;

      if (trigger === 'update') {
        session.user.name = user.name;
      }

      return session;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, trigger }: any) {
      // Assign user fields to token
      if (user) {
        token.id = user.id;
        token.role = user.role;

        // If user has no name, set it to email
        if (user.name === 'NO_NAME') {
          token.name = user.email!.split('@')[0];

          // Update database to reflect the name change
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              name: token.name,
            },
          });
        }

        if (trigger === 'signIn' || trigger === 'signUp') {
          const cookiesObject = await cookies();
          const sessionCartId = cookiesObject.get('sessionCartId')?.value;

          if (sessionCartId) {
            const sesstionCart = await prisma.cart.findFirst({
              where: {
                sessionCartId,
              },
            });

            if (sesstionCart) {
              // Delete current user cart
              await prisma.cart.deleteMany({ where: { userId: user.id } });

              // Assign new cart to user
              await prisma.cart.update({
                where: {
                  id: sesstionCart.id,
                },
                data: {
                  userId: user.id,
                },
              });
            }
          }
        }
      }

      return token;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authorized({ request }: any) {
      // Check for session cart cookie
      if (!request.cookies.get('sessionCartId')) {
        const sessionCartId = crypto.randomUUID();

        // Clone request headers
        const newRequestHeaders = new Headers(request.headers);

        // Create new response
        const response = NextResponse.next({
          request: {
            headers: newRequestHeaders,
          },
        });

        // Set newly generated sessionCartId in the response cookie
        response.cookies.set('sessionCartId', sessionCartId);

        return response;
      } else {
        return true;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
