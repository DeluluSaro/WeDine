import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

// Client for read operations (with CDN)
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Set to false if statically generating pages, using ISR or tag-based revalidation
})

// Client for write operations (without CDN)
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Must be false for write operations
  token: process.env.SANITY_API_TOKEN, // Add token for write access
})
