import { useState, useEffect } from "react";
import ChatInterface from "./components/ChatInterface";
import ProductForm from "./components/ProductForm";
import { getProducts } from "./services/api";
import type { ProductData } from "./types";

type Tab = "search" | "admin";

export default function App() {
  const [tab, setTab] = useState<Tab>("search");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);

  const fetchProducts = () => {
    getProducts().then(setProducts).catch(console.error);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">ProductSearch</h1>
            <p className="text-xs text-gray-400 mt-0.5">AI-powered product discovery</p>
          </div>
        </div>
        <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab("search")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "search"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setTab("admin")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "admin"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Admin
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "search" ? (
          <ChatInterface />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">
                    {editingProduct ? "Edit Product" : "Add Product"}
                  </h2>
                  <ProductForm
                    onProductAdded={fetchProducts}
                    editingProduct={editingProduct}
                    onCancelEdit={() => setEditingProduct(null)}
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Catalog</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    {products.length} products
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${
                        editingProduct?.id === p.id
                          ? "border-indigo-400 ring-2 ring-indigo-100"
                          : "border-gray-100 hover:border-gray-200 hover:shadow"
                      }`}
                    >
                      <div className="flex gap-3">
                        {p.image_base64 ? (
                          <img
                            src={`data:image/jpeg;base64,${p.image_base64}`}
                            alt={p.title}
                            className="w-16 h-16 object-cover rounded-xl shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-7 h-7 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{p.title}</h3>
                          <p className="text-gray-400 text-xs line-clamp-2 mt-0.5">{p.description}</p>
                          <p className="text-indigo-600 font-bold text-sm mt-1">{p.price.toFixed(2)} $</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="text-gray-300 hover:text-indigo-500 transition-colors shrink-0 p-1"
                          title="Edit product"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
