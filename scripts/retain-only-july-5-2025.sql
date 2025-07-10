-- MOSEHXL: Retain Only July 5th, 2025 Data Script
-- This script will delete all transactional data except for July 5th, 2025
-- and reset sequences for legal compliance and integrity.
-- BACKUP your database before running this script!

-- 1. Keep only July 5th, 2025 in closure_bulletins
delete from closure_bulletins where date(period_start) <> '2025-07-05';

-- 2. Keep only July 5th, 2025 in orders
delete from orders where date(created_at) <> '2025-07-05';

-- 3. Keep only order_items for orders from July 5th, 2025
delete from order_items where order_id not in (select id from orders);

-- 4. Keep only sub_bills for orders from July 5th, 2025
delete from sub_bills where order_id not in (select id from orders);

-- 5. Keep only legal_journal entries for orders from July 5th, 2025
delete from legal_journal where order_id not in (select id from orders);

-- 6. (Optional) If you have audit_trail or other related tables, do the same:
-- delete from audit_trail where order_id not in (select id from orders);

-- 7. Reset sequences to max(id) + 1 for each table
select setval(pg_get_serial_sequence('orders', 'id'), coalesce(max(id), 1)) from orders;
select setval(pg_get_serial_sequence('order_items', 'id'), coalesce(max(id), 1)) from order_items;
select setval(pg_get_serial_sequence('sub_bills', 'id'), coalesce(max(id), 1)) from sub_bills;
select setval(pg_get_serial_sequence('legal_journal', 'id'), coalesce(max(id), 1)) from legal_journal;
select setval(pg_get_serial_sequence('closure_bulletins', 'id'), coalesce(max(id), 1)) from closure_bulletins;

-- 8. (If needed) Recompute closure hashes and legal integrity
-- If your backend has a function or endpoint to regenerate legal hashes, run it now.
-- Otherwise, you may need to trigger a closure or legal journal rebuild from the UI or backend.

-- END OF SCRIPT 