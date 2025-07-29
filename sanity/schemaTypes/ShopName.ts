// schemas/foodItemType.ts
import { defineType, defineField } from "sanity";

export const shopType = defineType({
  name: "shop",
  title: "Shop",
  type: "document",
  fields: [
    defineField({ 
      name: "shopName", 
      type: "string", 
      title: "Shop Name", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "latitude", 
      type: "number", 
      title: "Latitude" 
    }),
    defineField({ 
      name: "longitude", 
      type: "number", 
      title: "Longitude" 
    }),
    defineField({ 
      name: "ownerMobile", 
      type: "string", 
      title: "Owner Mobile Number",
      description: "Mobile number for payment transfers (format: +91-XXXXXXXXXX)",
      validation: Rule => Rule.regex(/^\+91-[0-9]{10}$/).warning('Please use format: +91-XXXXXXXXXX')
    }),
    defineField({ 
      name: "ownerEmail", 
      type: "string", 
      title: "Owner Email",
      validation: Rule => Rule.email()
    }),
    defineField({ 
      name: "razorpayAccountId", 
      type: "string", 
      title: "Razorpay Account ID",
      description: "Razorpay account ID for payment transfers"
    }),
    defineField({ 
      name: "address", 
      type: "text", 
      title: "Shop Address" 
    }),
    defineField({ 
      name: "description", 
      type: "text", 
      title: "Shop Description" 
    }),
    defineField({ 
      name: "category", 
      type: "string", 
      title: "Shop Category",
      options: {
        list: [
          { title: "Restaurant", value: "restaurant" },
          { title: "Cafe", value: "cafe" },
          { title: "Food Truck", value: "food_truck" },
          { title: "Bakery", value: "bakery" },
          { title: "Street Food", value: "street_food" },
          { title: "Other", value: "other" },
        ],
      }
    }),
    defineField({ 
      name: "isActive", 
      type: "boolean", 
      title: "Is Active",
      description: "Whether the shop is currently active and accepting orders",
      initialValue: true
    }),
    defineField({ 
      name: "openingHours", 
      type: "string", 
      title: "Opening Hours",
      description: "e.g., '9:00 AM - 10:00 PM'"
    }),
    defineField({ 
      name: "contactNumber", 
      type: "string", 
      title: "Contact Number" 
    }),
    defineField({ 
      name: "rating", 
      type: "number", 
      title: "Average Rating",
      validation: Rule => Rule.min(0).max(5)
    }),
    defineField({ 
      name: "totalReviews", 
      type: "number", 
      title: "Total Reviews",
      initialValue: 0
    }),
  ],
});