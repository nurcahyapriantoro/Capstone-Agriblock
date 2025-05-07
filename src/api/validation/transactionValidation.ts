import * as yup from 'yup';

// Transaction amount limits
const TRANSACTION_LIMITS = {
  // Minimum transaction amount in base currency
  minAmount: 1000, // 1,000 IDR
  
  // Maximum transaction amount in base currency
  maxAmount: 1000000000, // 1,000,000,000 IDR (1 billion)
  
  // Maximum daily transaction total for regular users
  dailyMaxRegular: 50000000, // 50,000,000 IDR
  
  // Maximum daily transaction total for premium users
  dailyMaxPremium: 200000000, // 200,000,000 IDR
};

// In-memory store for daily transaction totals
// In production, use a database
interface DailyTransactionStore {
  [userId: string]: {
    date: string;
    total: number;
  };
}

const dailyTransactions: DailyTransactionStore = {};

/**
 * Check if a transaction would exceed the daily limit
 * @param userId User ID
 * @param amount Transaction amount
 * @param isPremium Whether user has premium status
 * @returns Whether transaction exceeds daily limit
 */
export const exceedsDailyLimit = (
  userId: string,
  amount: number,
  isPremium: boolean = false
): boolean => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyMax = isPremium ? 
    TRANSACTION_LIMITS.dailyMaxPremium : 
    TRANSACTION_LIMITS.dailyMaxRegular;
  
  // Initialize or reset if new day
  if (!dailyTransactions[userId] || dailyTransactions[userId].date !== today) {
    dailyTransactions[userId] = {
      date: today,
      total: 0
    };
  }
  
  // Calculate new total
  const newTotal = dailyTransactions[userId].total + amount;
  
  // Check if exceeds limit
  return newTotal > dailyMax;
};

/**
 * Record a transaction amount for daily limits
 * @param userId User ID
 * @param amount Transaction amount
 */
export const recordTransaction = (userId: string, amount: number): void => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Initialize if doesn't exist or new day
  if (!dailyTransactions[userId] || dailyTransactions[userId].date !== today) {
    dailyTransactions[userId] = {
      date: today,
      total: 0
    };
  }
  
  // Add transaction to daily total
  dailyTransactions[userId].total += amount;
};

// Basic transaction schema validation
export const transactionAmountSchema = yup.object().shape({
  amount: yup.number()
    .required('Transaction amount is required')
    .min(
      TRANSACTION_LIMITS.minAmount, 
      `Transaction amount must be at least ${TRANSACTION_LIMITS.minAmount} IDR`
    )
    .max(
      TRANSACTION_LIMITS.maxAmount, 
      `Transaction amount cannot exceed ${TRANSACTION_LIMITS.maxAmount} IDR`
    )
});

// Product transaction schema
export const productTransactionSchema = yup.object().shape({
  productId: yup.string()
    .required('Product ID is required'),
  
  amount: yup.number()
    .required('Transaction amount is required')
    .min(
      TRANSACTION_LIMITS.minAmount, 
      `Transaction amount must be at least ${TRANSACTION_LIMITS.minAmount} IDR`
    )
    .max(
      TRANSACTION_LIMITS.maxAmount, 
      `Transaction amount cannot exceed ${TRANSACTION_LIMITS.maxAmount} IDR`
    ),
    
  quantity: yup.number()
    .required('Quantity is required')
    .min(1, 'Quantity must be at least 1')
    .integer('Quantity must be a whole number'),
    
  buyerId: yup.string()
    .required('Buyer ID is required'),
    
  sellerId: yup.string()
    .required('Seller ID is required'),
    
  paymentMethod: yup.string()
    .required('Payment method is required')
    .oneOf(
      ['BANK_TRANSFER', 'BLOCKCHAIN_WALLET', 'CASH', 'ESCROW'], 
      'Invalid payment method'
    )
});

// Fund transfer schema
export const fundTransferSchema = yup.object().shape({
  fromUserId: yup.string()
    .required('Sender ID is required'),
    
  toUserId: yup.string()
    .required('Receiver ID is required'),
    
  amount: yup.number()
    .required('Transfer amount is required')
    .min(
      TRANSACTION_LIMITS.minAmount, 
      `Transfer amount must be at least ${TRANSACTION_LIMITS.minAmount} IDR`
    )
    .max(
      TRANSACTION_LIMITS.maxAmount, 
      `Transfer amount cannot exceed ${TRANSACTION_LIMITS.maxAmount} IDR`
    ),
    
  purpose: yup.string()
    .required('Transfer purpose is required')
    .oneOf(
      ['PAYMENT', 'REFUND', 'INVESTMENT', 'GIFT', 'OTHER'], 
      'Invalid transfer purpose'
    ),
    
  notes: yup.string()
    .max(500, 'Notes cannot exceed 500 characters')
}); 