// schemas/shopType.ts
import { defineType, defineField } from "sanity";

export const shopType = defineType({
  name: "shop",
  title: "Shop",
  type: "document",
  fields: [
    defineField({ name: "shopName", type: "string", title: "Shop Name", validation: Rule => Rule.required() }),
    defineField({ name: "ownerName", type: "string", title: "Owner Name" }),
    defineField({ name: "ownerEmail", type: "string", title: "Owner Email" }),
    defineField({ name: "ownerMobile", type: "string", title: "Owner Mobile" }),
    defineField({ name: "latitude", type: "number", title: "Latitude" }),
    defineField({ name: "longitude", type: "number", title: "Longitude" }),
  ],
});
