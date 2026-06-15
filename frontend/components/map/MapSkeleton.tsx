export default function MapSkeleton({ className = 'h-full w-full' }: { readonly className?: string }) {
  return (
    <div className={`${className} bg-slate-800 animate-pulse flex flex-col items-center justify-center gap-2`}>
      <div className="h-8 w-8 border-4 border-blue-700 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Memuat peta...</p>
    </div>
  );
}
