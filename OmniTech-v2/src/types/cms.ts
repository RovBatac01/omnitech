/** Shared, client-safe data contract. No database imports in this module. */
export type AdminRole = 'owner' | 'admin';
export type AdminUser = { id: string; name: string; email: string; role: AdminRole; active: boolean; createdAt: string };
export type AdminSession = { user: AdminUser; csrfToken: string };
export type PublicationStatus = 'draft' | 'published';
export interface CmsService {
  id: string; slug: string; title: string; short: string; icon: string; description: string;
  details: string[]; outcome: string; official: boolean; category: string; filterCategory: string;
  shortDescription: string; benefits: string[]; aliases: string[]; featured: boolean;
  status: PublicationStatus; sortOrder: number; updatedAt: string;
}
export interface CmsProject {
  id: string; slug: string; title: string; description: string; serviceSlugs: string[];
  stack: string[]; creativeTypes: string[]; projectType: 'concept' | 'completed';
  imageUrl: string; imageAlt: string; visualType: string;
  opportunity: string; approach: string; demonstration: string;
  client: string; completedAt: string; featured: boolean; status: PublicationStatus;
  videoUrl: string; captionsUrl: string; transcript: string;
  sortOrder: number; updatedAt: string;
}
export interface CmsAnnouncement {
  id: string; slug: string; title: string; summary: string; body: string;
  type: 'announcement' | 'promotion'; imageUrl: string; imageAlt: string;
  ctaLabel: string; ctaUrl: string; startsAt: string; endsAt: string;
  featured: boolean; status: PublicationStatus; sortOrder: number; updatedAt: string;
}
export interface SiteSettings {
  businessName: string; tagline: string;
  /** Legacy shared logo retained for non-destructive upgrades. */
  logoUrl: string; logoAlt: string;
  logoLightUrl: string; logoLightAlt: string; logoDarkUrl: string; logoDarkAlt: string;
  defaultTheme: 'light' | 'dark' | 'system';
  contactEmail: string; phone: string; address: string;
  heroEyebrow: string; heroTitle: string; heroAccent: string; heroDescription: string;
  aboutTitle: string; aboutDescription: string; mission: string; vision: string;
  ctaTitle: string; ctaDescription: string; socialLinks: { label: string; url: string }[];
  analyticsEnabled: boolean; accessibilityEmail: string; inquiryRetentionDays: number;
}
export interface Inquiry {
  id: string; reference: string; name: string; email: string; phone: string; company: string;
  service: string; subject: string; message: string; preferredContactMethod: 'email' | 'phone';
  status: 'new' | 'contacted' | 'quoted' | 'closed' | 'spam'; notes: string;
  createdAt: string; updatedAt: string; emailStatus: 'pending' | 'sent' | 'failed' | 'not_configured';
  emailAttempts: number; emailError: string; emailSentAt: string | null;
}
export interface DashboardData {
  days: number; totals: { pageViews: number; visitors: number; ctaClicks: number; inquiries: number; newInquiries: number; publishedProjects: number; publishedServices: number; pendingEmails: number };
  daily: { date: string; views: number; visitors: number; inquiries: number }[];
  topPages: { path: string; views: number }[];
  recentInquiries: Inquiry[]; recentActivity: { id: string; action: string; detail: string; createdAt: string }[];
  mail: { configured: boolean; recipients: string[] };
}
export type ContentKind = 'services' | 'projects' | 'announcements';
export type CmsEntry = CmsService | CmsProject | CmsAnnouncement;
