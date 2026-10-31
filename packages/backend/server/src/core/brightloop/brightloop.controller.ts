import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { BrightloopService } from './brightloop.service';
import { CurrentUser, Public } from '../auth';
import {
  BrightloopProductType,
  BrightloopBillingFrequency,
  BrightloopDiscountType,
  BrightloopPaymentMethod,
} from '@prisma/client';

@Controller()
export class BrightloopController {
  constructor(private readonly service: BrightloopService) {}

  // =========================================================================
  // Role & Permission Helper
  // =========================================================================
  private assertAdmin(user?: CurrentUser) {
    const role = (user as any)?.userRole?.toUpperCase();
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required.');
    }
  }

  private assertAdminOrStaff(user?: CurrentUser) {
    const role = (user as any)?.userRole?.toUpperCase();
    if (role !== 'ADMIN' && role !== 'STAFF') {
      throw new ForbiddenException('Staff or Admin access required.');
    }
  }

  // =========================================================================
  // 1. Auth & RBAC
  // =========================================================================

  @Public()
  @Post('/api/auth/register-customer')
  async registerCustomer(
    @Body() body: { email: string; name: string; password?: string }
  ) {
    return this.service.registerCustomer(body);
  }

  @Post('/api/auth/create-staff')
  async createStaff(
    @CurrentUser() user: CurrentUser,
    @Body() body: { email: string; name: string; password?: string }
  ) {
    this.assertAdmin(user);
    return this.service.createStaffAccount(user.id, body);
  }

  @Get('/api/auth/users')
  async listUsers(
    @CurrentUser() user: CurrentUser,
    @Query('role') role?: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.listUsers(role);
  }

  // =========================================================================
  // 2. Product & Variant Management (Admin only for modifications)
  // =========================================================================

  @Get('/api/workspaces/:workspaceId/brightloop/products')
  async listProducts(@Param('workspaceId') workspaceId: string) {
    return this.service.listProducts(workspaceId);
  }

  @Get('/api/workspaces/:workspaceId/brightloop/products/:id')
  async getProduct(@Param('id') id: string) {
    return this.service.getProduct(id);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/products')
  async createProduct(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      name: string;
      productType?: BrightloopProductType;
      salesPrice: number;
      costPrice?: number;
      notes?: string;
      variants?: Array<{
        name: string;
        variantType?: string;
        priceAdjustment: number;
        sku?: string;
      }>;
    }
  ) {
    this.assertAdmin(user);
    return this.service.createProduct({ ...body, workspaceId });
  }

  @Put('/api/workspaces/:workspaceId/brightloop/products/:id')
  async updateProduct(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      productType?: BrightloopProductType;
      salesPrice?: number;
      costPrice?: number;
      notes?: string;
    }
  ) {
    this.assertAdmin(user);
    return this.service.updateProduct(id, body);
  }

  @Delete('/api/workspaces/:workspaceId/brightloop/products/:id')
  async deleteProduct(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdmin(user);
    return this.service.deleteProduct(id);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/products/:id/variants')
  async addProductVariant(
    @CurrentUser() user: CurrentUser,
    @Param('id') productId: string,
    @Body()
    body: {
      name: string;
      variantType?: string;
      priceAdjustment: number;
      sku?: string;
    }
  ) {
    this.assertAdmin(user);
    return this.service.addProductVariant(productId, body);
  }

  @Delete('/api/workspaces/:workspaceId/brightloop/variants/:variantId')
  async deleteProductVariant(
    @CurrentUser() user: CurrentUser,
    @Param('variantId') variantId: string
  ) {
    this.assertAdmin(user);
    return this.service.deleteProductVariant(variantId);
  }

  // =========================================================================
  // 3. Subscription Plan Management (Admin only for modifications)
  // =========================================================================

  @Get('/api/workspaces/:workspaceId/brightloop/plans')
  async listPlans(@Param('workspaceId') workspaceId: string) {
    return this.service.listPlans(workspaceId);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/plans')
  async createPlan(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      price: number;
      billingFrequency: BrightloopBillingFrequency;
      minQuantity?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    this.assertAdmin(user);
    return this.service.createPlan({
      ...body,
      workspaceId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Put('/api/workspaces/:workspaceId/brightloop/plans/:id')
  async updatePlan(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: number;
      billingFrequency?: BrightloopBillingFrequency;
      minQuantity?: number;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    }
  ) {
    this.assertAdmin(user);
    return this.service.updatePlan(id, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Delete('/api/workspaces/:workspaceId/brightloop/plans/:id')
  async deletePlan(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdmin(user);
    return this.service.deletePlan(id);
  }

  // =========================================================================
  // 4. Quotation and Subscription Management
  // =========================================================================

  // Templates
  @Get('/api/workspaces/:workspaceId/brightloop/quotation-templates')
  async listQuotationTemplates(@Param('workspaceId') workspaceId: string) {
    return this.service.listQuotationTemplates(workspaceId);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/quotation-templates')
  async createQuotationTemplate(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
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
    }
  ) {
    this.assertAdminOrStaff(user);
    return this.service.createQuotationTemplate({ ...body, workspaceId });
  }

  // Quotations
  @Get('/api/workspaces/:workspaceId/brightloop/quotations')
  async listQuotations(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    const role = (user as any)?.userRole?.toUpperCase();
    const customerFilter = role === 'CUSTOMER' ? user.id : undefined;
    return this.service.listQuotations(workspaceId, customerFilter);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/quotations')
  async createQuotation(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
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
    }
  ) {
    this.assertAdminOrStaff(user);
    return this.service.createQuotation({ ...body, workspaceId });
  }

  @Post('/api/workspaces/:workspaceId/brightloop/quotations/:id/convert')
  async convertQuotation(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.convertQuotationToSubscription(id);
  }

  // Subscriptions
  @Get('/api/workspaces/:workspaceId/brightloop/subscriptions')
  async listSubscriptions(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    const role = (user as any)?.userRole?.toUpperCase();
    const customerFilter = role === 'CUSTOMER' ? user.id : undefined;
    return this.service.listSubscriptions(workspaceId, customerFilter);
  }

  @Get('/api/workspaces/:workspaceId/brightloop/subscriptions/:id')
  async getSubscription(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    const sub = await this.service.getSubscription(id);
    const role = (user as any)?.userRole?.toUpperCase();
    if (role === 'CUSTOMER' && sub.customerId !== user.id) {
      throw new ForbiddenException('You can only access your own subscriptions.');
    }
    return sub;
  }

  @Post('/api/workspaces/:workspaceId/brightloop/subscriptions')
  async createSubscription(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
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
    }
  ) {
    this.assertAdminOrStaff(user);
    return this.service.createSubscription({ ...body, workspaceId });
  }

  @Post('/api/workspaces/:workspaceId/brightloop/subscriptions/:id/pause')
  async pauseSubscription(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.pauseSubscription(id);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/subscriptions/:id/resume')
  async resumeSubscription(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.resumeSubscription(id);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/subscriptions/:id/close')
  async closeSubscription(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.closeSubscription(id, reason);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/subscriptions/:id/renew')
  async renewSubscription(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body('extensionMonths') extensionMonths?: number
  ) {
    this.assertAdminOrStaff(user);
    return this.service.renewSubscription(id, extensionMonths);
  }

  // =========================================================================
  // 5. Automated Recurring Invoicing
  // =========================================================================

  @Get('/api/workspaces/:workspaceId/brightloop/invoices')
  async listInvoices(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    const role = (user as any)?.userRole?.toUpperCase();
    const customerFilter = role === 'CUSTOMER' ? user.id : undefined;
    return this.service.listInvoices(workspaceId, customerFilter);
  }

  @Get('/api/workspaces/:workspaceId/brightloop/invoices/:id')
  async getInvoice(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    const invoice = await this.service.getInvoice(id);
    const role = (user as any)?.userRole?.toUpperCase();
    if (role === 'CUSTOMER' && invoice.customerId !== user.id) {
      throw new ForbiddenException('You can only view your own invoices.');
    }
    return invoice;
  }

  @Post('/api/workspaces/:workspaceId/brightloop/invoices/generate-due')
  async generateDueInvoices(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.generateDueInvoices(workspaceId);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/invoices/:id/confirm')
  async confirmInvoice(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.confirmInvoice(id);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/invoices/:id/cancel')
  async cancelInvoice(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.cancelInvoice(id);
  }

  // =========================================================================
  // 6. Discount Management (Admin only)
  // =========================================================================

  @Get('/api/workspaces/:workspaceId/brightloop/discounts')
  async listDiscounts(@Param('workspaceId') workspaceId: string) {
    return this.service.listDiscounts(workspaceId);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/discounts')
  async createDiscount(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      code: string;
      description?: string;
      discountType: BrightloopDiscountType;
      value: number;
      minPurchase?: number;
      minQuantity?: number;
      startDate?: string;
      endDate?: string;
      maxUses?: number;
      appliesToAll?: boolean;
      productId?: string;
    }
  ) {
    this.assertAdmin(user);
    return this.service.createDiscount({
      ...body,
      workspaceId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Put('/api/workspaces/:workspaceId/brightloop/discounts/:id')
  async updateDiscount(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body()
    body: {
      description?: string;
      value?: number;
      minPurchase?: number;
      minQuantity?: number;
      startDate?: string;
      endDate?: string;
      maxUses?: number;
      isActive?: boolean;
    }
  ) {
    this.assertAdmin(user);
    return this.service.updateDiscount(id, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Delete('/api/workspaces/:workspaceId/brightloop/discounts/:id')
  async deleteDiscount(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string
  ) {
    this.assertAdmin(user);
    return this.service.deleteDiscount(id);
  }

  // =========================================================================
  // 7. Payment Management
  // =========================================================================

  @Get('/api/workspaces/:workspaceId/brightloop/payments')
  async listPayments(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.listPayments(workspaceId);
  }

  @Post('/api/workspaces/:workspaceId/brightloop/payments')
  async recordPayment(
    @CurrentUser() user: CurrentUser,
    @Body()
    body: {
      invoiceId: string;
      amount: number;
      paymentMethod: BrightloopPaymentMethod;
      paymentDate?: string;
      referenceNumber?: string;
      notes?: string;
    }
  ) {
    this.assertAdminOrStaff(user);
    return this.service.recordPayment({
      ...body,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      recordedById: user?.id,
    });
  }

  // =========================================================================
  // 8. Finance Dashboard & Reporting
  // =========================================================================

  @Get('/api/workspaces/:workspaceId/brightloop/dashboard')
  async getDashboard(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    this.assertAdminOrStaff(user);
    return this.service.getDashboardMetrics(workspaceId);
  }
}
