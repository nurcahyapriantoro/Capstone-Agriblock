/**
 * Interface untuk parameter paginasi standar
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * Interface untuk hasil paginasi
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse parameter paginasi dari query string
 * @param query Query object dari express request
 * @returns Parameter paginasi dengan nilai default jika tidak diberikan
 */
export const parsePaginationParams = (query: any): PaginationParams => {
  return {
    page: query.page ? parseInt(query.page as string, 10) : 1,
    limit: query.limit ? parseInt(query.limit as string, 10) : 10,
    sortBy: query.sortBy as string || 'timestamp',
    sortDir: (query.sortDir as 'asc' | 'desc') || 'desc'
  };
};

/**
 * Paginate array of items
 * @param items Array of items to paginate
 * @param params Pagination parameters
 * @returns Paginated result object
 */
export const paginate = <T>(items: T[], params: PaginationParams): PaginatedResult<T> => {
  const { page = 1, limit = 10, sortBy, sortDir } = params;
  
  // Validasi input
  const validPage = page > 0 ? page : 1;
  const validLimit = limit > 0 && limit <= 100 ? limit : 10;
  
  // Total items
  const totalItems = items.length;
  
  // Total pages
  const totalPages = Math.ceil(totalItems / validLimit);
  
  // Calculate start and end index
  const startIndex = (validPage - 1) * validLimit;
  const endIndex = Math.min(startIndex + validLimit, totalItems);
  
  // Sort if required
  let sortedItems = [...items];
  if (sortBy) {
    sortedItems.sort((a: any, b: any) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDir === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      return sortDir === 'asc' 
        ? (valueA - valueB) 
        : (valueB - valueA);
    });
  }
  
  // Get paginated data
  const data = sortedItems.slice(startIndex, endIndex);
  
  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage: validPage,
      pageSize: validLimit,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1
    }
  };
}; 