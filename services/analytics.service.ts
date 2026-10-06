import { BaseRepository } from '@/repositories/base'

export class AnalyticsService extends BaseRepository {
  async trackEvent(eventName: string, payload: unknown) {
    // Future implementation: Push to external analytics service (e.g. PostHog, Google Analytics)
    console.log(`[Analytics] ${eventName}:`, payload)
  }
}
