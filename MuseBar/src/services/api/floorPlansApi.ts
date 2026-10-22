import { request } from './core';

export interface FloorPlanDto {
  id: number;
  establishment_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export async function listFloorPlans(): Promise<FloorPlanDto[]> {
  const res = await request<{ plans: FloorPlanDto[] }>('/floor/plans');
  return res.plans;
}

export async function createFloorPlan(name: string): Promise<FloorPlanDto> {
  const res = await request<{ plan: FloorPlanDto }>('/floor/plans', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.plan;
}

export async function updateFloorPlan(
  id: number,
  patch: Partial<Pick<FloorPlanDto, 'name' | 'display_order' | 'is_active'>>
): Promise<FloorPlanDto> {
  const res = await request<{ plan: FloorPlanDto }>(`/floor/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return res.plan;
}

export async function deleteFloorPlan(id: number): Promise<void> {
  await request(`/floor/plans/${id}`, { method: 'DELETE' });
}
