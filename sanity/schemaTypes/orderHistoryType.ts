import { defineType, defineField } from "sanity";

export const orderHistoryType = defineType({
  name: "orderHistory",
  title: "Order History",
  type: "document",
  description: "Permanent storage for all order history and analytics",
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
      description: "Unique identifier to prevent duplicate history entries",
      validation: Rule => Rule.required()
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
      name: "status",
      type: "string",
      title: "Final Status",
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
      title: "Order Created At", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "updatedAt", 
      type: "datetime", 
      title: "Last Updated At",
      validation: Rule => Rule.required()
    }),
    defineField({ 
      name: "archivedAt", 
      type: "datetime", 
      title: "Archived At",
      description: "When the order was moved from active orders to history"
    }),
    defineField({
      name: "paymentStatus",
      type: "boolean",
      title: "Payment Completed",
      initialValue: false,
      description: "True if payment is completed via Razorpay.",
    }),
    defineField({
      name: "originalOrderId",
      type: "string",
      title: "Original Order ID",
      description: "Reference to the original order document ID for tracking",
      validation: Rule => Rule.required()
    }),
    defineField({
      name: "lifecycleNotes",
      type: "text",
      title: "Lifecycle Notes",
      description: "Notes about the order lifecycle and any special circumstances"
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