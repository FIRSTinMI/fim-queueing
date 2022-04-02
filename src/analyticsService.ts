import { Analytics, getAnalytics, logEvent } from 'firebase/analytics';

export default class AnalyticsService {
  private static analytics: Analytics;

  public static logEvent(name: string, values: object): void {
    if (!AnalyticsService.analytics) {
      AnalyticsService.analytics = getAnalytics();
    }

    logEvent(AnalyticsService.analytics, name, values);
  }
}
