import { type SchemaTypeDefinition } from 'sanity'

import { shopType } from './shopType'
import { orderType, foodItemType } from './foodItemType'
import { categoryType } from './categoryType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [categoryType, shopType, foodItemType, orderType],
}
