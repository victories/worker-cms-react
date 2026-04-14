// Theme dispatch helper — selects the correct Layout component based on template setting
import { Layout } from '../components/Layout';
import { LayoutModern } from '../components/LayoutModern';
import { LayoutVelvet } from '../components/LayoutVelvet';
import { LayoutPublisher } from '../components/LayoutPublisher';

export function getLayoutComponent(template: string) {
  switch (template) {
    case 'modern':
      return LayoutModern;
    case 'velvet':
      return LayoutVelvet;
    case 'publisher':
      return LayoutPublisher;
    case 'starter':
    default:
      return Layout;
  }
}
