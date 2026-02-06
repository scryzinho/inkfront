import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Package,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  Save,
  X,
  GripVertical,
  Sparkles,
  MousePointer,
  Type,
  Hand,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import {
  GlassSelect,
  GlassSelectContent,
  GlassSelectItem,
  GlassSelectTrigger,
  GlassSelectValue,
} from "@/components/ui/GlassSelect";
import { cn } from "@/lib/utils";
import {
  addStockItems,
  clearStockItems,
  createStoreProduct,
  fetchStockItems,
  uploadProductImageForProduct,
  setInfiniteStock,
  updateStoreProduct,
  type StoreProduct,
} from "@/lib/api/store";

interface ProductField {
  id: string;
  name: string;
  emoji: string;
  preDescription: string;
  description: string;
  price: number;
  stockTotal: number;
  infiniteStock: boolean;
  infiniteValue?: string;
}

interface ProductEditorProps {
  onBack: () => void;
  onSaved?: (product: StoreProduct) => void;
  product?: StoreProduct | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

function createFieldId() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return Math.random().toString(36).slice(2, 10);
}

function normalizePrice(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function normalizeBanner(value: string | null) {
  if (!value) return null;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return null;
}

function toSafeJson<T>(value: T): T {
  const safe = JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val));
  return JSON.parse(safe) as T;
}

export function ProductEditor({ onBack, onSaved, product }: ProductEditorProps) {
  const [currentProduct, setCurrentProduct] = useState<StoreProduct | null>(product ?? null);
  const [productName, setProductName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.info?.description || "");
  const [image, setImage] = useState<string | null>(product?.info?.banner || null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState(product?.info?.buy_button?.label || "Comprar");
  const [buttonEmoji, setButtonEmoji] = useState(product?.info?.buy_button?.emoji || "🛒");
  const [embedColor, setEmbedColor] = useState(product?.info?.hex_color || "#5865F2");
  const [deliveryType, setDeliveryType] = useState<"automatic" | "manual">(
    (product?.info?.delivery_type as "automatic" | "manual") || "automatic"
  );
  const [isActive, setIsActive] = useState(product?.info?.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState<ProductField[]>(() => {
    const campos = product?.campos || {};
    const entries = Object.values(campos);
    if (!entries.length) {
      return [
        {
          id: createFieldId(),
          name: "Padrão",
          emoji: "📦",
          preDescription: "",
          description: "",
          price: 0,
          stockTotal: 0,
          infiniteStock: false,
        },
      ];
    }
    return entries.map((campo: any) => ({
      id: campo.id || createFieldId(),
      name: campo.name || "",
      emoji: campo.emoji || "📦",
      preDescription: campo.pre_description || "",
      description: campo.description || "",
      price: normalizePrice(Number(campo.price || 0)),
      stockTotal: 0,
      infiniteStock: Boolean(campo?.infinite_stock?.enabled),
      infiniteValue: campo?.infinite_stock?.value || "",
    }));
  });

  const [activeFieldId, setActiveFieldId] = useState<string>(() => fields[0]?.id || "");
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockInput, setStockInput] = useState("");
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<ProductField | null>(null);
  const [stockItems, setStockItems] = useState<string[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockInfinite, setStockInfinite] = useState(false);
  const [stockInfiniteValue, setStockInfiniteValue] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockCache, setStockCache] = useState<Record<string, { items: string[]; total: number; is_infinite: boolean; infinite_value: string }>>({});

  const activeField = useMemo(
    () => fields.find((f) => f.id === activeFieldId) || null,
    [fields, activeFieldId]
  );

  useEffect(() => {
    setCurrentProduct(product ?? null);
  }, [product]);

  useEffect(() => {
    if (!activeField && fields.length) {
      setActiveFieldId(fields[0].id);
    }
  }, [fields, activeField]);

  const loadStock = async (fieldId: string, productId?: string, force = false) => {
    const resolvedProductId = productId || currentProduct?.id;
    if (!resolvedProductId) return;
    if (!force && stockCache[fieldId]) {
      const cached = stockCache[fieldId];
      setStockItems(cached.items);
      setStockTotal(cached.total);
      setStockInfinite(cached.is_infinite);
      setStockInfiniteValue(cached.infinite_value || "");
      setFields((prev) =>
        prev.map((field) =>
          field.id === fieldId
            ? {
                ...field,
                stockTotal: cached.total,
                infiniteStock: cached.is_infinite,
                infiniteValue: cached.infinite_value || field.infiniteValue,
              }
            : field
        )
      );
      return;
    }
    setStockLoading(true);
    try {
      const data = await fetchStockItems({
        product_id: resolvedProductId,
        field_id: fieldId,
        limit: 200,
        offset: 0,
      });
      const payload = {
        items: data.items || [],
        total: data.total || 0,
        is_infinite: Boolean(data.is_infinite),
        infinite_value: data.infinite_value || "",
      };
      setStockItems(payload.items);
      setStockTotal(payload.total);
      setStockInfinite(payload.is_infinite);
      setStockInfiniteValue(payload.infinite_value);
      setStockCache((prev) => ({ ...prev, [fieldId]: payload }));
      setFields((prev) =>
        prev.map((field) =>
          field.id === fieldId
            ? {
                ...field,
                stockTotal: payload.total,
                infiniteStock: payload.is_infinite,
                infiniteValue: payload.infinite_value || field.infiniteValue,
              }
            : field
        )
      );
    } catch (err) {
      console.error("[store] load stock", err);
      setStockItems([]);
      setStockTotal(0);
      setStockInfinite(false);
      setStockInfiniteValue("");
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (!currentProduct?.id || !activeFieldId) return;
    loadStock(activeFieldId);
  }, [currentProduct?.id, activeFieldId]);

  useEffect(() => {
    if (currentProduct?.id || !activeField) return;
    setStockInfinite(activeField.infiniteStock);
    setStockInfiniteValue(activeField.infiniteValue || "");
    setStockTotal(activeField.stockTotal || 0);
  }, [currentProduct?.id, activeField]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const resolved = await ensureProductExists();
      if (!resolved?.id) return;
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      const result = await uploadProductImageForProduct(resolved.id, file);
      setImage(result.image_url);
      setImagePreview(null);
      setCurrentProduct((prev) =>
        prev
          ? {
              ...prev,
              info: {
                ...(prev.info || {}),
                banner: result.image_url,
              },
            }
          : prev
      );
    } catch (err) {
      console.error("[store] upload image", err);
      setError("Não foi possível enviar a imagem.");
    }
  };

  const addField = () => {
    const newField: ProductField = {
      id: createFieldId(),
      name: "",
      emoji: "📦",
      preDescription: "",
      description: "",
      price: 0,
      stockTotal: 0,
      infiniteStock: false,
    };
    setEditingField(newField);
    setShowFieldModal(true);
  };

  const saveField = () => {
    if (!editingField) return;
    const existingIndex = fields.findIndex((f) => f.id === editingField.id);
    if (existingIndex >= 0) {
      setFields((prev) => prev.map((f) => (f.id === editingField.id ? editingField : f)));
    } else {
      setFields((prev) => [...prev, editingField]);
    }
    setShowFieldModal(false);
    setEditingField(null);
  };

  const deleteField = (id: string) => {
    if (fields.length <= 1) return;
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (activeFieldId === id && fields.length > 1) {
      const next = fields.find((f) => f.id !== id);
      if (next) setActiveFieldId(next.id);
    }
  };

  const buildCamposPayload = (now: number) => {
    const campos: Record<string, any> = {};
    for (const field of fields) {
      if (!field.name.trim()) {
        setError("Todos os campos precisam de nome.");
        return null;
      }
      const base = currentProduct?.campos?.[field.id] || {
        id: field.id,
        name: "",
        price: 0,
        emoji: null,
        pre_description: "",
        description: "",
        instructions: null,
        category_id: null,
        created_at: now,
        updated_at: now,
        advanced: {},
        stock: [],
        cargos: { adicionar: [], remover: [] },
        condicoes: { valorMin: null, valorMax: null, quantidadeMin: null, quantidadeMax: null },
      };
      base.id = field.id;
      base.name = field.name;
      base.price = normalizePrice(field.price);
      base.emoji = field.emoji || null;
      base.pre_description = field.preDescription || "";
      base.description = field.description || "";
      base.updated_at = now;
      if (field.infiniteStock && (field.infiniteValue || "").trim()) {
        base.infinite_stock = {
          enabled: true,
          value: field.infiniteValue,
          configured_at: now,
        };
      } else if (base.infinite_stock) {
        delete base.infinite_stock;
      }
      campos[field.id] = base;
    }
    return campos;
  };

  const createBaseProduct = async () => {
    if (!productName.trim()) {
      setError("Informe o nome do produto.");
      return null;
    }
    const created = await createStoreProduct({
      name: productName.trim(),
      description: description || null,
      banner: normalizeBanner(image),
      hex_color: embedColor,
      delivery_type: deliveryType,
      buy_button: { label: buttonText, emoji: buttonEmoji || null },
    });
    setCurrentProduct(created);
    onSaved?.(created);
    return created;
  };

  const ensureProductExists = async () => {
    if (currentProduct?.id) {
      if (activeFieldId && !currentProduct.campos?.[activeFieldId]) {
        const now = Math.floor(Date.now() / 1000);
        const campos = buildCamposPayload(now);
        if (!campos) return null;
        const nextProduct: StoreProduct = {
          ...currentProduct,
          name: productName.trim() || currentProduct.name,
          info: {
            ...(currentProduct.info || {}),
            description,
            banner: normalizeBanner(image),
            hex_color: embedColor,
            delivery_type: deliveryType,
            buy_button: { label: buttonText, emoji: buttonEmoji || null },
            active: isActive,
            updated_at: now,
          },
          campos,
        };
        const updated = await updateStoreProduct(currentProduct.id, toSafeJson(nextProduct));
        setCurrentProduct(updated);
        onSaved?.(updated);
        return updated;
      }
      return currentProduct;
    }
    const base = await createBaseProduct();
    if (!base?.id) return null;
    const now = Math.floor(Date.now() / 1000);
    const campos = buildCamposPayload(now);
    if (!campos) return null;
    const updated = await updateStoreProduct(base.id, toSafeJson({
      ...base,
      info: {
        ...(base.info || {}),
        description,
        banner: normalizeBanner(image),
        hex_color: embedColor,
        delivery_type: deliveryType,
        buy_button: { label: buttonText, emoji: buttonEmoji || null },
        active: isActive,
        updated_at: now,
      },
      campos,
    }));
    setCurrentProduct(updated);
    onSaved?.(updated);
    return updated;
  };

  const handleOpenStockModal = () => {
    setError(null);
    setShowStockModal(true);
  };

  const handleAddStockItems = async () => {
    if (stockLoading) return;
    const resolved = await ensureProductExists();
    if (!resolved?.id || !activeFieldId) return;
    const lines = stockInput.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    setStockLoading(true);
    try {
      await addStockItems({ product_id: resolved.id, field_id: activeFieldId, items: lines });
      const nextItems = [...stockItems, ...lines];
      const payload = { items: nextItems, total: nextItems.length, is_infinite: false, infinite_value: "" };
      setStockItems(payload.items);
      setStockTotal(payload.total);
      setStockInfinite(false);
      setStockInfiniteValue("");
      setStockCache((prev) => ({ ...prev, [activeFieldId]: payload }));
      setFields((prev) =>
        prev.map((field) =>
          field.id === activeFieldId
            ? { ...field, stockTotal: payload.total, infiniteStock: false }
            : field
        )
      );
      setStockInput("");
      setShowStockModal(false);
    } catch (err) {
      console.error("[store] add stock", err);
      setError("Não foi possível adicionar estoque.");
    } finally {
      setStockLoading(false);
    }
  };

  const clearAllStock = async () => {
    if (stockLoading) return;
    if (!currentProduct?.id || !activeFieldId) return;
    setStockLoading(true);
    try {
      await clearStockItems({ product_id: currentProduct.id, field_id: activeFieldId });
      const payload = { items: [], total: 0, is_infinite: false, infinite_value: "" };
      setStockItems([]);
      setStockTotal(0);
      setStockInfinite(false);
      setStockInfiniteValue("");
      setStockCache((prev) => ({ ...prev, [activeFieldId]: payload }));
      setFields((prev) =>
        prev.map((field) =>
          field.id === activeFieldId
            ? { ...field, stockTotal: 0, infiniteStock: false }
            : field
        )
      );
    } catch (err) {
      console.error("[store] clear stock", err);
    } finally {
      setStockLoading(false);
    }
  };

  const toggleInfiniteStock = async () => {
    if (stockLoading) return;
    const resolved = await ensureProductExists();
    if (!resolved?.id || !activeFieldId) return;
    if (!activeField) return;
    setStockLoading(true);
    try {
      if (!activeField.infiniteStock) {
        const value = (activeField.infiniteValue || stockInfiniteValue || "").trim();
        if (!value) {
          setError("Informe o valor do estoque infinito.");
          return;
        }
        await setInfiniteStock({ product_id: resolved.id, field_id: activeFieldId, value });
        const payload = { items: [], total: 0, is_infinite: true, infinite_value: value };
        setStockItems([]);
        setStockTotal(0);
        setStockInfinite(true);
        setStockInfiniteValue(value);
        setStockCache((prev) => ({ ...prev, [activeFieldId]: payload }));
        setFields((prev) =>
          prev.map((field) =>
            field.id === activeFieldId
              ? { ...field, stockTotal: 0, infiniteStock: true, infiniteValue: value }
              : field
          )
        );
      } else {
        await clearStockItems({ product_id: resolved.id, field_id: activeFieldId });
        const payload = { items: [], total: 0, is_infinite: false, infinite_value: "" };
        setStockItems([]);
        setStockTotal(0);
        setStockInfinite(false);
        setStockInfiniteValue("");
        setStockCache((prev) => ({ ...prev, [activeFieldId]: payload }));
        setFields((prev) =>
          prev.map((field) =>
            field.id === activeFieldId
              ? { ...field, stockTotal: 0, infiniteStock: false }
              : field
          )
        );
      }
    } catch (err) {
      console.error("[store] toggle infinite", err);
    } finally {
      setStockLoading(false);
    }
  };

  const setInfiniteValue = (value: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === activeFieldId ? { ...f, infiniteValue: value } : f))
    );
    setStockInfiniteValue(value);
  };

  const handleSaveInfiniteValue = async () => {
    if (stockLoading) return;
    const resolved = await ensureProductExists();
    if (!resolved?.id || !activeFieldId) return;
    const value = (stockInfiniteValue || "").trim();
    if (!value) {
      setError("Informe o valor do estoque infinito.");
      return;
    }
    setStockLoading(true);
    try {
      await setInfiniteStock({ product_id: resolved.id, field_id: activeFieldId, value });
      const payload = { items: [], total: 0, is_infinite: true, infinite_value: value };
      setStockItems([]);
      setStockTotal(0);
      setStockInfinite(true);
      setStockInfiniteValue(value);
      setStockCache((prev) => ({ ...prev, [activeFieldId]: payload }));
      setFields((prev) =>
        prev.map((field) =>
          field.id === activeFieldId
            ? { ...field, stockTotal: 0, infiniteStock: true, infiniteValue: value }
            : field
        )
      );
    } catch (err) {
      console.error("[store] save infinite value", err);
      setError("Não foi possível salvar o estoque infinito.");
    } finally {
      setStockLoading(false);
    }
  };

  const handleRemoveStockItem = async (index: number) => {
    if (stockLoading) return;
    if (!currentProduct?.id || !activeFieldId) return;
    const nextItems = stockItems.filter((_, idx) => idx !== index);
    setStockLoading(true);
    try {
      await clearStockItems({ product_id: currentProduct.id, field_id: activeFieldId });
      if (nextItems.length) {
        await addStockItems({ product_id: currentProduct.id, field_id: activeFieldId, items: nextItems });
      }
      const payload = { items: nextItems, total: nextItems.length, is_infinite: false, infinite_value: "" };
      setStockItems(payload.items);
      setStockTotal(payload.total);
      setStockCache((prev) => ({ ...prev, [activeFieldId]: payload }));
      setFields((prev) =>
        prev.map((field) =>
          field.id === activeFieldId
            ? { ...field, stockTotal: payload.total, infiniteStock: false }
            : field
        )
      );
    } catch (err) {
      console.error("[store] remove stock item", err);
      setError("Não foi possível remover o item do estoque.");
      await loadStock(activeFieldId, currentProduct.id, true);
    } finally {
      setStockLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (saving) return;
    setError(null);
    if (!productName.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const campos = buildCamposPayload(now);
    if (!campos) return;
    setSaving(true);
    try {
      if (currentProduct?.id) {
        const nextProduct: StoreProduct = {
          ...currentProduct,
          name: productName.trim(),
          info: {
            ...(currentProduct.info || {}),
            description,
            banner: normalizeBanner(image),
            hex_color: embedColor,
            delivery_type: deliveryType,
            buy_button: { label: buttonText, emoji: buttonEmoji || null },
            active: isActive,
            updated_at: now,
          },
          campos,
        };
        const updated = await updateStoreProduct(currentProduct.id, toSafeJson(nextProduct));
        setCurrentProduct(updated);
        onSaved?.(updated);
      } else {
        const base = await createBaseProduct();
        if (!base?.id) return;
        const updated = await updateStoreProduct(base.id, toSafeJson({
          ...base,
          info: {
            ...(base.info || {}),
            description,
            banner: normalizeBanner(image),
            hex_color: embedColor,
            delivery_type: deliveryType,
            buy_button: { label: buttonText, emoji: buttonEmoji || null },
            active: isActive,
            updated_at: now,
          },
          campos,
        }));
        setCurrentProduct(updated);
        onSaved?.(updated);
      }
      onBack();
    } catch (err) {
      console.error("[store] save product", err);
      const message = err instanceof Error ? err.message : "Não foi possível salvar o produto.";
      setError(message || "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  const getTotalStock = () => {
    return fields.reduce((acc, f) => {
      if (f.infiniteStock) return acc + 999;
      return acc + (f.stockTotal || 0);
    }, 0);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <motion.button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {product ? "Editar Produto" : "Novo Produto"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure todas as informações do produto
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={onBack}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSaveProduct} disabled={saving} loading={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Produto"}
          </GlassButton>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="text-sm text-destructive">
          {error}
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6" hover={false}>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Informações Básicas
              </h3>

              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  Imagem do Produto
                </label>
                <div className="flex items-start gap-4">
                  <motion.label
                    className={cn(
                      "relative w-32 h-32 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer overflow-hidden group",
                      (imagePreview || image) && "border-solid border-white/20"
                    )}
                    whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {imagePreview || image ? (
                      <>
                        <img src={imagePreview || image || ""} alt="Preview" className="w-full h-full object-cover" />
                        <motion.div
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          initial={{ opacity: 0 }}
                        >
                          <Upload className="w-6 h-6" />
                        </motion.div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </motion.label>
                  {(imagePreview || image) && (
                    <motion.button
                      onClick={() => {
                        if (imagePreview) {
                          URL.revokeObjectURL(imagePreview);
                        }
                        setImagePreview(null);
                        setImage(null);
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 text-destructive transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Discord Nitro"
                    className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">
                    Tipo de Entrega
                  </label>
                  <GlassSelect value={deliveryType} onValueChange={(v) => setDeliveryType(v as "automatic" | "manual")}>
                    <GlassSelectTrigger>
                      <GlassSelectValue placeholder="Selecione..." />
                    </GlassSelectTrigger>
                    <GlassSelectContent>
                      <GlassSelectItem value="automatic" icon={<Sparkles className="w-4 h-4" />}>
                        Automática
                      </GlassSelectItem>
                      <GlassSelectItem value="manual" icon={<Hand className="w-4 h-4" />}>
                        Manual
                      </GlassSelectItem>
                    </GlassSelectContent>
                  </GlassSelect>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descreva seu produto..."
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors resize-none"
                />
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-6" hover={false}>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                Personalização do Botão
              </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">
                    <Type className="w-3 h-3 inline mr-1" />
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Comprar"
                    className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">
                    Emoji
                  </label>
                  <EmojiPicker value={buttonEmoji} onChange={setButtonEmoji} />
                </div>
                <ColorPicker
                  label="Cor do Embed"
                  value={embedColor}
                  onChange={setEmbedColor}
                />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <motion.button
                  className="px-6 py-3 rounded-xl font-medium text-white transition-all bg-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {buttonEmoji} {buttonText}
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-6" hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Campos do Produto
                </h3>
                <GlassButton size="sm" onClick={addField}>
                  <Plus className="w-4 h-4" />
                  Novo Campo
                </GlassButton>
              </div>

              <div className="space-y-2 mb-4">
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setActiveFieldId(field.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                      activeFieldId === field.id
                        ? "bg-white/10 border border-white/20"
                        : "bg-white/[0.02] border border-white/5 hover:bg-white/5"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className="text-lg">{field.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{field.name || "Campo sem nome"}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {field.price.toFixed(2)} •{" "}
                        {field.infiniteStock ? "∞" : field.stockTotal} em estoque
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField(field);
                          setShowFieldModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Type className="w-4 h-4" />
                      </motion.button>
                      {fields.length > 1 && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(field.id);
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-destructive transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {activeField && (
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Estoque - {activeField.emoji} {activeField.name || "Campo"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stockInfinite
                        ? "Estoque infinito ativado"
                        : `${stockTotal} itens em estoque`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Infinito</span>
                      <Switch
                        checked={stockInfinite}
                        onCheckedChange={toggleInfiniteStock}
                        disabled={stockLoading}
                      />
                    </div>
                    {!stockInfinite && (
                      <GlassButton size="sm" onClick={handleOpenStockModal} disabled={stockLoading}>
                        <Plus className="w-4 h-4" />
                        Adicionar Estoque
                      </GlassButton>
                    )}
                  </div>
                </div>

                {stockInfinite ? (
                  <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <InfinityIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    </motion.div>
                    <p className="text-sm font-medium mb-3">Estoque Infinito</p>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">
                      Valor/Conteúdo entregue ao cliente:
                    </label>
                    <textarea
                      value={stockInfiniteValue}
                      onChange={(e) => setInfiniteValue(e.target.value)}
                      onBlur={handleSaveInfiniteValue}
                      rows={3}
                      placeholder="Digite o conteúdo que será entregue..."
                      className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors resize-none font-mono"
                    />
                  </div>
                </div>
                ) : stockTotal === 0 ? (
                  <div className="p-8 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Nenhum item em estoque
                    </p>
                    <GlassButton onClick={handleOpenStockModal} disabled={stockLoading}>
                      <Plus className="w-4 h-4" />
                      Adicionar Primeiro Item
                    </GlassButton>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground">
                        {stockTotal} itens
                      </p>
                      <motion.button
                        onClick={clearAllStock}
                        className="text-xs text-destructive hover:underline"
                        whileHover={{ x: 2 }}
                        disabled={stockLoading}
                      >
                        Limpar tudo
                      </motion.button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
                      {stockLoading && <div className="text-xs text-muted-foreground">Carregando...</div>}
                      {!stockLoading && stockItems.map((item, index) => (
                        <motion.div
                          key={`${item}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 group"
                        >
                          <span className="text-xs text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <code className="flex-1 text-sm font-mono truncate">
                            {item}
                          </code>
                          <motion.button
                            onClick={() => handleRemoveStockItem(index)}
                            className="p-1 rounded hover:bg-white/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={stockLoading}
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6" hover={false}>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </h3>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                {imagePreview || image ? (
                  <img
                    src={imagePreview || image || ""}
                    alt="Preview"
                    className="w-full aspect-square object-cover rounded-xl mb-4"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center mb-4">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <h4 className="font-semibold text-lg mb-1">
                  {productName || "Nome do Produto"}
                </h4>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {description || "Descrição do produto..."}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold">
                    R$ {activeField?.price.toFixed(2) || "0.00"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {activeField?.infiniteStock ? "∞" : activeField?.stockTotal || 0} disponíveis
                  </span>
                </div>
                <motion.button
                  className="w-full px-4 py-3 rounded-xl font-medium text-white transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {buttonEmoji} {buttonText}
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-6" hover={false}>
              <h3 className="font-medium mb-4">Status</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Eye className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {isActive ? "Produto Ativo" : "Produto Inativo"}
                  </span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-6" hover={false}>
              <h3 className="font-medium mb-4">Estatísticas</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Campos</span>
                  <span className="font-medium">{fields.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total em Estoque</span>
                  <span className="font-medium">
                    {fields.some((f) => f.infiniteStock) ? "∞" : getTotalStock()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Entrega</span>
                  <span className="font-medium">
                    {deliveryType === "automatic" ? "Automática" : "Manual"}
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showStockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowStockModal(false)}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl bg-background/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Adicionar Estoque</h3>
                    <p className="text-sm text-muted-foreground">
                      Cole os itens, um por linha
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setShowStockModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <textarea
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value)}
                  rows={10}
                  placeholder="Cole aqui os códigos, keys ou itens...&#10;Um item por linha&#10;&#10;Exemplo:&#10;XXXX-YYYY-ZZZZ&#10;AAAA-BBBB-CCCC"
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors resize-none font-mono"
                />

                {error && (
                  <p className="text-xs text-destructive mt-2">{error}</p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {stockInput.split("\n").filter((l) => l.trim()).length} itens detectados
                </p>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                  <GlassButton variant="ghost" onClick={() => setShowStockModal(false)} disabled={stockLoading}>
                    Cancelar
                  </GlassButton>
                  <GlassButton variant="primary" onClick={handleAddStockItems} disabled={stockLoading} loading={stockLoading}>
                    <Plus className="w-4 h-4" />
                    Adicionar ({stockInput.split("\n").filter((l) => l.trim()).length})
                  </GlassButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFieldModal && editingField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFieldModal(false)}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl bg-background/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {fields.find((f) => f.id === editingField.id)
                        ? "Editar Campo"
                        : "Novo Campo"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Configure as informações do campo
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setShowFieldModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block text-muted-foreground">
                        Emoji
                      </label>
                      <EmojiPicker
                        value={editingField.emoji}
                        onChange={(emoji) =>
                          setEditingField({ ...editingField, emoji })
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-sm font-medium mb-2 block text-muted-foreground">
                        Nome do Campo
                      </label>
                      <input
                        type="text"
                        value={editingField.name}
                        onChange={(e) =>
                          setEditingField({ ...editingField, name: e.target.value })
                        }
                        placeholder="Ex: 1 Mês, 3 Meses..."
                        className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-muted-foreground">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      value={editingField.price}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          price: normalizePrice(Number(e.target.value || 0)),
                        })
                      }
                      min={0}
                      step={0.01}
                      className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-muted-foreground">
                      Pré-descrição
                    </label>
                    <input
                      type="text"
                      value={editingField.preDescription}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          preDescription: e.target.value,
                        })
                      }
                      placeholder="Texto antes da descrição principal"
                      className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-muted-foreground">
                      Descrição
                    </label>
                    <textarea
                      value={editingField.description}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Descrição detalhada do campo..."
                      className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
                  <GlassButton variant="ghost" onClick={() => setShowFieldModal(false)}>
                    Cancelar
                  </GlassButton>
                  <GlassButton variant="primary" onClick={saveField}>
                    <Save className="w-4 h-4" />
                    Salvar Campo
                  </GlassButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
