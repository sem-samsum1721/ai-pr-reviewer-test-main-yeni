interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'image' | 'list';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ variant = 'text', count = 1, className = '' }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`skeleton-card shimmer ${className}`}>
            <div className="p-6 space-y-4">
              <div className="skeleton-text-lg"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text w-3/4"></div>
              <div className="flex justify-between items-center mt-4">
                <div className="skeleton-button"></div>
                <div className="skeleton-avatar"></div>
              </div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="skeleton-text shimmer"></div>
            ))}
          </div>
        );
      
      case 'avatar':
        return <div className={`skeleton-avatar shimmer ${className}`}></div>;
      
      case 'button':
        return <div className={`skeleton-button shimmer ${className}`}></div>;
      
      case 'image':
        return <div className={`skeleton-image shimmer ${className}`}></div>;
      
      case 'list':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="skeleton-avatar shimmer"></div>
                <div className="flex-1 space-y-2">
                  <div className="skeleton-text shimmer"></div>
                  <div className="skeleton-text-sm shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return <div className={`skeleton-text shimmer ${className}`}></div>;
    }
  };

  return <>{renderSkeleton()}</>;
}

// Specific skeleton components for common use cases
export function CardSkeleton({ className = '' }: { className?: string }) {
  return <LoadingSkeleton variant="card" className={className} />;
}

export function TextSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return <LoadingSkeleton variant="text" count={count} className={className} />;
}

export function ListSkeleton({ count = 5, className = '' }: { count?: number; className?: string }) {
  return <LoadingSkeleton variant="list" count={count} className={className} />;
}

export function AvatarSkeleton({ className = '' }: { className?: string }) {
  return <LoadingSkeleton variant="avatar" className={className} />;
}

export function ButtonSkeleton({ className = '' }: { className?: string }) {
  return <LoadingSkeleton variant="button" className={className} />;
}

export function ImageSkeleton({ className = '' }: { className?: string }) {
  return <LoadingSkeleton variant="image" className={className} />;
}
