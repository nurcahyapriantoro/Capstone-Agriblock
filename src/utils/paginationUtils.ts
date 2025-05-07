/**
 * Pagination and Sorting Utilities
 * Provides helper functions for implementing pagination and sorting in API endpoints
 */

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Pagination result interface
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_SORT_DIRECTION = 'desc';

/**
 * Extracts pagination parameters from query parameters
 * @param query Query parameters from request
 * @returns Standardized pagination parameters
 */
export const extractPaginationParams = (query: any): PaginationParams => {
  const page = query.page ? parseInt(query.page) : DEFAULT_PAGE;
  const limit = query.limit ? parseInt(query.limit) : DEFAULT_LIMIT;
  const sortBy = query.sortBy || 'createdAt';
  const sortDirection = (query.sortDirection === 'asc' || query.sortDirection === 'desc') 
    ? query.sortDirection 
    : DEFAULT_SORT_DIRECTION;

  return {
    page: page < 1 ? DEFAULT_PAGE : page,
    limit: limit < 1 ? DEFAULT_LIMIT : limit,
    sortBy,
    sortDirection,
  };
};

/**
 * Applies pagination to an array of items
 * @param items Array of items to paginate
 * @param pagination Pagination parameters
 * @returns Paginated result with metadata
 */
export const paginateArray = <T>(items: T[], pagination: PaginationParams): PaginationResult<T> => {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, sortBy, sortDirection = DEFAULT_SORT_DIRECTION } = pagination;
  
  // Apply sorting if sortBy is specified
  let sortedItems = [...items];
  if (sortBy) {
    sortedItems.sort((a: any, b: any) => {
      if (typeof a[sortBy] === 'string') {
        return sortDirection === 'asc' 
          ? a[sortBy].localeCompare(b[sortBy])
          : b[sortBy].localeCompare(a[sortBy]);
      }
      
      return sortDirection === 'asc' 
        ? a[sortBy] - b[sortBy]
        : b[sortBy] - a[sortBy];
    });
  }
  
  // Calculate pagination values
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    data: paginatedItems,
    pagination: {
      total: totalItems,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}; 