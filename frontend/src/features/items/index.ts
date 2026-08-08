export { useItems, itemsQueryKey } from './api/useItems';
export { useItem, itemQueryKey } from './api/useItem';

export { ItemCard } from './components/ItemCard';
export { ItemCardSkeleton } from './components/ItemCardSkeleton';
export { ItemList } from './components/ItemList';
export { ItemDetail } from './components/ItemDetail';
export { ItemDetailHeader } from './components/ItemDetailHeader';
export { ItemsTable } from './components/ItemsTable';
export { StockBadge } from './components/StockBadge';
export { VariantCard } from './components/VariantCard';

export {
  STOCK_STATUS,
  stockStatus,
  necesitaAtencion,
  presentacionDeStock,
  type StockStatus,
} from './lib/stock-status';
export { itemTotals, FALLBACK_IMAGE, itemCover } from './lib/item-display';
