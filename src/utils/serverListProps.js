/** Shared ERPListPage props for server-paged lists. */
export function serverListProps(paged) {
  return {
    data: paged.items,
    loading: paged.loading,
    error: paged.error,
    onRefreshExternal: paged.refresh,
    serverMode: true,
    serverTotal: paged.total,
    serverHasMore: paged.hasMore,
    totalIsApproximate: paged.totalIsApproximate,
    serverPage: paged.page,
    onServerPageChange: paged.setPage,
    serverPageSize: paged.pageSize,
    onServerPageSizeChange: paged.setPageSize,
    onServerSearch: paged.setSearch,
    onServerFilter: paged.setFilter,
    searchValue: paged.search,
  }
}
