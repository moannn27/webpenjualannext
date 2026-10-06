BEGIN;
SELECT plan(2);

SELECT ok(
    NOT has_function_privilege(
        'anon',
        'public.process_checkout(uuid, text, text, text, text, text, text, text, text)',
        'EXECUTE'
    ),
    'anonymous users cannot execute checkout'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
    $$
        SELECT public.process_checkout(
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Test User', '081234567890', 'Jalan Test 1', 'Bandung',
            'Jawa Barat', '40115', 'standard', 'manual_transfer'
        )
    $$,
    '42501',
    'Not authorized to checkout this cart',
    'checkout rejects a request without a matching authenticated user'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;