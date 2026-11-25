!function(t){"use strict";/*! VOXO generated bundle */function e(){return"undefined"!=typeof crypto&&crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,t=>{const e=16*Math.random()|0
return("x"===t?e:3&e|8).toString(16)})}function i(t,e,i="chatbot"){try{const s=`${i}-${t}`,n=JSON.stringify({data:e,timestamp:Date.now(),version:"1.0.0"})
return localStorage.setItem(s,n),1}catch(s){return console.warn("Impossible de sauvegarder dans localStorage:",s),0}}function n(t,e=null,i="chatbot"){try{const s=`${i}-${t}`,n=localStorage.getItem(s)
if(!n)return e
const a=JSON.parse(n),o=2592e6
return a.timestamp&&Date.now()-a.timestamp>o?(localStorage.removeItem(s),e):a.data}catch(s){return console.warn("Impossible de lire depuis localStorage:",s),e}}function a(t,e={}){var i,n
const a={...e,timestamp:(new Date).toISOString(),userAgent:navigator.userAgent,url:window.location.href,device:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)?"mobile":/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent)?"tablet":"desktop",viewport:{width:window.innerWidth,height:window.innerHeight}}
"function"==typeof gtag&&gtag("event",t,{event_category:"ChatBot Widget",...a}),"object"==typeof dataLayer&&Array.isArray(dataLayer)&&dataLayer.push({event:t,event_category:"ChatBot Widget",...a}),"object"==typeof analytics&&analytics.track&&analytics.track(t,{category:"ChatBot Widget",...a}),"object"==typeof s&&s.t&&(s.linkTrackVars="events,eVar1,eVar2",s.events=t,s.eVar1="ChatBot Widget",s.eVar2=JSON.stringify(a),s.tl(1,"o",t)),"localhost"!==window.location.hostname&&"127.0.0.1"!==window.location.hostname||console.log(`[Analytics] ${t}:`,a),(null==(n=null==(i=window.ChatBotConfig)?void 0:i.analytics)?void 0:n.endpoint)&&fetch(window.ChatBotConfig.analytics.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:t,properties:a})}).catch(t=>{console.warn("Erreur envoi analytics:",t)})}const o=["fr","en"],r={fr:{messages:"Messages",messageLabel:"Message",welcome:"Bienvenue",retry:"Réessayer",open:"Ouvrir le chat",tagline:"Une question ? Échangeons !",connecting:"Connexion…",minimize:"Réduire le panneau",close:"Fermer le chat",conversation:"Messages de la conversation",attach:"Joindre un fichier",more:"Plus d’actions",placeholder:"Écrivez votre message…",send:"Envoyer le message",i:"Propulsé par ",today:"Aujourd’hui",yesterday:"Hier",typing:"L’assistant écrit…",language:"Langue",defaultWelcome:"Bonjour ! Comment puis-je vous aider ?",clear:"Effacer la conversation",history:"Historique des conversations",endAndRate:"Terminer et évaluer",sending:"Envoi en cours",answered:"Traité par l’assistant",failed:"Échec de l’envoi",copyResponse:"Copier la réponse",useful:"Réponse utile",notUseful:"Réponse non utile",suggestions:"Suggestions de messages",prechatTitle:"Avant de commencer",prechatCopy:"Indiquez vos coordonnées pour personnaliser la conversation.",fullName:"Nom complet",email:"Adresse e-mail",start:"Démarrer la conversation",nameRequired:"Renseignez votre nom complet.",emailInvalid:"Saisissez une adresse e-mail valide.",ratingTitle:"Comment s’est passée la conversation ?",ratingCopy:"Votre avis aide à améliorer les prochaines réponses.",o:"Note sur cinq",star:"{count} étoile",stars:"{count} étoiles",optionalComment:"Commentaire facultatif",commentPlaceholder:"Dites-nous ce qui vous a aidé…",cancel:"Annuler",sendRating:"Envoyer mon avis",attachmentLimit:"Vous pouvez joindre au maximum {count} fichiers.",attachmentRoom:"Seuls {count} fichiers supplémentaires peuvent être joints.",uploadFailed:"Envoi du fichier impossible.",uploadPending:"Un fichier est encore en cours d’envoi.",rateLimited:"Vous envoyez trop de messages. Patientez quelques instants.",tooLong:"Message trop long (2 000 caractères maximum).",copyFailed:"Impossible de copier la réponse.",feedbackFailed:"Votre avis n’a pas pu être enregistré.",ratingRequired:"Choisissez une note entre 1 et 5.",ratingThanks:"Merci, votre avis a bien été envoyé.",ratingFailed:"Impossible d’envoyer votre avis.",endFailed:"Impossible de terminer la conversation.",closeFailed:"Impossible de clôturer la conversation.",noHistory:"Aucune conversation précédente.",agent:"un conseiller",withAgent:"Vous échangez avec {name}",agentNotified:"Un conseiller a été prévenu",inactivityReminder:"Bonjour, souhaitez-vous poursuivre notre échange ? Je reste à votre disposition.",inactivityClosed:"Sans réponse de votre part, cette conversation est maintenant clôturée. Vous pourrez démarrer une nouvelle conversation à tout moment.",timeout:"Le service met trop de temps à répondre. Veuillez réessayer.",network:"Impossible de se connecter au serveur. Vérifiez votre connexion internet.",copied:"Réponse copiée.",autoCloseFailed:"La clôture automatique a échoué. Veuillez réessayer.",historyUnavailable:"Historique indisponible",assistant:"Assistant IA",available:"Assistant disponible",unavailable:"Service indisponible",technicalError:"Une erreur technique est survenue.",authError:"Problème d’authentification. Contactez l’administrateur.",denied:"Accès refusé. Contactez l’administrateur.",serviceMissing:"Service non trouvé. Contactez l’administrateur.",serverError:"Erreur serveur temporaire. Réessayez dans quelques instants.",unexpected:"Une erreur inattendue s’est produite. Veuillez réessayer.",expand:"Développer le panneau",responseAnnouncement:"Réponse de {name} : {text}",justNow:"À l’instant",minutesAgo:"{count} min",hoursAgo:"{count} h",daysAgo:"{count} j",conversationLabel:"Conversation",testGreeting:"Bonjour !",testHowAreYou:"Comment ça va ?",testHelpRequest:"Pouvez-vous m’aider ?",testThanks:"Merci beaucoup !",testGoodbye:"À bientôt !"},en:{messages:"Messages",messageLabel:"Message",welcome:"Welcome",retry:"Retry",open:"Open chat",tagline:"Have a question? Let’s chat!",connecting:"Connecting…",minimize:"Minimize panel",close:"Close chat",conversation:"Conversation messages",attach:"Attach a file",more:"More actions",placeholder:"Type your message…",send:"Send message",i:"Powered by ",today:"Today",yesterday:"Yesterday",typing:"The assistant is typing…",language:"Language",defaultWelcome:"Hello! How can I help you?",clear:"Clear conversation",history:"Conversation history",endAndRate:"End and rate",sending:"Sending",answered:"Handled by the assistant",failed:"Send failed",copyResponse:"Copy response",useful:"Helpful response",notUseful:"Not helpful",suggestions:"Message suggestions",prechatTitle:"Before you start",prechatCopy:"Share your details to personalize the chat.",fullName:"Full name",email:"Email address",start:"Start conversation",nameRequired:"Enter your full name.",emailInvalid:"Enter a valid email address.",ratingTitle:"How did the chat go?",ratingCopy:"Your feedback improves our replies.",o:"Rating out of five",star:"{count} star",stars:"{count} stars",optionalComment:"Optional comment",commentPlaceholder:"Tell us what helped…",cancel:"Cancel",sendRating:"Send feedback",attachmentLimit:"You can attach up to {count} files.",attachmentRoom:"Only {count} more files can be attached.",uploadFailed:"Unable to upload the file.",uploadPending:"A file is still uploading.",rateLimited:"You are sending too many messages. Please wait a moment.",tooLong:"Message is too long (2,000 characters maximum).",copyFailed:"Unable to copy the response.",feedbackFailed:"Your feedback could not be saved.",ratingRequired:"Choose a rating between 1 and 5.",ratingThanks:"Thank you, your feedback was sent.",ratingFailed:"Unable to send your feedback.",endFailed:"Unable to end the conversation.",closeFailed:"Unable to close the conversation.",noHistory:"No previous conversations.",agent:"an agent",withAgent:"You are chatting with {name}",agentNotified:"An agent has been notified",inactivityReminder:"Would you like to continue?",inactivityClosed:"Chat closed for inactivity. You can start a new one anytime.",timeout:"The service is slow to respond. Try again.",network:"Unable to connect. Check your network.",copied:"Response copied.",autoCloseFailed:"Automatic close failed. Try again.",historyUnavailable:"History unavailable",assistant:"AI assistant",available:"Assistant available",unavailable:"Service unavailable",technicalError:"A technical error occurred.",authError:"Authentication failed. Contact the administrator.",denied:"Access denied. Contact the administrator.",serviceMissing:"Service not found. Contact the administrator.",serverError:"Temporary server error. Please try again shortly.",unexpected:"Unexpected error. Try again.",expand:"Expand panel",responseAnnouncement:"Response from {name}: {text}",justNow:"Just now",minutesAgo:"{count} min",hoursAgo:"{count} h",daysAgo:"{count} d",conversationLabel:"Conversation",testGreeting:"Hello!",testHowAreYou:"How are you?",testHelpRequest:"Can you help me?",testThanks:"Thank you very much!",testGoodbye:"See you soon!"}}
function h(t){const e=((t||"")+"").toLowerCase().split(/[-_,;]/)[0]
return o.includes(e)?e:"fr"}function l(t={}){return h(t.locale||n("locale-"+t.tenantId)||navigator.language)}function c(t,e,i={}){const s=r[h(t)][e]||r.fr[e]||e
return Object.entries(i).reduce((t,[e,i])=>t.replaceAll(`{${e}}`,i+""),s)}class d{constructor(t,e,i="fr"){this.baseUrl=(t||"http://invalid").replace(/\/$/,""),this.tenantId=e,this.locale=i,this.timeout=3e4}async sendMessage(t){return(await this.fetch("/widget/message",{method:"POST",headers:{"Content-Type":"application/json","X-Tenant-ID":this.tenantId},body:JSON.stringify(t)})).json()}async h(t){const e=new FormData
return e.append("file",t),(await this.fetch("/widget/upload",{method:"POST",headers:{"X-Tenant-ID":this.tenantId},body:e},12e4)).json()}async l(t,e={}){const i=""+new URLSearchParams(e),s=`/widget/conversation/${t}${i?"?"+i:""}`
return(await this.fetch(s,{headers:{"X-Tenant-ID":this.tenantId}})).json()}async endConversation(t,e={}){return(await this.fetch(`/widget/conversation/${t}/end`,{method:"POST",headers:{"Content-Type":"application/json","X-Tenant-ID":this.tenantId},body:JSON.stringify(e)})).json()}conversationSocketUrl(t){return`${this.baseUrl.replace(/^http/,"ws")}/widget/conversation/${encodeURIComponent(t)}/socket?tenantId=${encodeURIComponent(this.tenantId)}`}async endConversationForInactivity(t,e={}){return(await this.fetch(`/widget/conversation/${t}/timeout`,{method:"POST",headers:{"Content-Type":"application/json","X-Tenant-ID":this.tenantId},body:JSON.stringify(e)})).json()}async sendMessageFeedback(t,e){return(await this.fetch(`/widget/conversation/${t}/message-feedback`,{method:"POST",headers:{"Content-Type":"application/json","X-Tenant-ID":this.tenantId},body:JSON.stringify(e)})).json()}async getTenantSettings(){return(await this.fetch("/widget/config",{headers:{"X-Tenant-ID":this.tenantId}})).json()}async getQuickReplies(t="greeting"){return(await this.fetch("/widget/quick-replies?category="+t,{headers:{"X-Tenant-ID":this.tenantId}})).json()}async fetch(t,e={},i=this.timeout){const s=`${this.baseUrl}${t}`,n=i>0?new AbortController:null,a=n?setTimeout(()=>n.abort(),i):null
try{const t=await fetch(s,{...e,headers:{"Accept-Language":this.locale,...e.headers||{}},signal:e.signal||(null==n?void 0:n.signal)})
if(a&&clearTimeout(a),!t.ok){const e=await t.json().catch(()=>({})),i=Error(e.error||`HTTP ${t.status}: ${t.statusText}`)
throw i.status=t.status,i.code=e.code,i.details=e.details,i}return t}catch(o){if(a&&clearTimeout(a),"AbortError"===o.name)throw Error(c(this.locale,"timeout"))
if(o.message.includes("Failed to fetch")||o.message.includes("Network request failed"))throw Error(c(this.locale,"network"))
throw o}}async healthCheck(){try{const t=await this.fetch("/widget/health",{headers:{"X-Tenant-ID":this.tenantId}})
return await t.json()}catch(t){return{healthy:0,error:t.message}}}}const u=':host{--vx-accent:#3b82f6;--vx-accent-solid:#2563c9;--vx-accent-fg:#fff;--vx-accent-soft:#e9f1fe;--vx-accent-soft-dark:#172239;--vx-accent-text-light:#1f56b3;--vx-accent-text-dark:#8fb5f4;--vx-accent-text:var(--vx-accent-text-light);--vx-accent-ring:rgba(37,99,201,.42);--vx-header-start:#2563c9;--vx-header-end:#1a438a;--vx-surface:#fff;--vx-surface-muted:#f7f8fa;--vx-surface-raised:#fff;--vx-text:#172033;--vx-text-muted:#697386;--vx-border:#e4e7ec;--vx-danger:#b42318;--vx-danger-soft:#fef3f2;--vx-radius-panel:16px;--vx-shadow-panel:0 24px 64px rgba(15,23,42,.18);--vx-shadow-launcher:0 12px 30px rgba(15,23,42,.22);--vx-duration-fast:160ms;--vx-duration-base:240ms;position:fixed;z-index:2147483000;color:var(--vx-text);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;font-size:14px;line-height:1.45;color-scheme:light}:host([data-position="bottom-right"]){right:20px;bottom:20px}:host([data-position="bottom-left"]){left:20px;bottom:20px}:host([data-position="top-right"]){right:20px;top:20px}:host([data-position="top-left"]){left:20px;top:20px}*,*::before,*::after{box-sizing:border-box}button,input,textarea{font:inherit}button{color:inherit}[hidden]{display:none !important}._20{position:relative}._21{display:inline-flex;flex:0 0 auto;line-height:0}._1s{width:62px;height:62px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:var(--vx-accent-solid);color:var(--vx-accent-fg);box-shadow:var(--vx-shadow-launcher);cursor:pointer}._c{width:100%;height:100%;display:block;border-radius:50%;object-fit:cover}._1z{position:absolute;width:min(420px,calc(100vw - 32px));height:min(680px,calc(100vh - 108px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--vx-border);border-radius:var(--vx-radius-panel);background:var(--vx-surface);box-shadow:var(--vx-shadow-panel);color:var(--vx-text);animation:vx-enter var(--vx-duration-base) cubic-bezier(.2,.8,.2,1)}:host([data-position^="bottom"]) ._1z{bottom:72px}:host([data-position^="top"]) ._1z{top:72px}:host([data-position$="right"]) ._1z{right:0}:host([data-position$="left"]) ._1z{left:0}._1y{min-height:176px;display:flex;flex-direction:column;padding:11px 12px 25px;background:linear-gradient(180deg,var(--vx-header-start) 0%,var(--vx-header-end) 100%);color:#fff}._f{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;width:100%;min-height:38px}._h{display:flex;align-items:center;gap:8px;padding:7px 18px;border-radius:99px;background:rgba(8,37,112,.3);font-weight:650}._i{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;text-align:center}._0{position:relative;flex:0 0 auto}._15,._9,._17{display:grid;place-items:center;flex:0 0 auto;overflow:hidden;border-radius:50%;background:var(--vx-accent-soft);color:var(--vx-accent-text);font-weight:700;letter-spacing:-.02em}._15{width:52px;height:52px;padding:3px;background:#fff;color:var(--vx-accent-text);box-shadow:0 5px 16px rgba(15,23,42,.2)}._17{position:absolute;right:-12px;bottom:-3px;width:27px;height:27px;overflow:hidden;padding:2px;border:2px solid #fff;background:#fff}._e{width:100%;height:100%;object-fit:cover}._16{min-width:0;max-width:300px;padding-top:7px}._1x{margin:0;overflow:hidden;font-size:14px;font-weight:750;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}._1v{margin:3px 0 4px;color:#fff;font-size:14px;font-weight:750}._1w{display:flex;align-items:center;justify-content:center}._1u{display:inline-flex;align-items:center;gap:6px;color:#fff;font-size:10.5px}._1u::before{content:"";width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 3px rgba(255,255,255,.12)}._1u[data-connectivity="available"]::before{background:#4ade80}._1u[data-connectivity="unavailable"]::before{background:#fca5a5}._1u[data-connectivity="disabled"]::before{display:none}._d{display:flex;justify-self:end;gap:2px}.vx-locale-select{border:0;border-radius:8px;background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:12px;padding:0 4px}.vx-locale-select option{color:#111827}._19{width:36px;height:36px;display:grid;place-items:center;padding:0;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}._19:hover{background:rgba(255,255,255,.18)}._18{position:relative;min-height:0;display:flex;flex:1;flex-direction:column;margin-top:-14px;overflow:hidden;border-radius:18px 18px 0 0;background:var(--vx-surface)}._n,._w{display:none}._1z[data-view="prechat"] ._18,._1z[data-view="rating"] ._18{display:none}._1z[data-view="prechat"] ._n,._1z[data-view="rating"] ._w{display:block}._1z[data-minimized="true"]{height:auto}._1z[data-minimized="true"] ._1y{min-height:56px;padding:9px 12px}._1z[data-minimized="true"] ._i{display:none}._1z[data-minimized="true"] ._18,._1z[data-minimized="true"] ._n,._1z[data-minimized="true"] ._w,._1z[data-minimized="true"] ._1t{display:none}._8{min-height:0;flex:1;overflow:auto;padding:24px 14px 14px;background:var(--vx-surface-muted)}._1a{display:flex;gap:8px;align-items:flex-end;margin-top:12px}._1a[data-grouped="true"]{margin-top:4px}._9{width:30px;height:30px;padding:2px;background:var(--vx-surface);font-size:10px}._28{display:none}._1a[data-grouped="true"] ._9{visibility:hidden}._4{min-width:0;max-width:78%}._29 ._4{margin-left:auto}._1b{inline-size:max-content;max-inline-size:100%;padding:10px 12px;border:1px solid var(--vx-border);border-radius:14px 14px 14px 5px;background:var(--vx-surface-raised);color:var(--vx-text);overflow-wrap:break-word;word-break:normal}._29 ._1b{margin-left:auto;border-color:var(--vx-accent-soft);border-radius:14px 14px 5px 14px;background:var(--vx-accent-soft);color:var(--vx-accent-text)}._2b ._1b{background:#15803d;color:#fff;border-color:transparent}._1a[data-welcome="true"] ._1b{padding:15px;border-color:var(--vx-accent-soft);background:linear-gradient(145deg,var(--vx-surface-raised),var(--vx-accent-soft));box-shadow:0 9px 26px rgba(15,23,42,.08)}._1a[data-welcome="true"] ._9{width:34px;height:34px}._l{display:flex;align-items:center;gap:6px;margin-bottom:7px;color:var(--vx-accent-text);font-size:11px;font-weight:700;text-transform:uppercase}._1b a{color:inherit;text-decoration:underline}._1b._26{border-color:#fecdca;background:var(--vx-danger-soft);color:var(--vx-danger)}._a{display:flex;align-items:center;gap:7px;margin-top:4px;padding-inline:2px;color:var(--vx-text-muted);font-size:10px}._29 ._a{justify-content:flex-end}._1a[data-hide-time="true"] ._1c{display:none}._24{margin-top:8px;padding:4px 8px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;cursor:pointer}._6{display:inline-flex;align-items:center;gap:3px}._6[data-status="failed"]{color:var(--vx-danger)}._y{padding:0;border:0;background:transparent;color:inherit;font-size:10px;font-weight:700;text-decoration:underline;cursor:pointer}._1{display:inline-flex;align-items:center;gap:1px;opacity:0;transition:opacity var(--vx-duration-fast)}._1a:hover ._1,._1a:focus-within ._1{opacity:1}._x{width:25px;height:25px;display:grid;place-items:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--vx-text-muted);cursor:pointer}._x:hover,._x[aria-pressed="true"]{background:var(--vx-accent-soft);color:var(--vx-accent-text)}._5{display:flex;align-items:center;gap:8px;margin:18px 0 10px;color:var(--vx-text-muted);font-size:10px;text-align:center}._5::before,._5::after{content:"";height:1px;flex:1;background:var(--vx-border)}._23 p{margin:0 0 8px}._23 p:last-child{margin-bottom:0}._23 ul,._23 ol{margin:5px 0;padding-left:20px}._23 li + li{margin-top:3px}._23 code{padding:2px 4px;border-radius:5px;background:var(--vx-surface-muted);font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}._23 pre{max-width:100%;margin:7px 0;overflow:auto;padding:10px;border-radius:9px;background:#0b1220;color:#e5e7eb}._23 pre code{padding:0;background:transparent;color:inherit;white-space:pre}._1e{display:flex;align-items:center;gap:8px;margin:12px 0 0 36px;color:var(--vx-text-muted);font-size:11px}._m{display:flex;gap:3px;padding:9px 10px;border:1px solid var(--vx-border);border-radius:14px 14px 14px 5px;background:var(--vx-surface)}._1d{width:5px;height:5px;border-radius:50%;background:var(--vx-text-muted)}._2{display:flex;gap:6px;overflow-x:auto;padding-top:9px;scrollbar-width:none}._1f{flex:0 0 auto;max-width:220px;padding:7px 10px;overflow:hidden;border:1px solid var(--vx-border);border-radius:999px;background:var(--vx-surface);color:var(--vx-text);font-size:11px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}._1f:hover{border-color:var(--vx-accent);background:var(--vx-accent-soft);color:var(--vx-accent-text)}._b{position:relative;padding:9px 11px 11px;background:var(--vx-surface)}._1g{display:flex;flex-direction:column;gap:2px;padding:8px;border:1.5px solid var(--vx-border);border-radius:18px;background:var(--vx-surface-raised);box-shadow:0 6px 18px rgba(15,23,42,.07);transition:border-color var(--vx-duration-fast),box-shadow var(--vx-duration-fast)}._1g:focus-within{border-color:var(--vx-accent-solid);box-shadow:0 0 0 3px var(--vx-accent-ring),0 8px 22px rgba(15,23,42,.09)}._1h{width:100%;min-width:0;min-height:44px;max-height:116px;resize:none;padding:8px 9px 5px;border:0;outline:0;background:transparent;color:var(--vx-text);line-height:20px}._1h::placeholder{color:var(--vx-text-muted)}._j{display:flex;align-items:center;justify-content:space-between}._k{display:flex;align-items:center;gap:2px}._3{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;padding:0;border:0;border-radius:11px;background:transparent;cursor:pointer}._3:hover{background:var(--vx-surface-muted)}._1i{border-radius:50%;background:var(--vx-accent-solid);color:var(--vx-accent-fg);box-shadow:0 4px 12px rgba(15,23,42,.16);transition:transform var(--vx-duration-fast),filter var(--vx-duration-fast)}._1i:hover{background:var(--vx-accent-solid);filter:brightness(.94)}._1i:not(:disabled):active{transform:scale(.92)}._1i:disabled{background:#c7cdd6;color:#fff;box-shadow:none;cursor:not-allowed;opacity:1}._1k{position:absolute;z-index:2;left:10px;bottom:112px;min-width:210px;padding:5px;border:1px solid var(--vx-border);border-radius:12px;background:var(--vx-surface-raised);box-shadow:0 12px 30px rgba(15,23,42,.14)}._1j{width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--vx-danger);text-align:left;cursor:pointer}._1j:hover{background:var(--vx-danger-soft)}._1j:first-child{color:var(--vx-text)}._1j:first-child:hover{background:var(--vx-surface-muted)}._1l{display:flex;flex-wrap:wrap;gap:6px;padding:0 4px 8px}._1m{display:inline-flex;align-items:center;gap:6px;max-width:190px;padding:4px 6px;border:1px solid var(--vx-border);border-radius:10px;background:var(--vx-surface-muted);color:var(--vx-text);font-size:11px}._11{width:34px;height:34px;object-fit:cover;border-radius:6px}._10{opacity:.6}._1n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}._13{width:22px;height:22px;flex:0 0 auto;border-radius:5px;object-fit:cover}._12{width:18px;height:18px;display:grid;place-items:center;flex:0 0 auto;padding:0;border:0;border-radius:50%;background:transparent;color:var(--vx-text-muted);cursor:pointer}._12:hover{background:var(--vx-danger-soft);color:var(--vx-danger)}._z{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}._25{outline:2px dashed var(--vx-accent-solid);outline-offset:-6px}._1t{padding:0 12px 8px;background:var(--vx-surface);color:var(--vx-text-muted);font-size:9px;text-align:center}._1t a{color:inherit}._n,._w{position:relative;min-height:0;flex:1;overflow:auto;margin-top:-14px;padding:32px 24px 28px;border-radius:18px 18px 0 0;background:var(--vx-surface-muted)}._1o{padding:22px;border:1px solid var(--vx-border);border-radius:16px;background:var(--vx-surface);box-shadow:0 10px 32px rgba(15,23,42,.07)}._1o h2{margin:0 0 6px;font-size:18px}._1o > p{margin:0 0 20px;color:var(--vx-text-muted);font-size:12px}._1q{margin-top:14px}._1q label{display:block;margin-bottom:6px;font-size:12px;font-weight:600}._1q input{width:100%;height:42px;padding:0 11px;border:1px solid var(--vx-border);border-radius:10px;background:var(--vx-surface);color:var(--vx-text);outline:0}._1q input[aria-invalid="true"]{border-color:var(--vx-danger)}._1p{min-height:18px;margin:8px 0 0;color:var(--vx-danger);font-size:11px}._p{width:100%;min-height:42px;margin-top:10px;padding:9px 14px;border:0;border-radius:11px;background:var(--vx-accent-solid);color:var(--vx-accent-fg);font-weight:700;cursor:pointer}._o{min-height:42px;padding:9px 14px;border:1px solid var(--vx-border);border-radius:11px;background:var(--vx-surface);color:var(--vx-text);font-weight:650;cursor:pointer}._t{padding:22px;border:1px solid var(--vx-border);border-radius:16px;background:var(--vx-surface);box-shadow:0 10px 32px rgba(15,23,42,.07)}._t h2{margin:0;font-size:18px;text-align:center}._u{margin:7px 0 18px;color:var(--vx-text-muted);font-size:12px;text-align:center}._r{display:flex;justify-content:center;gap:4px;margin-bottom:20px}._s{width:42px;height:42px;display:grid;place-items:center;padding:0;border:0;background:transparent;color:#9ca3af;cursor:pointer}._s[data-selected="true"]{color:#d97706}._s[data-filled="true"] svg{fill:currentColor}._v{display:block;margin-bottom:6px;font-size:12px;font-weight:650}._7{width:100%;resize:vertical;padding:10px;border:1px solid var(--vx-border);border-radius:10px;background:var(--vx-surface);color:var(--vx-text)}._q{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;margin-top:6px}._q ._p{margin-top:0}._1r{position:absolute;z-index:5;right:12px;bottom:70px;left:12px;padding:10px 12px;border:1px solid var(--vx-border);border-radius:10px;background:var(--vx-text);color:var(--vx-surface);box-shadow:0 10px 24px rgba(15,23,42,.18);font-size:12px;text-align:center}._22{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}:where(button,input,textarea,a):focus-visible{outline:3px solid var(--vx-accent-ring);outline-offset:2px}._1h:focus-visible{outline:0}:host([data-theme="dark"]){color-scheme:dark;--vx-surface:#111827;--vx-surface-muted:#0b1220;--vx-surface-raised:#172033;--vx-text:#f3f4f6;--vx-text-muted:#aab2c0;--vx-border:#30394a;--vx-danger:#fda29b;--vx-danger-soft:#351817;--vx-accent-soft:var(--vx-accent-soft-dark);--vx-accent-text:var(--vx-accent-text-dark)}:host([data-theme="dark"]) ._15{background:#fff;color:var(--vx-accent-text-light)}@media (prefers-color-scheme:dark){:host([data-theme="auto"]){color-scheme:dark;--vx-surface:#111827;--vx-surface-muted:#0b1220;--vx-surface-raised:#172033;--vx-text:#f3f4f6;--vx-text-muted:#aab2c0;--vx-border:#30394a;--vx-danger:#fda29b;--vx-danger-soft:#351817;--vx-accent-soft:var(--vx-accent-soft-dark);--vx-accent-text:var(--vx-accent-text-dark)}:host([data-theme="auto"]) ._15{background:#fff;color:var(--vx-accent-text-light)}}@media (max-width:640px){:host{right:12px;bottom:12px;left:auto;top:auto}._1s{width:56px;height:56px}._1z{position:fixed;inset:12px;width:auto;height:auto;max-height:none}:host([data-mobile-fullscreen="true"]) ._1z{inset:0;border-width:0;border-radius:0}._19,._3{min-width:44px;min-height:44px}._1y{min-height:176px}}@media (prefers-reduced-motion:reduce){:host{--vx-duration-fast:1ms;--vx-duration-base:1ms}*,*::before,*::after{scroll-behavior:auto !important;animation-duration:1ms !important;animation-iteration-count:1 !important}}@media (hover:none),(pointer:coarse){._1{opacity:1}}@media (forced-colors:active){._1s,._1i,._p,._1z,._1y,._1b,._1g,._1f{border:1px solid ButtonText}}._14{width:100%;padding:12px;text-align:left;border:0;border-bottom:1px solid var(--vx-border);background:transparent;color:var(--vx-text);cursor:pointer}._14:hover{background:var(--vx-surface)}@keyframes vx-enter{from{opacity:0;transform:translateY(10px) scale(.98)}}'
let p
const v=/^#?([\da-f]{3}|[\da-f]{6})$/i
function x(t,e="#3b82f6"){const i=((t||"")+"").trim()
if(!v.test(i))return e
const s=i.replace("#","").toLowerCase()
return"#"+(3===s.length?s.split("").map(t=>t+t).join(""):s)}function g(t){const e=x(t).slice(1)
return{r:parseInt(e.slice(0,2),16),g:parseInt(e.slice(2,4),16),b:parseInt(e.slice(4,6),16)}}function f(t,e,i=.5){const s=g(t),n=g(e),a=Math.max(0,Math.min(1,i)),o=t=>Math.round(s[t]*(1-a)+n[t]*a).toString(16).padStart(2,"0")
return`#${o("r")}${o("g")}${o("b")}`}function m(t){const e=t/255
return e<=.04045?e/12.92:((e+.055)/1.055)**2.4}function b(t){const{r:e,g:i,b:s}=g(t)
return.2126*m(e)+.7152*m(i)+.0722*m(s)}function w(t,e){return(Math.max(b(t),b(e))+.05)/(Math.min(b(t),b(e))+.05)}const y=new Set(["bottom-right","bottom-left","top-right","top-left"]),_=new Set(["auto","light","dark"])
function k(t,e){var i,s,n
if(!t||!e)return
const a=(t=>{const e=x(t)
let i=e
for(let h=0;h<=.8&&w(i,"#ffffff")<4.5;h+=.03)i=f(e,"#000000",h)
const s=w(i,"#ffffff")>=4.5?"#ffffff":"#0b1220",n=f(e,"#ffffff",.88),a=f(e,"#111827",.78)
let o=i,r=e
for(let h=0;h<=.85&&w(o,n)<4.5;h+=.03)o=f(i,"#000000",h)
for(let h=0;h<=.9&&w(r,"#111827")<4.5;h+=.03)r=f(e,"#ffffff",h)
return{accent:e,accentSolid:i,accentFg:s,accentSoft:n,accentSoftDark:a,accentText:o,accentTextDark:r,accentRing:i}})(null==(i=e.theme)?void 0:i.primaryColor),o=(null==(s=e.options)?void 0:s.ui)||{},r=/^\d+(\.\d+)?(px|rem|em)$/.test((o.borderRadius||"")+"")?o.borderRadius:"16px"
t.style.setProperty("--vx-accent",a.accent),t.style.setProperty("--vx-accent-solid",a.accentSolid),t.style.setProperty("--vx-accent-fg",a.accentFg),t.style.setProperty("--vx-accent-soft",a.accentSoft),t.style.setProperty("--vx-accent-soft-dark",a.accentSoftDark),t.style.setProperty("--vx-accent-text-light",a.accentText),t.style.setProperty("--vx-accent-text-dark",a.accentTextDark),t.style.setProperty("--vx-accent-ring",a.accentRing),t.style.setProperty("--vx-header-start",a.accentSolid),t.style.setProperty("--vx-header-end",f(a.accentSolid,"#0b1220",.24)),t.style.setProperty("--vx-radius-panel",r),t.style.setProperty("--vx-shadow-panel",0==o.shadows?"none":"0 24px 64px rgba(15, 23, 42, .18)"),t.style.setProperty("--vx-shadow-launcher",0==o.shadows?"none":"0 12px 30px rgba(15, 23, 42, .22)"),t.style.setProperty("--vx-duration-fast",0==o.animations?"1ms":"160ms"),t.style.setProperty("--vx-duration-base",0==o.animations?"1ms":"240ms"),t.dataset.position=y.has(null==(n=e.theme)?void 0:n.position)?e.theme.position:"bottom-right",t.dataset.theme=_.has(o.colorScheme)?o.colorScheme:"light",t.dataset.mobileFullscreen=0==o.mobileFullScreen?"false":"true"}const C={brand:'<circle fill="#267CB5" stroke="none" cx="12" cy="12" r="12"/><path fill="#fff" stroke="none" d="M19 7H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h4v3l4-3h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z"/>',chat:'<path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4a3.5 3.5 0 0 1-3.5 3.5H11l-4.75 4v-4.4A3.5 3.5 0 0 1 5 10.5v-4Z"/><path d="M8.5 8.5h.01M12 8.5h.01M15.5 8.5h.01"/>',close:'<path d="m7 7 10 10M17 7 7 17"/>',chevronDown:'<path d="m7 9 5 5 5-5"/>',send:'<path d="m4 4 16 8-16 8 3-8-3-8Z"/><path d="M7 12h13"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',retry:'<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 5v6h-6"/>',sparkle:'<path d="m12 3 .8 2.2L15 6l-2.2.8L12 9l-.8-2.2L9 6l2.2-.8L12 3ZM6 12l1.1 2.9L10 16l-2.9 1.1L6 20l-1.1-2.9L2 16l2.9-1.1L6 12Zm11-2 .8 2.2L20 13l-2.2.8L17 16l-.8-2.2L14 13l2.2-.8L17 10Z"/>',copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',thumbUp:'<path d="M7 10v10H4V10h3Zm0 9h9.2a2 2 0 0 0 1.9-1.4l1.5-5A2 2 0 0 0 17.7 10H14l.7-3.1A2.4 2.4 0 0 0 12.4 4L7 10Z"/>',thumbDown:'<path d="M7 14V4H4v10h3Zm0-9h9.2a2 2 0 0 1 1.9 1.4l1.5 5a2 2 0 0 1-1.9 2.6H14l.7 3.1a2.4 2.4 0 0 1-2.3 2.9L7 14Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',check:'<path d="m6 12 4 4 8-8"/>',alert:'<path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',paperclip:'<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7-7l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.8 1.8 0 0 1-2.5-2.5l7.4-7.4"/>',file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>'}
function S(t,e=20){const i=document.createElement("span")
return i.className="_21",i.setAttribute("aria-hidden","true"),i.innerHTML=`<svg viewBox="0 0 24 24" width="${e}" height="${e}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${C[t]||C.chat}</svg>`,i}function M(t,e){t.appendChild(document.createTextNode(e.slice(0)))}function z(t){const e=document.createDocumentFragment()
return((t??"")+"").split("\n").forEach((t,i)=>{i&&e.appendChild(document.createElement("br")),t.split(/(https?:\/\/[^\s<]+)/gi).forEach(t=>{if(/^https?:\/\//i.test(t)){const{url:i,trailing:s}=(t=>{var e
const i=(null==(e=t.match(/[),.!?;:]+$/))?void 0:e[0])||""
return{url:i?t.slice(0,-i.length):t,trailing:i}})(t);((t,e,i)=>{const s=(t=>{const e=((t||"")+"").trim()
if(!e||/[\u0000-\u001f\u007f]/.test(e))return null
if(e.startsWith("/")&&!e.startsWith("//"))return e
try{const t=new URL(e)
return["http:","https:","mailto:","tel:"].includes(t.protocol.toLowerCase())?e:null}catch{return null}})(i)
if(!s)return void t.appendChild(document.createTextNode(e))
const n=document.createElement("a")
n.textContent=e,n.href=s,/^https?:/i.test(s)&&(n.target="_blank"),n.rel="noopener noreferrer nofollow",t.appendChild(n)})(e,i,i),s&&e.appendChild(document.createTextNode(s))}else e.appendChild(document.createTextNode(t))})}),e}const T=10485760,A={".pdf":"application/pdf",".doc":"application/msword",".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",".txt":"text/plain",".md":"text/markdown"},I={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",".gif":"image/gif",".bmp":"image/bmp",".tif":"image/tiff",".tiff":"image/tiff"},R={knowledge:{...A,...I},conversation:{...A,...I}}
function L(t){const e=/\.[^.]+$/.exec(((t||"")+"").toLowerCase())
return e?e[0]:""}function $(t){const e=L(t)
return I[e]?"image":A[e]?"document":null}function D(t){return t>=1048576?(t/1048576).toFixed(1)+" Mo":Math.max(1,Math.round(t/1024))+" Ko"}function U(t,e="knowledge"){const i=R[e]||R.knowledge
if(!t)return{valid:0,error:"Aucun fichier sélectionné."}
if(!t.size)return{valid:0,error:"Le fichier est vide."}
const s=L(t.name)
return i[s]?t.size>T?{valid:0,error:`Fichier trop volumineux (${D(t.size)}). La taille maximale est de ${D(T)}.`}:{valid:1,error:null,category:$(t.name),mimeType:i[s]}:{valid:0,error:`Format non pris en charge. Formats acceptés : ${Object.keys(i).join(", ")}.`}}function j(t,e,i){return new Promise(s=>t.toBlob(s,e,i))}const F=((t="knowledge")=>Object.keys(R[t]||R.knowledge).join(","))("conversation")
class E{constructor({api:t,onChange:e,onError:i,u:s,maxFiles:n=3}){this.api=t,this.onChange=e,this.onError=i,this.u=s||(()=>"fr"),this.maxFiles=n,this.items=[]}t(t,e){return c(this.u(),t,e)}get ready(){return this.items.filter(t=>t.id)}get p(){return this.items.some(t=>!t.id&&!t.failed)}ids(){return this.ready.map(t=>t.id)}clear(){var t
this.items.forEach(t=>t.v&&URL.revokeObjectURL(t.v)),this.items=[],null==(t=this.onChange)||t.call(this)}remove(t){var e
const i=this.items.find(e=>e.m===t);(null==i?void 0:i.v)&&URL.revokeObjectURL(i.v),this.items=this.items.filter(e=>e.m!==t),null==(e=this.onChange)||e.call(this)}async add(t){var e,i
const s=Array.from(t||[])
if(0===s.length)return
const n=this.maxFiles-this.items.length
if(n<=0)null==(e=this.onError)||e.call(this,this.t("attachmentLimit",{count:this.maxFiles}))
else{s.length>n&&(null==(i=this.onError)||i.call(this,this.t("attachmentRoom",{count:n})))
for(const t of s.slice(0,n))await this.addOne(t)}}async addOne(t){var e,i,s,n,a
const{file:o,valid:r,error:h,category:l}=await(async(t,e="knowledge")=>{const i=await(async(t,e={})=>{var i
const s=e.maxDimension||2048,n=e.quality||.82
if(!t||!/^image\/(jpeg|png|webp)$/.test(t.type||""))return t
let a
try{a=await createImageBitmap(t)}catch{return t}try{const e=Math.min(1,s/Math.max(a.width,a.height)),i=document.createElement("canvas")
i.width=Math.round(a.width*e),i.height=Math.round(a.height*e)
const r=i.getContext("2d")
r.drawImage(a,0,0,i.width,i.height)
let h=await j(i,"image/webp",n)
return h&&"image/webp"===h.type||(r.globalCompositeOperation="destination-over",r.fillStyle="#ffffff",r.fillRect(0,0,i.width,i.height),h=await j(i,"image/jpeg",n)),!h||h.size>=t.size?t:new File([h],(o="image/webp"===h.type?".webp":".jpg",`${(t.name+"").replace(/\.[^.]+$/,"")}${o}`),{type:h.type,lastModified:Date.now()})}catch{return t}finally{null==(i=a.close)||i.call(a)}var o})(t)
return{file:i,...U(i,e)}})(t,"conversation")
if(!r)return void(null==(e=this.onError)||e.call(this,h))
const c={m:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,id:null,name:o.name,size:o.size,category:l,failed:0,v:"image"===l?URL.createObjectURL(o):null}
this.items.push(c),null==(i=this.onChange)||i.call(this)
try{const t=await this.api.h(o)
if(!(null==t?void 0:t.success)||!(null==(s=t.data)?void 0:s.id))throw Error((null==t?void 0:t.error)||this.t("uploadFailed"))
c.id=t.data.id}catch(d){return c.failed=1,null==(n=this.onError)||n.call(this,d.message||this.t("uploadFailed")),void this.remove(c.m)}null==(a=this.onChange)||a.call(this)}}function O(t){var e
const i=t.dataTransfer||t.clipboardData
return i?(null==(e=i.files)?void 0:e.length)?Array.from(i.files):Array.from(i.items||[]).filter(t=>"file"===t.kind).map(t=>t.getAsFile()).filter(Boolean):[]}function q(t,e,i){const s=document.createElement(t)
return e&&(s.className=e),void 0!==i&&(s.textContent=i),s}function B(t,e){const i=document.createElement(t)
return e&&(i.className=e),i}function P(t){return((t||"Assistant")+"").trim().split(/\s+/).slice(0,2).map(t=>{var e
return null==(e=t[0])?void 0:e.toUpperCase()}).join("")||"AI"}function N(t){var e,i
const s=B("span","_0"),n=B("span","_15"),a=(null==(e=t.getTenantLogoUrl)?void 0:e.call(t))||t._
if(a){const t=B("img","_e")
t.src=a,t.alt="",t.addEventListener("error",()=>n.replaceChildren(S("chat",26)),{once:1}),n.appendChild(t)}else n.appendChild(S("chat",26))
s.appendChild(n)
const o=(null==(i=t.getBotAvatarUrl)?void 0:i.call(t))||t.config.options.ui.avatarUrl
if(o){const t=B("span","_17"),e=B("img","_e")
e.src=o,e.alt="",e.addEventListener("error",()=>t.remove(),{once:1}),t.appendChild(e),s.appendChild(t)}return s}function H(t,e=t.button){if(!e)return
if(t.isOpen)return void e.replaceChildren(S("close",22))
const i=t.config.options.ui.launcherIconUrl
if(!i)return void e.replaceChildren(S("brand",56))
const s=B("img","_c")
s.src=i,s.alt="",s.referrerPolicy="no-referrer",s.addEventListener("error",()=>e.replaceChildren(S("brand",56)),{once:1}),e.replaceChildren(s)}const V={user:"_29",bot:"_2a",agent:"_2b"}
function W(t,e,i){const s=document.createElement(t)
return e&&(s.className=e),void 0!==i&&(s.textContent=i),s}function X(t,e,i,s=18){const n=W("button",t)
return n.type="button",n.setAttribute("aria-label",e),n.appendChild(S(i,s)),n}class J{constructor(t){this.widget=t}t(t,e){return c(this.widget.config.locale,t,e)}k(){const t=W("div","_20"),e=X("_1s",this.t("open"),"chat",24)
e.setAttribute("aria-controls","vx-chat-panel"),e.setAttribute("aria-expanded","false"),H(this.widget,e)
const i=W("section","_1z")
i.id="vx-chat-panel",i.hidden=1,i.dataset.view="chat",i.dataset.minimized="false",i.setAttribute("role","dialog"),i.setAttribute("aria-modal","false"),i.setAttribute("aria-labelledby","vx-chat-title"),i.lang=this.widget.config.locale
const s=W("header","_1y"),n=W("div","_f"),a=W("span","_g")
a.setAttribute("aria-hidden","true")
const o=W("div","_h")
o.append(S("chat",17),document.createTextNode(this.t("messages")))
const r=W("div","_i"),h=N(this.widget),l=W("div","_16"),c=W("h2","_1x",this.widget.config.name)
c.id="vx-chat-title"
const d=W("p","_1v",this.t("tagline")),u=W("div","_1w"),p=W("span","_1u",this.t("connecting"))
u.appendChild(p),l.append(c,d,u)
const v=W("div","_d"),x=W("select","vx-locale-select")
x.setAttribute("aria-label",this.t("language")),x.append(W("option","","FR"),W("option","","EN")),x.options[0].value="fr",x.options[1].value="en",x.value=this.widget.config.locale,x.hidden=0==this.widget.config.showLanguageSwitcher
const g=X("_19",this.t("minimize"),"chevronDown"),f=X("_19",this.t("close"),"close")
v.append(x,g,f),n.append(a,o,v),r.append(h,l),s.append(n,r)
const m=W("div","_18"),b=W("div","_8")
b.setAttribute("role","log"),b.setAttribute("aria-live","off"),b.setAttribute("aria-label",this.t("conversation"))
const w=W("div","_b"),y=W("div","_1k")
y.id="vx-composer-menu",y.hidden=1,y.setAttribute("role","menu")
const _=X("_3 _27",this.t("attach"),"paperclip",18)
_.hidden=!this.widget.config.options.features.attachments
const k=X("_1j",this.t("clear"),"trash",17)
k.appendChild(document.createTextNode(this.t("clear"))),k.setAttribute("role","menuitem")
const C=X("_1j",this.t("history"),"clock",17)
C.appendChild(document.createTextNode(this.t("history"))),C.setAttribute("role","menuitem")
const M=X("_1j",this.t("endAndRate"),"star",17)
M.appendChild(document.createTextNode(this.t("endAndRate"))),M.setAttribute("role","menuitem"),M.hidden=1,y.append(C,k,M)
const z=W("div","_1l")
z.hidden=1
const T=W("input")
T.type="file",T.multiple=1,T.accept=F,T.hidden=1
const A=W("div","_1g"),I=W("div","_j"),R=W("div","_k"),L=X("_3",this.t("more"),"more")
L.setAttribute("aria-controls",y.id),L.setAttribute("aria-expanded","false"),L.setAttribute("aria-haspopup","menu")
const $=W("textarea","_1h")
$.rows=1,$.maxLength=2e3,$.placeholder=this.t("placeholder"),$.setAttribute("aria-label",this.t("messageLabel"))
const D=X("_3 _1i",this.t("send"),"send",18)
R.append(L,_),I.append(R,D),A.append($,I),w.append(y,z,A,T),m.append(b,w)
const U=this.C(),j=this.S(),E=W("div","_1t"),O=W("a","","VOXO")
O.href=this.widget.config.frontendUrl,O.target="_blank",O.rel="noopener noreferrer",E.append(this.t("powered"),O),E.hidden=!this.widget.config.options.showPoweredBy
const q=W("div","_22")
q.setAttribute("role","status"),q.setAttribute("aria-live","polite"),q.setAttribute("aria-atomic","true")
const B=W("div","_1r")
return B.hidden=1,B.setAttribute("role","status"),i.append(s,m,U,j.view,E,B,q),t.append(i,e),{shell:t,launcher:e,panel:i,messages:b,input:$,M:D,menu:y,T:L,A:_,attachments:z,I:T,R:k,L:C,$:M,D:g,U:f,j:x,title:c,subtitle:p,F:h,i:E,O:q,q:U,B:j.view,o:j.group,P:j.comment,N:j.submit,H:j.cancel,V:j.error,toast:B}}W(t,e,i=null){var s,n,a,o,r,h,l,c,d,u
const p=!!(i&&i.sender===t.sender&&new Date(t.timestamp)-new Date(i.timestamp)<=3e5),v=W("article","_1a "+(V[t.sender]||"_2a"))
v.dataset.grouped=p+"",(null==(s=t.metadata)?void 0:s.isWelcome)&&(v.dataset.welcome="true"),v.setAttribute("role","listitem"),this.widget.currentMessageAgentId=(null==(n=t.metadata)?void 0:n.agentId)||t.agentId||null
const x=((t,e,i="bot")=>{var s,n,a
const o=B("span","_9"),r="agent"===i,h="bot"===i||r,l=r?null==(s=t.getAgentAvatarUrl)?void 0:s.call(t,t.currentMessageAgentId):(null==(n=t.getBotAvatarUrl)?void 0:n.call(t))||t.config.options.ui.avatarUrl||t._
if(!l)return o.textContent=P(h?t.config.name:(null==(a=t.userInfo)?void 0:a.name)||"Vous"),o
const c=B("img","_e")
return c.src=l,c.alt="",c.referrerPolicy="no-referrer",c.addEventListener("error",()=>{var e
o.replaceChildren(document.createTextNode(P(h?t.config.name:(null==(e=t.userInfo)?void 0:e.name)||"Vous")))},{once:1}),o.appendChild(c),o})(this.widget,0,t.sender)
this.widget.currentMessageAgentId=null,"user"!==t.sender||this.widget.config.options.ui.showUserAvatar||(x.setAttribute("aria-hidden","true"),x.classList.add("_28"))
const g=W("div","_4"),f=W("div","_1b")
if((null==(a=t.metadata)?void 0:a.isError)&&f.classList.add("_26"),null==(o=t.metadata)?void 0:o.isWelcome){const t=W("div","_l")
t.append(S("sparkle",15),document.createTextNode(this.t("welcome"))),f.appendChild(t)}(null==(r=t.attachments)?void 0:r.length)&&f.appendChild((t=>{const e=q("div","_z")
return t.forEach(t=>{const i=q(t.url?"a":"span","_1m")
if(t.url&&(i.href=t.url,i.target="_blank",i.rel="noopener noreferrer"),"image"===t.category&&t.url){const e=document.createElement("img")
e.src=t.url,e.alt=t.name,e.className="_11",i.appendChild(e)}i.append(S("file",14),q("span","_1n",t.name)),i.title=t.name,e.appendChild(i)}),e})(t.attachments))
const m="user"!==t.sender&&this.widget.config.options.enableMarkdown
if(t.text){const e=W("div",m?"_23":"vx-text")
e.appendChild(((t,e=0)=>e?(t=>{const e=(t??"")+""
if(e.length>8e3)return z(e)
const i=document.createDocumentFragment(),s=e.replace(/\r\n?/g,"\n").split("\n")
let n=0
for(;n<s.length;){const t=s[n]
if(!t.trim()){n++
continue}if(/^\s*```/.test(t)){const t=document.createElement("pre"),e=document.createElement("code"),a=[]
for(n++;n<s.length&&!/^\s*```/.test(s[n]);)a.push(s[n++])
n<s.length&&n++,e.textContent=a.join("\n"),t.appendChild(e),i.appendChild(t)
continue}const e=t.match(/^\s*([-+*]|\d+\.)\s+(.+)$/)
if(e){const t=/\d+\./.test(e[1]),a=document.createElement(t?"ol":"ul")
for(;n<s.length;){const e=s[n].match(/^\s*([-+*]|\d+\.)\s+(.+)$/)
if(!e||/\d+\./.test(e[1])!==t)break
const i=document.createElement("li")
M(i,e[2]),a.appendChild(i),n++}i.appendChild(a)
continue}const a=[]
for(;n<s.length&&s[n].trim()&&!/^\s*```/.test(s[n])&&!/^\s*([-+*]|\d+\.)\s+/.test(s[n]);)a.push(s[n++])
const o=document.createElement("p")
a.forEach((t,e)=>{e&&o.appendChild(document.createElement("br")),M(o,t)}),i.appendChild(o)}return i})(t):z(t))(t.text,m)),f.appendChild(e)}if(null==(h=t.metadata)?void 0:h.retryable){const t=X("_24",this.t("retry"),"retry",14)
t.appendChild(document.createTextNode(" "+this.t("retry"))),t.addEventListener("click",()=>this.widget.retryLastMessage()),f.appendChild(t)}"bot"===t.sender&&(null==(l=t.suggestions)?void 0:l.length)>0&&!(null==(c=t.metadata)?void 0:c.suggestionsHidden)&&f.appendChild(this.X(t.suggestions))
const b=W("div","_1c",this.widget.formatTime(t.timestamp))
b.hidden=!this.widget.config.options.features.showTimestamps
const w=W("div","_a")
return w.appendChild(b),"user"===t.sender&&this.widget.config.options.features.showDeliveryStatus&&w.appendChild(this.J(t)),"user"===t.sender||(null==(d=t.metadata)?void 0:d.isWelcome)||w.appendChild(this.Z(t)),g.append(f,w),"user"===t.sender?v.append(g,x):v.append(x,g),p&&(null==(u=e.lastElementChild)?void 0:u.classList.contains("_1a"))&&(e.lastElementChild.dataset.hideTime="true"),e.appendChild(v),v}J(t){const e=t.deliveryStatus||"answered",i={sending:this.t("sending"),answered:this.t("answered"),failed:this.t("failed")},s=W("span","_6",i[e]||i.answered)
if(s.dataset.status=e,s.prepend(S({sending:"clock",answered:"check",failed:"alert"}[e]||"check",12)),"failed"===e){const e=W("button","_y",this.t("retry"))
e.type="button",e.addEventListener("click",()=>this.widget.G(t.id)),s.appendChild(e)}return s}Z(t){const e=W("span","_1"),i=X("_x",this.t("copyResponse"),"copy",14)
if(i.addEventListener("click",()=>this.widget.Y(t)),e.appendChild(i),t.serverId&&this.widget.config.options.features.messageFeedback){const i=X("_x",this.t("useful"),"thumbUp",14),s=X("_x",this.t("notUseful"),"thumbDown",14)
i.setAttribute("aria-pressed",("up"===t.feedback)+""),s.setAttribute("aria-pressed",("down"===t.feedback)+""),i.addEventListener("click",()=>this.widget.K(t,"up")),s.addEventListener("click",()=>this.widget.K(t,"down")),e.append(i,s)}return e}tt(t){const e=W("div","_5")
return e.setAttribute("role","separator"),e.setAttribute("aria-label",t),e.appendChild(W("span","",t)),e}et(){const t=W("div","_1e"),e=W("span","_m")
for(let i=0;i<3;i++)e.appendChild(W("span","_1d"))
return t.append(e,document.createTextNode(this.t("typing"))),t}X(t){const e=W("div","_2")
return e.setAttribute("aria-label",this.t("suggestions")),t.forEach((t,i)=>{const s=W("button","_1f",t)
s.type="button",s.dataset.index=i+"",s.addEventListener("click",()=>this.widget.sendMessage(t)),s.addEventListener("keydown",t=>{var s
if(!["ArrowLeft","ArrowRight"].includes(t.key))return
t.preventDefault()
const n=[...e.querySelectorAll("._1f")]
null==(s=n[(i+("ArrowRight"===t.key?1:-1)+n.length)%n.length])||s.focus()}),e.appendChild(s)}),e}C(){const t=W("div","_n"),e=W("form","_1o")
e.noValidate=1
const i=W("h2","",this.t("prechatTitle")),s=W("p","",this.t("prechatCopy")),n=W("div","_1q"),a=W("label","",this.t("fullName"))
a.htmlFor="vx-user-name"
const o=W("input")
o.id="vx-user-name",o.name="name",o.autocomplete="name",o.required=1,n.append(a,o)
const r=W("div","_1q"),h=W("label","",this.t("email"))
h.htmlFor="vx-user-email"
const l=W("input")
l.id="vx-user-email",l.name="email",l.type="email",l.autocomplete="email",l.required=1,r.append(h,l)
const c=W("p","_1p")
c.setAttribute("role","alert")
const d=W("button","_p",this.t("start"))
return d.type="submit",e.append(i,s,n,r,c,d),e.addEventListener("submit",t=>{t.preventDefault()
const e=o.value.trim(),i=l.value.trim(),s=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i)
if(o.setAttribute("aria-invalid",!e+""),l.setAttribute("aria-invalid",!s+""),!e||!s)return c.textContent=this.t(e?"emailInvalid":"nameRequired"),void(e?l:o).focus()
c.textContent="",this.widget.it(e,i)}),t.appendChild(e),t}S(){const t=W("div","_w"),e=W("form","_t")
e.noValidate=1,e.append(W("h2","",this.t("ratingTitle")),W("p","_u",this.t("ratingCopy")))
const i=W("div","_r")
i.setAttribute("role","radiogroup"),i.setAttribute("aria-label",this.t("ratingGroup"))
for(let l=1;l<=5;l++){const t=X("_s",this.t(l>1?"stars":"star",{count:l}),"star",28)
t.dataset.value=l+"",t.setAttribute("role","radio"),t.setAttribute("aria-checked","false"),t.tabIndex=1===l?0:-1,t.addEventListener("click",()=>this.widget.st(l)),t.addEventListener("keydown",t=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(t.key)&&(t.preventDefault(),this.widget.st(Math.max(1,Math.min(5,l+(["ArrowRight","ArrowUp"].includes(t.key)?1:-1))),1))}),i.appendChild(t)}const s=W("label","_v",this.t("optionalComment"))
s.htmlFor="_7"
const n=W("textarea","_7")
n.id="_7",n.maxLength=1e3,n.rows=4,n.placeholder=this.t("commentPlaceholder")
const a=W("p","_1p")
a.setAttribute("role","alert")
const o=W("div","_q"),r=W("button","_o",this.t("cancel"))
r.type="button"
const h=W("button","_p",this.t("sendRating"))
return h.type="submit",o.append(r,h),e.append(i,s,n,a,o),e.addEventListener("submit",t=>{t.preventDefault(),this.widget.nt()}),r.addEventListener("click",()=>this.widget.ot()),t.appendChild(e),{view:t,group:i,comment:n,submit:h,cancel:r,error:a}}rt(){this.widget.ht.textContent=this.widget.config.name,this.widget.F.replaceWith(N(this.widget)),this.widget.F=this.widget.root.querySelector("._0"),H(this.widget)}}const Z={},G=(()=>{if("undefined"==typeof document)return null
const t=document.currentScript||document.querySelector('script[src*="widget.js"]')
if(!(null==t?void 0:t.src))return null
try{const e=new URL(t.src),i=e.pathname.replace(/\/[^/]*$/,"")
return`${e.origin}${i}`.replace(/\/+$/,"")}catch{return null}})()
function Y(){if("undefined"==typeof document)return{}
const t=document.currentScript||document.querySelector('script[src*="widget.js"]')
if(!t)return{}
const e={}
return t.dataset.tenantId&&(e.tenantId=t.dataset.tenantId),t.dataset.apiUrl&&(e.apiUrl=t.dataset.apiUrl),t.dataset.locale&&(e.locale=t.dataset.locale),e}function K(){return G?G+"/api":null}function Q(){return(null==Z?void 0:Z.VITE_FRONTEND_URL)||G}function tt(t,e=G){if(!e||!t)return null
const i=(t+"").split("/").map(encodeURIComponent).join("/")
return`${(e+"").replace(/\/+$/,"")}/public/widget-assets/${i}`}const et="session-",it="conversation-history-"
class st{constructor(t){this.config=this.lt(t),this.invalid=!this.config,this.invalid||(this.config.locale=l(this.config),this._=tt("chat-icon.svg"),this.sessionId=this.ct(),this.isOpen=0,this.isLoading=0,this.isMinimized=0,this.isDestroyed=0,this.messages=[],this.dt=Date.now(),this.ut=null,this.vt=0,this.userInfo=null,this.xt=1,this.gt=0,this.ft=[],this.bt=new Map,this.wt="connecting",this.yt=0,this._t=0,this.kt=0,this.Ct=6e4,this.St=[],this.Mt=null,this.inactivityReminderCount=0,this.zt=null,this.Tt=null,this.At=null,this.It=null,this.Rt=null,this.Lt=null,this.$t=null,this.Dt=0,this.Ut=0,this.jt=0,this.Ft=0,this.Et=null,this.Ot=0,this.api=new d(this.config.apiUrl,this.config.tenantId,this.config.locale),this.ui=new J(this),this.attachments=new E({api:this.api,onChange:()=>this.qt(),onError:t=>this.Bt(t),u:()=>this.config.locale}),this.bindMethods(),this.Pt(),this.Nt())}bindMethods(){this.Ht=this.Ht.bind(this),this.handleKeyDown=this.handleKeyDown.bind(this),this.Vt=this.Vt.bind(this),this.toggle=this.toggle.bind(this),this.Wt=this.Wt.bind(this),this.handleBeforeUnload=this.handleBeforeUnload.bind(this),this.Xt=this.Xt.bind(this),this.handleInput=this.handleInput.bind(this),this.handleOnline=this.handleOnline.bind(this),this.handleOffline=this.handleOffline.bind(this)}async init(){if(this.invalid||this.isDestroyed||this.host)return this
if(!this.Jt())return this
try{if(this.initDOM(),this.Zt(),this.Gt(),await this.Yt(),this.isDestroyed)return this
if(0===this.messages.length&&await this.Kt(),this.isDestroyed)return this
this.config.options.autoOpen&&(this.Tt=setTimeout(()=>this.open(),1e3)),this.Qt(),this.te=(t=>{let e=0,i=null,s=null
const n=i=>{var s
const n=t.Lt
n&&n.readyState===WebSocket.OPEN&&(null==(s=t.config.options.features)?void 0:s.liveTypingPreview)&&"human"===t.ee&&(e=Date.now(),n.send(JSON.stringify({type:"typing",text:i})))},a=()=>{clearTimeout(i),clearTimeout(s),i=s=null,n("")}
return{ie:t=>{clearTimeout(s),s=setTimeout(a,3e3)
const o=300-(Date.now()-e)
if(o<=0)return n(t)
clearTimeout(i),i=setTimeout(()=>n(t),o)},se:a}})(this),this.ne(),this.ae(),a("widget_initialized",{tenant_id:this.config.tenantId}),this.oe("onInit")}catch(t){console.error("VOXO init",t)}return this}initDOM(){this.host=document.createElement("div"),this.host.id="voxo-chat",this.host.dataset.voxoWidget="",this.root=this.host.attachShadow({mode:"open"}),this.styleMode=(t=>{if("adoptedStyleSheets"in t&&"undefined"!=typeof CSSStyleSheet&&"replaceSync"in CSSStyleSheet.prototype)return p||(p=new CSSStyleSheet,p.replaceSync(u)),t.adoptedStyleSheets=[...t.adoptedStyleSheets,p],"adoptedStyleSheets"
const e=document.createElement("style")
return e.dataset.voxoStyles="",e.textContent=u,t.appendChild(e),"style"})(this.root),k(this.host,this.config)
const t=this.ui.k()
this.root.appendChild(t.shell),document.body.appendChild(this.host),this.shell=t.shell,this.button=t.launcher,this.re=t.panel,this.he=t.messages,this.le=t.input,this.M=t.M,this.menu=t.menu,this.T=t.T,this.A=t.A,this.ce=t.attachments,this.I=t.I,this.R=t.R,this.L=t.L,this.$=t.$,this.D=t.D,this.U=t.U,this.ht=t.title,this.de=t.subtitle,this.F=t.F,this.i=t.i,this.O=t.O,this.q=t.q,this.B=t.B,this.o=t.o,this.P=t.P,this.N=t.N,this.H=t.H,this.V=t.V,this.toast=t.toast,this.j=t.j,this.ue()}Gt(){if(!this.he)return
this.he.replaceChildren(),this.bt.clear()
let t=null,e=null;[...this.messages].sort((t,e)=>Date.parse(t.timestamp)-Date.parse(e.timestamp)||0).forEach(i=>{const s=new Date(i.timestamp).toDateString()
this.config.options.features.dateSeparators&&s!==e&&(this.he.appendChild(this.ui.tt(this.formatDateLabel(i.timestamp))),t=null,e=s)
const n=this.ui.W(i,this.he,t)
this.bt.set(i.id,n),t=i}),this.pe(),this.ve()}async Ht(t=null){var i,s,n,a,o,r
const h="user"===(null==t?void 0:t.sender)?t:null,l=(null==h?void 0:h.text)||(null==(i=this.le)?void 0:i.value.trim())||"",c=h?(null==(s=h.metadata)?void 0:s.xe)||[]:this.attachments.ready
if(!l&&0===c.length||this.isLoading)return null
if(this.kt&&await this.ge(),this.attachments.p)return this.Bt(this.t("uploadPending")),null
if(this.config.options.rateLimiting.enabled&&!this.fe())return this.Bt(this.t("rateLimited")),null
if(l.length>2e3)return this.Bt(this.t("tooLong")),null
this.isLoading=1,this.me(),this.be("connecting"),this.toggleLoadingState(1),this.pendingSuggestionMessageId=this.setPreviousSuggestionsVisibility(0),this.we()
const d=c.map(t=>({id:t.id,name:t.name,category:t.category})),u=h||this.addMessage("user",l,[],{id:e(),deliveryStatus:"sending",attachments:d.map(({name:t,category:e})=>({name:t,category:e})),xe:d})
h&&this.ye(h.id,{deliveryStatus:"sending"}),this.le.value="",null==(n=this.te)||n.se()
const p=c.map(t=>t.id)
this.attachments.clear(),this._e(),this.config.options.enableTyping&&this.ke()
try{const t=await this.api.sendMessage({message:l,sessionId:this.sessionId,clientMessageId:u.id,userId:this.getUserId(),userName:null==(a=this.userInfo)?void 0:a.name,userEmail:null==(o=this.userInfo)?void 0:o.email,attachmentIds:p,metadata:this.getMetadata()})
if(this.Ce(),!t.success||!t.data)throw Error(t.error||this.t("failed"))
{this.jt=1
const i=this.sessionId,s=t.data.sessionId||i
s!==i&&(this.Se(i,this.messages.filter(t=>t.id!==u.id)),this.sessionId=s,this.messages=[],this.addMessage("user",l,[],{id:u.id,serverId:t.data.userMessageId||u.id,deliveryStatus:"answered",attachments:u.attachments})),u.metadata.xe=[],this.ye(u.id,{serverId:t.data.userMessageId||u.id,deliveryStatus:"answered"})
const n=this.messages.find(e=>e.serverId&&e.serverId===t.data.assistantMessageId)
t.data.response&&!n&&this.addMessage("bot",t.data.response,t.data.suggestions,{id:t.data.assistantMessageId||e(),serverId:t.data.assistantMessageId||null}),this.be("available"),this.config.options.enableSounds&&this.Me()}return t}catch(v){return this.Ce(),this.ye(u.id,{deliveryStatus:"failed"}),this.be("unavailable"),this.Bt(((t,e="Widget",i=t=>t)=>(console.error(`[${e}] Erreur:`,t),"localhost"!==window.location.hostname&&"127.0.0.1"!==window.location.hostname||(console.error("Stack trace:",t.stack),console.error("Contexte:",e)),"string"==typeof t?t:t.message?t.message.includes("timeout")||t.message.includes("Timeout")?i("timeout"):t.message.includes("Network")||t.message.includes("fetch")||t.message.includes("Failed to fetch")?i("network"):t.message.includes("401")||t.message.includes("Unauthorized")?i("authError"):t.message.includes("403")||t.message.includes("Forbidden")?i("denied"):t.message.includes("404")||t.message.includes("Not Found")?i("serviceMissing"):t.message.includes("500")||t.message.includes("Internal Server Error")?i("serverError"):t.message:i("unexpected")))(v,"Widget",t=>this.t(t))),null}finally{this.isLoading=0,this.toggleLoadingState(0),this.setPreviousSuggestionsVisibility(1,this.pendingSuggestionMessageId),this.pendingSuggestionMessageId=null,null==(r=this.le)||r.focus()}}addMessage(t,i,s=[],n={}){const a=this.messages.at(-1)||null,o={id:n.id||e(),serverId:n.serverId||null,sender:t,text:(i??"")+"",timestamp:new Date,suggestions:s||[],deliveryStatus:n.deliveryStatus,feedback:n.feedback??null,messageIndex:n.messageIndex,attachments:n.attachments||[],metadata:n}
if(this.messages.push(o),this.messages.length>this.config.options.maxMessages)this.messages=this.messages.slice(-this.config.options.maxMessages),this.Gt()
else{const t=a?new Date(a.timestamp).toDateString():null,e=new Date(o.timestamp).toDateString()
this.config.options.features.dateSeparators&&e!==t&&this.he.appendChild(this.ui.tt(this.formatDateLabel(o.timestamp)))
const i=this.ui.W(o,this.he,e===t?a:null)
this.bt.set(o.id,i)}return this.ve(),"user"===t?(this.vt++,this.oe("onMessage",{message:i})):(this.config.options.a11y.announceMessages&&!n.isWelcome&&this.announce(this.t("responseAnnouncement",{name:this.config.name,text:i})),this.oe("onResponse",{response:i,suggestions:s})),this.ze(),this.pe(),o}async sendMessage(t){return"string"==typeof t&&t.trim()&&this.le?(this.le.value=t.slice(0,2e3),this._e(),this.Ht()):null}ye(t,e){const i=this.messages.find(e=>e.id===t)
return i?(Object.assign(i,e),this.Gt(),this.ze(),i):null}toggle(){return this.isOpen?this.close():this.open()}toggleChat(){return this.toggle()}open(){!this.isDestroyed&&this.re&&(this.isOpen?this.isMinimized&&this.minimize():(this.kt&&this.ge(),this.Et=this.root.activeElement||document.activeElement,this.isOpen=1,this.re.hidden=0,this.button.setAttribute("aria-expanded","true"),this.button.setAttribute("aria-label",this.t("close")),this.button.replaceChildren(S("close",22)),this.Te(),this.ut||(this.ut=Date.now()),this.we(),this.config.options.features.connectivityStatus&&this.Ae(1),this.ve(),a("chat_opened",{tenant_id:this.config.tenantId})))}close(){var t,e
if(!this.isOpen||!this.re)return
this.isOpen=0,this.isMinimized=0,this.re.hidden=1,this.re.dataset.minimized="false",this.closeMenu(),this.button.setAttribute("aria-expanded","false"),this.button.setAttribute("aria-label",this.t("open")),H(this)
const i=(null==(t=this.Et)?void 0:t.isConnected)?this.Et:this.button
null==(e=null==i?void 0:i.focus)||e.call(i),a("chat_closed",{tenant_id:this.config.tenantId})}minimize(){this.re&&(this.isMinimized=!this.isMinimized,this.re.dataset.minimized=this.isMinimized+"",this.isMinimized||this.ve(),this.D.setAttribute("aria-label",this.t(this.isMinimized?"expand":"minimize")))}destroy(){var t,e,i
this.isDestroyed||(this.isDestroyed=1,this.ze(),clearInterval(this.Mt),null==(t=this.Lt)||t.close(),clearTimeout(this.$t),clearTimeout(this.Tt),clearTimeout(this.At),clearTimeout(this.It),clearTimeout(this.Rt),this.Ce(),window.removeEventListener("beforeunload",this.handleBeforeUnload),window.removeEventListener("online",this.handleOnline),window.removeEventListener("offline",this.handleOffline),document.removeEventListener("pointerdown",this.Wt),null==(e=this.root)||e.removeEventListener("keydown",this.Vt),null==(i=this.host)||i.remove(),this.isOpen=0,window.ChatBotWidget===this&&(window.ChatBotWidget=null),this.oe("onDestroy"))}ke(){this.Ce(),this.zt=this.ui.et(),this.he.appendChild(this.zt),this.ve()}Ce(){var t
null==(t=this.zt)||t.remove(),this.zt=null}setPreviousSuggestionsVisibility(t,e=null){var i
const s=e?this.messages.find(t=>t.id===e):[...this.messages].reverse().find(t=>"bot"===t.sender)
if(null==(i=null==s?void 0:s.suggestions)?void 0:i.length)return s.metadata.suggestionsHidden=!t,this.Gt(),s.id}async clearMessages({addWelcome:t=1}={}){var e
this.Ot=0,this.sessionId=this.ct(),this.jt=0,this.ne(),this.messages=[],this.vt=0,this.me(),this.kt=0,this.ut=null,null==(e=this.he)||e.replaceChildren(),this.closeMenu(),this.ze(),t&&await this.Kt()}async ge(){this.Ot=0,this.Se(this.sessionId,this.messages),this.sessionId=this.ct(),this.jt=0,this.ne(),this.messages=[],this.vt=0,this.me(),this.kt=0,this._t=0,this.ut=null,this.Gt(),this.ze(),await this.Kt()}getStats(){return{sessionId:this.sessionId,vt:this.vt,totalMessages:this.messages.length,isOpen:this.isOpen,isLoading:this.isLoading,styleMode:this.styleMode}}pe(){if(!this.$)return
const t=this.messages.some(t=>"bot"===t.sender&&t.serverId)
this.$.hidden=!this.config.options.features.conversationRating||!t}async Y(t){var e
try{if(null==(e=navigator.clipboard)?void 0:e.writeText)await navigator.clipboard.writeText(t.text)
else{const e=document.createElement("textarea")
e.value=t.text,this.root.appendChild(e),e.select(),document.execCommand("copy"),e.remove()}this.Bt(this.t("copied"))}catch{this.Bt(this.t("copyFailed"))}}async K(t,e){if(!t.serverId||!this.config.options.features.messageFeedback)return
const i=t.feedback,s=i===e?null:e
this.ye(t.id,{feedback:s})
try{await this.api.sendMessageFeedback(this.sessionId,{messageId:t.serverId,...Number.isInteger(t.messageIndex)?{messageIndex:t.messageIndex}:{},value:s})}catch{this.ye(t.id,{feedback:i}),this.Bt(this.t("feedbackFailed"))}}Ie(){var t,e;(null==(t=this.$)?void 0:t.hidden)||(this.closeMenu(),this._t=0,this.P.value="",this.V.textContent="",this.st(0),this.Re("rating"),null==(e=this.o.querySelector('[role="radio"]'))||e.focus())}st(t,e=0){var i
this._t=Number(t)||0
const s=[...this.o.querySelectorAll('[role="radio"]')]
s.forEach((t,e)=>{const i=e+1
t.dataset.selected=(i===this._t)+"",t.dataset.filled=(i<=this._t)+"",t.setAttribute("aria-checked",(i===this._t)+""),t.tabIndex=i===(this._t||1)?0:-1}),e&&this._t&&(null==(i=s[this._t-1])||i.focus())}ot(){var t
this.V.textContent="",this.Re("chat"),null==(t=this.le)||t.focus()}async nt(){var t
if(!this._t)return this.V.textContent=this.t("ratingRequired"),null==(t=this.o.querySelector('[role="radio"]'))||t.focus(),null
this.V.textContent="",this.N.disabled=1
try{const t=await this.endConversation({rating:this._t,feedback:this.P.value.trim()})
return this.kt=1,this.ze(),this.Bt(this.t("ratingThanks")),this.announce(this.t("ratingThanks")),this.Re("chat"),this.Rt=setTimeout(()=>this.close(),700),t}catch(e){return this.V.textContent=e.message||this.t("ratingFailed"),null}finally{this.N.disabled=0}}async endConversation(t={}){const e=await this.api.endConversation(this.sessionId,{...t,sessionDuration:this.ut?Date.now()-this.ut:null,vt:this.vt})
if(!e.success)throw Error(e.error||this.t("endFailed"))
return this.kt=1,this.ze(),e}async endConversationForInactivity(){const t=await this.api.endConversationForInactivity(this.sessionId,{sessionDuration:this.ut?Date.now()-this.ut:null,vt:this.vt})
if(!t.success)throw Error(t.error||this.t("closeFailed"))
return this.kt=1,this.Se(this.sessionId,this.messages),this.ze(),t}Bt(t){this.toast&&(clearTimeout(this.It),this.toast.textContent=t,this.toast.hidden=0,this.It=setTimeout(()=>{this.toast&&(this.toast.hidden=1)},3200))}lt(t){const e={name:"Assistant",welcomeMessage:"Bonjour ! Comment puis-je vous aider ?",showLanguageSwitcher:1,theme:{primaryColor:"#3b82f6",textColor:"#333333",position:"bottom-right"},apiUrl:K(),frontendUrl:Q(),options:{autoOpen:0,showPoweredBy:1,enableSounds:0,enableTyping:1,enableMarkdown:1,maxMessages:100,debugMode:0,rateLimiting:{messagesPerMinute:15,enabled:1},ui:{borderRadius:"16px",shadows:1,animations:1,mobileFullScreen:1,colorScheme:"light",avatarUrl:null,launcherIconUrl:null,showUserAvatar:0},a11y:{trapFocus:"auto",announceMessages:1},features:{messageFeedback:1,conversationRating:1,showTimestamps:1,showDeliveryStatus:1,dateSeparators:1,connectivityStatus:1,attachments:1}}}
if(!(null==t?void 0:t.tenantId))return null
const i=this.deepMerge(e,t)
return i.apiUrl?i:(console.error("VOXO api"),null)}deepMerge(t,e){const i={...t}
for(const s in e||{})i[s]=e[s]&&"object"==typeof e[s]&&!Array.isArray(e[s])?this.deepMerge((null==t?void 0:t[s])||{},e[s]):e[s]
return i}ze(){this.invalid||i(`${et}${this.config.tenantId}`,{sessionId:this.sessionId,messages:this.messages.slice(-50),lastActivity:this.dt,ut:this.ut,vt:this.vt,inactivityReminderCount:this.inactivityReminderCount,userInfo:this.userInfo,xt:this.xt,gt:this.gt,ft:this.ft,kt:this.kt,jt:this.jt})}l(){const t=n(`${it}${this.config.tenantId}`,[]),e=Date.now()-2592e6
return t.filter(t=>new Date(t.endedAt).getTime()>=e)}Se(t,e){var s
if(!t||!(null==e?void 0:e.length))return
const n=this.l().filter(e=>e.sessionId!==t),a=(null==(s=e.find(t=>"user"===t.sender))?void 0:s.text)||this.t("conversationLabel")
n.unshift({sessionId:t,title:a.slice(0,80),endedAt:(new Date).toISOString()}),i(`${it}${this.config.tenantId}`,n.slice(0,30))}async Le(){this.closeMenu(),this.Ot=1
const t=this.l()
this.he.replaceChildren(),t.length?t.forEach(t=>{const e=document.createElement("button")
e.type="button",e.className="_14",e.textContent=`${t.title} — ${new Date(t.endedAt).toLocaleDateString(this.config.locale)}`,e.addEventListener("click",()=>this.$e(t.sessionId)),this.he.appendChild(e)}):this.he.textContent=this.t("noHistory")}async $e(t){var i
const s=await this.api.l(t)
if(!s.success)throw Error(s.error||this.t("historyUnavailable"))
this.Ot=0,this.ee=s.data.ee||this.ee,this.De=(null==(i=s.data.assignedAgent)?void 0:i.name)||this.De,this.ue(),this.messages=(s.data.messages||[]).map(t=>({id:t.id||e(),sender:"user"===t.role?"user":"agent"===t.role?"agent":"bot",text:t.content,timestamp:t.timestamp,serverId:t.id,attachments:t.attachments||[]})),this.Gt()}getMediaBaseUrl(){return((this.config.apiUrl||"")+"").replace(/\/?api\/?$/,"").replace(/\/+$/,"")}getTenantLogoUrl(){const t=this.getMediaBaseUrl()
return t?`${t}/api/widget/media/${encodeURIComponent(this.config.tenantId)}/logo`:null}getAgentAvatarUrl(t){const e=this.getMediaBaseUrl()
return e&&t?`${e}/api/widget/media/${encodeURIComponent(this.config.tenantId)}/avatar/${encodeURIComponent(t)}`:null}getBotAvatarUrl(){var t,e
const i=null==(e=null==(t=this.config.options)?void 0:t.ui)?void 0:e.avatarPreset
return i?tt(`bot-avatars/voxo-${i}.png`):null}async Ue(){if(!this.jt||this.Ft)return
const t=this.sessionId
this.Ft=1
try{await this.$e(t)}catch(e){404===(null==e?void 0:e.status)&&"CONVERSATION_NOT_FOUND"===(null==e?void 0:e.code)&&t===this.sessionId?await this.clearMessages():this.je(e)}finally{this.Ft=0}}Nt(){var t
const e=n(`${et}${this.config.tenantId}`)
if(!(null==e?void 0:e.lastActivity))return
const i=6e4*((null==(t=this.config.advanced)?void 0:t.sessionTimeout)||30)
Date.now()-e.lastActivity>=i?this.Se(e.sessionId,e.messages||[]):(this.sessionId=e.sessionId||this.sessionId,this.messages=e.messages||[],this.ut=e.ut,this.vt=e.vt||0,this.inactivityReminderCount=e.inactivityReminderCount||0,this.gt=!!e.gt,this.ft=e.ft||[],this.kt=!!e.kt,this.jt="boolean"==typeof e.jt?e.jt:this.messages.some(t=>{var e
return t.serverId&&!(null==(e=t.metadata)?void 0:e.isWelcome)}),e.userInfo&&(this.userInfo=e.userInfo,this.xt=e.xt??0))}Fe(){this.userInfo&&i("user-profile-"+this.config.tenantId,this.userInfo)}Pt(){const t=n("user-profile-"+this.config.tenantId)
t&&(this.userInfo=t,this.xt=0)}Te(){this.xt&&!this.userInfo?this.Ee():this.Oe()}Ee(){this.Re("prechat"),queueMicrotask(()=>{var t,e
return null==(e=null==(t=this.q)?void 0:t.querySelector("input"))?void 0:e.focus()})}Oe(){this.Re("chat"),queueMicrotask(()=>{var t
return null==(t=this.le)?void 0:t.focus()})}Re(t){this.re&&(this.re.dataset.view=["prechat","rating"].includes(t)?t:"chat")}it(t,e){this.userInfo={name:t,email:e},this.xt=0,this.Oe(),this.Fe(),this.ze()}Zt(){var t
this.button.addEventListener("click",this.toggle),this.U.addEventListener("click",()=>this.close()),this.D.addEventListener("click",()=>this.minimize()),this.M.addEventListener("click",this.Ht),this.le.addEventListener("keydown",this.handleKeyDown),this.le.addEventListener("input",this.handleInput),this.T.addEventListener("click",()=>this.toggleMenu()),this.R.addEventListener("click",()=>this.clearMessages()),this.L.addEventListener("click",()=>this.Le()),this.$.addEventListener("click",()=>this.Ie()),null==(t=this.j)||t.addEventListener("change",t=>this.setLocale(t.target.value)),this.root.addEventListener("keydown",this.Vt),(t=>{const{A:e,I:i,re:s,le:n,attachments:a}=t
e.addEventListener("click",()=>{t.closeMenu(),i.click()}),i.addEventListener("change",t=>{a.add(t.target.files),t.target.value=""}),s.addEventListener("dragover",t=>{t.preventDefault(),s.classList.add("_25")}),s.addEventListener("dragleave",()=>s.classList.remove("_25")),s.addEventListener("drop",t=>{t.preventDefault(),s.classList.remove("_25"),a.add(O(t))}),n.addEventListener("paste",t=>{const e=O(t)
e.length>0&&(t.preventDefault(),a.add(e))})})(this)}qt(){var t,e,i
e=this.attachments.items,i=t=>this.attachments.remove(t),(t=this.ce).textContent="",t.hidden=0===e.length,e.forEach(e=>{const s=q("span","_1m")
if(e.id||s.classList.add("_10"),e.v){const t=q("img","_13")
t.src=e.v,t.alt="",s.appendChild(t)}else s.appendChild(S("file",14))
s.appendChild(q("span","_1n",e.name)),s.title=e.name
const n=q("button","_12")
n.type="button",n.setAttribute("aria-label","Retirer "+e.name),n.appendChild(S("close",12)),n.addEventListener("click",()=>i(e.m)),s.appendChild(n),t.appendChild(s)})}ae(){document.addEventListener("pointerdown",this.Wt),window.addEventListener("beforeunload",this.handleBeforeUnload),window.addEventListener("online",this.handleOnline),window.addEventListener("offline",this.handleOffline)}handleInput(){var t
this._e(),this.we(),null==(t=this.te)||t.ie(this.le.value)}handleKeyDown(t){"Enter"!==t.key||t.shiftKey||t.isComposing||(t.preventDefault(),this.Ht())}Vt(t){if("Escape"===t.key)return void(this.menu.hidden?this.close():this.closeMenu())
if("Tab"!==t.key||!this.shouldTrapFocus())return
const e=this.getFocusable()
if(!e.length)return
const i=e[0],s=e.at(-1)
t.shiftKey&&this.root.activeElement===i?(t.preventDefault(),s.focus()):t.shiftKey||this.root.activeElement!==s||(t.preventDefault(),i.focus())}shouldTrapFocus(){var t
const e=this.config.options.a11y.trapFocus
return"boolean"==typeof e?e:0!=this.config.options.ui.mobileFullScreen&&(null==(t=window.matchMedia)?void 0:t.call(window,"(max-width: 640px)").matches)}getFocusable(){return!this.re||this.re.hidden?[]:[...this.re.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]")].filter(t=>!t.closest("[hidden]"))}Wt(t){var e
if(null==(e=this.menu)?void 0:e.hidden)return
const i=t.composedPath()
i.includes(this.menu)||i.includes(this.T)||this.closeMenu()}toggleMenu(){const t=this.menu.hidden
this.menu.hidden=!t,this.T.setAttribute("aria-expanded",t+""),t&&this.R.focus()}closeMenu(){var t
this.menu&&(this.menu.hidden=1,null==(t=this.T)||t.setAttribute("aria-expanded","false"))}_e(){this.le&&(this.le.style.height="auto",this.le.style.height=Math.min(this.le.scrollHeight,116)+"px")}async Yt(){var t
try{const e=await this.api.getTenantSettings()
e.success&&(null==(t=e.data)?void 0:t.chatbot)&&this.updateConfig(e.data.chatbot),this.be(e.success?"available":"unavailable")}catch(e){this.be("unavailable"),this.log("Erreur settings:",e)}}updateConfig(t={}){if(this.invalid||this.isDestroyed)return this
const e=this.config.apiUrl,i=this.config.tenantId
return this.config=this.deepMerge(this.config,t),e===this.config.apiUrl&&i===this.config.tenantId||(this.api=new d(this.config.apiUrl,this.config.tenantId,this.config.locale)),this.host&&(k(this.host,this.config),this.ui.rt(),this.i.hidden=!this.config.options.showPoweredBy,this.A.hidden=!this.config.options.features.attachments,this.Gt(),this.ue()),this}formatTime(t){return new Date(t).toLocaleTimeString(this.config.locale,{hour:"2-digit",minute:"2-digit"})}formatDateLabel(t){const e=new Date(t),i=new Date,s=new Date
return s.setDate(i.getDate()-1),e.toDateString()===i.toDateString()?this.t("today"):e.toDateString()===s.toDateString()?this.t("yesterday"):e.toLocaleDateString(this.config.locale,{day:"numeric",month:"long",year:"numeric"})}ve(){requestAnimationFrame(()=>{this.he&&(this.he.scrollTop=this.he.scrollHeight)})}announce(t){this.O&&(this.O.textContent="",setTimeout(()=>{this.O&&(this.O.textContent=t)},20))}we(){this.dt=Date.now()}me(){this.inactivityReminderCount=0}Qt(){this.Mt=setInterval(this.Xt,6e4)}async Xt(){if(this.isOpen&&!this.kt&&!(Date.now()-this.dt<=6e5)){if(this.inactivityReminderCount<2)return this.inactivityReminderCount+=1,this.addMessage("bot",this.t("inactivityReminder")),void this.we()
2===this.inactivityReminderCount&&(this.inactivityReminderCount+=1,this.addMessage("bot",this.t("inactivityClosed")),this.we())
try{await this.endConversationForInactivity()}catch(t){this.Bt(this.t("autoCloseFailed"))}}}async Ae(t=0){var e
if(!t&&Date.now()-this.yt<55e3)return
if(this.yt=Date.now(),0==navigator.onLine)return void this.be("unavailable")
const i=await this.api.healthCheck()
this.be(i.success&&"healthy"===(null==(e=i.data)?void 0:e.status)?"available":"unavailable")}be(t){this.wt=t,this.ue()}ue(){if(!this.de)return
if(this.de.dataset.connectivity=this.wt,"human"===this.ee)return void(this.de.textContent=this.t("withAgent",{name:this.De||this.t("agent")}))
if("waiting"===this.ee)return void(this.de.textContent=this.t("agentNotified"))
if(!this.config.options.features.connectivityStatus)return this.de.textContent=this.t("assistant"),void(this.de.dataset.connectivity="disabled")
const t={connecting:this.t("connecting"),available:this.t("available"),unavailable:this.t("unavailable")}
this.de.textContent=t[this.wt]||t.connecting}handleOnline(){this.be("connecting"),this.isOpen&&this.Ae(1)}handleOffline(){this.be("unavailable")}ne(){clearTimeout(this.$t)
const t=this.Lt
t&&(t.onclose=null,t.close())
const e=this.sessionId,i=new WebSocket(this.api.conversationSocketUrl(this.sessionId))
this.Lt=i,i.onopen=()=>{this.Dt=0},i.onmessage=t=>{try{this.qe(JSON.parse(t.data))}catch(e){this.je(e)}},i.onclose=()=>this.Be(e)}Be(t){if(this.isDestroyed||t!==this.sessionId)return
const e=Math.min(1e3*2**this.Dt++,15e3)
this.$t=setTimeout(()=>this.ne(),e)}je(t){this.Ut||(this.Ut=1,console.warn("VOXO socket",(null==t?void 0:t.message)||t))}qe(t){var e,i
t.handoff&&(this.ee=t.handoff.status,this.De=(null==(e=t.handoff.assignedAgent)?void 0:e.name)||null,this.ue()),"conversation.sync"===t.type&&this.Ue(),"message"!==t.type||"agent"!==(null==(i=t.message)?void 0:i.role)||this.messages.some(e=>e.serverId===t.message.id)||this.addMessage("agent",t.message.content,[],{serverId:t.message.id,id:t.message.id,attachments:t.message.attachments||[]})}getUserId(){let t=n("user-id")
return t||(t="user-"+e(),i("user-id",t)),t}getMetadata(){return{url:window.location.href,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,locale:this.config.locale}}t(t,e){return c(this.config.locale,t,e)}async setLocale(t){return this.config.locale=l({locale:t,tenantId:this.config.tenantId}),(()=>{i("locale-"+this.config.tenantId,h(this.config.locale))})(),this.api.locale=this.config.locale,this.re&&(this.re.lang=this.config.locale),this.Pe(),this.j&&(this.j.value=this.config.locale),await this.Yt(),this.Ot?this.Le():this.Gt(),this}Pe(){var t
if(!this.root)return
const e=(t,e)=>{const i=this.root.querySelector(t)
i&&(i.lastChild.textContent=this.t(e))}
e("._h","messages"),e("._1v","tagline"),e("._1j:nth-child(1)","history"),e("._1j:nth-child(2)","clear"),e("._1j:nth-child(3)","endAndRate"),this.le&&(this.le.placeholder=this.t("placeholder")),(null==(t=this.i)?void 0:t.firstChild)&&(this.i.firstChild.textContent=this.t("powered")),this.P&&(this.P.placeholder=this.t("commentPlaceholder")),this.N&&(this.N.textContent=this.t("sendRating")),this.H&&(this.H.textContent=this.t("cancel")),this.Ne(),this.He(),this.ue()}Ne(){const t=this.q
if(!t)return
const e=t.querySelector("h2")
e&&(e.textContent=this.t("prechatTitle"))
const i=t.querySelector("p:not(._1p)")
i&&(i.textContent=this.t("prechatCopy"))
const s=t.querySelector('label[for="vx-user-name"]')
s&&(s.textContent=this.t("fullName"))
const n=t.querySelector('label[for="vx-user-email"]')
n&&(n.textContent=this.t("email"))
const a=t.querySelector('button[type="submit"]')
a&&(a.textContent=this.t("start"))}He(){const t=this.B
if(!t)return
const e=t.querySelector("h2")
e&&(e.textContent=this.t("ratingTitle"))
const i=t.querySelector("._u")
i&&(i.textContent=this.t("ratingCopy"))
const s=t.querySelector("._v")
s&&(s.textContent=this.t("optionalComment")),this.o&&(this.o.setAttribute("aria-label",this.t("ratingGroup")),[...this.o.querySelectorAll('[role="radio"]')].forEach((t,e)=>{const i=e+1
t.setAttribute("aria-label",this.t(i>1?"stars":"star",{count:i}))}))}Jt(){const t="function"==typeof window.fetch&&void 0!==window.Promise&&"function"==typeof Element.prototype.attachShadow
return t||console.error("[VOXO Widget] Ce navigateur ne prend pas en charge les fonctionnalités requises."),t}toggleLoadingState(t){this.M&&(this.M.disabled=t,this.M.setAttribute("aria-busy",t+""))}showErrorMessage(t){this.Bt(t||this.t("technicalError"))}retryLastMessage(){const t=[...this.messages].reverse().find(t=>"user"===t.sender&&"failed"===t.deliveryStatus)
t&&this.G(t.id)}G(t){const e=this.messages.find(e=>e.id===t&&"user"===e.sender)
return e&&"failed"===e.deliveryStatus?this.Ht(e):null}fe(){const t=Date.now()
return this.St=this.St.filter(e=>t-e<this.Ct),this.St.length>=this.config.options.rateLimiting.messagesPerMinute?0:(this.St.push(t),1)}log(...t){this.config.options.debugMode&&console.log("[VOXO Widget]",...t)}oe(t,e){var i
"function"==typeof(null==(i=this.config.callbacks)?void 0:i[t])&&this.config.callbacks[t](e)}handleBeforeUnload(){this.ze()}ct(){return e()}Me(){try{const t=new(window.AudioContext||window.webkitAudioContext),e=t.createOscillator(),i=t.createGain()
e.connect(i),i.connect(t.destination),e.frequency.setValueAtTime(800,t.currentTime),i.gain.setValueAtTime(.1,t.currentTime),e.start(),e.stop(t.currentTime+.1)}catch{}}async Kt(){if(!this.config.welcomeMessage||this.messages.length>0)return
let t=this.ft
if(!this.gt){this.gt=1
try{const e=await this.api.getQuickReplies("greeting")
e.success&&(t=e.data.suggestions||[],this.ft=t)}catch{}}this.isDestroyed||this.addMessage("bot",this.config.welcomeMessage,t,{isWelcome:1})}}const nt={name:"Assistant",welcomeMessage:"Bonjour ! Comment puis-je vous aider ?",showLanguageSwitcher:1,theme:{primaryColor:"#3b82f6",textColor:"#333333",position:"bottom-right"},apiUrl:K(),frontendUrl:Q()}
function at(){if("loading"===document.readyState)return document.addEventListener("DOMContentLoaded",at,{once:1}),null
const t=document.getElementById("voxo-chat")
if(window.ChatBotWidget&&!window.ChatBotWidget.isDestroyed&&t)return window.ChatBotWidget
const e={...nt,...Y(),...window.ChatBotConfig||{}}
if(!e.apiUrl)return console.error("[ChatBot Widget] Impossible de déterminer l'URL API. Définissez window.ChatBotConfig.apiUrl."),null
if(!e.tenantId)return console.error("[ChatBot Widget] tenantId est requis dans window.ChatBotConfig"),null
const i=new st(e)
return i.init(),"undefined"!=typeof window&&(window.ChatBotWidget=i),i}at(),t.ChatBotWidget=st,t.initChatBotWidget=at,Object.defineProperty(t,Symbol.toStringTag,{value:"Module"})}({})
