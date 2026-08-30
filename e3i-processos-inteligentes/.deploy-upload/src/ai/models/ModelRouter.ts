import { AIConfig } from '../config/AIConfig';
import { ModelProfile } from './ModelProvider';

export class ModelRouter {
  static resolveModel(profile: ModelProfile): string {
    switch (profile) {
      case 'FAST':
        return AIConfig.models.fast;
      case 'BALANCED':
      case 'REASONING':
        return AIConfig.models.balanced;
      case 'NO_MODEL':
      default:
        return '';
    }
  }
}
