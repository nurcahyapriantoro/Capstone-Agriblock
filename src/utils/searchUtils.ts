/**
 * Search and Filter Utilities
 * Provides helper functions for implementing search and filtering in API endpoints
 */

/**
 * Search parameters interface for products
 */
export interface ProductSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  harvestDateFrom?: string | Date;
  harvestDateTo?: string | Date;
  certifications?: string[];
  status?: string;
  ownerId?: string;
}

/**
 * Extract search parameters from query parameters
 * @param query Query parameters from request
 * @returns Standardized search parameters
 */
export const extractProductSearchParams = (query: any): ProductSearchParams => {
  return {
    query: query.query,
    category: query.category,
    minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
    location: query.location,
    harvestDateFrom: query.harvestDateFrom ? new Date(query.harvestDateFrom) : undefined,
    harvestDateTo: query.harvestDateTo ? new Date(query.harvestDateTo) : undefined,
    certifications: query.certifications ? 
      (Array.isArray(query.certifications) ? query.certifications : [query.certifications]) : 
      undefined,
    status: query.status,
    ownerId: query.ownerId
  };
};

/**
 * Function to filter products by search parameters
 * @param products Array of products to filter
 * @param searchParams Search parameters to apply
 * @returns Filtered products
 */
export const filterProducts = <T extends Record<string, any>>(
  products: T[], 
  searchParams: ProductSearchParams
): T[] => {
  return products.filter(product => {
    // Full text search on name and description
    if (searchParams.query) {
      const query = searchParams.query.toLowerCase();
      const nameMatch = product.name?.toLowerCase().includes(query);
      const descMatch = product.description?.toLowerCase().includes(query);
      if (!nameMatch && !descMatch) return false;
    }
    
    // Category filter
    if (searchParams.category && product.category !== searchParams.category) {
      return false;
    }
    
    // Price range filter
    if (searchParams.minPrice !== undefined && (product.price < searchParams.minPrice)) {
      return false;
    }
    if (searchParams.maxPrice !== undefined && (product.price > searchParams.maxPrice)) {
      return false;
    }
    
    // Location filter
    if (searchParams.location) {
      const productLocation = product.metadata?.location || product.location;
      if (!productLocation || !productLocation.toLowerCase().includes(searchParams.location.toLowerCase())) {
        return false;
      }
    }
    
    // Harvest date range filter
    if (searchParams.harvestDateFrom || searchParams.harvestDateTo) {
      const harvestDate = product.metadata?.harvestDate || product.harvestDate;
      if (!harvestDate) return false;
      
      const productHarvestDate = new Date(harvestDate);
      
      if (searchParams.harvestDateFrom && productHarvestDate < searchParams.harvestDateFrom) {
        return false;
      }
      
      if (searchParams.harvestDateTo && productHarvestDate > searchParams.harvestDateTo) {
        return false;
      }
    }
    
    // Certifications filter
    if (searchParams.certifications && searchParams.certifications.length > 0) {
      const productCertifications = product.metadata?.certifications || product.certifications || [];
      // Check if the product has at least one of the requested certifications
      if (!searchParams.certifications.some(cert => productCertifications.includes(cert))) {
        return false;
      }
    }
    
    // Status filter
    if (searchParams.status && product.status !== searchParams.status) {
      return false;
    }
    
    // Owner ID filter
    if (searchParams.ownerId && product.ownerId !== searchParams.ownerId) {
      return false;
    }
    
    return true;
  });
}; 