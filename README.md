- actions.ts

```ts
export const fetchCartItems = async () => {};

const fetchProduct = async () => {};

export const fetchOrCreateCart = async () => {};

const updateOrCreateCartItem = async () => {};

export const updateCart = async () => {};

export const addToCartAction = async () => {};

export const removeCartItemAction = async () => {};

export const updateCartItemAction = async () => {};
```

### FetchCartItems

- actions.ts

```ts
export const fetchCartItems = async () => {
  const { userId } = auth();

  const cart = await db.cart.findFirst({
    where: {
      clerkId: userId ?? '',
    },
    select: {
      numItemsInCart: true,
    },
  });
  return cart?.numItemsInCart || 0;
};
```

- components/navbar/CartButton.tsx

```tsx
async function CartButton() {
  const numItemsInCart = await fetchCartItems();
}
```

### ProductSignInButton Component

- components/form/Buttons.tsx

```tsx
export const ProductSignInButton = () => {
  return (
    <SignInButton mode='modal'>
      <Button type='button' size='default' className='mt-8'>
        Please Sign In
      </Button>
    </SignInButton>
  );
};
```

### SelectProductAmount Component

- create components/single-product/SelectProductAmount.tsx

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export enum Mode {
  SingleProduct = 'singleProduct',
  CartItem = 'cartItem',
}

type SelectProductAmountProps = {
  mode: Mode.SingleProduct;
  amount: number;
  setAmount: (value: number) => void;
};

type SelectCartItemAmountProps = {
  mode: Mode.CartItem;
  amount: number;
  setAmount: (value: number) => Promise<void>;
  isLoading: boolean;
};

function SelectProductAmount(
  props: SelectProductAmountProps | SelectCartItemAmountProps
) {
  const { mode, amount, setAmount } = props;

  const cartItem = mode === Mode.CartItem;

  return (
    <>
      <h4 className='mb-2'>Amount : </h4>
      <Select
        defaultValue={amount.toString()}
        onValueChange={(value) => setAmount(Number(value))}
        disabled={cartItem ? props.isLoading : false}
      >
        <SelectTrigger className={cartItem ? 'w-[100px]' : 'w-[150px]'}>
          <SelectValue placeholder={amount} />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: cartItem ? amount + 10 : 10 }, (_, index) => {
            const selectValue = (index + 1).toString();
            return (
              <SelectItem key={index} value={selectValue}>
                {selectValue}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </>
  );
}
export default SelectProductAmount;
```

### AddToCart Component

```tsx
'use client';
import { useState } from 'react';
import SelectProductAmount from './SelectProductAmount';
import { Mode } from './SelectProductAmount';
import FormContainer from '../form/FormContainer';
import { SubmitButton } from '../form/Buttons';
import { addToCartAction } from '@/utils/actions';
import { useAuth } from '@clerk/nextjs';
import { ProductSignInButton } from '../form/Buttons';

function AddToCart({ productId }: { productId: string }) {
  const [amount, setAmount] = useState(1);
  const { userId } = useAuth();
  return (
    <div className='mt-4'>
      <SelectProductAmount
        mode={Mode.SingleProduct}
        amount={amount}
        setAmount={setAmount}
      />
      {userId ? (
        <FormContainer action={addToCartAction}>
          <input type='hidden' name='productId' value={productId} />
          <input type='hidden' name='amount' value={amount} />
          <SubmitButton text='add to cart' size='default' className='mt-8' />
        </FormContainer>
      ) : (
        <ProductSignInButton />
      )}
    </div>
  );
}
export default AddToCart;
```

### AddToCart Action

- actions.ts

```ts
import { Cart } from '@prisma/client';

const fetchProduct = async (productId: string) => {
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }
  return product;
};
const includeProductClause = {
  cartItems: {
    include: {
      product: true,
    },
  },
};

export const fetchOrCreateCart = async ({
  userId,
  errorOnFailure = false,
}: {
  userId: string;
  errorOnFailure?: boolean;
}) => {
  let cart = await db.cart.findFirst({
    where: {
      clerkId: userId,
    },
    include: includeProductClause,
  });

  if (!cart && errorOnFailure) {
    throw new Error('Cart not found');
  }

  if (!cart) {
    cart = await db.cart.create({
      data: {
        clerkId: userId,
      },
      include: includeProductClause,
    });
  }

  return cart;
};

const updateOrCreateCartItem = async ({
  productId,
  cartId,
  amount,
}: {
  productId: string;
  cartId: string;
  amount: number;
}) => {
  let cartItem = await db.cartItem.findFirst({
    where: {
      productId,
      cartId,
    },
  });

  if (cartItem) {
    cartItem = await db.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        amount: cartItem.amount + amount,
      },
    });
  } else {
    cartItem = await db.cartItem.create({
      data: { amount, productId, cartId },
    });
  }
};

export const updateCart = async (cart: Cart) => {
  const cartItems = await db.cartItem.findMany({
    where: {
      cartId: cart.id,
    },
    include: {
      product: true, // Include the related product
    },
  });

  let numItemsInCart = 0;
  let cartTotal = 0;

  for (const item of cartItems) {
    numItemsInCart += item.amount;
    cartTotal += item.amount * item.product.price;
  }
  const tax = cart.taxRate * cartTotal;
  const shipping = cartTotal ? cart.shipping : 0;
  const orderTotal = cartTotal + tax + shipping;

  await db.cart.update({
    where: {
      id: cart.id,
    },
    data: {
      numItemsInCart,
      cartTotal,
      tax,
      orderTotal,
    },
  });
};

export const addToCartAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser();
  try {
    const productId = formData.get('productId') as string;
    const amount = Number(formData.get('amount'));
    await fetchProduct(productId);
    const cart = await fetchOrCreateCart({ userId: user.id });
    await updateOrCreateCartItem({ productId, cartId: cart.id, amount });
    await updateCart(cart);
  } catch (error) {
    return renderError(error);
  }
  redirect('/cart');
};
```

### Cart Page

- create components/cart

  - CartItemColumns.tsx
  - CartItemsList.tsx
  - CartTotals.tsx
  - ThirdColumn.tsx

- app/cart/page.tsx

```tsx
import CartItemsList from '@/components/cart/CartItemsList';
import CartTotals from '@/components/cart/CartTotals';
import SectionTitle from '@/components/global/SectionTitle';
import { fetchOrCreateCart, updateCart } from '@/utils/actions';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
async function CartPage() {
  const { userId } = auth();
  if (!userId) redirect('/');
  const cart = await fetchOrCreateCart({ userId });
  await updateCart(cart);

  if (cart.numItemsInCart === 0) {
    return <SectionTitle text='Empty cart' />;
  }
  return (
    <>
      <SectionTitle text='Shopping Cart' />
      <div className='mt-8 grid gap-4 lg:grid-cols-12'>
        <div className='lg:col-span-8'>
          <CartItemsList cartItems={cart.cartItems} />
        </div>
        <div className='lg:col-span-4 lg:pl-4'>
          <CartTotals cart={cart} />
        </div>
      </div>
    </>
  );
}
export default CartPage;
```

### CartTotals Component

```tsx
import { Card, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/format';
import { createOrderAction } from '@/utils/actions';
import FormContainer from '../form/FormContainer';
import { SubmitButton } from '../form/Buttons';
import { Cart } from '@prisma/client';

function CartTotals({ cart }: { cart: Cart }) {
  const { cartTotal, shipping, tax, orderTotal } = cart;
  return (
    <div>
      <Card className='p-8 '>
        <CartTotalRow label='Subtotal' amount={cartTotal} />
        <CartTotalRow label='Shipping' amount={shipping} />
        <CartTotalRow label='Tax' amount={tax} />
        <CardTitle className='mt-8'>
          <CartTotalRow label='Order Total' amount={orderTotal} lastRow />
        </CardTitle>
      </Card>
      <FormContainer action={createOrderAction}>
        <SubmitButton text='Place Order' className='w-full mt-8' />
      </FormContainer>
    </div>
  );
}

function CartTotalRow({
  label,
  amount,
  lastRow,
}: {
  label: string;
  amount: number;
  lastRow?: boolean;
}) {
  return (
    <>
      <p className='flex justify-between text-sm'>
        <span>{label}</span>
        <span>{formatCurrency(amount)}</span>
      </p>
      {lastRow ? null : <Separator className='my-2' />}
    </>
  );
}

export default CartTotals;
```

### Cart Item Columns - 1,2 and 4

- cart/CartItemColumns.tsx

```tsx
import { formatCurrency } from '@/utils/format';
import Image from 'next/image';
import Link from 'next/link';
export const FirstColumn = ({
  name,
  image,
}: {
  image: string;
  name: string;
}) => {
  return (
    <div className='relative h-24 w-24 sm:h-32 sm:w-32'>
      <Image
        src={image}
        alt={name}
        fill
        sizes='(max-width:768px) 100vw,(max-width:1200px) 50vw,33vw'
        priority
        className='w-full rounded-md object-cover'
      />
    </div>
  );
};
export const SecondColumn = ({
  name,
  company,
  productId,
}: {
  name: string;
  company: string;
  productId: string;
}) => {
  return (
    <div className=' sm:w-48'>
      <Link href={`/products/${productId}`}>
        <h3 className='capitalize font-medium hover:underline'>{name}</h3>
      </Link>
      <h4 className='mt-2 capitalize text-xs'>{company}</h4>
    </div>
  );
};

export const FourthColumn = ({ price }: { price: number }) => {
  return <p className='font-medium md:ml-auto'>{formatCurrency(price)}</p>;
};
```

### CartItemsList Component

- utils/types.ts

```ts
import { Prisma } from '@prisma/client';

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: { product: true };
}>;
```

```tsx
import { Card } from '@/components/ui/card';
import { FirstColumn, SecondColumn, FourthColumn } from './CartItemColumns';
import ThirdColumn from './ThirdColumn';
import { CartItemWithProduct } from '@/utils/types';
function CartItemsList({ cartItems }: { cartItems: CartItemWithProduct[] }) {
  return (
    <div>
      {cartItems.map((cartItem) => {
        const { id, amount } = cartItem;
        const { id: productId, image, name, company, price } = cartItem.product;
        return (
          <Card
            key={id}
            className='flex flex-col gap-y-4 md:flex-row flex-wrap p-6 mb-8 gap-x-4'
          >
            <FirstColumn image={image} name={name} />
            <SecondColumn name={name} company={company} productId={productId} />
            <ThirdColumn id={id} quantity={amount} />
            <FourthColumn price={price} />
          </Card>
        );
      })}
    </div>
  );
}
export default CartItemsList;
```

### Cart Item - Third Column

- optional

actions.ts

```ts
export const removeCartItemAction = async (
  prevState: any,
  formData: FormData
) => {
  return { message: 'Item removed from cart' };
};
```

```tsx
'use client';
import { useState } from 'react';
import SelectProductAmount from '../single-product/SelectProductAmount';
import { Mode } from '../single-product/SelectProductAmount';
import FormContainer from '../form/FormContainer';
import { SubmitButton } from '../form/Buttons';
import { removeCartItemAction, updateCartItemAction } from '@/utils/actions';
import { useToast } from '../ui/use-toast';

function ThirdColumn({ quantity, id }: { quantity: number; id: string }) {
  const [amount, setAmount] = useState(quantity);

  const handleAmountChange = async (value: number) => {
    setAmount(value);
  };

  return (
    <div className='md:ml-8'>
      <SelectProductAmount
        amount={amount}
        setAmount={handleAmountChange}
        mode={Mode.CartItem}
        isLoading={false}
      />
      <FormContainer action={removeCartItemAction}>
        <input type='hidden' name='id' value={id} />
        <SubmitButton size='sm' className='mt-4' text='remove' />
      </FormContainer>
    </div>
  );
}
export default ThirdColumn;
```

### RemoveCartItem Action

- actions.ts

```ts
eexport const removeCartItemAction = async (
  prevState: any,
  formData: FormData
) => {
  const user = await getAuthUser();
  try {
    const cartItemId = formData.get('id') as string;
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    await db.cartItem.delete({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    await updateCart(cart);
    revalidatePath('/cart');
    return { message: 'Item removed from cart' };
  } catch (error) {
    return renderError(error);
  }
};
```

### UpdateCartItem Action

- actions.ts

```ts
export const updateCartItemAction = async ({
  amount,
  cartItemId,
}: {
  amount: number;
  cartItemId: string;
}) => {
  const user = await getAuthUser();

  try {
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    await db.cartItem.update({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      data: {
        amount,
      },
    });
    await updateCart(cart);
    revalidatePath('/cart');
    return { message: 'cart updated' };
  } catch (error) {
    return renderError(error);
  }
};
```

### Cart Item Third Column - Complete

```tsx
'use client';
import { useState } from 'react';
import SelectProductAmount from '../single-product/SelectProductAmount';
import { Mode } from '../single-product/SelectProductAmount';
import FormContainer from '../form/FormContainer';
import { SubmitButton } from '../form/Buttons';
import { removeCartItemAction, updateCartItemAction } from '@/utils/actions';
import { useToast } from '../ui/use-toast';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';

function ThirdColumn({ quantity, id }: { quantity: number; id: string }) {
  const [amount, setAmount] = useState(quantity);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const handleAmountChange = async (value: number) => {
    setIsLoading(true);
    toast({ description: 'Calculating...' });
    const result = await updateCartItemAction({
      amount: value,
      cartItemId: id,
    });
    setAmount(value);
    toast({ description: result.message });
    setIsLoading(false);
  };

  return (
    <div className='md:ml-8'>
      <SelectProductAmount
        amount={amount}
        setAmount={handleAmountChange}
        mode={Mode.CartItem}
        isLoading={isLoading}
      />
      <FormContainer action={removeCartItemAction}>
        <input type='hidden' name='id' value={id} />
        <SubmitButton size='sm' className='mt-4' text='remove' />
      </FormContainer>
    </div>
  );
}
export default ThirdColumn;
```

### Bug Fix

- make CartItemsList client component ('use client' directive)

- refactor updateCart

actions.ts

```ts
export const updateCart = async (cart: Cart) => {
  const cartItems = await db.cartItem.findMany({
    where: {
      cartId: cart.id,
    },
    include: {
      product: true, // Include the related product
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  let numItemsInCart = 0;
  let cartTotal = 0;

  for (const item of cartItems) {
    numItemsInCart += item.amount;
    cartTotal += item.amount * item.product.price;
  }
  const tax = cart.taxRate * cartTotal;
  const shipping = cartTotal ? cart.shipping : 0;
  const orderTotal = cartTotal + tax + shipping;

  const currentCart = await db.cart.update({
    where: {
      id: cart.id,
    },

    data: {
      numItemsInCart,
      cartTotal,
      tax,
      orderTotal,
    },
    include: includeProductClause,
  });
  return { currentCart, cartItems };
};
```

- app/cart/page.tsx

```tsx
import CartItemsList from '@/components/cart/CartItemsList';
import CartTotals from '@/components/cart/CartTotals';
import SectionTitle from '@/components/global/SectionTitle';
import { fetchOrCreateCart, updateCart } from '@/utils/actions';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
async function CartPage() {
  const { userId } = auth();
  if (!userId) redirect('/');
  const previousCart = await fetchOrCreateCart({ userId });
  const { cartItems, currentCart } = await updateCart(previousCart);

  if (cartItems.length === 0) {
    return <SectionTitle text='Empty cart' />;
  }
  return (
    <>
      <SectionTitle text='Shopping Cart' />
      <div className='mt-8 grid gap-4 lg:grid-cols-12'>
        <div className='lg:col-span-8'>
          <CartItemsList cartItems={cartItems} />
        </div>
        <div className='lg:col-span-4 lg:pl-4'>
          <CartTotals cart={currentCart} />
        </div>
      </div>
    </>
  );
}
export default CartPage;
```

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
