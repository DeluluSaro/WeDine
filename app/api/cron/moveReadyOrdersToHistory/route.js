import { NextResponse } from 'next/server';
const sanityClient = require('@sanity/client');

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
  useCdn: false,
  apiVersion: '2023-07-18',
});

export async function GET() {
  try {
    const orders = await client.fetch(
      `*[_type == "order" && status == "Ready" && paymentStatus == true]`
    );
    let moved = 0;
    for (const order of orders) {
      await client.create({
        _type: 'history',
        ...order,
        updatedAt: new Date().toISOString(),
      });
      await client.delete(order._id);
      moved++;
    }
    return NextResponse.json({ success: true, moved });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 