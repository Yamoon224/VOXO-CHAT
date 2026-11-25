const FALSE_VISION_REFUSALS = [
  /je ne (?:peux|suis pas en mesure de).{0,35}(?:voir|identifier|analyser|lire).{0,20}image/is,
  /je n['’]ai pas (?:la capacité|la possibilité).{0,35}(?:voir|analyser).{0,20}image/is,
  /en tant qu['’]assistant textuel.{0,50}image/is,
];

// Le modèle refuse de traiter un vocal de mille façons (« répondre directement aux »,
// « traiter le contenu des », « traiter les »). On borne sur la phrase plutôt que sur le verbe.
const FALSE_VOICE_REFUSALS = [
  /je ne (?:peux|suis pas en mesure de)[^.]{0,60}(?:vocal|vocaux|audio)/is,
  /je n['’]ai pas (?:la capacité|la possibilité)[^.]{0,60}(?:vocal|vocaux|audio)/is,
  /en tant qu['’]assistant textuel[^.]{0,60}(?:vocal|vocaux|audio)/is,
];

function hasFalseVisionRefusal(response) {
  return FALSE_VISION_REFUSALS.some(pattern => pattern.test(String(response || '')));
}

function hasFalseVoiceRefusal(response) {
  return FALSE_VOICE_REFUSALS.some(pattern => pattern.test(String(response || '')));
}

function correctionMessage() {
  return `Correction obligatoire : l'image est lisible et se trouve dans le dernier message.
Analyse-la directement. Ne prétends pas être incapable de la voir. N'invente aucun détail.
Si elle est sans rapport avec l'entreprise, applique la branche hors périmètre prévue.`;
}

function voiceCorrectionMessage() {
  return `Correction obligatoire : le message vocal a déjà été transcrit et le dernier message
utilisateur EST cette transcription. Réponds directement à son contenu comme à un message écrit.
Ne prétends pas être incapable de traiter un message vocal et ne mentionne pas l'audio.`;
}

/**
 * Retourne le message de correction adapté au média, ou null si la réponse est acceptable.
 * Centralisé ici pour que `openaiService` n'accumule pas de conditions supplémentaires.
 */
function correctionFor({ response, visionUsed = false, mediaType = null }) {
  if (visionUsed && hasFalseVisionRefusal(response)) return correctionMessage();
  if (mediaType === 'voice' && hasFalseVoiceRefusal(response)) return voiceCorrectionMessage();
  return null;
}

module.exports = {
  hasFalseVisionRefusal,
  hasFalseVoiceRefusal,
  correctionMessage,
  voiceCorrectionMessage,
  correctionFor,
  FALSE_VISION_REFUSALS,
  FALSE_VOICE_REFUSALS,
};
