const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const accelerateUrl = process.env.ACCELERATE_URL || process.env.PRISMA_ACCELERATE_URL;
const databaseUrl = process.env.DATABASE_URL;

const prismaOptions = {
	...(accelerateUrl ? { accelerateUrl } : {}),
};

const prisma = accelerateUrl
	? new PrismaClient(prismaOptions).$extends(withAccelerate())
	: new PrismaClient({
		adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })),
	});

module.exports = prisma;
