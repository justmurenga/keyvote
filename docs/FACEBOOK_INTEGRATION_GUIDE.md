# myVote Kenya - Facebook Integration Complete Guide

## 📋 Overview

This guide provides comprehensive instructions for creating a Facebook page for myVote Kenya and integrating it with your website.

---

## 🎯 What's Included

This integration package includes:

1. **Content Guide** ([FACEBOOK_CONTENT_GUIDE.md](./FACEBOOK_CONTENT_GUIDE.md))
   - Complete Facebook page content
   - 7 days of launch posts
   - Ongoing content calendar
   - Hashtag strategy
   - Engagement templates

2. **Image Design Guide** ([FACEBOOK_IMAGE_GUIDE.md](./FACEBOOK_IMAGE_GUIDE.md))
   - Profile picture specifications
   - Cover photo templates
   - Post image templates
   - Design tools and resources
   - Free stock photo sources

3. **Setup Guide** ([FACEBOOK_SETUP_GUIDE.md](./FACEBOOK_SETUP_GUIDE.md))
   - Step-by-step Facebook page creation
   - Settings configuration
   - Analytics setup
   - Advertising guide
   - Compliance checklist

4. **Website Integration** (This Document)
   - Social sharing features
   - Facebook metadata
   - Admin dashboard for social settings

---

## 🚀 Quick Start (30 Minutes)

### Phase 1: Create Facebook Page (15 minutes)

1. **Go to Facebook**
   - Visit: https://www.facebook.com/pages/create
   - Log in with your Facebook account

2. **Enter Basic Info**
   ```
   Page Name: myVote Kenya
   Category: Government & Politics, Voting Service
   Description: Kenya's trusted election management platform
   ```

3. **Upload Images**
   - Profile Picture: 500x500px (logo)
   - Cover Photo: 1640x624px (see image guide for templates)

4. **Create Username**
   - Username: `@myvotekenya`
   - Your URL: facebook.com/myvotekenya

5. **Complete About Section**
   - Copy from [FACEBOOK_CONTENT_GUIDE.md](./FACEBOOK_CONTENT_GUIDE.md)
   - Add contact information
   - Set business hours

### Phase 2: Initial Content (15 minutes)

1. **Create Welcome Post**
   - Use Post 1 from content guide
   - Upload accompanying image
   - Add hashtags: #myVoteKenya #KenyanDemocracy

2. **Schedule Week 1 Posts**
   - Schedule 6 more posts from content guide
   - Space them out over 7 days
   - Best times: 8-9 AM, 1-2 PM, 7-8 PM

3. **Invite Connections**
   - Invite team members as admins
   - Invite friends to like page
   - Share on personal profile

---

## 🔗 Website Integration

### What's Already Integrated

The myVote Kenya website already includes:

✅ **Footer Social Links**
- Facebook, Instagram, TikTok icons
- Auto-populated from system settings
- Located in: `apps/web/src/components/layout/site-footer.tsx`

✅ **Open Graph Meta Tags**
- Optimized for Facebook sharing
- Includes proper images and descriptions
- Located in: `apps/web/src/app/layout.tsx`

✅ **Social Share Components**
- Share buttons for Facebook, Twitter, WhatsApp, etc.
- Located in: `apps/web/src/components/ui/social-share.tsx`

✅ **Admin Dashboard**
- Manage social media URLs
- Update contact information
- Located in: `apps/web/src/app/dashboard/admin/social-media/page.tsx`

### How to Update Social Media Links

#### Option 1: Via Admin Dashboard (Recommended)

1. Log in to myVote Kenya admin panel
2. Navigate to: **Dashboard → Admin → Social Media**
3. Update the following fields:
   ```
   Facebook Page URL: https://facebook.com/myvotekenya
   Instagram URL: https://instagram.com/myvotekenya
   TikTok URL: https://tiktok.com/@myvotekenya
   Support Email: support@myvote.ke
   Support Phone: +254 733 638 940
   WhatsApp: +254 733 638 940
   USSD Code: *384*VOTE#
   ```
4. Click "Save Changes"

#### Option 2: Direct Database Update

If the admin interface is not yet deployed, update directly in Supabase:

```sql
-- Update social media settings
UPDATE system_settings
SET value = value || '{
  "facebookUrl": "https://facebook.com/myvotekenya",
  "instagramUrl": "https://instagram.com/myvotekenya",
  "tiktokUrl": "https://tiktok.com/@myvotekenya",
  "supportEmail": "support@myvote.ke",
  "supportPhone": "+254 733 638 940",
  "whatsappPhone": "+254 733 638 940",
  "ussdCode": "*384*VOTE#"
}'::jsonb
WHERE key = 'general';
```

---

## 📱 Using Social Share Features

### 1. Share Entire Pages

Add to any page component:

```tsx
import { SocialShare } from '@/components/ui/social-share';

// In your component
<SocialShare 
  url="https://myvote.ke/candidates/profile/123"
  title="Check out this candidate on myVote Kenya"
  hashtags={['myVoteKenya', 'KenyaElections2027']}
/>
```

### 2. Facebook-Only Share Button

For quick Facebook sharing:

```tsx
import { FacebookShareButton } from '@/components/ui/social-share';

<FacebookShareButton 
  url="https://myvote.ke/polls/results/456"
  showLabel={true}
/>
```

### 3. Share Candidate Profiles

Example implementation for candidate pages:

```tsx
// apps/web/src/app/candidates/[id]/page.tsx

import { SocialShare } from '@/components/ui/social-share';

export default function CandidatePage({ params }) {
  const candidateUrl = `https://myvote.ke/candidates/${params.id}`;
  
  return (
    <div>
      {/* Candidate info */}
      
      <div className="flex gap-2">
        <SocialShare 
          url={candidateUrl}
          title={`${candidate.name} - ${candidate.position}`}
          description={candidate.manifesto}
          hashtags={['myVoteKenya', candidate.county]}
        />
      </div>
    </div>
  );
}
```

### 4. Share Poll Results

```tsx
<SocialShare 
  url={`https://myvote.ke/polls/results/${pollId}`}
  title="Opinion Poll Results - myVote Kenya"
  description={`See the latest poll results for ${pollTitle}`}
  hashtags={['myVoteKenya', 'OpinionPoll', county]}
/>
```

---

## 🎨 Facebook Sharing Optimization

### Open Graph Tags

The website automatically includes Open Graph tags for rich Facebook previews:

```html
<meta property="og:title" content="myVote Kenya - Empowering Democracy" />
<meta property="og:description" content="Kenya's comprehensive election management platform..." />
<meta property="og:image" content="https://myvote.ke/og-image.png" />
<meta property="og:url" content="https://myvote.ke" />
<meta property="og:type" content="website" />
<meta property="fb:app_id" content="YOUR_FACEBOOK_APP_ID" />
```

### Creating OG Images

You need to create an Open Graph image for optimal sharing:

**Requirements:**
- Dimensions: 1200x630px
- Format: PNG or JPG
- File size: Under 8MB
- Location: `apps/web/public/og-image.png`

**Design Template:**
```
┌─────────────────────────────────────┐
│  [myVote Kenya Logo]                │
│                                      │
│  myVote Kenya                       │
│  Empowering Democracy               │
│                                      │
│  🗳️ Follow Candidates               │
│  📊 Opinion Polls                   │
│  📱 Real-time Results               │
│                                      │
│  www.myvote.ke  |  🇰🇪              │
└─────────────────────────────────────┘
```

Use Canva or any design tool to create this.

---

## 🔧 Advanced Integration

### Facebook Pixel (For Advertising)

To track conversions and build audiences:

1. **Create Facebook Pixel**
   - Go to: business.facebook.com
   - Events Manager → Create Pixel
   - Name: "myVote Kenya Pixel"

2. **Install Pixel Code**
   
   Create: `apps/web/src/components/providers/facebook-pixel.tsx`

   ```tsx
   'use client';
   
   import { useEffect } from 'react';
   import { usePathname, useSearchParams } from 'next/navigation';
   
   export function FacebookPixel() {
     const pathname = usePathname();
     const searchParams = useSearchParams();
   
     useEffect(() => {
       if (typeof window !== 'undefined' && window.fbq) {
         window.fbq('track', 'PageView');
       }
     }, [pathname, searchParams]);
   
     return null;
   }
   ```

3. **Add to Layout**
   
   In `apps/web/src/app/layout.tsx`:

   ```tsx
   import { FacebookPixel } from '@/components/providers/facebook-pixel';
   import Script from 'next/script';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <head>
           <Script
             id="facebook-pixel"
             strategy="afterInteractive"
             dangerouslySetInnerHTML={{
               __html: `
                 !function(f,b,e,v,n,t,s)
                 {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                 n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                 if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                 n.queue=[];t=b.createElement(e);t.async=!0;
                 t.src=v;s=b.getElementsByTagName(e)[0];
                 s.parentNode.insertBefore(t,s)}(window, document,'script',
                 'https://connect.facebook.net/en_US/fbevents.js');
                 fbq('init', '${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}');
               `,
             }}
           />
         </head>
         <body>
           <FacebookPixel />
           {children}
         </body>
       </html>
     );
   }
   ```

4. **Add Environment Variable**
   
   In `.env.local`:
   ```
   NEXT_PUBLIC_FACEBOOK_PIXEL_ID=your_pixel_id_here
   NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id_here
   ```

### Facebook Login (Optional)

To allow users to sign in with Facebook:

1. **Create Facebook App**
   - Go to: developers.facebook.com
   - Create New App
   - Add Facebook Login product

2. **Configure OAuth**
   - Valid OAuth Redirect URIs: `https://myvote.ke/auth/callback`
   - Allowed Domains: `myvote.ke`

3. **Implement in Supabase**
   
   Supabase already supports Facebook login:
   
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'facebook',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`,
       scopes: 'email public_profile',
     },
   });
   ```

---

## 📊 Tracking & Analytics

### Facebook Page Insights

Access built-in analytics:

1. Go to your Facebook Page
2. Click "Insights" in left menu
3. Track:
   - Page likes/followers
   - Post reach and engagement
   - Demographics (age, location, gender)
   - Best posting times

### Website Traffic from Facebook

Track in Google Analytics:

1. Go to: Acquisition → All Traffic → Source/Medium
2. Filter by: `facebook / referral`
3. Track:
   - Sessions from Facebook
   - Conversion rate
   - Bounce rate
   - Popular pages

### Link Tracking with UTM Parameters

Add UTM parameters to Facebook posts:

```
https://myvote.ke/candidates?utm_source=facebook&utm_medium=social&utm_campaign=launch_week
```

Track in analytics to see which posts drive traffic.

---

## ✅ Integration Checklist

### Pre-Launch
- [ ] Facebook page created (@myvotekenya)
- [ ] Profile picture and cover photo uploaded
- [ ] About section completed
- [ ] Contact information added
- [ ] Username created
- [ ] Welcome post published
- [ ] Week 1 posts scheduled

### Website Integration
- [ ] Social media URLs updated in admin dashboard
- [ ] Footer links verified (click each icon)
- [ ] Open Graph image created (og-image.png)
- [ ] Social share buttons tested
- [ ] Mobile preview checked

### Optional Advanced Features
- [ ] Facebook Pixel installed
- [ ] Conversion tracking set up
- [ ] Facebook Login configured
- [ ] UTM parameters added to posts
- [ ] Analytics tracking verified

### Marketing
- [ ] Page shared on team's personal profiles
- [ ] Friends invited to like page
- [ ] Cross-promoted on other platforms
- [ ] Email signature updated
- [ ] Business cards updated

---

## 🎯 Next Steps

### Week 1: Launch
1. Publish welcome post
2. Post daily content
3. Respond to all comments
4. Share page everywhere
5. Invite 100+ people

### Week 2: Engagement
1. Continue daily posting
2. Start engagement campaigns
3. Share user testimonials
4. Run first poll
5. Analyze insights

### Month 1: Growth
1. Review analytics
2. Optimize posting times
3. Create video content
4. Run first ad campaign
5. Target 1,000 followers

### Month 2-3: Scaling
1. User-generated content
2. Partnerships with influencers
3. Live sessions
4. Advanced targeting
5. Target 10,000 followers

---

## 📞 Support & Resources

### Documentation
- Content Guide: [FACEBOOK_CONTENT_GUIDE.md](./FACEBOOK_CONTENT_GUIDE.md)
- Image Guide: [FACEBOOK_IMAGE_GUIDE.md](./FACEBOOK_IMAGE_GUIDE.md)
- Setup Guide: [FACEBOOK_SETUP_GUIDE.md](./FACEBOOK_SETUP_GUIDE.md)

### Facebook Resources
- Help Center: https://www.facebook.com/help
- Business Help: https://www.facebook.com/business/help
- Blueprint: https://www.facebook.com/business/learn

### Design Tools
- Canva: https://canva.com (Easy design)
- Unsplash: https://unsplash.com (Free images)
- Remove.bg: https://remove.bg (Background removal)

### Development
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Facebook Developers: https://developers.facebook.com

---

## 🎉 You're Ready!

You now have everything you need to:

1. ✅ Create a professional Facebook page
2. ✅ Design eye-catching graphics
3. ✅ Publish engaging content
4. ✅ Integrate with your website
5. ✅ Track performance
6. ✅ Grow your audience

**Start with the Quick Start guide above, then dive deeper into each document as needed.**

Good luck with your Facebook page launch! 🇰🇪 🗳️

---

*Last Updated: April 20, 2026*
*Version: 1.0*
