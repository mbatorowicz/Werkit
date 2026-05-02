import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <OrdersClient />
    </div>
  );
}
