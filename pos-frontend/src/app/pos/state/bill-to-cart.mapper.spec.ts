import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { BillToCartMapper } from './bill-to-cart.mapper';
import { BillApi, BillDto } from '../../core/bill.api';
import { ProductApi, Product } from '../../core/product.api';
import { CartService, CartItem } from '../cart/cart.service';

describe('BillToCartMapper', () => {
  it('hydrates cart by fetching products for bill items and replacing cart', async () => {
    const bill: BillDto = {
      id: 'bill-1',
      billNumber: 'B-001',
      storeId: 'store',
      userId: 'user',
      totalAmount: 100,
      taxAmount: 0,
      finalAmount: 100,
      createdAt: new Date().toISOString(),
      status: 'Pending',
      items: [
        {
          id: 'i1',
          productId: 'p1',
          productName: 'P1',
          quantity: 2,
          mrp: 60,
          unitPrice: 50,
          taxPercentage: 0,
          totalPrice: 100,
        },
      ],
    };

    const product: Product = {
      id: 'p1',
      name: 'P1',
      sku: 'SKU1',
      barcode: 'BC1',
      categoryId: 'c',
      taxId: 't',
      stock: 10,
      mrp: 60,
      sellingPrice: 50,
      isActive: true,
      storeId: 'store',
    };

    const billApiMock = {
      getById: () => of(bill),
    } as unknown as BillApi;

    const productApiMock = {
      getById: () => of(product),
    } as unknown as ProductApi;

    let replaced: CartItem[] | null = null;
    const cartMock = {
      clear: () => void 0,
      replace: (items: CartItem[]) => {
        replaced = items;
      },
    } as unknown as CartService;

    TestBed.configureTestingModule({
      providers: [
        BillToCartMapper,
        { provide: BillApi, useValue: billApiMock },
        { provide: ProductApi, useValue: productApiMock },
        { provide: CartService, useValue: cartMock },
      ],
    });

    const mapper = TestBed.inject(BillToCartMapper);
    await new Promise<void>((resolve, reject) => {
      mapper.hydrateCartFromBill('bill-1').subscribe({
        next: () => {
          expect(replaced).toEqual([{ product, quantity: 2 }]);
          resolve();
        },
        error: (e) => reject(e),
      });
    });
  });

  it('swallows failures and does not throw', async () => {
    const billApiMock = {
      getById: () => throwError(() => new Error('fail')),
    } as unknown as BillApi;

    const productApiMock = {
      getById: () => throwError(() => new Error('fail')),
    } as unknown as ProductApi;

    const cartMock = {
      clear: () => void 0,
      replace: () => void 0,
    } as unknown as CartService;

    TestBed.configureTestingModule({
      providers: [
        BillToCartMapper,
        { provide: BillApi, useValue: billApiMock },
        { provide: ProductApi, useValue: productApiMock },
        { provide: CartService, useValue: cartMock },
      ],
    });

    const mapper = TestBed.inject(BillToCartMapper);
    await new Promise<void>((resolve, reject) => {
      mapper.hydrateCartFromBill('bill-1').subscribe({
        next: () => resolve(),
        error: (e) => reject(e),
      });
    });
  });
});
