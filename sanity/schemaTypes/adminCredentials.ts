import { defineType, defineField } from "sanity";

export const adminCredentialsType = defineType({
  name: "adminCredentials",
  title: "Admin Credentials",
  type: "document",
  description: "Admin login credentials for different shops",
  fields: [
    defineField({ 
      name: "shopName", 
      type: "string", 
      title: "Shop Name", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "adminUsername", 
      type: "string", 
      title: "Admin Username", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "adminPassword", 
      type: "string", 
      title: "Admin Password", 
      validation: Rule => Rule.required() 
    }),
    defineField({ 
      name: "isActive", 
      type: "boolean", 
      title: "Is Active",
      description: "Whether this admin account is active",
      initialValue: true
    }),
    defineField({ 
      name: "createdAt", 
      type: "datetime", 
      title: "Created At",
      validation: Rule => Rule.required()
    }),
    defineField({ 
      name: "lastLogin", 
      type: "datetime", 
      title: "Last Login"
    }),
  ],
  preview: {
    select: {
      title: 'shopName',
      subtitle: 'adminUsername'
    },
    prepare(selection) {
      const {title, subtitle} = selection;
      return {
        title: title,
        subtitle: `Admin: ${subtitle}`
      }
    }
  }
}); 