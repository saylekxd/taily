# Taily Landing Page - Prompt for Bolt.new

## Project Overview
Create a simple, modern landing page for a children's AI story app called "Taily" using Next.js 14, TypeScript, and Tailwind CSS. The design should be clean, child-friendly, and optimized for mobile devices.

## Technical Stack Requirements

### Core Technologies
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React useState for simple language toggle (EN primary, PL secondary)
- Framer Motion for subtle animations

### Project Structure
```
app/
  page.tsx
  layout.tsx
  privacy-policy/
    page.tsx
  terms-of-use/
    page.tsx
  components/
    Hero.tsx
    Features.tsx
    Pricing.tsx
    Footer.tsx
    LanguageToggle.tsx
  lib/
    translations.ts
  data/
    translations.json
```

## Design Requirements

### Color Palette
- Primary: #FF6B6B (Coral red)
- Secondary: #4ECDC4 (Teal)
- Accent: #FFD166 (Yellow)
- Background: #121212
- Card: #1E1E1E
- Text: #E1E1E1
- Text Secondary: #A0A0A0

### Typography
- Use modern, child-friendly fonts
- Ensure good readability
- Maintain proper hierarchy

### Design Elements
- Rounded corners
- Subtle shadows
- Playful illustrations
- Child-friendly typography
- Mobile-first approach
- Responsive design

## Page Structure

### 1. Hero Section
- Headline: "AI Stories for Kids"
- Subheadline: "Where your child becomes the hero of their own story"
- CTA: App Store button
- Floating app screenshots/mockups

### 2. Features Section (3 columns)
- AI-Generated Stories
- Professional Voice Narration
- Interactive Sound Effects

### 3. Pricing Section
- Free tier features
- Premium features overview
- "Download Now" CTA
- App Store badge

### 4. Footer
- Privacy Policy link
- Terms of Use link
- Language toggle button (EN/PL)
- Copyright notice
- Social media links

## Translation Requirements

### Simple Language Toggle Implementation
Use React useState to manage language state without complex routing or middleware. Store translations in a simple JSON structure.

### Translation Structure (data/translations.json)
```json
{
  "en": {
    "hero": {
      "title": "AI Stories for Kids",
      "subtitle": "Where your child becomes the hero of their own story",
      "cta": "Download Now"
    },
    "features": {
      "ai": {
        "title": "AI-Generated Stories",
        "description": "Unique stories created just for your child"
      },
      "voice": {
        "title": "Professional Narration",
        "description": "Listen to beautifully narrated tales"
      },
      "interactive": {
        "title": "Interactive Reading",
        "description": "Engaging sound effects and animations"
      }
    },
    "footer": {
      "privacy": "Privacy Policy",
      "terms": "Terms of Use",
      "copyright": "© 2024 Taily. All rights reserved."
    }
  },
  "pl": {
    "hero": {
      "title": "AI Bajki dla Dzieci",
      "subtitle": "Gdzie Twoje dziecko zostaje bohaterem własnej historii",
      "cta": "Pobierz Teraz"
    },
    "features": {
      "ai": {
        "title": "Bajki Tworzone przez AI",
        "description": "Unikalne historie tworzone specjalnie dla Twojego dziecka"
      },
      "voice": {
        "title": "Profesjonalna Narracja",
        "description": "Słuchaj pięknie czytanych opowieści"
      },
      "interactive": {
        "title": "Interaktywne Czytanie",
        "description": "Wciągające efekty dźwiękowe i animacje"
      }
    },
    "footer": {
      "privacy": "Polityka Prywatności",
      "terms": "Regulamin",
      "copyright": "© 2024 Taily. Wszelkie prawa zastrzeżone."
    }
  }
}
```

### Translation Hook Usage
Create a simple custom hook to manage language state and provide translation function:
```typescript
// lib/translations.ts
import { useState } from 'react';
import translations from '../data/translations.json';

export const useTranslations = () => {
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  
  const t = (key: string) => {
    // Simple dot notation key access
    return key.split('.').reduce((obj, k) => obj?.[k], translations[language]) || key;
  };
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'pl' : 'en');
  };
  
  return { t, language, toggleLanguage };
};
```

## Technical Requirements

### Performance
- Implement image optimization
- Lazy loading for off-screen content
- Minimize bundle size
- Cache static content
- Optimize for Core Web Vitals

### SEO
- Proper meta tags
- OpenGraph support
- Structured data
- Sitemap
- Robots.txt

### Accessibility
- WCAG 2.1 compliance
- Proper ARIA labels
- Keyboard navigation
- Screen reader friendly
- Color contrast compliance

### Additional Features
- Cookie consent banner
- Simple contact form
- Social media integration
- App download tracking
- Analytics setup

## Legal Requirements
- Privacy Policy page
- Terms of Use page
- Cookie policy
- GDPR compliance
- App Store compliance

## Development Guidelines
1. Follow Next.js best practices
2. Use TypeScript strictly
3. Implement simple language toggle without middleware
4. Use localStorage to persist language preference
5. Implement proper error boundaries
6. Add loading states
7. Include proper documentation
8. Set up proper CI/CD
9. Implement testing (Jest + React Testing Library)

## Deployment
- Netlify deployment
- Environment variables setup
- Domain configuration (tailyapp.io)
- SSL certificate
- CDN configuration 