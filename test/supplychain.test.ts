import { UserRole, ProductStatus, TransactionActionType } from '../src/enum';
import RoleService from '../src/core/RoleService';
import ProductService from '../src/core/ProductService';
import { TransactionHistoryService } from '../src/core/TransactionHistory';
import StockManagement from '../src/core/StockManagement';

// Mock database client
jest.mock('../src/helper/level.db.client', () => {
  const mockDb = {
    get: jest.fn(),
    put: jest.fn(),
    del: jest.fn()
  };
  return {
    txhashDB: mockDb,
    blockDB: mockDb
  };
});

describe('Supply Chain Flow', () => {
  // Setup mock users
  const mockUsers = {
    farmer: { id: 'farmer-123', role: UserRole.FARMER },
    collector: { id: 'collector-123', role: UserRole.COLLECTOR },
    trader: { id: 'trader-123', role: UserRole.TRADER },
    retailer: { id: 'retailer-123', role: UserRole.RETAILER },
    consumer: { id: 'consumer-123', role: UserRole.CONSUMER }
  };

  // Mock product data
  const mockProduct = {
    id: 'product-123',
    name: 'Organic Rice',
    ownerId: mockUsers.farmer.id,
    category: 'Grain',
    initialQuantity: 100,
    price: 15000,
    createdAt: Date.now()
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock RoleService
    jest.spyOn(RoleService, 'getUserRole').mockImplementation(async (userId) => {
      if (userId === mockUsers.farmer.id) return UserRole.FARMER;
      if (userId === mockUsers.collector.id) return UserRole.COLLECTOR;
      if (userId === mockUsers.trader.id) return UserRole.TRADER;
      if (userId === mockUsers.retailer.id) return UserRole.RETAILER;
      if (userId === mockUsers.consumer.id) return UserRole.CONSUMER;
      return null;
    });
    
    // Mock ProductService
    jest.spyOn(ProductService, 'getProduct').mockResolvedValue(mockProduct);
    
    // Mock TransactionHistoryService
    jest.spyOn(TransactionHistoryService, 'recordProductCreation').mockResolvedValue({
      success: true,
      transactionId: 'tx-create-123'
    });
    
    jest.spyOn(TransactionHistoryService, 'recordProductTransfer').mockResolvedValue({
      success: true,
      transactionId: 'tx-transfer-123'
    });
    
    jest.spyOn(TransactionHistoryService, 'recordStockChange').mockResolvedValue({
      success: true,
      transactionId: 'tx-stock-123'
    });
    
    jest.spyOn(TransactionHistoryService, 'getCurrentStockLevel').mockResolvedValue(100);
    
    jest.spyOn(TransactionHistoryService, 'getProductTransactionHistory').mockResolvedValue([]);
  });

  test('Create product as a farmer', async () => {
    // Create product
    const createResult = await ProductService.createProduct({
      name: 'Organic Rice',
      ownerId: mockUsers.farmer.id,
      category: 'Grain',
      initialQuantity: 100,
      price: 15000
    });
    
    expect(createResult.success).toBe(true);
    expect(TransactionHistoryService.recordProductCreation).toHaveBeenCalledWith(
      expect.any(String),
      mockUsers.farmer.id,
      expect.any(Object)
    );
  });

  test('Transfer product from farmer to collector', async () => {
    // Setup stock management
    const farmerStock = new StockManagement(mockProduct.id, mockUsers.farmer.id);
    await farmerStock.initialize();
    
    // Transfer stock
    const transferResult = await StockManagement.transferStock(
      mockProduct.id,
      mockUsers.farmer.id,
      UserRole.FARMER,
      mockUsers.collector.id,
      UserRole.COLLECTOR,
      80,
      { reason: 'Product sale' }
    );
    
    expect(transferResult.success).toBe(true);
    expect(TransactionHistoryService.recordProductTransfer).toHaveBeenCalledWith(
      mockProduct.id,
      mockUsers.farmer.id,
      UserRole.FARMER,
      mockUsers.collector.id,
      UserRole.COLLECTOR,
      expect.anything()
    );
  });

  test('Transfer product along the supply chain', async () => {
    // Mock product ownership updates
    const updatedProductCollector = { ...mockProduct, ownerId: mockUsers.collector.id };
    const updatedProductTrader = { ...mockProduct, ownerId: mockUsers.trader.id };
    const updatedProductRetailer = { ...mockProduct, ownerId: mockUsers.retailer.id };
    
    // First get the product as collector
    jest.spyOn(ProductService, 'getProduct')
      .mockResolvedValueOnce(updatedProductCollector)
      .mockResolvedValueOnce(updatedProductTrader)
      .mockResolvedValueOnce(updatedProductRetailer);
    
    // Transfer from collector to trader
    const collectorStock = new StockManagement(mockProduct.id, mockUsers.collector.id);
    await collectorStock.initialize();
    
    const transfer1 = await StockManagement.transferStock(
      mockProduct.id,
      mockUsers.collector.id,
      UserRole.COLLECTOR,
      mockUsers.trader.id,
      UserRole.TRADER,
      60,
      { reason: 'Wholesale' }
    );
    
    expect(transfer1.success).toBe(true);
    
    // Transfer from trader to retailer
    const traderStock = new StockManagement(mockProduct.id, mockUsers.trader.id);
    await traderStock.initialize();
    
    const transfer2 = await StockManagement.transferStock(
      mockProduct.id,
      mockUsers.trader.id,
      UserRole.TRADER,
      mockUsers.retailer.id,
      UserRole.RETAILER,
      40,
      { reason: 'Retail distribution' }
    );
    
    expect(transfer2.success).toBe(true);
    
    // Check that transaction history was called correctly each time
    expect(TransactionHistoryService.recordProductTransfer).toHaveBeenCalledTimes(2);
  });

  test('Consumer purchases product from retailer', async () => {
    // Mock product with retailer ownership
    jest.spyOn(ProductService, 'getProduct').mockResolvedValue({
      ...mockProduct,
      ownerId: mockUsers.retailer.id
    });
    
    // Setup retailer stock
    const retailerStock = new StockManagement(mockProduct.id, mockUsers.retailer.id);
    await retailerStock.initialize();
    
    // Record a purchase transaction
    const purchaseResult = await TransactionHistoryService.recordProductTransfer(
      mockProduct.id,
      mockUsers.retailer.id,
      UserRole.RETAILER,
      mockUsers.consumer.id,
      UserRole.CONSUMER,
      { 
        quantity: 5,
        price: mockProduct.price,
        transactionType: TransactionActionType.SELL,
        productStatus: ProductStatus.SOLD
      }
    );
    
    expect(purchaseResult.success).toBe(true);
    expect(purchaseResult.transactionId).toBeTruthy();
  });

  test('Verify complete supply chain history', async () => {
    // Mock chain of transaction history
    const mockHistory = [
      { 
        productId: mockProduct.id,
        fromUserId: mockUsers.farmer.id,
        fromRole: UserRole.FARMER,
        toUserId: mockUsers.farmer.id,
        toRole: UserRole.FARMER,
        actionType: TransactionActionType.CREATE,
        productStatus: ProductStatus.CREATED,
        timestamp: Date.now() - 500000 
      },
      { 
        productId: mockProduct.id,
        fromUserId: mockUsers.farmer.id,
        fromRole: UserRole.FARMER,
        toUserId: mockUsers.collector.id,
        toRole: UserRole.COLLECTOR,
        actionType: TransactionActionType.TRANSFER,
        productStatus: ProductStatus.TRANSFERRED,
        timestamp: Date.now() - 400000 
      },
      { 
        productId: mockProduct.id,
        fromUserId: mockUsers.collector.id,
        fromRole: UserRole.COLLECTOR,
        toUserId: mockUsers.trader.id,
        toRole: UserRole.TRADER,
        actionType: TransactionActionType.TRANSFER,
        productStatus: ProductStatus.TRANSFERRED,
        timestamp: Date.now() - 300000 
      },
      { 
        productId: mockProduct.id,
        fromUserId: mockUsers.trader.id,
        fromRole: UserRole.TRADER,
        toUserId: mockUsers.retailer.id,
        toRole: UserRole.RETAILER,
        actionType: TransactionActionType.TRANSFER,
        productStatus: ProductStatus.TRANSFERRED,
        timestamp: Date.now() - 200000 
      },
      { 
        productId: mockProduct.id,
        fromUserId: mockUsers.retailer.id,
        fromRole: UserRole.RETAILER,
        toUserId: mockUsers.consumer.id,
        toRole: UserRole.CONSUMER,
        actionType: TransactionActionType.SELL,
        productStatus: ProductStatus.SOLD,
        timestamp: Date.now() - 100000
      }
    ];
    
    jest.spyOn(TransactionHistoryService, 'getProductTransactionHistory')
      .mockResolvedValue(mockHistory);
    
    // Get product history
    const history = await TransactionHistoryService.getProductTransactionHistory(mockProduct.id);
    
    // Verify complete chain
    expect(history.length).toBe(5);
    
    // Check the chain is in correct order
    expect(history[0].actionType).toBe(TransactionActionType.CREATE);
    expect(history[0].fromRole).toBe(UserRole.FARMER);
    
    expect(history[4].actionType).toBe(TransactionActionType.SELL);
    expect(history[4].toRole).toBe(UserRole.CONSUMER);
    
    // Verify supply chain integrity
    const roles = history.map(tx => tx.fromRole);
    expect(roles).toEqual([
      UserRole.FARMER,
      UserRole.FARMER,
      UserRole.COLLECTOR,
      UserRole.TRADER,
      UserRole.RETAILER
    ]);
  });
}); 