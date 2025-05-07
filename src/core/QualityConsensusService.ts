import { txhashDB } from "../helper/level.db.client";
import { ProductStatus, UserRole } from "../enum";
import { ContractRegistry } from "../contracts/ContractRegistry";
import { logger } from "../utils/logger";
import { NotificationService, NotificationType } from "../services/NotificationService";

/**
 * Interface untuk vote kualitas
 */
interface QualityVote {
  userId: string;
  userRole: UserRole;
  score: number;  // Score 0-100
  comment?: string;
  timestamp: number;
}

/**
 * Interface untuk konsensus kualitas produk
 */
interface QualityConsensus {
  productId: string;
  votes: QualityVote[];
  requiredRoles: UserRole[];
  threshold: number; // Threshold minimal rata-rata skor kualitas (0-100)
  requiredVotes: number; // Jumlah minimal votes yang diperlukan
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  finalScore?: number;
  result?: string;
}

/**
 * Service untuk mengelola konsensus kualitas produk
 */
class QualityConsensusService {
  private static instance: QualityConsensusService;
  private readonly contractId = 'product-management-v1';

  private constructor() {}

  /**
   * Mendapatkan instance (singleton)
   */
  public static getInstance(): QualityConsensusService {
    if (!QualityConsensusService.instance) {
      QualityConsensusService.instance = new QualityConsensusService();
    }
    return QualityConsensusService.instance;
  }

  /**
   * Membuat permintaan konsensus kualitas baru
   * @param productId ID produk yang akan diverifikasi
   * @param creatorId ID pengguna yang memulai konsensus
   * @param requiredRoles Peran-peran yang diperlukan untuk voting (default: semua peran dalam rantai pasok)
   * @param threshold Ambang batas skor untuk persetujuan (default: 70)
   * @param requiredVotes Jumlah minimal voting yang diperlukan (default: jumlah requiredRoles)
   */
  public async createConsensus(
    productId: string,
    creatorId: string,
    requiredRoles: UserRole[] = [
      UserRole.FARMER,
      UserRole.COLLECTOR,
      UserRole.TRADER,
      UserRole.RETAILER
    ],
    threshold: number = 70,
    requiredVotes: number = requiredRoles.length
  ): Promise<{ success: boolean; consensusId?: string; message?: string }> {
    try {
      logger.info(`Creating quality consensus for product ${productId} by ${creatorId}`);

      // Verifikasi produk ada
      const registry = ContractRegistry.getInstance();
      const productResult = await registry.queryContract(
        this.contractId,
        'getProduct',
        { productId }
      );

      if (!productResult.success || !productResult.product) {
        return {
          success: false,
          message: `Product not found: ${productId}`
        };
      }

      // Buat ID unik untuk konsensus ini
      const consensusId = `qc-${productId}-${Date.now()}`;

      // Buat objek konsensus
      const consensus: QualityConsensus = {
        productId,
        votes: [],
        requiredRoles,
        threshold,
        requiredVotes,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Simpan konsensus ke database
      await txhashDB.put(`consensus:${consensusId}`, JSON.stringify(consensus));
      
      // Simpan referensi konsensus untuk produk
      await txhashDB.put(`product:${productId}:consensus:${consensusId}`, consensusId);

      // Kirim notifikasi ke semua aktor yang diperlukan untuk vote
      await this.notifyActors(productId, consensusId, requiredRoles);

      logger.info(`Quality consensus created: ${consensusId} for product ${productId}`);

      return {
        success: true,
        consensusId,
        message: "Quality consensus process started successfully"
      };
    } catch (error) {
      logger.error(`Error creating quality consensus for product ${productId}:`, error);
      return {
        success: false,
        message: `Failed to create quality consensus: ${(error as Error).message}`
      };
    }
  }

  /**
   * Submit vote untuk kualitas produk
   * @param consensusId ID dari konsensus
   * @param userId ID pengguna yang melakukan voting
   * @param userRole Peran pengguna
   * @param score Skor kualitas (0-100)
   * @param comment Komentar opsional
   */
  public async submitVote(
    consensusId: string,
    userId: string,
    userRole: UserRole,
    score: number,
    comment?: string
  ): Promise<{ success: boolean; message?: string; isComplete?: boolean; result?: string }> {
    try {
      logger.info(`Submitting quality vote for consensus ${consensusId} by ${userId}`);

      // Validasi score
      if (score < 0 || score > 100) {
        return {
          success: false,
          message: "Score must be between 0 and 100"
        };
      }

      // Dapatkan konsensus
      const consensusJson = await txhashDB.get(`consensus:${consensusId}`);
      const consensus: QualityConsensus = JSON.parse(consensusJson);

      // Validasi status konsensus
      if (consensus.status !== 'pending') {
        return {
          success: false,
          message: `Consensus is already ${consensus.status}`
        };
      }

      // Periksa apakah peran pengguna diperlukan
      if (!consensus.requiredRoles.includes(userRole)) {
        return {
          success: false,
          message: `User role ${userRole} is not required for this consensus`
        };
      }

      // Periksa apakah pengguna sudah vote
      const existingVoteIndex = consensus.votes.findIndex(v => v.userId === userId);
      
      // Buat vote baru
      const vote: QualityVote = {
        userId,
        userRole,
        score,
        comment,
        timestamp: Date.now()
      };

      // Update atau tambahkan vote
      if (existingVoteIndex >= 0) {
        consensus.votes[existingVoteIndex] = vote;
      } else {
        consensus.votes.push(vote);
      }

      // Update lastUpdated
      consensus.updatedAt = Date.now();

      // Cek apakah sudah cukup votes untuk menyelesaikan konsensus
      let isComplete = false;
      let result = "";

      if (consensus.votes.length >= consensus.requiredVotes) {
        isComplete = true;
        
        // Hitung rata-rata skor
        const totalScore = consensus.votes.reduce((sum, vote) => sum + vote.score, 0);
        const averageScore = totalScore / consensus.votes.length;
        
        // Tentukan hasil
        if (averageScore >= consensus.threshold) {
          consensus.status = 'approved';
          result = "approved";
        } else {
          consensus.status = 'rejected';
          result = "rejected";
        }
        
        consensus.completedAt = Date.now();
        consensus.finalScore = averageScore;
        consensus.result = result;
        
        // Update status produk jika konsensus disetujui
        if (consensus.status === 'approved') {
          await this.updateProductStatus(consensus.productId, ProductStatus.VERIFIED, averageScore);
        }
      }

      // Simpan konsensus yang diperbarui
      await txhashDB.put(`consensus:${consensusId}`, JSON.stringify(consensus));

      logger.info(`Vote submitted for consensus ${consensusId} by ${userId}, score: ${score}`);

      return {
        success: true,
        message: "Vote submitted successfully",
        isComplete,
        result
      };
    } catch (error) {
      logger.error(`Error submitting vote for consensus ${consensusId}:`, error);
      return {
        success: false,
        message: `Failed to submit vote: ${(error as Error).message}`
      };
    }
  }

  /**
   * Dapatkan status konsensus kualitas
   * @param consensusId ID konsensus
   */
  public async getConsensusStatus(
    consensusId: string
  ): Promise<{ success: boolean; consensus?: QualityConsensus; message?: string }> {
    try {
      const consensusJson = await txhashDB.get(`consensus:${consensusId}`);
      const consensus: QualityConsensus = JSON.parse(consensusJson);

      return {
        success: true,
        consensus
      };
    } catch (error) {
      logger.error(`Error getting consensus ${consensusId}:`, error);
      return {
        success: false,
        message: `Consensus not found or error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Dapatkan semua konsensus untuk produk
   * @param productId ID produk
   */
  public async getConsensusForProduct(
    productId: string
  ): Promise<{ success: boolean; consensusIds?: string[]; message?: string }> {
    try {
      const consensusIds: string[] = [];
      
      // Gunakan iterator untuk menemukan semua konsensus untuk produk ini
      const iterator = txhashDB.iterator({
        gt: `product:${productId}:consensus:`,
        lt: `product:${productId}:consensus:\xff`
      });
      
      for await (const [key, value] of iterator) {
        consensusIds.push(value.toString());
      }

      return {
        success: true,
        consensusIds
      };
    } catch (error) {
      logger.error(`Error getting consensus for product ${productId}:`, error);
      return {
        success: false,
        message: `Failed to get consensus: ${(error as Error).message}`
      };
    }
  }

  /**
   * Notifikasi semua aktor yang diperlukan untuk melakukan voting
   * @param productId ID produk
   * @param consensusId ID konsensus
   * @param requiredRoles Peran-peran yang diperlukan
   */
  private async notifyActors(
    productId: string,
    consensusId: string,
    requiredRoles: UserRole[]
  ): Promise<void> {
    try {
      // Di implementasi nyata, Anda akan mengambil ID pengguna berdasarkan perannya dari database
      // Untuk saat ini, hanya simulasikan notifikasi

      for (const role of requiredRoles) {
        // Kirim notifikasi ke semua pengguna dengan peran yang diperlukan
        await NotificationService.sendNotification(
          `role:${role}`, // Dalam implementasi nyata, ganti dengan ID pengguna sebenarnya
          'Quality Verification Request',
          `Your vote is needed for product quality verification. Product ID: ${productId}`,
          NotificationType.QUALITY_VERIFICATION_REQUEST,
          { productId, consensusId }
        );
      }
    } catch (error) {
      logger.error(`Error notifying actors for consensus ${consensusId}:`, error);
    }
  }

  /**
   * Update status produk setelah konsensus
   * @param productId ID produk
   * @param status Status baru
   * @param qualityScore Skor kualitas
   */
  private async updateProductStatus(
    productId: string,
    status: ProductStatus,
    qualityScore: number
  ): Promise<void> {
    try {
      const registry = ContractRegistry.getInstance();
      
      // Panggil smart contract untuk memperbarui status produk
      const result = await registry.executeContract(
        this.contractId,
        'updateProductStatus',
        {
          productId,
          newStatus: status,
          details: {
            consensusQualityScore: qualityScore,
            verificationMethod: 'consensus',
            verifiedAt: Date.now()
          }
        },
        'system' // Gunakan 'system' sebagai pengirim karena ini adalah hasil konsensus
      );

      if (!result.success) {
        logger.error(`Failed to update product status after consensus: ${result.message}`);
      } else {
        logger.info(`Product ${productId} status updated to ${status} with quality score ${qualityScore}`);
      }
    } catch (error) {
      logger.error(`Error updating product status after consensus:`, error);
    }
  }
}

export default QualityConsensusService;