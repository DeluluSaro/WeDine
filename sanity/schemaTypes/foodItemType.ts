// schemas/foodItemType.ts
import { defineType, defineField } from "sanity";

export const foodItemType = defineType({
  name: "foodItem",
  title: "Food Item",
  type: "document",
  fields: [
    defineField({ 
      name: "foodName", 
      type: "string", 
      title: "Food Name", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "shopRef", 
      type: "reference", 
      title: "Shop", 
      to: [{ type: "shop" }], 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "image", 
      type: "image", 
      title: "Image" 
    }),
    defineField({ 
      name: "category", 
      type: "string", 
      title: "Category" 
    }),
    defineField({ 
      name: "price", 
      type: "number", 
      title: "Price", 
      validation: Rule => Rule.required().min(0) 
    }),
    defineField({ 
      name: "foodType", 
      type: "string", 
      title: "Food Type" 
    }),
    defineField({ 
      name: "quantity", 
      type: "number", 
      title: "Quantity" 
    }),
    defineField({ 
      name: "description", 
      type: "text", 
      title: "Description" 
    }),
    defineField({ 
      name: "ingredients", 
      type: "array", 
      title: "Ingredients", 
      of: [{ type: "string" }] 
    }),
    defineField({ 
      name: "allergens", 
      type: "array", 
      title: "Allergens", 
      of: [{ type: "string" }] 
    }),
    defineField({ 
      name: "preparationTime", 
      type: "number", 
      title: "Preparation Time (minutes)" 
    }),
    defineField({ 
      name: "rating", 
      type: "number", 
      title: "Rating" 
    }),
    defineField({ 
      name: "reviews", 
      type: "number", 
      title: "Number of Reviews" 
    }),
    defineField({ 
      name: "spicyLevel", 
      type: "number", 
      title: "Spicy Level" 
    }),
    defineField({ 
      name: "isVegetarian", 
      type: "boolean", 
      title: "Is Vegetarian" 
    }),
    defineField({ 
      name: "isVegan", 
      type: "boolean", 
      title: "Is Vegan" 
    }),
    defineField({ 
      name: "calories", 
      type: "number", 
      title: "Calories" 
    }),
    defineField({ 
      name: "protein", 
      type: "number", 
      title: "Protein (g)" 
    }),
    defineField({ 
      name: "carbs", 
      type: "number", 
      title: "Carbohydrates (g)" 
    }),
    defineField({ 
      name: "fat", 
      type: "number", 
      title: "Fat (g)" 
    }),
  ],
  // Add unique constraint at document level
  preview: {
    select: {
      title: 'foodName',
      subtitle: 'category',
      media: 'image'
    }
  }
});

export const orderType = defineType({
  name: "order",
  title: "Order",
  type: "document",
  description: "Temporary storage for active orders (24-hour lifecycle)",
  fields: [
    defineField({ 
      name: "userId", 
      type: "string", 
      title: "User ID", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "userEmail", 
      type: "string", 
      title: "User Email",
      validation: Rule => Rule.required()
    }),
    defineField({
      name: "orderIdentifier",
      type: "string",
      title: "Unique Order Identifier",
      description: "Unique identifier to prevent duplicate orders",
      validation: Rule => Rule.required().unique()
    }),
    defineField({
      name: "items",
      type: "array",
      title: "Order Items",
      validation: Rule => Rule.required().min(1),
      of: [
        {
          type: "object",
          fields: [
            { name: "foodName", type: "string", title: "Food Name", validation: Rule => Rule.required() },
            { name: "quantity", type: "number", title: "Quantity", validation: Rule => Rule.required().min(1) },
            { name: "price", type: "number", title: "Price", validation: Rule => Rule.required().min(0) },
            { name: "shopId", type: "string", title: "Shop ID", validation: Rule => Rule.required() },
            { name: "shopName", type: "string", title: "Shop Name", validation: Rule => Rule.required() },
          ],
        },
      ],
    }),
    defineField({ 
      name: "total", 
      type: "number", 
      title: "Total Amount", 
      validation: Rule => Rule.required().min(0) 
    }),
    defineField({
      name: "paymentMethod",
      type: "string",
      title: "Payment Method",
      validation: Rule => Rule.required(),
      options: {
        list: [
          { title: "Cash on Delivery (COD)", value: "cod" },
          { title: "Online Payment", value: "online" },
        ],
      },
      initialValue: "cod",
    }),
    defineField({
      name: "orderStatus",
      type: "boolean",
      title: "Payment Status",
      description: "True = Paid, False = Unpaid",
      initialValue: false,
    }),
    defineField({
      name: "status",
      type: "string",
      title: "Order Status",
      validation: Rule => Rule.required(),
      options: {
        list: [
          { title: "Ordered", value: "ordered" },
          { title: "Order Accepted", value: "order accepted" },
          { title: "Preparing", value: "preparing" },
          { title: "Out for Delivery", value: "out for delivery" },
          { title: "Delivered", value: "delivered" },
          { title: "Cancelled", value: "cancelled" },
        ],
      },
      initialValue: "ordered",
    }),
    defineField({ 
      name: "createdAt", 
      type: "datetime", 
      title: "Created At", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "updatedAt", 
      type: "datetime", 
      title: "Updated At",
      validation: Rule => Rule.required()
    }),
    defineField({
      name: "paymentStatus",
      type: "boolean",
      title: "Payment Completed",
      initialValue: false,
      description: "True if payment is completed via Razorpay.",
    }),
    // Enhanced payment details for Razorpay
    defineField({
      name: "paymentDetails",
      type: "object",
      title: "Payment Details",
      description: "Payment information for online transactions",
      fields: [
        { name: "razorpayOrderId", type: "string", title: "Razorpay Order ID" },
        { name: "razorpayPaymentId", type: "string", title: "Razorpay Payment ID" },
        { name: "razorpaySignature", type: "string", title: "Razorpay Signature" },
        { name: "transactionId", type: "string", title: "Transaction ID" },
        { 
          name: "paymentStatus", 
          type: "string", 
          title: "Payment Status",
          options: {
            list: [
              { title: "Pending", value: "pending" },
              { title: "Success", value: "success" },
              { title: "Failed", value: "failed" },
              { title: "Cancelled", value: "cancelled" },
            ],
          },
          initialValue: "pending"
        },
        { name: "paidAt", type: "datetime", title: "Paid At" },
        {
          name: "splits",
          type: "array",
          title: "Payment Splits",
          description: "Multi-vendor payment splits",
          of: [
            {
              type: "object",
              fields: [
                { name: "shopId", type: "string", title: "Shop ID" },
                { name: "shopName", type: "string", title: "Shop Name" },
                { name: "ownerMobile", type: "string", title: "Owner Mobile" },
                { name: "splitAmount", type: "number", title: "Split Amount" },
                { name: "transferId", type: "string", title: "Transfer ID" },
                { 
                  name: "transferStatus", 
                  type: "string", 
                  title: "Transfer Status",
                  options: {
                    list: [
                      { title: "Pending", value: "pending" },
                      { title: "Completed", value: "completed" },
                      { title: "Failed", value: "failed" },
                    ],
                  },
                  initialValue: "pending"
                },
                { name: "transferredAt", type: "datetime", title: "Transferred At" },
              ],
            },
          ],
        },
      ],
    }),
    // Lifecycle management fields
    defineField({
      name: "expiresAt",
      type: "datetime",
      title: "Expires At",
      description: "When this order will be automatically archived (24 hours after creation)",
      validation: Rule => Rule.required()
    }),
    defineField({
      name: "isArchived",
      type: "boolean",
      title: "Is Archived",
      description: "Whether this order has been moved to history",
      initialValue: false
    }),
    defineField({
      name: "archivedAt",
      type: "datetime",
      title: "Archived At",
      description: "When this order was moved to history"
    }),
  ],
  // Add unique constraint at document level
  preview: {
    select: {
      title: 'orderIdentifier',
      subtitle: 'userId'
      // Removed media field to prevent React component name issues with food names
    }
  }
});