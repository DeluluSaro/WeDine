import { type SchemaTypeDefinition } from 'sanity'

import { foodItemType, orderType } from './foodItemType'
import { orderHistoryType } from './orderHistoryType'
import { shopType } from './ShopName'
import { reviewType } from './ReviewType'
import { cartItemType } from './AddtoCart';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [shopType, foodItemType, orderType, orderHistoryType, reviewType, cartItemType],
}
