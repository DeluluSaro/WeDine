// schemas/foodItemType.ts
import { defineType, defineField } from "sanity";

export const foodItemType = defineType({
  name: "foodItem",
  title: "Food Item",
  type: "document",
  fields: [
    defineField({ name: "foodId", type: "string", title: "Food ID", validation: Rule => Rule.required() }),
    defineField({ name: "foodName", type: "string", title: "Food Name", validation: Rule => Rule.required() }),
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
          { title: "Beverages", value: "Beverages" },
          { title: "Juices", value: "Juices" },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    // For asset management, recommended
    defineField({ name: "image", type: "image", title: "Image", options: { hotspot: true } }),
    // Add shopRef
    defineField({
      name: "shopRef",
      type: "reference",
      to: [{ type: "shop" }],
      title: "Shop",
      validation: Rule => Rule.required(),
    }),
    // Additional fields for enhanced UI
    defineField({ 
      name: "description", 
      type: "text", 
      title: "Description",
      description: "Detailed description of the food item"
    }),
    defineField({ 
      name: "ingredients", 
      type: "array", 
      title: "Ingredients",
      of: [{ type: "string" }],
      description: "List of ingredients used in this dish"
    }),
    defineField({ 
      name: "allergens", 
      type: "array", 
      title: "Allergens",
      of: [{ type: "string" }],
      description: "List of allergens present in this dish"
    }),
    defineField({ 
      name: "preparationTime", 
      type: "number", 
      title: "Preparation Time (minutes)",
      description: "Time required to prepare this dish"
    }),
    defineField({ 
      name: "rating", 
      type: "number", 
      title: "Rating",
      description: "Average rating (1-5 stars)",
      validation: Rule => Rule.min(1).max(5)
    }),
    defineField({ 
      name: "reviews", 
      type: "number", 
      title: "Number of Reviews",
      description: "Total number of reviews"
    }),
    defineField({ 
      name: "spicyLevel", 
      type: "number", 
      title: "Spicy Level",
      description: "Spiciness level (0-5)",
      validation: Rule => Rule.min(0).max(5)
    }),
    defineField({ 
      name: "isVegetarian", 
      type: "boolean", 
      title: "Vegetarian",
      description: "Is this dish vegetarian?",
      initialValue: false
    }),
    defineField({ 
      name: "isVegan", 
      type: "boolean", 
      title: "Vegan",
      description: "Is this dish vegan?",
      initialValue: false
    }),
    // Nutrition information
    defineField({ 
      name: "calories", 
      type: "number", 
      title: "Calories",
      description: "Calories per serving"
    }),
    defineField({ 
      name: "protein", 
      type: "number", 
      title: "Protein (g)",
      description: "Protein content in grams"
    }),
    defineField({ 
      name: "carbs", 
      type: "number", 
      title: "Carbohydrates (g)",
      description: "Carbohydrate content in grams"
    }),
    defineField({ 
      name: "fat", 
      type: "number", 
      title: "Fat (g)",
      description: "Fat content in grams"
    }),
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