require('dotenv').config();
const sanityClient = require('@sanity/client');

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
  useCdn: false,
  apiVersion: '2023-07-18',
});

async function moveReadyOrdersToHistory() {
  const orders = await client.fetch(
    `*[_type == "order" && status == "Ready" && paymentStatus == true]`
  );
  for (const order of orders) {
    // Create in history
    await client.create({
      _type: 'history',
      ...order,
      updatedAt: new Date().toISOString(),
    });
    // Delete from order
    await client.delete(order._id);
    console.log(`Moved order ${order._id} to history`);
  }
  console.log('Migration complete!');
}

moveReadyOrdersToHistory().catch((err) => {
  console.error(err);
  process.exit(1);
}); 