import { Suspense } from 'react';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <Suspense fallback={<div className="p-12 flex justify-center">Wczytywanie...</div>}>
        <OrdersClient />
      </Suspense>
    </div>
  );
}
