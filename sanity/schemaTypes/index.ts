import { type SchemaTypeDefinition } from 'sanity'

import { foodItemType, orderType } from './foodItemType'
import { shopType } from './ShopName'
import { reviewType } from './ReviewType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [shopType, foodItemType, orderType, reviewType],
}
