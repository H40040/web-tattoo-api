export type TemplateCode = 'MODERNO' | 'CLASSICO' | 'MINIMALISTA' | 'ARTESANAL' | 'URBANO';

export const TEMPLATE_CATALOG: { code: TemplateCode; label: string; isPremium: boolean }[] = [
  { code: 'MODERNO', label: 'Moderno', isPremium: false },
  { code: 'CLASSICO', label: 'Clássico', isPremium: false },
  { code: 'MINIMALISTA', label: 'Minimalista', isPremium: false },
  { code: 'ARTESANAL', label: 'Artesanal', isPremium: true },
  { code: 'URBANO', label: 'Urbano', isPremium: true },
];

export function isPremiumTemplate(code: string): boolean {
  const item = TEMPLATE_CATALOG.find(t => t.code === code);
  return item?.isPremium ?? false;
}
