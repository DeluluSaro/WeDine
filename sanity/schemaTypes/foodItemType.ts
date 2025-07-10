// schemas/foodItemType.ts
import { defineType, defineField } from "sanity";

export const foodItemType = defineType({
  name: "foodItem",
  title: "Food Item",
  type: "document",
  fields: [
    defineField({ name: "foodId", type: "string", title: "Food ID", validation: Rule => Rule.required() }),
    defineField({ name: "foodName", type: "string", title: "Food Name", validation: Rule => Rule.required() }),
    defineField({ name: "shopName", type: "string", title: "Shop Name", validation: Rule => Rule.required() }),
    defineField({ name: "quantity", type: "number", title: "Available Quantity", validation: Rule => Rule.required().min(0) }),
    defineField({ name: "price", type: "number", title: "Price", validation: Rule => Rule.required().min(0) }),
    // For UI display, optional
    defineField({ name: "imageUrl", type: "string", title: "Image URL" }),
    // For filtering, now a dropdown
    defineField({
      name: "category",
      type: "string",
      title: "Category",
      options: {
        list: [
          { title: "Snacks", value: "Snacks" },
          { title: "Breakfast", value: "Breakfast" },
          { title: "Lunch", value: "Lunch" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    // For relational integrity, keep reference
    defineField({ name: "categoryRef", type: "reference", to: [{ type: "category" }], title: "Category Reference" }),
    // For asset management, recommended
    defineField({ name: "image", type: "image", title: "Image", options: { hotspot: true } }),
    // Add latitude and longitude fields to each shop/food item in your Sanity dataset.
    defineField({ name: "latitude", type: "number", title: "Latitude" }),
    defineField({ name: "longitude", type: "number", title: "Longitude" }),
  ],
});

export const orderType = defineType({
  name: "order",
  title: "Order",
  type: "document",
  fields: [
    defineField({ name: "orderId", type: "number", title: "Order ID", validation: Rule => Rule.required() }),
    defineField({ name: "userEmail", type: "string", title: "User Email", validation: Rule => Rule.required() }),
    defineField({ name: "foodId", type: "string", title: "Food ID", validation: Rule => Rule.required() }),
    defineField({ name: "foodName", type: "string", title: "Food Name", validation: Rule => Rule.required() }),
    defineField({ name: "shopName", type: "string", title: "Shop Name", validation: Rule => Rule.required() }),
    defineField({ name: "quantityOrdered", type: "number", title: "Quantity Ordered", validation: Rule => Rule.required().min(1) }),
    defineField({
      name: "status",
      type: "string",
      title: "Status",
      options: {
        list: [
          { title: "Ordered", value: "ordered" },
          { title: "Order Accepted", value: "order accepted" },
          { title: "Preparing", value: "preparing" },
          { title: "Ready", value: "ready" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({ name: "createdAt", type: "datetime", title: "Created At", validation: Rule => Rule.required() }),
    defineField({ name: "updatedAt", type: "datetime", title: "Updated At" }),
    // Stripe payment status
    defineField({
      name: "paymentStatus",
      type: "boolean",
      title: "Payment Completed",
      initialValue: false,
      description: "True if payment is completed via Stripe."
    }),
  ],
});