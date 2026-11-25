async function testChat() {
  const tenantId = 'e69a5029-e327-4916-94f0-1d57b3e7129f';
  const sessionId = 'test-session-' + Date.now();
  
  console.log('--- DEBUT DE LA CONVERSATION ---');
  
  const prompts = [
    "Bonjour, que pouvez-vous me dire sur l'entreprise TechCorp ?",
    "Quels sont ses produits phares ?",
    "Comment puis-je contacter leur équipe support ?"
  ];

  for (const message of prompts) {
    console.log('\n👤 Vous: ' + message);
    
    try {
      const resp = await fetch('http://localhost:3000/api/widget/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId
        },
        body: JSON.stringify({ message, sessionId })
      });
      
      const data = await resp.json();
      if (data.success && data.data && data.data.response) {
        console.log('🤖 Assistant: ' + data.data.response);
      } else {
        console.log('❌ Erreur:', JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log('❌ Erreur réseau:', e.message);
    }
  }
}

testChat();
