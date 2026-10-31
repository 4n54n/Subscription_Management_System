import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootEnv = resolve(__dirname, '../../../.env');
dotenvConfig({ path: rootEnv });

process.env.DATABASE_URL =
  'postgresql://postgres:root@localhost:5433/brightloop_subscriptions?schema=public';

console.log('Connecting to database at:', process.env.DATABASE_URL);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('--- Seeding Brightloop Subscription Management Data ---');

  // 1. Ensure Default Workspace exists
  let workspace = await prisma.workspace.findFirst({
    where: { id: 'brightloop-workspace' },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        id: 'brightloop-workspace',
        name: 'Brightloop Software Solutions',
        public: true,
      },
    });
    console.log('Created workspace:', workspace.name, `(${workspace.id})`);
  }

  // 2. Passwords meeting strong policy: >8 chars, 1 uppercase, 1 lowercase, 1 special char
  const adminPasswordHash = await hash('Admin@Brightloop2026!');
  const staffPasswordHash = await hash('Staff@Brightloop2026!');
  const customerPasswordHash = await hash('Customer@Brightloop2026!');

  // Users & Roles
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@brightloop.local' },
    update: {
      password: adminPasswordHash,
      userRole: 'ADMIN',
      registered: true,
    },
    create: {
      id: 'usr-admin-001',
      name: 'Brightloop Administrator',
      email: 'admin@brightloop.local',
      userRole: 'ADMIN',
      password: adminPasswordHash,
      registered: true,
      companyName: 'Brightloop Software',
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@brightloop.local' },
    update: {
      password: staffPasswordHash,
      userRole: 'STAFF',
      registered: true,
    },
    create: {
      id: 'usr-staff-001',
      name: 'Brightloop Billing Staff',
      email: 'staff@brightloop.local',
      userRole: 'STAFF',
      password: staffPasswordHash,
      registered: true,
      companyName: 'Brightloop Software',
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@brightloop.local' },
    update: {
      password: customerPasswordHash,
      userRole: 'CUSTOMER',
      registered: true,
    },
    create: {
      id: 'usr-customer-001',
      name: 'Acme Corporation (Client)',
      email: 'customer@brightloop.local',
      userRole: 'CUSTOMER',
      password: customerPasswordHash,
      registered: true,
      companyName: 'Acme Corp',
      companyAddress: '100 Enterprise Way, Silicon Valley, CA',
    },
  });

  // Assign workspace roles
  for (const user of [adminUser, staffUser, customerUser]) {
    await prisma.workspaceUserRole.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: { accepted: true, status: 'Accepted' },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        type: user.userRole === 'ADMIN' ? 0 : 1,
        accepted: true,
        status: 'Accepted',
      },
    });
  }

  console.log('Seeded Users: Admin, Staff, Customer');

  // 3. Products & Product Variants
  const productErp = await prisma.product.upsert({
    where: { id: 'prod-brightloop-erp' },
    update: {},
    create: {
      id: 'prod-brightloop-erp',
      workspaceId: workspace.id,
      name: 'Brightloop Core ERP Suite',
      productType: 'SERVICE',
      salesPrice: 1200.0,
      costPrice: 400.0,
      notes: 'Unified recurring subscription management & billing platform.',
      variants: {
        create: [
          {
            name: 'Standard Edition',
            variantType: 'brand',
            sku: 'BL-ERP-STD',
            priceAdjustment: 0.0,
          },
          {
            name: 'Odoo Brand Integration',
            variantType: 'brand',
            sku: 'BL-ERP-ODOO',
            priceAdjustment: 560.0, // Selecting Odoo brand adds 560
          },
        ],
      },
    },
  });

  const productCloud = await prisma.product.upsert({
    where: { id: 'prod-cloud-hosting' },
    update: {},
    create: {
      id: 'prod-cloud-hosting',
      workspaceId: workspace.id,
      name: 'High Availability Cloud Hosting',
      productType: 'SERVICE',
      salesPrice: 350.0,
      costPrice: 90.0,
      notes: 'Dedicated redundant cloud infrastructure.',
      variants: {
        create: [
          {
            name: 'Single Region US-East',
            variantType: 'brand',
            sku: 'BL-CLOUD-US',
            priceAdjustment: 0.0,
          },
          {
            name: 'Multi-Region Global Cluster',
            variantType: 'brand',
            sku: 'BL-CLOUD-HA',
            priceAdjustment: 250.0,
          },
        ],
      },
    },
  });

  const productSupport = await prisma.product.upsert({
    where: { id: 'prod-support-sla' },
    update: {},
    create: {
      id: 'prod-support-sla',
      workspaceId: workspace.id,
      name: '24/7 Dedicated Support SLA',
      productType: 'SERVICE',
      salesPrice: 500.0,
      costPrice: 150.0,
      notes: 'Priority 15-minute response time SLA and dedicated architect.',
    },
  });

  console.log('Seeded Products:', productErp.name, productCloud.name, productSupport.name);

  // 4. Subscription Plans
  const plansData = [
    {
      id: 'plan-daily-starter',
      name: 'Daily Starter Plan',
      description: 'Daily billing cycle for dynamic or testing subscriptions',
      billingFrequency: 'DAILY' as const,
      price: 25.0,
      minQuantity: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
    },
    {
      id: 'plan-weekly-growth',
      name: 'Weekly Growth Plan',
      description: 'Weekly billing cycle for agile fast-growing operations',
      billingFrequency: 'WEEKLY' as const,
      price: 120.0,
      minQuantity: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
    },
    {
      id: 'plan-monthly-biz',
      name: 'Monthly Business Plan',
      description: 'Standard monthly billing for growing companies',
      billingFrequency: 'MONTHLY' as const,
      price: 450.0,
      minQuantity: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
    },
    {
      id: 'plan-annual-ent',
      name: 'Annual Enterprise Plan',
      description: 'Annual enterprise subscription with discounted pricing',
      billingFrequency: 'YEARLY' as const,
      price: 4800.0,
      minQuantity: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
    },
  ];

  for (const p of plansData) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        workspaceId: workspace.id,
      },
    });
  }
  console.log('Seeded Subscription Plans (Daily, Weekly, Monthly, Yearly)');

  // 5. Discount Rules
  await prisma.discountRule.upsert({
    where: { id: 'disc-welcome-10' },
    update: {},
    create: {
      id: 'disc-welcome-10',
      workspaceId: workspace.id,
      code: 'WELCOME10',
      description: 'Welcome 10% Off',
      discountType: 'PERCENTAGE',
      value: 10.0,
      minPurchase: 100.0,
      minQuantity: 1,
      maxUses: 100,
      currentUses: 12,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
      appliesToAll: true,
    },
  });

  await prisma.discountRule.upsert({
    where: { id: 'disc-odoo-connect' },
    update: {},
    create: {
      id: 'disc-odoo-connect',
      workspaceId: workspace.id,
      code: 'ODOOCONNECT',
      description: 'Odoo Ecosystem Partnership Rebate',
      discountType: 'FIXED',
      value: 560.0,
      minPurchase: 1200.0,
      maxUses: 50,
      currentUses: 5,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
      appliesToAll: true,
    },
  });
  console.log('Seeded Discount Rules');

  // 6. Quotation
  const odooVariant = await prisma.productVariant.findFirst({
    where: { sku: 'BL-ERP-ODOO' },
  });

  const quote = await prisma.quotation.upsert({
    where: { quotationNumber: 'QT-2026-0001' },
    update: {},
    create: {
      quotationNumber: 'QT-2026-0001',
      title: 'Enterprise Subscription with Odoo Brand Integration',
      workspaceId: workspace.id,
      customerId: customerUser.id,
      planId: 'plan-monthly-biz',
      status: 'sent',
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      paymentTerms: 'Net 30 Days',
      subtotal: 1760.0,
      taxAmount: 176.0,
      discountAmount: 0.0,
      totalAmount: 1936.0,
      lines: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id,
            quantity: 1,
            unitPrice: 1760.0, // 1200 base + 560 Odoo variant
            taxRate: 10.0,
            taxAmount: 176.0,
            totalAmount: 1936.0,
          },
        ],
      },
    },
  });
  console.log('Seeded Quotation:', quote.quotationNumber);

  // 7. Subscriptions: One Active, One Due for Automated Recurring Billing
  const now = new Date();
  const subActive = await prisma.brightloopSubscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-0001' },
    update: {},
    create: {
      subscriptionNumber: 'SUB-2026-0001',
      workspaceId: workspace.id,
      customerId: customerUser.id,
      planId: 'plan-monthly-biz',
      status: 'ACTIVE',
      startDate: new Date(now.getTime() - 25 * 24 * 3600 * 1000),
      nextBillingDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000), // In 5 days
      billingFrequency: 'MONTHLY',
      paymentTerms: 'Net 15 Days',
      subtotal: 1760.0,
      taxAmount: 176.0,
      totalAmount: 1936.0,
      items: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id,
            quantity: 1,
            unitPrice: 1760.0,
            taxRate: 10.0,
            taxAmount: 176.0,
            totalAmount: 1936.0,
          },
        ],
      },
    },
  });

  const subDue = await prisma.brightloopSubscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-0002' },
    update: {},
    create: {
      subscriptionNumber: 'SUB-2026-0002',
      workspaceId: workspace.id,
      customerId: customerUser.id,
      planId: 'plan-weekly-growth',
      status: 'ACTIVE',
      startDate: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
      nextBillingDate: new Date(now.getTime() - 24 * 3600 * 1000), // Due yesterday! Ready for automated invoicing
      billingFrequency: 'WEEKLY',
      paymentTerms: 'Immediate',
      subtotal: 120.0,
      taxAmount: 12.0,
      totalAmount: 132.0,
      items: {
        create: [
          {
            productId: productCloud.id,
            quantity: 1,
            unitPrice: 120.0,
            taxRate: 10.0,
            taxAmount: 12.0,
            totalAmount: 132.0,
          },
        ],
      },
    },
  });
  console.log('Seeded Subscriptions: Active (SUB-2026-0001) and Due (SUB-2026-0002)');

  // 8. Invoices: Paid, Confirmed, Overdue
  const invPaid = await prisma.brightloopInvoice.upsert({
    where: { invoiceNumber: 'INV-2026-0001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0001',
      workspaceId: workspace.id,
      subscriptionId: subActive.id,
      customerId: customerUser.id,
      status: 'PAID',
      issueDate: new Date(now.getTime() - 25 * 24 * 3600 * 1000),
      dueDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
      billingCycleStart: new Date(now.getTime() - 25 * 24 * 3600 * 1000),
      billingCycleEnd: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
      subtotal: 1760.0,
      taxAmount: 176.0,
      totalAmount: 1936.0,
      paidAmount: 1936.0,
      balanceAmount: 0.0,
      items: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id,
            description: 'Brightloop Core ERP Suite - Odoo Brand Integration',
            quantity: 1,
            unitPrice: 1760.0,
            taxRate: 10.0,
            taxAmount: 176.0,
            totalAmount: 1936.0,
          },
        ],
      },
    },
  });

  await prisma.brightloopInvoice.upsert({
    where: { invoiceNumber: 'INV-2026-0002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0002',
      workspaceId: workspace.id,
      subscriptionId: subActive.id,
      customerId: customerUser.id,
      status: 'CONFIRMED',
      issueDate: now,
      dueDate: new Date(now.getTime() + 15 * 24 * 3600 * 1000),
      billingCycleStart: now,
      billingCycleEnd: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      subtotal: 1760.0,
      taxAmount: 176.0,
      totalAmount: 1936.0,
      paidAmount: 0.0,
      balanceAmount: 1936.0,
      items: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id,
            description: 'Brightloop Core ERP Suite - Odoo Brand Integration',
            quantity: 1,
            unitPrice: 1760.0,
            taxRate: 10.0,
            taxAmount: 176.0,
            totalAmount: 1936.0,
          },
        ],
      },
    },
  });

  await prisma.brightloopInvoice.upsert({
    where: { invoiceNumber: 'INV-2026-0003' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0003',
      workspaceId: workspace.id,
      customerId: customerUser.id,
      status: 'CONFIRMED',
      issueDate: new Date(now.getTime() - 40 * 24 * 3600 * 1000),
      dueDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000), // 10 days past due!
      billingCycleStart: new Date(now.getTime() - 40 * 24 * 3600 * 1000),
      billingCycleEnd: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
      subtotal: 500.0,
      taxAmount: 50.0,
      totalAmount: 550.0,
      paidAmount: 0.0,
      balanceAmount: 550.0,
      items: {
        create: [
          {
            productId: productSupport.id,
            description: '24/7 Dedicated Support SLA',
            quantity: 1,
            unitPrice: 500.0,
            taxRate: 10.0,
            taxAmount: 50.0,
            totalAmount: 550.0,
          },
        ],
      },
    },
  });

  // 9. Payment Record for INV-2026-0001
  await prisma.paymentRecord.upsert({
    where: { paymentNumber: 'PAY-2026-0001' },
    update: {},
    create: {
      paymentNumber: 'PAY-2026-0001',
      invoiceId: invPaid.id,
      amount: 1936.0,
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date(now.getTime() - 15 * 24 * 3600 * 1000),
      notes: 'Customer wire transfer reference #WT-9923841-BRIGHTLOOP',
      recordedById: staffUser.id,
    },
  });

  console.log('Seeded Invoices: INV-2026-0001 (PAID), INV-2026-0002 (CONFIRMED), INV-2026-0003 (OVERDUE)');
  console.log('Seeded Payment: PAY-2026-0001 for $1936.00');
  console.log('--- Brightloop Seed Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
