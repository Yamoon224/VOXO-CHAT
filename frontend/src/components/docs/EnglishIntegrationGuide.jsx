import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const GUIDES = {
  website: {
    title: 'Integrate VOXO with your website',
    intro: 'Install the widget on any website with your preconfigured snippet.',
    sections: [
      ['Installation', 'Copy the snippet from VOXO, paste it before the closing body tag, publish the page, then clear any site or CDN cache.'],
      ['Configuration', 'Choose the appearance, allowed domains, language and visitor form in Settings. Never expose a private API secret in browser code.'],
      ['Verification', 'Open a public page in a private window, send a test message and confirm that it appears in Conversations.'],
      ['Troubleshooting', 'Check the browser console, Content Security Policy, allowed domains and network requests to widget.js and the VOXO API.']
    ]
  },
  flutter: {
    title: 'Flutter SDK integration', intro: 'Add VOXO chat to an iOS or Android Flutter application.',
    sections: [
      ['Install', 'Add the voxo_chat package, provide the public API URL and tenant ID, then initialize the controller before rendering the launcher or chat view.'],
      ['Language', 'Set locale to en or fr, enable the language switcher if needed, and call setLocale to update an active conversation. Unsupported locales fall back to French.'],
      ['Permissions', 'Add photo-library and camera usage descriptions on iOS only when attachments are enabled. Android requires no additional declaration for the standard picker.'],
      ['Development', 'Use 10.0.2.2 instead of localhost from an Android emulator and allow clear-text HTTP only for local development.'],
      ['Limits', 'Messages are limited to 2,000 characters and three 10 MB attachments. The SDK does not automatically retry failed sends.']
    ]
  },
  reactNative: {
    title: 'React Native SDK integration', intro: 'Embed VOXO chat in a React Native application.',
    sections: [
      ['Install', 'Install the package and required peer dependencies, configure the API URL and tenant ID, then wrap the application with VoxoProvider.'],
      ['Language', 'Pass locale and showLanguageSwitcher, or call setLocale at runtime. The choice is persisted per tenant and sent through Accept-Language.'],
      ['Native setup', 'Install pods on iOS and declare photo or camera permissions only when those attachment sources are enabled.'],
      ['Verification', 'Open the launcher, send a message, test offline errors, attachments, feedback and a human handoff.'],
      ['Limits', 'Messages are limited to 2,000 characters and three 10 MB attachments. Failed messages remain available for an explicit retry.']
    ]
  },
  kotlin: {
    title: 'Kotlin (Android) SDK integration', intro: 'Embed VOXO chat in a native Android application built with Jetpack Compose.',
    sections: [
      ['Install', 'Include the voxo-chat module from a clone of the repository, provide the public API URL and tenant ID, then create a VoxoController and show VoxoLauncher or VoxoChatView.'],
      ['Language', 'Pass locale and showLanguageSwitcher, or call setLocale at runtime. The choice is persisted per tenant and sent through Accept-Language.'],
      ['Permissions', 'The standard Android document picker needs no storage permission, so no additional declaration is required.'],
      ['Development', 'Use 10.0.2.2 instead of localhost from an Android emulator and allow clear-text HTTP in the debug manifest only.'],
      ['Limits', 'Messages are limited to 2,000 characters and three 10 MB attachments. Failed messages remain available for an explicit retry.']
    ]
  },
  telegram: {
    title: 'Connect Telegram to VOXO', intro: 'Create a Telegram bot and let VOXO configure its webhook.',
    sections: [
      ['Create the bot', 'Open the official @BotFather account, run /newbot, choose a public username ending in bot and store the generated token securely.'],
      ['Connect VOXO', 'Open Channels, paste the Bot Token, verify the bot identity, then activate the integration. VOXO registers the webhook automatically.'],
      ['Test', 'Open the public bot link, send /start and a normal question, then confirm the exchange in VOXO Conversations.'],
      ['Security', 'Restrict the token to administrators, rotate it immediately after a suspected leak and test the channel after every rotation.']
    ]
  },
  whatsapp: {
    title: 'Connect WhatsApp Business to VOXO', intro: 'Connect a Meta WhatsApp Business number and validate the VOXO webhook.',
    sections: [
      ['Meta application', 'Create a Business application in Meta for Developers, add WhatsApp and select or create the WhatsApp Business account and phone number.'],
      ['Credentials', 'Collect the Phone Number ID, App Secret and a permanent system-user token with WhatsApp messaging and management permissions.'],
      ['Connect VOXO', 'Enter the three credentials in Channels, verify them, save, then copy the webhook URL and verification token into Meta.'],
      ['Webhook', 'Subscribe the webhook to messages and confirm that your VOXO instance is publicly reachable over HTTPS.'],
      ['Production', 'Use a permanent token, protect all secrets, respect Meta consent rules and use approved templates outside the 24-hour response window.']
    ]
  },
  agentic: {
    title: 'Configure agentic actions', intro: 'Allow the assistant to call a controlled set of third-party API endpoints.',
    sections: [
      ['Enable', 'Enable agentic actions in Settings, then create at least one active API action.'],
      ['Define an action', 'Provide a stable name, description, HTTP method, HTTPS endpoint, timeout, JSON parameter schema and optional protected headers.'],
      ['Security', 'Keep credentials in the encrypted secret field, apply authorization in your API and never trust model-generated parameters without validation.'],
      ['Test and monitor', 'Test each action before activation and monitor calls, tokens, failures and limited turns from the usage section.']
    ]
  }
}

export function EnglishIntegrationGuide({ kind }) {
  const guide = GUIDES[kind] || GUIDES.website
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold tracking-tight">{guide.title}</h1><p className="mt-2 text-muted-foreground">{guide.intro}</p></div>
    {guide.sections.map(([title, body]) => <SurfaceCard key={title}><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{body}</p></CardContent></SurfaceCard>)}
  </div>
}
