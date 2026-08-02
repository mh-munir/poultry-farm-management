SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;

SELECT column_name FROM information_schema.columns WHERE table_name = 'SmsNotification' ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns WHERE table_name = 'Expense' ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns WHERE table_name = 'Party' ORDER BY ordinal_position;
