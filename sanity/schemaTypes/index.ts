import { type SchemaTypeDefinition } from 'sanity'

import { foodItemType, orderType } from './foodItemType'
import { shopType } from './ShopName';
import { reviewType } from './ReviewType'
import { cartItemType } from './AddtoCart';
import { historyType } from './historyType';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [shopType, foodItemType, orderType, reviewType, cartItemType, historyType],
}
