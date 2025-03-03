import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { StockMovementListOptions } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { Connection } from 'typeorm';

import { RequestContext } from '../../api/common/request-context';
import { InternalServerError } from '../../common/error/errors';
import { ShippingCalculator } from '../../config/shipping-method/shipping-calculator';
import { ShippingEligibilityChecker } from '../../config/shipping-method/shipping-eligibility-checker';
import { Order } from '../../entity/order/order.entity';
import { ProductVariant } from '../../entity/product-variant/product-variant.entity';
import { ShippingMethod } from '../../entity/shipping-method/shipping-method.entity';
import { Sale } from '../../entity/stock-movement/sale.entity';
import { StockAdjustment } from '../../entity/stock-movement/stock-adjustment.entity';
import { StockMovement } from '../../entity/stock-movement/stock-movement.entity';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';

@Injectable()
export class StockMovementService {
    shippingEligibilityCheckers: ShippingEligibilityChecker[];
    shippingCalculators: ShippingCalculator[];
    private activeShippingMethods: ShippingMethod[];

    constructor(
        @InjectConnection() private connection: Connection,
        private listQueryBuilder: ListQueryBuilder,
    ) {}

    getStockMovementsByProductVariantId(
        ctx: RequestContext,
        productVariantId: ID,
        options: StockMovementListOptions,
    ): Promise<PaginatedList<StockMovement>> {
        return this.listQueryBuilder
            .build<StockMovement>(StockMovement as any, options)
            .leftJoin('stockmovement.productVariant', 'productVariant')
            .andWhere('productVariant.id = :productVariantId', { productVariantId })
            .getManyAndCount()
            .then(async ([items, totalItems]) => {
                return {
                    items,
                    totalItems,
                };
            });
    }

    async adjustProductVariantStock(productVariantId: ID, oldStockLevel: number, newStockLevel: number): Promise<StockAdjustment | undefined> {
        if (oldStockLevel === newStockLevel) {
            return;
        }
        const delta = newStockLevel - oldStockLevel;

        const adjustment = new StockAdjustment({
            quantity: delta,
            productVariant: { id: productVariantId },
        });
        return this.connection.getRepository(StockAdjustment).save(adjustment);
    }

    async createSalesForOrder(order: Order): Promise<Sale[]> {
        if (order.active !== false) {
            throw new InternalServerError('error.cannot-create-sales-for-active-order');
        }
        const sales: Sale[] = [];
        for (const line of order.lines) {
            const { productVariant } = line;
            const sale = new Sale({
                productVariant,
                quantity: line.quantity * -1,
                orderLine: line,
            });
            sales.push(sale);

            if (productVariant.trackInventory === true) {
                productVariant.stockOnHand -= line.quantity;
                await this.connection.getRepository(ProductVariant).save(productVariant);
            }
        }
        return this.connection.getRepository(Sale).save(sales);
    }
}
