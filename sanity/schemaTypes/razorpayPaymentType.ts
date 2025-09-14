import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'razorpayPayment',
  title: 'Razorpay Payment',
  type: 'document',
  fields: [
    defineField({
      name: 'orderId',
      title: 'Order ID',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'amount',
      title: 'Amount',
      type: 'number',
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: 'shopId',
      title: 'Shop ID',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'deviceId',
      title: 'Device ID',
      type: 'string',
    }),
    defineField({
      name: 'razorpayOrderId',
      title: 'Razorpay Order ID',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Payment Status',
      type: 'string',
      options: {
        list: [
          { title: 'Created', value: 'created' },
          { title: 'Paid', value: 'paid' },
          { title: 'Failed', value: 'failed' },
          { title: 'Cancelled', value: 'cancelled' }
        ]
      },
      initialValue: 'created'
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
    defineField({
      name: 'paidAt',
      title: 'Paid At',
      type: 'datetime'
    }),
    defineField({
      name: 'paymentMethod',
      title: 'Payment Method',
      type: 'string',
      options: {
        list: [
          { title: 'RFID', value: 'rfid' },
          { title: 'Razorpay', value: 'razorpay' },
          { title: 'Cash', value: 'cash' }
        ]
      }
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text'
    })
  ],
  preview: {
    select: {
      title: 'orderId',
      subtitle: 'amount',
      status: 'status'
    },
    prepare(selection) {
      const { title, subtitle, status } = selection
      return {
        title: `Order: ${title}`,
        subtitle: `₹${subtitle} - ${status}`,
        media: status === 'paid' ? '✅' : status === 'failed' ? '❌' : '⏳'
      }
    }
  }
})
