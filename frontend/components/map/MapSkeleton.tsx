export default function MapSkeleton({ className = 'h-full w-full' }: { readonly className?: string }) {
  return (
    <div className={`${className} bg-gray-100 animate-pulse flex flex-col items-center justify-center gap-2`}>
      <div className="h-8 w-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Memuat peta...</p>
    </div>
  );
}
