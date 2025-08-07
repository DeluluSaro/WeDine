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
      title: "Owner Mobile Number (SMS)",
      validation: Rule => Rule.required(),
      description: "Mobile number for SMS notifications (format: +91-XXXXXXXXXX)",
    }),
    defineField({
      name: "paymentMobile",
      type: "string",
      title: "Payment Mobile Number",
      description: "Mobile number for payment transfers (format: +918754502573 - no hyphen)",
      validation: Rule => Rule.regex(/^\+91[0-9]{10}$/).warning('Please use format: +918754502573 (no hyphen)')
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
