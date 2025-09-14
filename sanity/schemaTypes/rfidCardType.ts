import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'rfidCard',
  title: 'RFID Card',
  type: 'document',
  fields: [
    defineField({
      name: 'cardId',
      title: 'RFID Card ID',
      type: 'string',
      validation: Rule => Rule.required().min(4).max(20),
      description: 'The unique serial number from the RFID card'
    }),
    defineField({
      name: 'userEmail',
      title: 'User Email',
      type: 'string',
      validation: Rule => Rule.required().email(),
      description: 'Email address of the card owner'
    }),
    defineField({
      name: 'studentId',
      title: 'Student ID',
      type: 'string',
      description: 'College student ID number'
    }),
    defineField({
      name: 'studentName',
      title: 'Student Name',
      type: 'string',
      description: 'Full name of the student'
    }),
    defineField({
      name: 'collegeName',
      title: 'College Name',
      type: 'string',
      description: 'Name of the college/institution'
    }),
    defineField({
      name: 'cardType',
      title: 'Card Type',
      type: 'string',
      options: {
        list: [
          { title: 'Student ID', value: 'student' },
          { title: 'Faculty ID', value: 'faculty' },
          { title: 'Staff ID', value: 'staff' },
          { title: 'Guest Card', value: 'guest' }
        ]
      },
      initialValue: 'student'
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
      description: 'Whether this card is currently active for payments'
    }),
    defineField({
      name: 'isBlocked',
      title: 'Is Blocked',
      type: 'boolean',
      initialValue: false,
      description: 'Whether this card is blocked from making payments'
    }),
    defineField({
      name: 'registeredAt',
      title: 'Registered At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
    defineField({
      name: 'lastUsedAt',
      title: 'Last Used At',
      type: 'datetime',
      description: 'When this card was last used for payment'
    }),
    defineField({
      name: 'registeredBy',
      title: 'Registered By',
      type: 'string',
      description: 'Admin who registered this card'
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      description: 'Additional notes about this card'
    })
  ],
  preview: {
    select: {
      title: 'studentName',
      subtitle: 'cardId',
      media: 'cardType'
    },
    prepare(selection) {
      const { title, subtitle, media } = selection
      return {
        title: title || 'Unknown Student',
        subtitle: `Card ID: ${subtitle}`,
        media: media === 'student' ? '🎓' : media === 'faculty' ? '👨‍🏫' : '💳'
      }
    }
  }
})
