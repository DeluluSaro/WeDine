import { defineType, defineField } from "sanity";

export const reviewType = defineType({
  name: "review",
  title: "Review",
  type: "document",
  fields: [
    defineField({
      name: "userName",
      type: "string",
      title: "User Name",
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: "userEmail",
      type: "string",
      title: "User Email",
      validation: Rule => Rule.required().email(),
    }),
    defineField({
      name: "shopRef",
      type: "reference",
      to: [{ type: "shop" }],
      title: "Shop",
      validation: Rule => Rule.required(),
      description: "The shop being reviewed",
    }),
    defineField({
      name: "rating",
      type: "number",
      title: "Rating",
      validation: Rule => Rule.required().min(1).max(5),
      description: "Star rating from 1 to 5",
    }),
    defineField({
      name: "reviewText",
      type: "text",
      title: "Review Text",
      validation: Rule => Rule.required().min(10).max(500),
      description: "Your review (10-500 characters)",
    }),
    defineField({
      name: "createdAt",
      type: "datetime",
      title: "Created At",
      validation: Rule => Rule.required(),
      readOnly: true,
    }),
    defineField({
      name: "isVerified",
      type: "boolean",
      title: "Verified Review",
      description: "Whether this review has been verified",
      initialValue: false,
    }),
    defineField({
      name: "helpfulCount",
      type: "number",
      title: "Helpful Count",
      description: "Number of users who found this review helpful",
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'userName',
      shop: 'shopRef.shopName',
      rating: 'rating',
      review: 'reviewText'
    },
    prepare(selection) {
      const {title, shop, rating, review} = selection;
      return {
        title: `${title} - ${shop}`,
        subtitle: `${'⭐'.repeat(rating)} - ${review?.substring(0, 50)}${review?.length > 50 ? '...' : ''}`,
      };
    },
  },
});