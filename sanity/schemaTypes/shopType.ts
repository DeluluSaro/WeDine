// schemas/shopType.ts
import { defineType, defineField } from "sanity";
export const shopType = defineType({
  name: "shop",
  title: "Shop",
  type: "document",
  fields: [
    defineField({ name: "shopId", type: "string", title: "Shop ID", validation: Rule => Rule.required() }),
    defineField({ name: "shopName", type: "string", title: "Shop Name", validation: Rule => Rule.required() }),
    defineField({ name: "shopDescription", type: "text", title: "Description" }),
    defineField({ name: "location", type: "string", title: "Location" }),
  ],
});
