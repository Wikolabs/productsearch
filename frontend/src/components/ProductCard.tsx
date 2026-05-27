import type { SearchResult } from "../types";

interface Props {
  result: SearchResult;
}

function scoreInfo(score: number): { label: string; classes: string } {
  if (score >= 0.85) return { label: "Excellent", classes: "bg-emerald-500 text-white" };
  if (score >= 0.7) return { label: "Good match", classes: "bg-blue-500 text-white" };
  if (score >= 0.5) return { label: "Fair match", classes: "bg-amber-500 text-white" };
  return { label: "Low match", classes: "bg-gray-400 text-white" };
}

export default function ProductCard({ result }: Props) {
  const { product, similarity_score } = result;
  const pct = Math.round(similarity_score * 100);
  const { label, classes } = scoreInfo(similarity_score);

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5">
      <div className="relative overflow-hidden">
        {product.image_base64 ? (
          <img
            src={`data:image/jpeg;base64,${product.image_base64}`}
            alt={product.title}
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full shadow ${classes}`}>
          {pct}%
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">
          {product.title}
        </h3>
        <p className="text-gray-500 text-xs mb-3 line-clamp-2 flex-1 leading-relaxed">
          {product.description}
        </p>
        {product.characteristics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.characteristics.slice(0, 3).map((c) => (
              <span key={c} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">
                {c}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <p className="text-indigo-600 font-bold text-lg">
            {product.price.toFixed(2)}<span className="text-xs font-normal text-gray-400 ml-1">USD</span>
          </p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">{label}</span>
        </div>
      </div>
    </div>
  );
}
