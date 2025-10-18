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
      title: "Food Type",
      options: {
        list: [
          { title: "Beverages", value: "beverages" },
          { title: "Snacks", value: "snacks" },
          { title: "Juices", value: "juices" },
          { title: "Breakfast", value: "breakfast" },
          { title: "Lunch", value: "lunch" },
          { title: "Dinner", value: "dinner" },
          { title: "Night Snacks", value: "night_snacks" },
        ],
      },
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
      name: "rfidCardId",
      type: "string",
      title: "RFID Card ID",
      description: "RFID card ID associated with this order for verification and payment"
    }),
    defineField({
      name: "orderIdentifier",
      type: "string",
      title: "Unique Order Identifier",
      description: "Unique identifier to prevent duplicate orders",
      validation: Rule => Rule.required()
    }),
    defineField({
      name: "shortOrderId",
      type: "string",
      title: "Short Order ID",
      description: "5-character order ID for easy user memorization and verification",
      validation: Rule => Rule.required().length(5)
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
      name: "deliveredAt",
      type: "datetime",
      title: "Delivered At",
      description: "When the order was marked as delivered"
    }),
    defineField({
      name: "adminNotes",
      type: "text",
      title: "Admin Notes",
      description: "Additional notes from admin (e.g., delivery method, RFID verification)"
    }),
    defineField({
      name: "paymentStatus",
      type: "boolean",
      title: "Payment Completed",
      initialValue: false,
      description: "True if payment is completed via Razorpay.",
    }),
    defineField({
      name: "userDetails",
      type: "object",
      title: "User Details",
      description: "User contact and delivery information",
      fields: [
        { name: "name", type: "string", title: "Name" },
        { name: "phone", type: "string", title: "Phone Number" },
        { name: "address", type: "text", title: "Delivery Address" },
      ],
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
        { name: "transferAmount", type: "number", title: "Transfer Amount", description: "Amount to be transferred to the vendor" },
        { name: "razorpayAccountId", type: "string", title: "Razorpay Account ID", description: "Vendor's Razorpay account ID for transfers" },
        
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