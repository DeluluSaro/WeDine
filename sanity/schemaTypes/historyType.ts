import { defineType, defineField } from "sanity";

export const historyType = defineType({
  name: "history",
  title: "Order History",
  type: "document",
  fields: [
    defineField({ name: "orderId", type: "number", title: "Order ID", validation: Rule => Rule.required() }),
    defineField({ name: "userId", type: "string", title: "User ID", description: "Clerk user ID for this order" }),
    defineField({ name: "userEmail", type: "string", title: "User Email", validation: Rule => Rule.required() }),
    defineField({ name: "foodId", type: "string", title: "Food ID", validation: Rule => Rule.required() }),
    defineField({ name: "foodName", type: "string", title: "Food Name", validation: Rule => Rule.required() }),
    defineField({ name: "shopName", type: "string", title: "Shop Name", validation: Rule => Rule.required() }),
    defineField({ name: "foodImageUrl", type: "string", title: "Food Image URL", description: "URL of the food image for this order" }),
    defineField({ name: "total", type: "number", title: "Total Paid", description: "Total price paid for this order" }),
    defineField({ name: "quantityOrdered", type: "number", title: "Quantity Ordered", validation: Rule => Rule.required().min(1) }),
    defineField({ name: "status", type: "string", title: "Status" }),
    defineField({ name: "createdAt", type: "datetime", title: "Created At", validation: Rule => Rule.required() }),
    defineField({ name: "updatedAt", type: "datetime", title: "Updated At" }),
    defineField({ name: "paymentStatus", type: "boolean", title: "Payment Completed", initialValue: false, description: "True if payment is completed via Stripe." }),
  ],
}); 