import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'wallet',
  title: 'User Wallet',
  type: 'document',
  fields: [
    defineField({
      name: 'userEmail',
      title: 'User Email',
      type: 'string',
      validation: Rule => Rule.required().email(),
    }),
    defineField({
      name: 'balance',
      title: 'Wallet Balance',
      type: 'number',
      initialValue: 0,
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: 'transactions',
      title: 'Wallet Transactions',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'type',
              title: 'Transaction Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Add Money', value: 'add' },
                  { title: 'Payment', value: 'payment' },
                  { title: 'Refund', value: 'refund' }
                ]
              }
            },
            {
              name: 'amount',
              title: 'Amount',
              type: 'number',
              validation: Rule => Rule.required().min(0)
            },
            {
              name: 'description',
              title: 'Description',
              type: 'string'
            },
            {
              name: 'orderId',
              title: 'Order ID',
              type: 'string'
            },
            {
              name: 'paymentId',
              title: 'Payment ID',
              type: 'string'
            },
            {
              name: 'timestamp',
              title: 'Timestamp',
              type: 'datetime',
              initialValue: () => new Date().toISOString()
            }
          ]
        }
      ]
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    })
  ],
  preview: {
    select: {
      title: 'userEmail',
      subtitle: 'balance'
    },
    prepare(selection) {
      const { title, subtitle } = selection
      return {
        title: title,
        subtitle: `Balance: ₹${subtitle}`
      }
    }
  }
})
