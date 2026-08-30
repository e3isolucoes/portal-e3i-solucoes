import { TrustLevel, ContextContentType } from '../context/ContextTypes';

export class ContentTrustClassifier {
  static classify(contentType: ContextContentType, isExternalSource: boolean = false): TrustLevel {
    if (isExternalSource || contentType === 'UNTRUSTED_EXTERNAL_CONTENT') {
      return 'UNTRUSTED_EXTERNAL';
    }

    switch (contentType) {
      case 'SYSTEM_RULE':
        return 'SYSTEM_TRUSTED';
      case 'TENANT_CONTEXT':
        return 'APPLICATION_TRUSTED';
      case 'CONFIRMED_BUSINESS_FACT':
        return 'BUSINESS_CONFIRMED';
      case 'USER_INPUT':
        return 'USER_PROVIDED';
      case 'INFERENCE':
        return 'APPLICATION_TRUSTED';
      default:
        return 'UNTRUSTED_EXTERNAL';
    }
  }

  static enforceBoundary(trustLevel: TrustLevel): TrustLevel {
    // Fundamental rule: UNTRUSTED_EXTERNAL never transforms into SYSTEM_TRUSTED
    if (trustLevel === 'UNTRUSTED_EXTERNAL') {
      return 'UNTRUSTED_EXTERNAL';
    }
    return trustLevel;
  }
}
