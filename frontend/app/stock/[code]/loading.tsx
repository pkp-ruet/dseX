export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 py-8">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="h-24 bg-gray-200 rounded" />
      <div className="h-40 bg-gray-200 rounded" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
