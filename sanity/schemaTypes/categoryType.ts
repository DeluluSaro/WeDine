// schemas/foodItemType.ts
import { defineType, defineField } from "sanity";

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "categoryId",
      type: "string",
      title: "Category ID",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "categoryName",
      type: "string",
      title: "Category Name",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      title: "Description",
    }),
  ],
});