export const CART_UPDATED_EVENT = "storefront:cart-updated";

export function emitCartUpdated(cartCount: number) {
  window.dispatchEvent(new CustomEvent<number>(CART_UPDATED_EVENT, { detail: cartCount }));
}
