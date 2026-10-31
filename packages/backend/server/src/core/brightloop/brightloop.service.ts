import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, BrightloopProductType, BrightloopBillingFrequency, BrightloopSubscriptionStatus, BrightloopInvoiceStatus, BrightloopDiscountType, BrightloopPaymentMethod } from '@prisma/client';
import { CryptoHelper } from '../../base';

@Injectable()
export class BrightloopService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoHelper,
  ) {}

  // =========================================================================
  // 1. User Authentication & Role Management (RBAC)
  // =========================================================================

  validatePasswordStrength(password: string): void {
    if (!password || password.length <= 8) {
      throw new BadRequestException('Password must be more than 8 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character.');
    }
  }

  async registerCustomer(params: { email: string; name: string; password?: string }) {
    this.validatePasswordStrength(params.password || '');
    const existing = await this.prisma.user.findUnique({ where: { email: params.email } });
    if (existing) {
      throw new BadRequestException('Email address is already registered.');
    }

    const hashedPassword = await this.crypto.encryptPassword(params.password!);
    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name || params.email.split('@')[0],
        password: hashedPassword,
        userRole: 'CUSTOMER',
        registered: true,
      },
      select: { id: true, email: true, name: true, userRole: true, createdAt: true },
    });
  }

  async createStaffAccount(adminUserId: string, params: { email: string; name: string; password?: string }) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || (admin.userRole !== 'ADMIN' && admin.userRole !== 'staff')) {
      // allow initial setup or admin role
      if (admin && admin.userRole !== 'ADMIN') {
        throw new ForbiddenException('Only Administrators can create staff accounts.');
      }
    }

    this.validatePasswordStrength(params.password || '');
    const existing = await this.prisma.user.findUnique({ where: { email: params.email } });
    if (existing) {
      throw new BadRequestException('Email address is already in use.');
    }

    const hashedPassword = await this.crypto.encryptPassword(params.password!);
    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        password: hashedPassword,
        userRole: 'STAFF',
        registered: true,
      },
      select: { id: true, email: true, name: true, userRole: true, createdAt: true },
    });
  }

  async listUsers(role?: string) {
    const where: any = {};
    if (role) {
      where.userRole = role.toUpperCase();
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        companyName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================================================================
  // 2. Product and Variant Management
  // =========================================================================

  async listProducts(workspaceId: string) {
    return this.prisma.product.findMany({
      where: { workspaceId },
      include: {
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  async createProduct(data: {
    workspaceId: string;
    name: string;
    productType?: BrightloopProductType;
    salesPrice: number;
    costPrice?: number;
    notes?: string;
    variants?: Array<{ name: string; variantType?: string; priceAdjustment: number; sku?: string }>;
  }) {
    return this.prisma.product.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        productType: data.productType || BrightloopProductType.SERVICE,
        salesPrice: data.salesPrice,
        costPrice: data.costPrice || 0,
        notes: data.notes,
        variants: {
          create: data.variants?.map(v => ({
            name: v.name,
            variantType: v.variantType || 'brand',
            priceAdjustment: v.priceAdjustment || 0,
            sku: v.sku,
          })),
        },
      },
      include: { variants: true },
    });
  }

  async updateProduct(id: string, data: {
    name?: string;
    productType?: BrightloopProductType;
    salesPrice?: number;
    costPrice?: number;
    notes?: string;
  }) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { variants: true },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async addProductVariant(productId: string, data: {
    name: string;
    variantType?: string;
    priceAdjustment: number;
    sku?: string;
  }) {
    return this.prisma.productVariant.create({
      data: {
        productId,
        name: data.name,
        variantType: data.variantType || 'brand',
        priceAdjustment: data.priceAdjustment,
        sku: data.sku,
      },
    });
  }

  async deleteProductVariant(variantId: string) {
    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  // =========================================================================
  // 3. Subscription Plan Management
  // =========================================================================

  async listPlans(workspaceId: string) {
    return this.prisma.subscriptionPlan.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPlan(data: {
    workspaceId: string;
    name: string;
    description?: string;
    price: number;
    billingFrequency: BrightloopBillingFrequency;
    minQuantity?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    return this.prisma.subscriptionPlan.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        price: data.price,
        billingFrequency: data.billingFrequency,
        minQuantity: data.minQuantity || 1,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
    });
  }

  async updatePlan(id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    billingFrequency: BrightloopBillingFrequency;
    minQuantity: number;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }>) {
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data,
    });
  }

  async deletePlan(id: string) {
    return this.prisma.subscriptionPlan.delete({ where: { id } });
  }

  // =========================================================================
  // 4. Quotation and Subscription Management
  // =========================================================================

  // Templates
  async listQuotationTemplates(workspaceId: string) {
    return this.prisma.quotationTemplate.findMany({
      where: { workspaceId },
      include: {
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuotationTemplate(data: {
    workspaceId: string;
    name: string;
    description?: string;
    planId?: string;
    validityDays?: number;
    lines: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }) {
    return this.prisma.quotationTemplate.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        planId: data.planId,
        validityDays: data.validityDays || 30,
        lines: {
          create: data.lines.map(line => {
            const taxRate = line.taxRate ?? 18;
            const sub = line.unitPrice * line.quantity;
            const tax = (sub * taxRate) / 100;
            return {
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate,
              taxAmount: tax,
              totalAmount: sub + tax,
            };
          }),
        },
      },
      include: { lines: { include: { product: true, variant: true } }, plan: true },
    });
  }

  // Quotes
  async listQuotations(workspaceId: string, customerId?: string) {
    const where: any = { workspaceId };
    if (customerId) where.customerId = customerId;

    return this.prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, companyName: true } },
        template: true,
        lines: { include: { product: true, variant: true } },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuotation(data: {
    workspaceId: string;
    customerId: string;
    templateId?: string;
    planId?: string;
    title: string;
    validityDays?: number;
    paymentTerms?: string;
    notes?: string;
    discountAmount?: number;
    lines: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }) {
    const count = await this.prisma.quotation.count({ where: { workspaceId: data.workspaceId } });
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const validityDays = data.validityDays || 30;
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    let subtotal = 0;
    let taxAmount = 0;

    const computedLines = data.lines.map(line => {
      const taxRate = line.taxRate ?? 18;
      const lineSubtotal = line.unitPrice * line.quantity;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate,
        taxAmount: lineTax,
        totalAmount: lineTotal,
      };
    });

    const discountAmount = data.discountAmount || 0;
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

    return this.prisma.quotation.create({
      data: {
        workspaceId: data.workspaceId,
        quotationNumber,
        templateId: data.templateId,
        customerId: data.customerId,
        planId: data.planId,
        title: data.title,
        validUntil,
        paymentTerms: data.paymentTerms || 'Immediate Payment',
        status: 'draft',
        notes: data.notes,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        lines: {
          create: computedLines,
        },
      },
      include: {
        customer: true,
        lines: { include: { product: true, variant: true } },
      },
    });
  }

  async convertQuotationToSubscription(quotationId: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        lines: { include: { product: true, variant: true } },
        customer: true,
      },
    });

    if (!quote) throw new NotFoundException('Quotation not found.');
    if (quote.status === 'converted' || quote.convertedSubId) {
      throw new BadRequestException('Quotation has already been converted to a subscription.');
    }

    if (!quote.planId) {
      throw new BadRequestException('Quotation must be linked to a subscription plan to convert.');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: quote.planId } });
    if (!plan) throw new NotFoundException('Linked subscription plan not found.');

    const subCount = await this.prisma.brightloopSubscription.count({ where: { workspaceId: quote.workspaceId } });
    const subscriptionNumber = `SUB-${new Date().getFullYear()}-${String(subCount + 1).padStart(4, '0')}`;

    const startDate = new Date();
    const nextBillingDate = this.calculateNextDate(startDate, plan.billingFrequency);
    const expiryDate = plan.endDate || new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.brightloopSubscription.create({
      data: {
        workspaceId: quote.workspaceId,
        subscriptionNumber,
        customerId: quote.customerId,
        planId: plan.id,
        quotationId: quote.id,
        status: BrightloopSubscriptionStatus.CONFIRMED,
        startDate,
        expiryDate,
        nextBillingDate,
        paymentTerms: quote.paymentTerms,
        billingFrequency: plan.billingFrequency,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        items: {
          create: quote.lines.map(l => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            totalAmount: l.totalAmount,
          })),
        },
      },
      include: {
        customer: true,
        plan: true,
        items: { include: { product: true, variant: true } },
      },
    });

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'converted',
        convertedSubId: subscription.id,
      },
    });

    return subscription;
  }

  // Subscriptions Lifecycle
  async listSubscriptions(workspaceId: string, customerId?: string) {
    const where: any = { workspaceId };
    if (customerId) where.customerId = customerId;

    return this.prisma.brightloopSubscription.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, companyName: true } },
        plan: true,
        items: { include: { product: true, variant: true } },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, totalAmount: true, dueDate: true, balanceAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscription(id: string) {
    const sub = await this.prisma.brightloopSubscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        items: { include: { product: true, variant: true } },
        invoices: { include: { payments: true } },
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found.');
    return sub;
  }

  async createSubscription(data: {
    workspaceId: string;
    customerId: string;
    planId: string;
    paymentTerms?: string;
    notes?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new NotFoundException('Subscription plan not found.');

    const count = await this.prisma.brightloopSubscription.count({ where: { workspaceId: data.workspaceId } });
    const subscriptionNumber = `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const startDate = new Date();
    const nextBillingDate = this.calculateNextDate(startDate, plan.billingFrequency);
    const expiryDate = plan.endDate || new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    let subtotal = 0;
    let taxAmount = 0;

    const computedItems = data.items.map(item => {
      const taxRate = item.taxRate ?? 18;
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        taxAmount: itemTax,
        totalAmount: itemTotal,
      };
    });

    return this.prisma.brightloopSubscription.create({
      data: {
        workspaceId: data.workspaceId,
        subscriptionNumber,
        customerId: data.customerId,
        planId: data.planId,
        status: BrightloopSubscriptionStatus.CONFIRMED,
        startDate,
        expiryDate,
        nextBillingDate,
        paymentTerms: data.paymentTerms || 'Net 15',
        billingFrequency: plan.billingFrequency,
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount: subtotal + taxAmount,
        notes: data.notes,
        items: {
          create: computedItems,
        },
      },
      include: {
        customer: true,
        plan: true,
        items: { include: { product: true, variant: true } },
      },
    });
  }

  async pauseSubscription(id: string) {
    return this.prisma.brightloopSubscription.update({
      where: { id },
      data: {
        status: BrightloopSubscriptionStatus.PAUSED,
        pausedAt: new Date(),
      },
    });
  }

  async resumeSubscription(id: string) {
    const sub = await this.prisma.brightloopSubscription.findUnique({ where: { id }, include: { plan: true } });
    if (!sub) throw new NotFoundException('Subscription not found.');

    const nextBillingDate = this.calculateNextDate(new Date(), sub.billingFrequency);

    return this.prisma.brightloopSubscription.update({
      where: { id },
      data: {
        status: BrightloopSubscriptionStatus.ACTIVE,
        pausedAt: null,
        nextBillingDate,
      },
    });
  }

  async closeSubscription(id: string, reason?: string) {
    return this.prisma.brightloopSubscription.update({
      where: { id },
      data: {
        status: BrightloopSubscriptionStatus.CLOSED,
        closedAt: new Date(),
        closureReason: reason || 'Closed by user request',
      },
    });
  }

  async renewSubscription(id: string, extensionMonths = 12) {
    const sub = await this.prisma.brightloopSubscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found.');

    const currentExpiry = sub.expiryDate && sub.expiryDate > new Date() ? sub.expiryDate : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + extensionMonths * 30 * 24 * 60 * 60 * 1000);

    return this.prisma.brightloopSubscription.update({
      where: { id },
      data: {
        status: BrightloopSubscriptionStatus.ACTIVE,
        expiryDate: newExpiry,
        closedAt: null,
        closureReason: null,
      },
    });
  }

  // =========================================================================
  // 5. Automated Recurring Invoicing (Billing Engine)
  // =========================================================================

  async generateDueInvoices(workspaceId?: string) {
    const now = new Date();
    const where: any = {
      status: { in: [BrightloopSubscriptionStatus.CONFIRMED, BrightloopSubscriptionStatus.ACTIVE] },
      nextBillingDate: { lte: now },
    };
    if (workspaceId) where.workspaceId = workspaceId;

    const dueSubscriptions = await this.prisma.brightloopSubscription.findMany({
      where,
      include: {
        customer: true,
        plan: true,
        items: { include: { product: true, variant: true } },
      },
    });

    const generatedInvoices = [];

    for (const sub of dueSubscriptions) {
      // Check plan expiration
      if (sub.expiryDate && sub.expiryDate < now) {
        await this.prisma.brightloopSubscription.update({
          where: { id: sub.id },
          data: {
            status: BrightloopSubscriptionStatus.EXPIRED,
            closedAt: now,
            closureReason: 'Plan expiration date reached.',
          },
        });
        continue;
      }

      const cycleStart = sub.lastInvoicedDate || sub.startDate;
      const cycleEnd = sub.nextBillingDate;

      // Prevent duplicate invoices
      const existing = await this.prisma.brightloopInvoice.findUnique({
        where: {
          subscriptionId_billingCycleStart_billingCycleEnd: {
            subscriptionId: sub.id,
            billingCycleStart: cycleStart,
            billingCycleEnd: cycleEnd,
          },
        },
      });

      if (existing) {
        // Already invoiced, advance nextBillingDate safely to prevent duplicate or skipped cycle
        const nextDate = this.calculateNextDate(sub.nextBillingDate, sub.billingFrequency);
        await this.prisma.brightloopSubscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: nextDate },
        });
        continue;
      }

      // Check applicable discounts
      let applicableDiscount = 0;
      const activeDiscounts = await this.prisma.discountRule.findMany({
        where: {
          workspaceId: sub.workspaceId,
          isActive: true,
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
          AND: [
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
            { OR: [{ maxUses: null }, { currentUses: { lt: this.prisma.discountRule.fields.maxUses } }] },
          ],
        },
      });

      for (const disc of activeDiscounts) {
        if (disc.minPurchase && Number(sub.subtotal) < Number(disc.minPurchase)) continue;

        if (disc.discountType === BrightloopDiscountType.PERCENTAGE) {
          applicableDiscount += (Number(sub.subtotal) * Number(disc.value)) / 100;
        } else {
          applicableDiscount += Number(disc.value);
        }

        // Increment usage
        await this.prisma.discountRule.update({
          where: { id: disc.id },
          data: { currentUses: { increment: 1 } },
        });
      }

      const subtotal = Number(sub.subtotal);
      const taxAmount = Number(sub.taxAmount);
      const totalAmount = Math.max(0, subtotal + taxAmount - applicableDiscount);

      const invCount = await this.prisma.brightloopInvoice.count({ where: { workspaceId: sub.workspaceId } });
      const invoiceNumber = `INV-${now.getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;

      // Net 15 due date
      const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      const invoice = await this.prisma.brightloopInvoice.create({
        data: {
          workspaceId: sub.workspaceId,
          invoiceNumber,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          billingCycleStart: cycleStart,
          billingCycleEnd: cycleEnd,
          issueDate: now,
          dueDate,
          status: BrightloopInvoiceStatus.CONFIRMED,
          subtotal,
          taxAmount,
          discountAmount: applicableDiscount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          paymentTerms: sub.paymentTerms,
          items: {
            create: sub.items.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              description: `${item.product.name}${item.variant ? ` (${item.variant.name})` : ''}`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      // Update subscription next billing date & status
      const nextDate = this.calculateNextDate(sub.nextBillingDate, sub.billingFrequency);
      await this.prisma.brightloopSubscription.update({
        where: { id: sub.id },
        data: {
          status: BrightloopSubscriptionStatus.ACTIVE,
          lastInvoicedDate: sub.nextBillingDate,
          nextBillingDate: nextDate,
        },
      });

      generatedInvoices.push(invoice);
    }

    return generatedInvoices;
  }

  async listInvoices(workspaceId: string, customerId?: string) {
    const where: any = { workspaceId };
    if (customerId) where.customerId = customerId;

    return this.prisma.brightloopInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, companyName: true } },
        subscription: { select: { id: true, subscriptionNumber: true, status: true } },
        items: { include: { product: true, variant: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.brightloopInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: { include: { plan: true } },
        items: { include: { product: true, variant: true } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async confirmInvoice(id: string) {
    return this.prisma.brightloopInvoice.update({
      where: { id },
      data: { status: BrightloopInvoiceStatus.CONFIRMED },
    });
  }

  async cancelInvoice(id: string) {
    return this.prisma.brightloopInvoice.update({
      where: { id },
      data: { status: BrightloopInvoiceStatus.CANCELLED },
    });
  }

  // =========================================================================
  // 6. Discount Management
  // =========================================================================

  async listDiscounts(workspaceId: string) {
    return this.prisma.discountRule.findMany({
      where: { workspaceId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiscount(data: {
    workspaceId: string;
    code: string;
    description?: string;
    discountType: BrightloopDiscountType;
    value: number;
    minPurchase?: number;
    minQuantity?: number;
    startDate?: Date;
    endDate?: Date;
    maxUses?: number;
    appliesToAll?: boolean;
    productId?: string;
  }) {
    return this.prisma.discountRule.create({
      data: {
        workspaceId: data.workspaceId,
        code: data.code.toUpperCase().trim(),
        description: data.description,
        discountType: data.discountType,
        value: data.value,
        minPurchase: data.minPurchase || 0,
        minQuantity: data.minQuantity || 1,
        startDate: data.startDate,
        endDate: data.endDate,
        maxUses: data.maxUses,
        appliesToAll: data.appliesToAll ?? true,
        productId: data.productId,
        isActive: true,
      },
    });
  }

  async updateDiscount(id: string, data: Partial<{
    description: string;
    value: number;
    minPurchase: number;
    minQuantity: number;
    startDate: Date;
    endDate: Date;
    maxUses: number;
    isActive: boolean;
  }>) {
    return this.prisma.discountRule.update({
      where: { id },
      data,
    });
  }

  async deleteDiscount(id: string) {
    return this.prisma.discountRule.delete({ where: { id } });
  }

  // =========================================================================
  // 7. Payment Management & Reconciliation
  // =========================================================================

  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: BrightloopPaymentMethod;
    paymentDate?: Date;
    referenceNumber?: string;
    notes?: string;
    recordedById?: string;
  }) {
    const invoice = await this.prisma.brightloopInvoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    const count = await this.prisma.paymentRecord.count();
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const paymentAmount = Number(data.amount);
    const newPaidAmount = Number(invoice.paidAmount) + paymentAmount;
    const newBalanceAmount = Math.max(0, Number(invoice.totalAmount) - newPaidAmount);

    const isPaidInFull = newBalanceAmount <= 0;
    const newStatus = isPaidInFull ? BrightloopInvoiceStatus.PAID : invoice.status;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRecord.create({
        data: {
          invoiceId: invoice.id,
          paymentNumber,
          amount: paymentAmount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate || new Date(),
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          recordedById: data.recordedById,
        },
      });

      await tx.brightloopInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      });

      return payment;
    });
  }

  async listPayments(workspaceId: string) {
    return this.prisma.paymentRecord.findMany({
      where: { invoice: { workspaceId } },
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, totalAmount: true, customer: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // Flag overdue invoices
  async checkOverdueInvoices(workspaceId?: string) {
    const now = new Date();
    const where: any = {
      dueDate: { lt: now },
      status: { notIn: [BrightloopInvoiceStatus.PAID, BrightloopInvoiceStatus.CANCELLED, BrightloopInvoiceStatus.OVERDUE] },
    };
    if (workspaceId) where.workspaceId = workspaceId;

    return this.prisma.brightloopInvoice.updateMany({
      where,
      data: { status: BrightloopInvoiceStatus.OVERDUE },
    });
  }

  // =========================================================================
  // 8. Finance Dashboard & Reporting
  // =========================================================================

  async getDashboardMetrics(workspaceId: string) {
    const now = new Date();

    const [
      activeSubscriptionsCount,
      totalRevenueResult,
      outstandingResult,
      overdueInvoicesCount,
      recentInvoices,
      recentSubscriptions,
    ] = await Promise.all([
      // Total active subscriptions
      this.prisma.brightloopSubscription.count({
        where: {
          workspaceId,
          status: { in: [BrightloopSubscriptionStatus.ACTIVE, BrightloopSubscriptionStatus.CONFIRMED] },
        },
      }),

      // Revenue received (sum of paid amounts on invoices)
      this.prisma.brightloopInvoice.aggregate({
        where: { workspaceId },
        _sum: { paidAmount: true },
      }),

      // Outstanding payments (sum of balance amounts on confirmed/overdue invoices)
      this.prisma.brightloopInvoice.aggregate({
        where: {
          workspaceId,
          status: { in: [BrightloopInvoiceStatus.CONFIRMED, BrightloopInvoiceStatus.OVERDUE] },
        },
        _sum: { balanceAmount: true },
      }),

      // Overdue invoices count
      this.prisma.brightloopInvoice.count({
        where: {
          workspaceId,
          status: BrightloopInvoiceStatus.OVERDUE,
        },
      }),

      // Recent 5 invoices
      this.prisma.brightloopInvoice.findMany({
        where: { workspaceId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
        },
      }),

      // Recent 5 subscriptions
      this.prisma.brightloopSubscription.findMany({
        where: { workspaceId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
          plan: { select: { name: true, billingFrequency: true } },
        },
      }),
    ]);

    return {
      activeSubscriptions: activeSubscriptionsCount,
      totalRevenue: Number(totalRevenueResult._sum.paidAmount || 0),
      outstandingPayments: Number(outstandingResult._sum.balanceAmount || 0),
      overdueInvoices: overdueInvoicesCount,
      recentInvoices,
      recentSubscriptions,
      generatedAt: now.toISOString(),
    };
  }

  // =========================================================================
  // Helper: Calculate Next Billing Date
  // =========================================================================
  private calculateNextDate(from: Date, frequency: BrightloopBillingFrequency): Date {
    const date = new Date(from);
    switch (frequency) {
      case BrightloopBillingFrequency.DAILY:
        date.setDate(date.getDate() + 1);
        break;
      case BrightloopBillingFrequency.WEEKLY:
        date.setDate(date.getDate() + 7);
        break;
      case BrightloopBillingFrequency.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case BrightloopBillingFrequency.YEARLY:
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }
}
