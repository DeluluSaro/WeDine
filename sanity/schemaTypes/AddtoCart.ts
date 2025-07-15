import { defineType, defineField } from "sanity";

export const cartItemType = defineType({
  name: "cartItem",
  title: "Cart Item",
  type: "document",
  fields: [
    defineField({
      name: "userId",
      type: "string",
      title: "User ID",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "foodId",
      type: "reference",
      to: [{ type: "foodItem" }],
      title: "Food Item",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "quantity",
      type: "number",
      title: "Quantity",
      validation: Rule => Rule.required().min(1),
    }),
    defineField({
      name: "price",
      type: "number",
      title: "Price",
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: "createdAt",
      type: "datetime",
      title: "Created At",
      validation: Rule => Rule.required(),
    }),
  ],
});
