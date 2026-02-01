import { TicketCategory, TicketPriority, ClassificationResult } from '../models/ticket.js';

const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  [TicketCategory.ACCOUNT_ACCESS]: [
    'login',
    'password',
    'sign in',
    'authentication',
    '2fa',
    'two factor',
    'access denied',
    'locked out',
    'forgot password',
    'reset password',
    'cannot log in',
    'can\'t log in',
    'unable to login'
  ],
  [TicketCategory.TECHNICAL_ISSUE]: [
    'error',
    'bug',
    'crash',
    'broken',
    'not working',
    'doesn\'t work',
    'fails',
    'failure',
    'issue',
    'problem',
    '500 error',
    '404',
    'exception',
    'stack trace'
  ],
  [TicketCategory.BILLING_QUESTION]: [
    'payment',
    'invoice',
    'billing',
    'charge',
    'refund',
    'subscription',
    'price',
    'cost',
    'credit card',
    'receipt',
    'transaction',
    'overcharged',
    'cancel subscription'
  ],
  [TicketCategory.FEATURE_REQUEST]: [
    'feature',
    'enhancement',
    'suggestion',
    'would like',
    'could you add',
    'please add',
    'new feature',
    'improve',
    'improvement',
    'request',
    'wish',
    'want'
  ],
  [TicketCategory.BUG_REPORT]: [
    'bug',
    'defect',
    'incorrect',
    'wrong',
    'unexpected',
    'reproduce',
    'steps to reproduce',
    'regression',
    'should work',
    'expected',
    'actual'
  ],
  [TicketCategory.OTHER]: []
};

const PRIORITY_KEYWORDS = {
  [TicketPriority.URGENT]: [
    'can\'t access',
    'cannot access',
    'critical',
    'production down',
    'security',
    'urgent',
    'emergency',
    'immediately',
    'asap',
    'data loss',
    'outage',
    'down'
  ],
  [TicketPriority.HIGH]: [
    'important',
    'blocking',
    'high priority',
    'need soon',
    'customers affected',
    'revenue impact'
  ],
  [TicketPriority.MEDIUM]: [],
  [TicketPriority.LOW]: [
    'minor',
    'cosmetic',
    'suggestion',
    'nice to have',
    'low priority',
    'when you have time'
  ]
};

export class ClassificationService {
  classify(subject: string, description: string): ClassificationResult {
    const text = `${subject} ${description}`.toLowerCase();

    // Classify category
    const { category, categoryConfidence, categoryKeywords } = this.classifyCategory(text);

    // Classify priority
    const { priority, priorityConfidence, priorityKeywords } = this.classifyPriority(text);

    // Combined confidence
    const confidence = Math.min((categoryConfidence + priorityConfidence) / 2, 1.0);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      category,
      priority,
      categoryKeywords,
      priorityKeywords,
      categoryConfidence,
      priorityConfidence
    );

    const allKeywords = [...categoryKeywords, ...priorityKeywords];

    const result: ClassificationResult = {
      category,
      priority,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
      keywords: allKeywords
    };

    // Structured log for auditability
    console.info(
      JSON.stringify({
        event: 'ticket_classification',
        subject,
        description,
        category: result.category,
        priority: result.priority,
        confidence: result.confidence,
        keywords: result.keywords,
        timestamp: new Date().toISOString()
      })
    );

    return result;
  }

  private classifyCategory(text: string): {
    category: TicketCategory;
    categoryConfidence: number;
    categoryKeywords: string[];
  } {
    const scores: Map<TicketCategory, { score: number; keywords: string[] }> = new Map();

    // Calculate scores for each category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === TicketCategory.OTHER) continue;

      const matchedKeywords: string[] = [];
      let score = 0;

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          matchedKeywords.push(keyword);
          // Higher weight for exact phrase matches
          score += keyword.split(' ').length > 1 ? 0.3 : 0.15;
        }
      }

      if (matchedKeywords.length > 0) {
        scores.set(category as TicketCategory, { score, keywords: matchedKeywords });
      }
    }

    // Find category with highest score
    let bestCategory = TicketCategory.OTHER;
    let bestScore = 0;
    let bestKeywords: string[] = [];

    for (const [category, { score, keywords }] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
        bestKeywords = keywords;
      }
    }

    // Default to OTHER if confidence is too low
    const confidence = bestScore < 0.3 ? 0.2 : Math.min(bestScore, 1.0);
    if (confidence < 0.3) {
      bestCategory = TicketCategory.OTHER;
      bestKeywords = [];
    }

    return {
      category: bestCategory,
      categoryConfidence: confidence,
      categoryKeywords: bestKeywords
    };
  }

  private classifyPriority(text: string): {
    priority: TicketPriority;
    priorityConfidence: number;
    priorityKeywords: string[];
  } {
    const matchedPriorities: Array<{
      priority: TicketPriority;
      keywords: string[];
      score: number;
    }> = [];

    // Check urgent keywords
    const urgentKeywords = PRIORITY_KEYWORDS[TicketPriority.URGENT].filter(kw =>
      text.includes(kw)
    );
    if (urgentKeywords.length > 0) {
      matchedPriorities.push({
        priority: TicketPriority.URGENT,
        keywords: urgentKeywords,
        score: urgentKeywords.length * 0.4
      });
    }

    // Check high priority keywords
    const highKeywords = PRIORITY_KEYWORDS[TicketPriority.HIGH].filter(kw => text.includes(kw));
    if (highKeywords.length > 0) {
      matchedPriorities.push({
        priority: TicketPriority.HIGH,
        keywords: highKeywords,
        score: highKeywords.length * 0.3
      });
    }

    // Check low priority keywords
    const lowKeywords = PRIORITY_KEYWORDS[TicketPriority.LOW].filter(kw => text.includes(kw));
    if (lowKeywords.length > 0) {
      matchedPriorities.push({
        priority: TicketPriority.LOW,
        keywords: lowKeywords,
        score: lowKeywords.length * 0.2
      });
    }

    // Return highest priority match, or default to MEDIUM
    if (matchedPriorities.length === 0) {
      return {
        priority: TicketPriority.MEDIUM,
        priorityConfidence: 0.5,
        priorityKeywords: []
      };
    }

    // Sort by priority level (urgent > high > low)
    matchedPriorities.sort((a, b) => {
      const priorityOrder = {
        [TicketPriority.URGENT]: 0,
        [TicketPriority.HIGH]: 1,
        [TicketPriority.LOW]: 2,
        [TicketPriority.MEDIUM]: 3
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const best = matchedPriorities[0];
    return {
      priority: best.priority,
      priorityConfidence: Math.min(best.score, 1.0),
      priorityKeywords: best.keywords
    };
  }

  private generateReasoning(
    category: TicketCategory,
    priority: TicketPriority,
    categoryKeywords: string[],
    priorityKeywords: string[],
    categoryConfidence: number,
    priorityConfidence: number
  ): string {
    const parts: string[] = [];

    // Category reasoning
    if (category === TicketCategory.OTHER) {
      parts.push('Categorized as "other" due to insufficient matching keywords.');
    } else if (categoryKeywords.length > 0) {
      parts.push(
        `Categorized as "${category}" based on keywords: ${categoryKeywords.join(', ')}.`
      );
    }

    // Priority reasoning
    if (priorityKeywords.length > 0) {
      parts.push(
        `Priority set to "${priority}" based on keywords: ${priorityKeywords.join(', ')}.`
      );
    } else {
      parts.push(`Priority defaulted to "${priority}" (no specific priority indicators found).`);
    }

    // Confidence note
    const avgConfidence = (categoryConfidence + priorityConfidence) / 2;
    if (avgConfidence < 0.4) {
      parts.push('Confidence is low; manual review recommended.');
    }

    return parts.join(' ');
  }
}

export const classificationService = new ClassificationService();
