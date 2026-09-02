import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, ChevronDown, ChevronUp, ImagePlus, RefreshCw, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useFoods } from '@/features/foods/hooks/useFoods';
import { foodsApi } from '@/features/foods/api/foodsApi';
import type { FoodDetail, Serving } from '@/features/foods/types/foods.types';
import { preferredServing } from '@/features/foods/utils/serving';
import { useCreateMealMutation } from '@/features/meals/hooks/useMeals';
import type { MealType } from '@/features/meals/types/meals.types';
import { useFoodRecognition } from '../hooks/useFoodRecognition';
import type { FoodRecognitionCandidate } from '../types/food-recognition.types';
import { optimizeImage } from '../image-optimizer';

interface ReviewItem {
  readonly key: string;
  readonly detectionIndex?: number;
  readonly candidate: FoodRecognitionCandidate;
  readonly food: FoodDetail | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly selectedServingId: string;
  readonly quantity: string;
}

function displayCandidate(candidate: FoodRecognitionCandidate): string {
  return candidate.foodDisplayName ?? candidate.foodName ?? candidate.label;
}

function candidateForFood(food: { id: string; name: string; displayName?: string; variantLabel?: string | null }, label?: string): FoodRecognitionCandidate {
  return {
    label: label ?? food.displayName ?? food.name,
    confidence: 1,
    foodId: food.id,
    foodName: food.name,
    foodDisplayName: food.displayName ?? food.name,
    foodVariantLabel: food.variantLabel ?? null,
    matchStatus: 'database-match',
    resolutionStatus: 'matched',
    nutritionSource: 'canonical-database',
    requiresReview: false,
  };
}

export const FoodRecognitionPage: React.FC = () => {
  const recognition = useFoodRecognition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [requestImage, setRequestImage] = useState<{ imageData: string; mimeType: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'optimizing' | 'ready' | 'recognizing' | 'preparing-review' | 'review'>('idle');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [resolvedDetections, setResolvedDetections] = useState<Record<number, string>>({});
  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [consumedAt, setConsumedAt] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saved, setSaved] = useState(false);

  const { data: catalogData, isLoading: catalogLoading } = useFoods({ search: catalogQuery, limit: 8 });
  const createMeal = useCreateMealMutation(() => setSaved(true));

  useEffect(() => {
    if (recognition.data == null) return;
    setStage(recognition.data.recognitionStatus === 'completed' ? 'preparing-review' : 'ready');
    const matched = recognition.data.candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => candidate.foodId != null && candidate.resolutionStatus === 'matched');
    setResolvedDetections(Object.fromEntries(matched.map(({ candidate, index }) => [index, candidate.foodId!])));
    setReviewItems(matched.map(({ candidate, index }) => createReviewItem(candidate, `detected-${index}`, index)));
    matched.forEach(({ candidate, index }) => void loadFood(candidate, `detected-${index}`, index));
    setReplacementIndex(null);
    if (recognition.data.recognitionStatus === 'completed') {
      const timer = window.setTimeout(() => setStage('review'), 250);
      return () => window.clearTimeout(timer);
    }
  }, [recognition.data]);

  const unresolved = useMemo(() => {
    const candidates = recognition.data?.candidates ?? [];
    return candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ index }) => resolvedDetections[index] == null);
  }, [recognition.data, resolvedDetections]);

  const selectedCount = reviewItems.length;
  const hasBlockingItems = unresolved.length > 0;
  const canSave = selectedCount > 0 && !hasBlockingItems && reviewItems.every((item) => !item.loading && item.food != null && item.selectedServingId && Number.parseFloat(item.quantity) > 0);

  function createReviewItem(candidate: FoodRecognitionCandidate, key: string, detectionIndex?: number): ReviewItem {
    return {
      key,
      detectionIndex,
      candidate,
      food: null,
      loading: true,
      error: null,
      selectedServingId: '',
      quantity: '1',
    };
  }

  const loadFood = async (candidate: FoodRecognitionCandidate, key: string, detectionIndex?: number) => {
    if (!candidate.foodId) return;
    setReviewItems((items) => items.some((item) => item.key === key) ? items : [...items, createReviewItem(candidate, key, detectionIndex)]);
    try {
      const food = await foodsApi.getFoodById(candidate.foodId);
      const serving = preferredServing(food.servings) ?? food.servings[0];
      setReviewItems((items) => items.map((item) => item.key === key ? {
        ...item,
        candidate: { ...candidate, foodDisplayName: food.displayName, foodVariantLabel: food.variantLabel },
        food,
        loading: false,
        selectedServingId: serving?.id ?? '',
      } : item));
    } catch (error) {
      setReviewItems((items) => items.map((item) => item.key === key ? { ...item, loading: false, error: error instanceof Error ? error.message : 'Could not load this food.' } : item));
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setImageError(null);
    recognition.reset();
    setReviewItems([]);
    setResolvedDetections({});
    setSaved(false);
    setStage('optimizing');
    try {
      const optimized = await optimizeImage(file);
      setPreviewUrl(optimized.previewUrl);
      setRequestImage({ imageData: optimized.imageData, mimeType: optimized.mimeType });
      setStage('ready');
    } catch (error) {
      setStage('idle');
      setImageError(error instanceof Error ? error.message : 'Could not prepare that image.');
    }
  };

  const recognize = () => {
    if (!requestImage) return;
    setStage('recognizing');
    recognition.mutate(requestImage);
  };

  const chooseAlternative = (detectionIndex: number, candidate: FoodRecognitionCandidate, foodId: string) => {
    const alternative = candidate.alternatives?.find((item) => item.foodId === foodId);
    if (!alternative) return;
    const selected: FoodRecognitionCandidate = {
      ...candidate,
      foodId: alternative.foodId,
      foodName: alternative.canonicalName,
      foodDisplayName: alternative.displayName,
      foodVariantLabel: alternative.variantLabel,
      matchStatus: 'database-match',
      resolutionStatus: 'matched',
      nutritionSource: 'canonical-database',
      requiresReview: false,
    };
    setResolvedDetections((current) => ({ ...current, [detectionIndex]: foodId }));
    void loadFood(selected, `detected-${detectionIndex}`, detectionIndex);
  };

  const replaceWithCatalogFood = (food: { id: string; name: string; displayName?: string; variantLabel?: string | null }) => {
    const candidate = candidateForFood(food, food.displayName ?? food.name);
    if (replacementIndex == null) {
      void loadFood(candidate, `catalog-${food.id}-${Date.now()}`);
    } else {
      const key = `detected-${replacementIndex}`;
      setResolvedDetections((current) => ({ ...current, [replacementIndex]: food.id }));
      setReviewItems((items) => items.filter((item) => item.key !== key));
      void loadFood(candidate, key, replacementIndex);
    }
    setCatalogQuery('');
    setReplacementIndex(null);
  };

  const removeItem = (key: string, detectionIndex?: number) => {
    setReviewItems((items) => items.filter((item) => item.key !== key));
    if (detectionIndex != null) setResolvedDetections((current) => { const next = { ...current }; delete next[detectionIndex]; return next; });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= reviewItems.length) return;
    setReviewItems((items) => {
      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const updateItem = (key: string, update: Partial<ReviewItem>) => setReviewItems((items) => items.map((item) => item.key === key ? { ...item, ...update } : item));

  const saveMeal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    const byServing = new Map<string, string>();
    for (const item of reviewItems) {
      const existing = byServing.get(item.selectedServingId) ?? '0';
      byServing.set(item.selectedServingId, (Number.parseFloat(existing) + Number.parseFloat(item.quantity)).toString());
    }
    createMeal.mutate({
      mealType,
      consumedAt: new Date(consumedAt).toISOString(),
      items: [...byServing.entries()].map(([servingId, quantity]) => ({ servingId, quantity })),
    });
  };

  if (saved) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}><PageHeader title="Meal saved" subtitle="Your confirmed foods were evaluated with the existing nutrition engine." /><Card><div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-primary)' }}><CheckCircle2 size={24} /><strong>Your daily guidance has been refreshed.</strong></div><p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>Recognition helped identify the foods. Your meal evaluation and recommendations use canonical food and serving data.</p><Button variant="primary" onClick={() => { setSaved(false); setPreviewUrl(null); setRequestImage(null); setReviewItems([]); setStage('idle'); }}>Scan another meal</Button></Card></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Scan a Meal" subtitle="Take a photo, review what NutriApp sees, then save the confirmed meal." />
      <Card style={{ border: '1.5px solid var(--border-light)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center', textAlign: 'center' }}>
          <Camera size={32} color="var(--color-primary)" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Recognition suggests foods only. You confirm every food and portion before anything is evaluated or saved.</p>
          {previewUrl && <img src={previewUrl} alt="Meal selected for recognition" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-full)', padding: '9px 14px', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}><ImagePlus size={16} /> Choose photo<input type="file" accept="image/*" capture="environment" hidden onChange={(event) => void handleFile(event.target.files?.[0])} /></label>
            <Button variant="primary" onClick={recognize} disabled={!requestImage || stage === 'optimizing' || stage === 'recognizing'}>{stage === 'recognizing' ? 'Recognizing...' : 'Recognize foods'}</Button>
          </div>
          {stage === 'optimizing' && <LoadingSpinner label="Preparing your image..." size={18} />}
          {stage === 'recognizing' && <LoadingSpinner label="Recognizing foods and matching them to the catalog..." size={18} />}
          {stage === 'preparing-review' && <LoadingSpinner label="Preparing your review..." size={18} />}
          {stage === 'ready' && requestImage && <Badge variant="success" icon={<CheckCircle2 size={12} />}>Image ready</Badge>}
          {imageError && <p style={{ color: 'var(--color-danger)' }}>{imageError}</p>}
        </div>
      </Card>

      {recognition.isError && <Card style={{ color: 'var(--color-danger)' }}>Could not recognize this image. {recognition.error.message}</Card>}
      {recognition.data?.imageQuality.status === 'poor' && <Card style={{ color: 'var(--text-secondary)' }}><div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><TriangleAlert size={18} color="var(--color-accent)" /><div><strong>This photo may be too difficult to recognize.</strong>{recognition.data.imageQuality.issues.map((issue) => <p key={issue} style={{ marginTop: 4 }}>{issue}</p>)}<p style={{ marginTop: 8 }}>Please retake the photo with the meal in focus and good lighting.</p></div></div></Card>}
      {recognition.data?.recognitionStatus === 'unavailable' && <Card style={{ color: 'var(--text-secondary)' }}>Image recognition is temporarily unavailable. You can still build this meal by searching the food catalog below.</Card>}
      {recognition.data?.mealDescription && <Card><strong>What I see</strong><p style={{ marginTop: 5, color: 'var(--text-secondary)' }}>{recognition.data.mealDescription}</p>{recognition.data.mealConfidence != null && <p style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall meal confidence: {Math.round(recognition.data.mealConfidence * 100)}%</p>}</Card>}

      {recognition.data?.imageQuality.status !== 'poor' && recognition.data?.recognitionStatus === 'completed' && <Card>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>Review detected foods</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>Check each item, choose a serving, and adjust the quantity. Nothing is saved until you confirm the meal.</p>
        {reviewItems.length === 0 && unresolved.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No catalog foods are ready to review.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviewItems.map((item, index) => <ReviewItemCard key={item.key} item={item} index={index} total={reviewItems.length} onUpdate={updateItem} onRemove={removeItem} onMove={moveItem} onReplace={(detectionIndex) => { setReplacementIndex(detectionIndex ?? null); setCatalogQuery(''); }} onRetry={(candidate, key, detectionIndex) => void loadFood(candidate, key, detectionIndex)} />)}
        </div>
        {unresolved.map(({ candidate, index }) => <div key={`unresolved-${index}`} style={{ marginTop: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-clinical-subtle)', border: '1px solid var(--color-clinical-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><strong>{candidate.label}</strong><p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{candidate.matchStatus === 'ambiguous' ? 'Please choose the closest food.' : 'We could not confidently match this food to the catalog.'}</p></div><Badge variant="warning">Needs review</Badge></div>
          {candidate.alternatives?.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>{candidate.alternatives.map((alternative) => <Button key={alternative.foodId} type="button" variant="secondary" size="sm" onClick={() => chooseAlternative(index, candidate, alternative.foodId)}>{alternative.displayName}{alternative.variantLabel ? ` · ${alternative.variantLabel}` : ''}</Button>)}</div> : null}
          <Button type="button" variant="secondary" size="sm" onClick={() => { setReplacementIndex(index); setCatalogQuery(candidate.label); }} style={{ marginTop: 8 }} leftIcon={<Search size={14} />}>Search catalog</Button>
        </div>)}
      </Card>}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><strong>{replacementIndex == null ? 'Add a food' : `Replace “${recognition.data?.candidates[replacementIndex]?.label ?? 'food'}”`}</strong>{replacementIndex != null && <Button type="button" variant="secondary" size="sm" onClick={() => { setReplacementIndex(null); setCatalogQuery(''); }} leftIcon={<X size={14} />}>Cancel</Button>}</div>
        <div style={{ marginTop: 8 }}><Input placeholder="Search the canonical food catalog" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} leftIcon={<Search size={16} />} autoComplete="off" /></div>
        {catalogLoading && catalogQuery && <LoadingSpinner label="Searching foods..." size={18} />}
        {catalogQuery && !catalogLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>{(catalogData?.items ?? []).map((food) => <button key={food.id} type="button" onClick={() => replaceWithCatalogFood(food)} style={{ textAlign: 'left', padding: '9px 10px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}><strong>{food.displayName ?? food.name}</strong>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)' }}>{food.variantLabel}</small>}</button>)}</div>}
      </Card>

      {reviewItems.length > 0 && <Card><form onSubmit={saveMeal} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Save confirmed meal</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><Select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)} options={[{ value: 'BREAKFAST', label: 'Breakfast' }, { value: 'LUNCH', label: 'Lunch' }, { value: 'DINNER', label: 'Dinner' }, { value: 'SNACK', label: 'Snack' }]} /><Input type="datetime-local" value={consumedAt} onChange={(event) => setConsumedAt(event.target.value)} /></div><Button type="submit" variant="primary" disabled={!canSave || createMeal.isPending}>{createMeal.isPending ? 'Saving and evaluating...' : 'Confirm & save meal'}</Button>{hasBlockingItems && <p style={{ color: 'var(--color-accent)', fontSize: '0.8rem' }}>Review or replace every detected food before continuing.</p>}</form></Card>}

      <Card><p style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem' }}><Search size={15} /> Recognition only identifies foods. Confirmed canonical foods use the existing deterministic nutrition engine.</p></Card>
    </div>
  );
};

interface ReviewItemCardProps {
  item: ReviewItem;
  index: number;
  total: number;
  onUpdate: (key: string, update: Partial<ReviewItem>) => void;
  onRemove: (key: string, detectionIndex?: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onReplace: (detectionIndex?: number) => void;
  onRetry: (candidate: FoodRecognitionCandidate, key: string, detectionIndex?: number) => void;
}

const ReviewItemCard: React.FC<ReviewItemCardProps> = ({ item, index, total, onUpdate, onRemove, onMove, onReplace, onRetry }) => {
  const selectedServing: Serving | undefined = item.food?.servings.find((serving) => serving.id === item.selectedServingId) ?? item.food?.servings[0];
  return <div style={{ padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-surface-secondary)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div><strong>{displayCandidate(item.candidate)}</strong>{item.candidate.foodVariantLabel && <small style={{ display: 'block', color: 'var(--text-muted)' }}>{item.candidate.foodVariantLabel}</small>}<small style={{ display: 'block', marginTop: 3, color: item.candidate.confidence < 0.75 ? 'var(--color-accent)' : 'var(--text-muted)' }}>{Math.round(item.candidate.confidence * 100)}% recognition confidence{item.candidate.confidence < 0.75 ? ' · Please check' : ''}</small></div><div style={{ display: 'flex', gap: 3 }}><button type="button" aria-label="Move food up" disabled={index === 0} onClick={() => onMove(index, -1)} style={iconButtonStyle}><ChevronUp size={16} /></button><button type="button" aria-label="Move food down" disabled={index === total - 1} onClick={() => onMove(index, 1)} style={iconButtonStyle}><ChevronDown size={16} /></button><button type="button" aria-label={`Replace ${displayCandidate(item.candidate)}`} onClick={() => onReplace(item.detectionIndex)} style={iconButtonStyle}><Search size={16} /></button><button type="button" aria-label={`Remove ${displayCandidate(item.candidate)}`} onClick={() => onRemove(item.key, item.detectionIndex)} style={{ ...iconButtonStyle, color: 'var(--color-danger)' }}><Trash2 size={16} /></button></div></div>
    {item.loading ? <LoadingSpinner label="Loading serving options..." size={18} /> : item.error ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)', marginTop: 8 }}><AlertCircle size={16} />{item.error}<button type="button" onClick={() => onRetry(item.candidate, item.key, item.detectionIndex)} aria-label="Retry loading food"><RefreshCw size={15} /></button></div> : item.food && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}><Select aria-label={`Serving for ${displayCandidate(item.candidate)}`} value={item.selectedServingId} onChange={(event) => onUpdate(item.key, { selectedServingId: event.target.value })} options={item.food.servings.map((serving) => ({ value: serving.id, label: `${serving.name} (${serving.grams} g)` }))} /><Input aria-label={`Quantity for ${displayCandidate(item.candidate)}`} type="number" min="0.25" step="0.25" value={item.quantity} onChange={(event) => onUpdate(item.key, { quantity: event.target.value })} />{selectedServing && <small style={{ color: 'var(--text-muted)' }}>Using {selectedServing.name}; nutrient evaluation uses the canonical serving and quantity.</small>}</div>}
  </div>;
};

const iconButtonStyle: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 4, color: 'var(--text-secondary)', cursor: 'pointer' };
