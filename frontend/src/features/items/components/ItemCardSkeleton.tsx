import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';

export function ItemCardSkeleton() {
  return (
    <Card className="flex flex-col gap-0 py-0">
      <AspectRatio ratio={1 / 1}>
        <Skeleton className="h-full w-full" />
      </AspectRatio>

      <CardHeader className="gap-2 px-4 pt-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-3">
        <Skeleton className="h-7 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="grid grid-cols-2 gap-2 px-4 py-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  );
}
