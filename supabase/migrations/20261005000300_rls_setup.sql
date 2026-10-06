-- Phase 6: Row Level Security (RLS) Setup

-- 1. Helper Functions for Role Checking (Security Definer to bypass RLS and prevent infinite loops)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$;

-- 2. Policies for 'users'
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.users FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete profiles" ON public.users FOR DELETE USING (public.is_admin());

-- 3. Policies for Catalog Tables (Public Read, Admin Write)
-- categories
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (public.is_admin());

-- brands
CREATE POLICY "Public can view brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE USING (public.is_admin());

-- products
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (status = 'published' OR public.is_admin());
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (public.is_admin());

-- product_images
CREATE POLICY "Public can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins can insert product images" ON public.product_images FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update product images" ON public.product_images FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete product images" ON public.product_images FOR DELETE USING (public.is_admin());

-- product_specifications
CREATE POLICY "Public can view product specifications" ON public.product_specifications FOR SELECT USING (true);
CREATE POLICY "Admins can insert product specifications" ON public.product_specifications FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update product specifications" ON public.product_specifications FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete product specifications" ON public.product_specifications FOR DELETE USING (public.is_admin());

-- 4. Policies for Commerce Tables (Self or Admin)
-- wishlist
CREATE POLICY "Users can view their wishlist" ON public.wishlist FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert to their wishlist" ON public.wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from their wishlist" ON public.wishlist FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- cart
CREATE POLICY "Users can view their cart" ON public.cart FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "System/Users can insert cart" ON public.cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their cart" ON public.cart FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- cart_items
CREATE POLICY "Users can view their cart items" ON public.cart_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cart WHERE cart.id = cart_items.cart_id AND (cart.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "Users can insert cart items" ON public.cart_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
);
CREATE POLICY "Users can update cart items" ON public.cart_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
);
CREATE POLICY "Users can delete cart items" ON public.cart_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.cart WHERE cart.id = cart_items.cart_id AND (cart.user_id = auth.uid() OR public.is_admin()))
);

-- addresses
CREATE POLICY "Users can view their addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert their addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can delete their addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- 5. Policies for Order Management
-- orders
CREATE POLICY "Users can view their orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Only admins can update orders" ON public.orders FOR UPDATE USING (public.is_admin());
CREATE POLICY "Only admins can delete orders" ON public.orders FOR DELETE USING (public.is_admin());

-- order_items
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "Only admins can update order items" ON public.order_items FOR UPDATE USING (public.is_admin());
CREATE POLICY "Only admins can delete order items" ON public.order_items FOR DELETE USING (public.is_admin());

-- payments
CREATE POLICY "Users can view their payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "Users can insert payments" ON public.payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "System/Admins can update payments" ON public.payments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);

-- 6. Policies for Content Tables
-- reviews
CREATE POLICY "Public can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can delete their reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- banners
CREATE POLICY "Public can view active banners" ON public.banners FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert banners" ON public.banners FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update banners" ON public.banners FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete banners" ON public.banners FOR DELETE USING (public.is_admin());

-- faqs
CREATE POLICY "Public can view active faqs" ON public.faqs FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert faqs" ON public.faqs FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update faqs" ON public.faqs FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete faqs" ON public.faqs FOR DELETE USING (public.is_admin());

-- testimonials
CREATE POLICY "Public can view active testimonials" ON public.testimonials FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert testimonials" ON public.testimonials FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update testimonials" ON public.testimonials FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete testimonials" ON public.testimonials FOR DELETE USING (public.is_admin());
