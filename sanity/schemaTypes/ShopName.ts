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
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "latitude",
      type: "number",
      title: "Latitude",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "longitude",
      type: "number",
      title: "Longitude",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "workerName",
      type: "string",
      title: "Worker Name",
    }),
    defineField({
      name: "ownerName",
      type: "string",
      title: "Owner Name",
    }),
    defineField({
      name: "ownerMobile",
      type: "string",
      title: "Owner Mobile Number",
      validation: Rule => Rule.required(),
      description: "Mobile number for stock notifications",
    }),
    defineField({
      name: "ownerEmail",
      type: "string",
      title: "Owner Email",
      validation: Rule => Rule.required().email(),
      description: "Email address for stock notifications",
    }),
  ],
});