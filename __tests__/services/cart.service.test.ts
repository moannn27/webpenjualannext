import { describe, it, expect } from 'vitest'
import { CartService } from '@/services/cart.service'

describe('CartService', () => {
  it('should instantiate without crashing', () => {
    const service = new CartService()
    expect(service).toBeDefined()
  })

  // We mocked Supabase in setup.ts, so we can test the service methods
  it('should call getCart without errors based on mock', async () => {
    const service = new CartService()
    const cart = await service.getCart('test-user-id')
    expect(cart).toBeDefined()
  })
})
