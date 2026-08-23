import React, { useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Search, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useFoodRecognition } from '../hooks/useFoodRecognition';
import { useFoodDetail } from '@/features/foods/hooks/useFoods';
import { FoodEvaluationModal } from '@/features/food-evaluation/components/FoodEvaluationModal';
import type { FoodDetail, Serving } from '@/features/foods/types/foods.types';
import { preferredServing } from '@/features/foods/utils/serving';

export const FoodRecognitionPage: React.FC = () => {
  const recognition = useFoodRecognition();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState('image/jpeg');
  const [selectedFoodId, setSelectedFoodId] = useState<string>();
  const [servingId, setServingId] = useState<string>();
  const [quantity, setQuantity] = useState('1');
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const { data: food } = useFoodDetail(selectedFoodId);
  const selectedServing = food?.servings.find((serving) => serving.id === servingId) ?? preferredServing(food?.servings ?? []) ?? null;
  const handleFile = (file?: File) => { if (!file) return; setSelectedMimeType(file.type || 'image/jpeg'); const reader = new FileReader(); reader.onload = () => setSelectedFile(String(reader.result).split(',')[1] ?? null); reader.readAsDataURL(file); };
  const recognize = () => { if (selectedFile) recognition.mutate({ imageData: selectedFile, mimeType: selectedMimeType }); };
  const selectCandidate = (foodId: string | null) => { if (!foodId) return; setSelectedFoodId(foodId); setServingId(undefined); setQuantity('1'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Scan a Food" subtitle="Take a photo, confirm what NutriApp sees, then check the portion against your goals." />
      <Card style={{ border: '1.5px solid var(--border-light)' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center', textAlign: 'center' }}><Camera size={32} color="var(--color-primary)" /><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Images suggest foods. You always confirm the food and portion before evaluation.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}><label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-full)', padding: '9px 14px', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}><ImagePlus size={16} /> Choose image<input type="file" accept="image/*" capture="environment" hidden onChange={(event) => handleFile(event.target.files?.[0])} /></label><Button variant="primary" onClick={recognize} disabled={!selectedFile || recognition.isPending}>Recognize food</Button></div>{selectedFile && <Badge variant="success" icon={<CheckCircle2 size={12} />}>Image ready for recognition</Badge>}</div></Card>
      {recognition.isPending && <LoadingSpinner label="Looking for foods in your image..." />}
      {recognition.isError && <Card style={{ color: 'var(--color-danger)' }}>Could not recognize this image. {recognition.error.message}</Card>}
      {recognition.data && <Card><h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>Confirm what you see</h2>{!recognition.data.providerAvailable && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>Image recognition is not configured yet. Use the food catalog to select a canonical food.</p>}{recognition.data.candidates.length === 0 ? <div style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}><TriangleAlert size={16} /> No reliable candidates were returned. Try a clearer image or use the food catalog.</div> : recognition.data.candidates.map((candidate) => <div key={`${candidate.label}-${candidate.foodId ?? 'unmatched'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border-light)' }}><div><strong>{candidate.foodName ?? candidate.label}</strong><p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{Math.round(candidate.confidence * 100)}% confidence · {candidate.nutritionSource === 'canonical-database' ? 'Canonical database nutrition' : candidate.nutritionSource === 'ai-estimated' ? 'AI-estimated, review required' : 'No nutrition match'}</p></div>{candidate.foodId ? <Button size="sm" variant="secondary" onClick={() => selectCandidate(candidate.foodId)}>Confirm</Button> : <Badge variant="warning">Needs review</Badge>}</div>)}{recognition.data.limitations.map((limitation) => <p key={limitation} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>{limitation}</p>)}</Card>}
      {selectedFoodId && <Card><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Adjust your portion</h2>{food ? <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}><strong>{food.name}</strong><select value={selectedServing?.id ?? ''} onChange={(event) => setServingId(event.target.value)} style={{ padding: 9, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>{food.servings.map((serving) => <option key={serving.id} value={serving.id}>{serving.name} ({serving.grams} g)</option>)}</select><label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Number of portions<input type="number" min="0.25" step="0.25" value={quantity} onChange={(event) => setQuantity(event.target.value)} style={{ display: 'block', marginTop: 4, padding: 8, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} /></label><Button variant="primary" onClick={() => setEvaluationOpen(true)} disabled={!selectedServing || !quantity}>Evaluate confirmed portion</Button></div> : <LoadingSpinner label="Loading canonical food details..." size={20} />}</Card>}
      <FoodEvaluationModal isOpen={evaluationOpen} onClose={() => setEvaluationOpen(false)} food={food as FoodDetail | null} selectedServing={selectedServing as Serving | null} quantity={quantity} />
      <Card><p style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem' }}><Search size={15} /> Recognition is an assistant. Confirmed canonical foods use the deterministic nutrition engine.</p></Card>
    </div>
  );
};
