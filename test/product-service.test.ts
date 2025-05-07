import { UserRole, ProductStatus } from '../src/enum';
import RoleService from '../src/core/RoleService';
import ProductService from '../src/core/ProductService';
import { TransactionHistoryService } from '../src/core/TransactionHistory';
import { txhashDB } from '../src/helper/level.db.client';

// Mock database client
jest.mock('../src/helper/level.db.client', () => {
  const mockData = new Map();
  
  const mockDb = {
    get: jest.fn((key) => {
      if (mockData.has(key)) {
        return Promise.resolve(mockData.get(key));
      }
      return Promise.reject(new Error('Not found'));
    }),
    put: jest.fn((key, value) => {
      mockData.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key) => {
      mockData.delete(key);
      return Promise.resolve();
    }),
    keys: jest.fn(() => ({
      all: () => Promise.resolve(Array.from(mockData.keys()))
    }))
  };
  
  return {
    txhashDB: mockDb,
    blockDB: mockDb
  };
});

describe('ProductService', () => {
  // Persiapan data pengujian
  const mockFarmerId = 'farmer-123';
  const mockCollectorId = 'collector-456';
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock RoleService
    jest.spyOn(RoleService, 'getUserRole').mockImplementation(async (userId) => {
      if (userId === mockFarmerId) return UserRole.FARMER;
      if (userId === mockCollectorId) return UserRole.COLLECTOR;
      return null;
    });
    
    // Mock TransactionHistoryService
    jest.spyOn(TransactionHistoryService, 'recordProductCreation').mockResolvedValue({
      success: true,
      transactionId: 'mock-txn-123'
    });
  });

  describe('createProduct', () => {
    test('petani berhasil membuat produk baru', async () => {
      // Persiapkan data produk
      const productData = {
        name: 'Beras Organik',
        description: 'Beras organik kualitas premium',
        quantity: 100,
        price: 15000,
        metadata: {
          origin: 'Cianjur',
          harvestDate: '2023-06-01',
          certification: 'Organik'
        },
        status: ProductStatus.ACTIVE
      };
      
      // Jalankan fungsi yang diuji
      const result = await ProductService.createProduct(
        mockFarmerId,
        productData,
        { initialQuantity: 100 }
      );
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.productId).toBeDefined();
      expect(result.message).toBe('Product created successfully.');
      expect(result.transactionId).toBe('mock-txn-123');
      
      // Verifikasi panggilan fungsi
      expect(txhashDB.put).toHaveBeenCalledWith(
        expect.stringMatching(/^product:prod-/),
        expect.any(String)
      );
      
      expect(TransactionHistoryService.recordProductCreation).toHaveBeenCalledWith(
        expect.any(String),
        mockFarmerId,
        expect.objectContaining({
          name: 'Beras Organik',
          description: 'Beras organik kualitas premium',
          quantity: 100
        })
      );
      
      // Verify product data was stored correctly
      const putCall = (txhashDB.put as jest.Mock).mock.calls[0];
      const productKey = putCall[0];
      const savedProductJSON = putCall[1];
      const savedProduct = JSON.parse(savedProductJSON);
      
      expect(savedProduct.name).toBe('Beras Organik');
      expect(savedProduct.ownerId).toBe(mockFarmerId);
      expect(savedProduct.quantity).toBe(100);
      expect(savedProduct.status).toBe(ProductStatus.ACTIVE);
      expect(savedProduct.metadata).toEqual({
        origin: 'Cianjur',
        harvestDate: '2023-06-01',
        certification: 'Organik'
      });
    });
    
    test('non-petani tidak bisa membuat produk', async () => {
      // Persiapkan data produk
      const productData = {
        name: 'Beras Organik',
        description: 'Beras organik kualitas premium',
        quantity: 100,
        price: 15000,
        status: ProductStatus.ACTIVE
      };
      
      // Jalankan fungsi yang diuji dengan ID collector
      const result = await ProductService.createProduct(
        mockCollectorId,
        productData
      );
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.message).toBe('Only farmers can create new products.');
      
      // Verifikasi database tidak diakses
      expect(txhashDB.put).not.toHaveBeenCalled();
      expect(TransactionHistoryService.recordProductCreation).not.toHaveBeenCalled();
    });
    
    test('createProduct dengan quantity default', async () => {
      // Persiapkan data produk tanpa quantity
      const productData = {
        name: 'Beras Organik',
        description: 'Beras organik kualitas premium',
        price: 15000,
        status: ProductStatus.ACTIVE
      };
      
      // Jalankan fungsi yang diuji
      const result = await ProductService.createProduct(
        mockFarmerId,
        productData
      );
      
      // Assertions
      expect(result.success).toBe(true);
      
      // Verify product data was stored with default quantity
      const putCall = (txhashDB.put as jest.Mock).mock.calls[0];
      const savedProductJSON = putCall[1];
      const savedProduct = JSON.parse(savedProductJSON);
      
      expect(savedProduct.quantity).toBe(0); // Default quantity
    });
    
    test('createProduct dengan initialQuantity dari details', async () => {
      // Persiapkan data produk tanpa quantity
      const productData = {
        name: 'Beras Organik',
        description: 'Beras organik kualitas premium',
        price: 15000,
        status: ProductStatus.ACTIVE
      };
      
      // Jalankan fungsi yang diuji dengan initial quantity di details
      const result = await ProductService.createProduct(
        mockFarmerId,
        productData,
        { initialQuantity: 50 }
      );
      
      // Assertions
      expect(result.success).toBe(true);
      
      // Verify product data was stored with initial quantity from details
      const putCall = (txhashDB.put as jest.Mock).mock.calls[0];
      const savedProductJSON = putCall[1];
      const savedProduct = JSON.parse(savedProductJSON);
      
      expect(savedProduct.quantity).toBe(50);
    });
    
    test('error saat membuat produk', async () => {
      // Persiapkan mock untuk menghasilkan error
      jest.spyOn(txhashDB, 'put').mockRejectedValueOnce(new Error('Database error'));
      
      // Persiapkan data produk
      const productData = {
        name: 'Beras Organik',
        quantity: 100,
        price: 15000,
        status: ProductStatus.ACTIVE
      };
      
      // Jalankan fungsi yang diuji
      const result = await ProductService.createProduct(
        mockFarmerId,
        productData
      );
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create product due to an error.');
    });
  });
}); 