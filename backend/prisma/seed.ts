// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create test users (using upsert to avoid duplicates)
    const user1 = await prisma.user.upsert({
        where: { email: 'customer@example.com' },
        update: {},
        create: {
            id: 'user_001',
            email: 'customer@example.com',
            passwordHash: 'mock_hash_001',
            role: 'CUSTOMER',
            profile: {
                create: {
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '555-0001',
                },
            },
        },
    });

    const user2 = await prisma.user.upsert({
        where: { email: 'restaurant@example.com' },
        update: {},
        create: {
            id: 'user_002',
            email: 'restaurant@example.com',
            passwordHash: 'mock_hash_002',
            role: 'RESTAURANT',
            profile: {
                create: {
                    firstName: 'Pizza',
                    lastName: 'Place',
                    phone: '555-0002',
                },
            },
            restaurant: {
                create: {
                    name: 'Pizza Palace',
                    description: 'Best pizzas in town',
                    category: 'Italian',
                    address: '123 Main St',
                    phone: '555-PIZZA',
                },
            },
        },
    });

    console.log('✅ Seeded users:');
    console.log(`  - Customer: ${user1.email} (id: ${user1.id})`);
    console.log(`  - Restaurant: ${user2.email} (id: ${user2.id})`);
}

main()
    .catch(e => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });