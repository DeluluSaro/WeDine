require('dotenv').config();
const sanityClient = require('@sanity/client');

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
  useCdn: false,
  apiVersion: '2023-07-18',
});

async function removeShopNameField() {
  const orders = await client.fetch(
    `*[_type == "order" && defined(shopName)]{_id, shopName}`
  );
  console.log(`Found ${orders.length} orders with shopName to update.`);
  for (const order of orders) {
    await client.patch(order._id).unset(['shopName']).commit();
    console.log(`Removed shopName from order ${order._id}`);
  }
  console.log('All done!');
}

removeShopNameField().catch((err) => {
  console.error(err);
  process.exit(1);
}); 