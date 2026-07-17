### Order Model

```prisma
model Order {
  id        String   @id @default(uuid())
  clerkId  String
  products Int  @default(0)
  orderTotal Int @default(0)
  tax Int @default(0)
  shipping Int @default(0)
  email String
  isPaid Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Order Actions

```ts
export const createOrderAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser();
  try {
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    const order = await db.order.create({
      data: {
        clerkId: user.id,
        products: cart.numItemsInCart,
        orderTotal: cart.orderTotal,
        tax: cart.tax,
        shipping: cart.shipping,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    await db.cart.delete({
      where: {
        id: cart.id,
      },
    });
  } catch (error) {
    return renderError(error);
  }
  redirect('/orders');
};
export const fetchUserOrders = async () => {
  const user = await getAuthUser();
  const orders = await db.order.findMany({
    where: {
      clerkId: user.id,
      isPaid: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return orders;
};

export const fetchAdminOrders = async () => {
  const user = await getAdminUser();

  const orders = await db.order.findMany({
    where: {
      isPaid: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return orders;
};
```

### Orders Page

- utils/format.ts

```ts
export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};
```

- create app/orders/loading.tsx

```tsx
'use client';

import LoadingTable from '@/components/global/LoadingTable';

function loading() {
  return <LoadingTable />;
}
export default loading;
```

- app/orders/page.tsx

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import SectionTitle from '@/components/global/SectionTitle';
import { fetchUserOrders } from '@/utils/actions';
import { formatCurrency, formatDate } from '@/utils/format';
async function OrdersPage() {
  const orders = await fetchUserOrders();

  return (
    <>
      <SectionTitle text='Your Orders' />
      <div>
        <Table>
          <TableCaption>Total orders : {orders.length}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Products</TableHead>
              <TableHead>Order Total</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Shipping</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const { id, products, orderTotal, tax, shipping, createdAt } =
                order;

              return (
                <TableRow key={order.id}>
                  <TableCell>{products}</TableCell>
                  <TableCell>{formatCurrency(orderTotal)}</TableCell>
                  <TableCell>{formatCurrency(tax)}</TableCell>
                  <TableCell>{formatCurrency(shipping)}</TableCell>
                  <TableCell>{formatDate(createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
export default OrdersPage;
```

### Admin - Sales Page

- create app/admin/sales/loading.tsx

```tsx
'use client';

import LoadingTable from '@/components/global/LoadingTable';

function loading() {
  return <LoadingTable />;
}
export default loading;
```

- app/admin/sales/page.tsx

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { fetchAdminOrders } from '@/utils/actions';
import { formatCurrency, formatDate } from '@/utils/format';
async function SalesPage() {
  const orders = await fetchAdminOrders();

  return (
    <div>
      <Table>
        <TableCaption>Total orders : {orders.length}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Order Total</TableHead>
            <TableHead>Tax</TableHead>
            <TableHead>Shipping</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const {
              id,
              products,
              orderTotal,
              tax,
              shipping,
              createdAt,
              email,
            } = order;

            return (
              <TableRow key={order.id}>
                <TableCell>{email}</TableCell>
                <TableCell>{products}</TableCell>
                <TableCell>{formatCurrency(orderTotal)}</TableCell>
                <TableCell>{formatCurrency(tax)}</TableCell>
                <TableCell>{formatCurrency(shipping)}</TableCell>
                <TableCell>{formatDate(createdAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
export default SalesPage;
```

### Stripe

[Embedded Form](https://docs.stripe.com/checkout/embedded/quickstart)

- setup and add keys to .env

```sh
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

- install

```sh
npm install --save @stripe/react-stripe-js @stripe/stripe-js stripe axios
```

### Refactor Order and createOrderAction

```prisma
model Order {
  isPaid Boolean @default(false)
}
```

```ts
export const createOrderAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser();
  let orderId: null | string = null;
  let cartId: null | string = null;
  try {
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    cartId = cart.id;
    await db.order.deleteMany({
      where: {
        clerkId: user.id,
        isPaid: false,
      },
    });

    const order = await db.order.create({
      data: {
        clerkId: user.id,
        products: cart.numItemsInCart,
        orderTotal: cart.orderTotal,
        tax: cart.tax,
        shipping: cart.shipping,
        email: user.emailAddresses[0].emailAddress,
      },
    });
    orderId = order.id;
  } catch (error) {
    return renderError(error);
  }
  redirect(`/checkout?orderId=${orderId}&cartId=${cartId}`);
};
```

### Stripe ClientSecret Fetch Call and Response Diagram

```plaintext
+--------+    Fetch clientSecret    +--------+   Request        +---------+
| Client | -----------------------> | Server | ---------------> | Stripe  |
|        |                          |        |                  |  API    |
|        |                          |        | <--------------- |         |
|        | <----------------------- |        |   clientSecret   |         |
|        |  clientSecret response   |        |                  |         |
+--------+                          +--------+                  +---------+

Checkout.tsx                        payment/route.ts

```

### Checkout Page

- create app/checkout/page.tsx

```tsx
'use client';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import React, { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

export default function CheckoutPage() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId');
  const cartId = searchParams.get('cartId');

  const fetchClientSecret = useCallback(async () => {
    // Create a Checkout Session
    const response = await axios.post('/api/payment', {
      orderId: orderId,
      cartId: cartId,
    });
    return response.data.clientSecret;
  }, []);

  const options = { fetchClientSecret };

  return (
    <div id='checkout'>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
```

### API - Payment Route

- create api/payment/route.ts

```ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
import { type NextRequest } from 'next/server';
import db from '@/utils/db';

export const POST = async (req: NextRequest) => {
  const requestHeaders = new Headers(req.headers);
  const origin = requestHeaders.get('origin');

  const { orderId, cartId } = await req.json();

  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
  });
  const cart = await db.cart.findUnique({
    where: {
      id: cartId,
    },
    include: {
      cartItems: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!order || !cart) {
    return Response.json(null, {
      status: 404,
      statusText: 'Not Found',
    });
  }
  const line_items = cart.cartItems.map((cartItem) => {
    return {
      quantity: cartItem.amount,
      price_data: {
        currency: 'usd',
        product_data: {
          name: cartItem.product.name,
          images: [cartItem.product.image],
        },
        unit_amount: cartItem.product.price * 100, // price in cents
      },
    };
  });
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      metadata: { orderId, cartId },
      line_items: line_items,
      mode: 'payment',
      return_url: `${origin}/api/confirm?session_id={CHECKOUT_SESSION_ID}`,
    });

    return Response.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.log(error);

    return Response.json(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
};
```

- product structure

```ts
return {
  quantity: 1,
  price_data: {
    currency: 'usd',
    product_data: {
      name: 'product name',
      images: ['product image url'],
    },
    unit_amount: cartItem.product.price * 100, // price in cents
  },
};
```

```plaintext
+--------+    Checkout Session ID   +--------+    redirect      +---------+
| Server | -----------------------> | Server | ---------------> | Orders  |
|        |                          |        |                  |         |
|        |                          |        |                  |         |
|        |                          |        |                  |         |
|        |                          |        |                  |         |
+--------+                          +--------+                  +---------+

payment/route.ts                    confirm/route.ts            orders page

```

### API - Confirm Route

```ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
import { redirect } from 'next/navigation';

import { type NextRequest } from 'next/server';
import db from '@/utils/db';

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id') as string;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    // console.log(session);

    const orderId = session.metadata?.orderId;
    const cartId = session.metadata?.cartId;
    if (session.status === 'complete') {
      await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          isPaid: true,
        },
      });
      await db.cart.delete({
        where: {
          id: cartId,
        },
      });
    }
  } catch (err) {
    console.log(err);
    return Response.json(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
  redirect('/orders');
};
```
